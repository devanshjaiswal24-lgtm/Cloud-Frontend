import express from "express";
import { borrowBook, getMyTransactions, getTransactionById, getTransactions, returnBook } from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/borrow", protect, borrowBook);
router.post("/return", protect, returnBook);
router.get("/me", protect, getMyTransactions);
router.get("/", protect, authorizeRoles("admin"), getTransactions);
router.get("/:id", protect, getTransactionById);

export default router;