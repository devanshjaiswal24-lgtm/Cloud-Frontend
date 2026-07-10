import express from "express";
import { approveUser, deleteUser, getProfile, getUsers, updateProfile, updateUserRole } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

router.get("/", protect, authorizeRoles("admin"), getUsers);
router.put("/:id/approve", protect, authorizeRoles("admin"), approveUser);
router.put("/:id/role", protect, authorizeRoles("admin"), updateUserRole);
router.delete("/:id", protect, authorizeRoles("admin"), deleteUser);

export default router;