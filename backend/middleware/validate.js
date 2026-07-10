import mongoose from "mongoose";

export const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const value = req.params[paramName] || req.body[paramName] || req.query[paramName];

    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({ message: `Invalid ${paramName}` });
    }

    return next();
  };
};
