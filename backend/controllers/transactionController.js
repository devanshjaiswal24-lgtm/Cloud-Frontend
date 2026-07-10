import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Book from "../models/Book.js";
import Transaction from "../models/Transaction.js";
import { addDays, calculateFine, getLoanPeriodDays } from "../utils/fineCalculator.js";

const normalizeTransaction = (transaction) => ({
  _id: transaction._id,
  user: transaction.user,
  book: transaction.book,
  relatedTransaction: transaction.relatedTransaction,
  type: transaction.type,
  borrowDate: transaction.borrowDate,
  dueDate: transaction.dueDate,
  returnDate: transaction.returnDate,
  status: transaction.status,
  fineAmount: transaction.fineAmount,
  daysLate: transaction.daysLate,
  paymentStatus: transaction.paymentStatus,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
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

export const borrowBook = asyncHandler(async (req, res) => {
  const { bookId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(400).json({ message: "Invalid book id" });
  }

  const allowMemberBorrow = String(process.env.ALLOW_MEMBER_BORROW || "false").toLowerCase() === "true";
  if (!allowMemberBorrow && !req.user.approved) {
    return res.status(403).json({ message: "Account must be approved before borrowing" });
  }

  const book = await Book.findById(bookId);
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  const isDigitalBook = book.format === "digital";

  if (!isDigitalBook && book.availableCopies <= 0) {
    return res.status(400).json({ message: "Book is currently unavailable" });
  }

  const activeBorrow = await Transaction.findOne({
    user: req.user._id,
    book: book._id,
    type: "borrow",
    status: "Active",
  });

  if (activeBorrow) {
    return res.status(409).json({ message: "You already have an active borrow for this book" });
  }

  const borrowDate = new Date();
  const dueDate = addDays(borrowDate, getLoanPeriodDays());

  const transaction = await Transaction.create({
    user: req.user._id,
    book: book._id,
    type: "borrow",
    borrowDate,
    dueDate,
    status: "Active",
    fineAmount: 0,
    daysLate: 0,
    paymentStatus: "Not Required",
  });

  if (!isDigitalBook) {
    book.availableCopies -= 1;
    book.status = getBookStatus(book);
    await book.save();
  }

  return res.status(201).json({
    message: isDigitalBook ? "Digital book accessed successfully" : "Book borrowed successfully",
    transaction: normalizeTransaction(transaction),
    book: {
      _id: book._id,
      availableCopies: book.availableCopies,
      status: book.status,
    },
  });
});

export const returnBook = asyncHandler(async (req, res) => {
  const { bookId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(400).json({ message: "Invalid book id" });
  }

  const book = await Book.findById(bookId);
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  const activeBorrow = await Transaction.findOne({
    user: req.user._id,
    book: book._id,
    type: "borrow",
    status: "Active",
  });

  if (!activeBorrow) {
    return res.status(404).json({ message: "Active borrow record not found" });
  }

  const returnDate = new Date();
  const { daysLate, fineAmount } = calculateFine(activeBorrow.dueDate, returnDate);
  const overdue = daysLate > 0;
  const isDigitalBook = book.format === "digital";

  activeBorrow.status = overdue ? "Overdue" : "Returned";
  activeBorrow.returnDate = returnDate;
  activeBorrow.daysLate = daysLate;
  activeBorrow.fineAmount = fineAmount;
  activeBorrow.paymentStatus = overdue && fineAmount > 0 ? "Pending" : "Not Required";

  const updatedBorrowTransaction = await activeBorrow.save();

  const returnTransaction = await Transaction.create({
    user: req.user._id,
    book: book._id,
    relatedTransaction: updatedBorrowTransaction._id,
    type: "return",
    borrowDate: updatedBorrowTransaction.borrowDate,
    dueDate: updatedBorrowTransaction.dueDate,
    returnDate,
    status: overdue ? "Overdue" : "Returned",
    fineAmount,
    daysLate,
    paymentStatus: overdue && fineAmount > 0 ? "Pending" : "Not Required",
  });

  let fineTransaction = null;
  if (fineAmount > 0) {
    fineTransaction = await Transaction.create({
      user: req.user._id,
      book: book._id,
      relatedTransaction: updatedBorrowTransaction._id,
      type: "fine",
      borrowDate: updatedBorrowTransaction.borrowDate,
      dueDate: updatedBorrowTransaction.dueDate,
      returnDate,
      status: "Overdue",
      fineAmount,
      daysLate,
      paymentStatus: "Pending",
    });
  }

  if (!isDigitalBook) {
    book.availableCopies += 1;
    book.status = getBookStatus(book);
    await book.save();
  }

  return res.status(200).json({
    message: overdue && fineAmount > 0 ? "Book returned with fine" : "Book returned successfully",
    borrowTransaction: normalizeTransaction(updatedBorrowTransaction),
    returnTransaction: normalizeTransaction(returnTransaction),
    fineTransaction: fineTransaction ? normalizeTransaction(fineTransaction) : null,
    book: {
      _id: book._id,
      availableCopies: book.availableCopies,
      status: book.status,
    },
  });
});

export const getMyTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };

  if (req.query.type) {
    filter.type = req.query.type;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [transactions, totalTransactions] = await Promise.all([
    Transaction.find(filter).populate("user", "name email role approved avatar createdAt").populate("book", "title author coverImage").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return res.status(200).json({
    transactions: transactions.map(normalizeTransaction),
    page,
    limit,
    totalTransactions,
    totalPages: Math.ceil(totalTransactions / limit) || 1,
  });
});

export const getTransactions = asyncHandler(async (_req, res) => {
  const page = Math.max(parseInt(_req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(_req.query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};

  if (_req.query.type) {
    filter.type = _req.query.type;
  }

  if (_req.query.status) {
    filter.status = _req.query.status;
  }

  if (_req.query.user && mongoose.Types.ObjectId.isValid(_req.query.user)) {
    filter.user = _req.query.user;
  }

  if (_req.query.book && mongoose.Types.ObjectId.isValid(_req.query.book)) {
    filter.book = _req.query.book;
  }

  const [transactions, totalTransactions] = await Promise.all([
    Transaction.find(filter).populate("user", "name email role approved avatar createdAt").populate("book", "title author coverImage").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return res.status(200).json({
    transactions: transactions.map(normalizeTransaction),
    page,
    limit,
    totalTransactions,
    totalPages: Math.ceil(totalTransactions / limit) || 1,
  });
});

export const getTransactionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid transaction id" });
  }

  const transaction = await Transaction.findById(id).populate("user", "name email role approved avatar createdAt").populate("book", "title author coverImage");
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  if (req.user.role !== "admin" && transaction.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to view this transaction" });
  }

  return res.status(200).json({ transaction: normalizeTransaction(transaction) });
});