import express from "express";
import { cancelReservation, createReservation, getMyReservations, getReservations } from "../controllers/reservationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, createReservation);
router.get("/me", protect, getMyReservations);
router.get("/", protect, authorizeRoles("admin"), getReservations);
router.delete("/:id", protect, cancelReservation);

export default router;