import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { validateLoginInput, validateRegisterInput } from "../utils/validators.js";

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const buildUserResponse = (user, token) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  approved: user.approved,
  avatar: user.avatar,
  token,
});

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const normalizedRole = role ? String(role).toLowerCase() : "member";

  const validationErrors = validateRegisterInput({ name, email, password, role });
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
  }

  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return res.status(409).json({ message: "Email is already registered" });
  }

  const autoApprove = String(process.env.AUTO_APPROVE_USERS || "false").toLowerCase() === "true";

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: ["member", "librarian"].includes(normalizedRole) ? normalizedRole : "member",
    approved: autoApprove,
  });

  const token = generateToken(user);

  return res.status(201).json({
    message: "Account created successfully",
    user: buildUserResponse(user, token),
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const validationErrors = validateLoginInput({ email, password });
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = generateToken(user);

  return res.status(200).json({
    message: "Login successful",
    user: buildUserResponse(user, token),
  });
});

export const logoutUser = asyncHandler(async (_req, res) => {
  return res.status(200).json({ message: "Logged out successfully" });
});
