import validator from "validator";

export const isValidRole = (role) => ["member", "librarian", "admin"].includes(role);

export const validateRegisterInput = ({ name, email, password, role }) => {
  const errors = [];
  const normalizedRole = role ? String(role).toLowerCase() : "";

  if (!name || !name.trim()) {
    errors.push("Name is required");
  }

  if (!email || !validator.isEmail(email)) {
    errors.push("Valid email is required");
  }

  if (!password || !validator.isStrongPassword(password, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })) {
    errors.push("Password must be at least 8 characters and include uppercase, lowercase, and a number");
  }

  if (normalizedRole && !isValidRole(normalizedRole)) {
    errors.push("Role must be member, librarian, or admin");
  }

  return errors;
};

export const validateLoginInput = ({ email, password }) => {
  const errors = [];

  if (!email || !validator.isEmail(email)) {
    errors.push("Valid email is required");
  }

  if (!password) {
    errors.push("Password is required");
  }

  return errors;
};

export const validateProfileInput = ({ name, email }) => {
  const errors = [];

  if (name !== undefined && !String(name).trim()) {
    errors.push("Name cannot be empty");
  }

  if (email !== undefined && !validator.isEmail(String(email))) {
    errors.push("Valid email is required");
  }

  return errors;
};

export const validateRoleInput = ({ role }) => {
  const errors = [];
  const normalizedRole = role ? String(role).toLowerCase() : "";

  if (!normalizedRole || !isValidRole(normalizedRole)) {
    errors.push("Role must be member, librarian, or admin");
  }

  return errors;
};