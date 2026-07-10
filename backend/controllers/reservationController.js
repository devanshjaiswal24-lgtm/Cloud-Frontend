import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Book from "../models/Book.js";
import Reservation from "../models/Reservation.js";
import Transaction from "../models/Transaction.js";

const normalizeReservation = (reservation) => ({
  _id: reservation._id,
  user: reservation.user,
  book: reservation.book,
  status: reservation.status,
  readyAt: reservation.readyAt,
  expiresAt: reservation.expiresAt,
  cancelledAt: reservation.cancelledAt,
  createdAt: reservation.createdAt,
  updatedAt: reservation.updatedAt,
});

const getBookStatus = (book) => {
  if (book.availableCopies <= 0) {
    return "borrowed";
  }

  if (book.reservedCount > 0) {
    return "reserved";
  }

  return "available";
};

export const createReservation = asyncHandler(async (req, res) => {
  const { bookId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(400).json({ message: "Invalid book id" });
  }

  const allowMemberBorrow = String(process.env.ALLOW_MEMBER_BORROW || "false").toLowerCase() === "true";
  if (!allowMemberBorrow && !req.user.approved) {
    return res.status(403).json({ message: "Account must be approved before reserving" });
  }

  const book = await Book.findById(bookId);
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  const duplicateReservation = await Reservation.findOne({
    user: req.user._id,
    book: book._id,
    status: { $in: ["Pending", "Ready"] },
  });

  if (duplicateReservation) {
    return res.status(409).json({ message: "You already have an active reservation for this book" });
  }

  const reservation = await Reservation.create({
    user: req.user._id,
    book: book._id,
    status: book.availableCopies > 0 ? "Ready" : "Pending",
    readyAt: book.availableCopies > 0 ? new Date() : null,
    expiresAt: book.availableCopies > 0 ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null,
  });

  book.reservedCount += 1;
  book.status = getBookStatus(book);
  await book.save();

  await Transaction.create({
    user: req.user._id,
    book: book._id,
    relatedTransaction: null,
    type: "reservation",
    status: reservation.status,
    borrowDate: null,
    dueDate: null,
    returnDate: null,
    fineAmount: 0,
    daysLate: 0,
    paymentStatus: "Not Required",
  });

  return res.status(201).json({
    message: "Reservation created successfully",
    reservation: normalizeReservation(reservation),
    book: {
      _id: book._id,
      reservedCount: book.reservedCount,
      status: book.status,
    },
  });
});

export const cancelReservation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid reservation id" });
  }

  const reservation = await Reservation.findById(id);
  if (!reservation) {
    return res.status(404).json({ message: "Reservation not found" });
  }

  if (reservation.user.toString() !== req.user._id.toString() && req.user.role !== "admin" && req.user.role !== "librarian") {
    return res.status(403).json({ message: "Not authorized to cancel this reservation" });
  }

  if (reservation.status === "Cancelled") {
    return res.status(400).json({ message: "Reservation is already cancelled" });
  }

  reservation.status = "Cancelled";
  reservation.cancelledAt = new Date();
  const updatedReservation = await reservation.save();

  const book = await Book.findById(reservation.book);
  if (book) {
    book.reservedCount = Math.max(book.reservedCount - 1, 0);
    book.status = getBookStatus(book);
    await book.save();
  }

  await Transaction.create({
    user: reservation.user,
    book: reservation.book,
    relatedTransaction: null,
    type: "cancellation",
    status: "Cancelled",
    borrowDate: null,
    dueDate: null,
    returnDate: new Date(),
    fineAmount: 0,
    daysLate: 0,
    paymentStatus: "Not Required",
  });

  return res.status(200).json({
    message: "Reservation cancelled successfully",
    reservation: normalizeReservation(updatedReservation),
    book: book
      ? {
          _id: book._id,
          reservedCount: book.reservedCount,
          status: book.status,
        }
      : null,
  });
});

export const getMyReservations = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [reservations, totalReservations] = await Promise.all([
    Reservation.find(filter).populate("user", "name email role approved avatar createdAt").populate("book", "title author coverImage").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Reservation.countDocuments(filter),
  ]);

  return res.status(200).json({
    reservations: reservations.map(normalizeReservation),
    page,
    limit,
    totalReservations,
    totalPages: Math.ceil(totalReservations / limit) || 1,
  });
});

export const getReservations = asyncHandler(async (_req, res) => {
  const page = Math.max(parseInt(_req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(_req.query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (_req.query.status) {
    filter.status = _req.query.status;
  }

  const [reservations, totalReservations] = await Promise.all([
    Reservation.find(filter).populate("user", "name email role approved avatar createdAt").populate("book", "title author coverImage").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Reservation.countDocuments(filter),
  ]);

  return res.status(200).json({
    reservations: reservations.map(normalizeReservation),
    page,
    limit,
    totalReservations,
    totalPages: Math.ceil(totalReservations / limit) || 1,
  });
});
