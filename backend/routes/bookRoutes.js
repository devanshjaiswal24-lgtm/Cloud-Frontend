import express from "express";
import { createBook, deleteBook, getBookById, getBooks, updateBook } from "../controllers/bookController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { upload, uploadBookAssets } from "../middleware/upload.js";

const router = express.Router();

router.get("/", getBooks);
router.get("/:id", getBookById);

router.post("/", protect, authorizeRoles("librarian", "admin"), upload.fields([{ name: "cover", maxCount: 1 }, { name: "pdf", maxCount: 1 }]), uploadBookAssets, createBook);
router.put("/:id", protect, authorizeRoles("librarian", "admin"), upload.fields([{ name: "cover", maxCount: 1 }, { name: "pdf", maxCount: 1 }]), uploadBookAssets, updateBook);
router.delete("/:id", protect, authorizeRoles("librarian", "admin"), deleteBook);

export default router;