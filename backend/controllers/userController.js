import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import User from "../models/User.js";
import { validateProfileInput, validateRoleInput } from "../utils/validators.js";

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  approved: user.approved,
  avatar: user.avatar,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getProfile = asyncHandler(async (req, res) => {
  return res.status(200).json({ user: sanitizeUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, avatar } = req.body;

  const validationErrors = validateProfileInput({ name, email });
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
  }

  if (email) {
    const normalizedEmail = String(email).toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user._id } });

    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    req.user.email = normalizedEmail;
  }

  if (name !== undefined) {
    req.user.name = String(name).trim();
  }

  if (avatar !== undefined) {
    req.user.avatar = String(avatar).trim();
  }

  const updatedUser = await req.user.save();

  return res.status(200).json({
    message: "Profile updated successfully",
    user: sanitizeUser(updatedUser),
  });
});

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  return res.status(200).json({ users: users.map(sanitizeUser) });
});

export const approveUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.approved = true;
  const updatedUser = await user.save();

  return res.status(200).json({
    message: "User approved successfully",
    user: sanitizeUser(updatedUser),
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const validationErrors = validateRoleInput({ role });
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.role = String(role).toLowerCase();
  const updatedUser = await user.save();

  return res.status(200).json({
    message: "User role updated successfully",
    user: sanitizeUser(updatedUser),
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await user.deleteOne();

  return res.status(200).json({ message: "User deleted successfully" });
});