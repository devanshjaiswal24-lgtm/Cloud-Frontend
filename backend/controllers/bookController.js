import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { getCloudinary } from "../config/cloudinary.js";
import Book from "../models/Book.js";
import { validateBookInput, parsePaginationParams } from "../utils/bookValidators.js";

const normalizeBook = (book) => ({
  _id: book._id,
  title: book.title,
  author: book.author,
  isbn: book.isbn,
  category: book.category,
  description: book.description,
  totalCopies: book.totalCopies,
  availableCopies: book.availableCopies,
  reservedCount: book.reservedCount,
  coverImage: book.coverImage,
  publicId: book.publicId,
  pdfUrl: book.pdfUrl,
  pdfPublicId: book.pdfPublicId,
  format: book.format,
  publisher: book.publisher,
  year: book.year,
  status: book.status,
  addedBy: book.addedBy,
  createdAt: book.createdAt,
  updatedAt: book.updatedAt,
});

const buildBookQuery = (query) => {
  const filter = {};

  if (query.category) {
    filter.category = query.category;
  }

  if (query.availability) {
    if (query.availability === "available") {
      filter.availableCopies = { $gt: 0 };
    } else if (query.availability === "borrowed") {
      filter.availableCopies = { $lte: 0 };
    }
  }

  if (query.author) {
    filter.author = { $regex: query.author, $options: "i" };
  }

  if (query.search) {
    const searchRegex = { $regex: query.search, $options: "i" };
    filter.$or = [
      { title: searchRegex },
      { author: searchRegex },
      { isbn: searchRegex },
      { category: searchRegex },
    ];
  }

  return filter;
};

const buildSort = (sort) => {
  switch (sort) {
    case "title":
      return { title: 1 };
    case "newest":
      return { createdAt: -1 };
    case "availability":
      return { availableCopies: -1, title: 1 };
    default:
      return { createdAt: -1 };
  }
};

export const getBooks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const filter = buildBookQuery(req.query);
  const sort = buildSort(req.query.sort);

  const [books, totalBooks] = await Promise.all([
    Book.find(filter).sort(sort).skip(skip).limit(limit),
    Book.countDocuments(filter),
  ]);

  return res.status(200).json({
    books: books.map(normalizeBook),
    page,
    limit,
    totalBooks,
    totalPages: Math.ceil(totalBooks / limit) || 1,
  });
});

export const getBookById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid book id" });
  }

  const book = await Book.findById(id);
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  return res.status(200).json({ book: normalizeBook(book) });
});

export const createBook = asyncHandler(async (req, res) => {
  const {
    title,
    author,
    isbn,
    category,
    description,
    totalCopies,
    availableCopies,
    reservedCount,
    coverImage,
    publicId,
    pdfUrl,
    pdfPublicId,
    format,
    publisher,
    year,
  } = req.body;

  const uploadedCover = req.uploadedCover || {};
  const uploadedPdf = req.uploadedPdf || {};
  const finalCoverImage = uploadedCover.coverImage || coverImage;
  const finalPublicId = uploadedCover.publicId || publicId;
  const finalPdfUrl = uploadedPdf.pdfUrl || pdfUrl || "";
  const finalPdfPublicId = uploadedPdf.pdfPublicId || pdfPublicId || "";

  const validationErrors = validateBookInput({
    title,
    author,
    isbn,
    category,
    description,
    totalCopies,
    availableCopies,
    reservedCount,
    coverImage: finalCoverImage,
    format,
    pdfUrl: finalPdfUrl,
  });

  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
  }

  const existingBook = await Book.findOne({ isbn: String(isbn).trim() });
  if (existingBook) {
    return res.status(409).json({ message: "A book with this ISBN already exists" });
  }

  const book = await Book.create({
    title: String(title).trim(),
    author: String(author).trim(),
    isbn: String(isbn).trim(),
    category: String(category).trim(),
    description: String(description).trim(),
    totalCopies: Number(totalCopies),
    availableCopies: Number(availableCopies ?? totalCopies),
    reservedCount: Number(reservedCount ?? 0),
    coverImage: String(finalCoverImage).trim(),
    publicId: finalPublicId ? String(finalPublicId).trim() : "",
    pdfUrl: finalPdfUrl ? String(finalPdfUrl).trim() : "",
    pdfPublicId: finalPdfPublicId ? String(finalPdfPublicId).trim() : "",
    format: format === "digital" ? "digital" : "physical",
    publisher: publisher ? String(publisher).trim() : "",
    year: year ? Number(year) : null,
    addedBy: req.user?._id,
  });

  return res.status(201).json({
    message: "Book created successfully",
    book: normalizeBook(book),
  });
});

export const updateBook = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid book id" });
  }

  const book = await Book.findById(id);
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  const nextPayload = { ...req.body };
  const uploadedCover = req.uploadedCover || {};
  const uploadedPdf = req.uploadedPdf || {};

  if (nextPayload.isbn && String(nextPayload.isbn).trim() !== book.isbn) {
    const duplicateBook = await Book.findOne({ isbn: String(nextPayload.isbn).trim(), _id: { $ne: id } });
    if (duplicateBook) {
      return res.status(409).json({ message: "A book with this ISBN already exists" });
    }
  }

  const merged = {
    title: nextPayload.title ?? book.title,
    author: nextPayload.author ?? book.author,
    isbn: nextPayload.isbn ?? book.isbn,
    category: nextPayload.category ?? book.category,
    description: nextPayload.description ?? book.description,
    totalCopies: nextPayload.totalCopies ?? book.totalCopies,
    availableCopies: nextPayload.availableCopies ?? book.availableCopies,
    reservedCount: nextPayload.reservedCount ?? book.reservedCount,
    coverImage: uploadedCover.coverImage ?? nextPayload.coverImage ?? book.coverImage,
    pdfUrl: uploadedPdf.pdfUrl ?? nextPayload.pdfUrl ?? book.pdfUrl ?? "",
    format: nextPayload.format ?? book.format,
  };

  const validationErrors = validateBookInput(merged);
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
  }

  Object.assign(book, {
    title: String(nextPayload.title ?? book.title).trim(),
    author: String(nextPayload.author ?? book.author).trim(),
    isbn: String(nextPayload.isbn ?? book.isbn).trim(),
    category: String(nextPayload.category ?? book.category).trim(),
    description: String(nextPayload.description ?? book.description).trim(),
    totalCopies: Number(nextPayload.totalCopies ?? book.totalCopies),
    availableCopies: Number(nextPayload.availableCopies ?? book.availableCopies),
    reservedCount: Number(nextPayload.reservedCount ?? book.reservedCount),
    coverImage: String(uploadedCover.coverImage ?? nextPayload.coverImage ?? book.coverImage).trim(),
    publicId: uploadedCover.publicId ?? (nextPayload.publicId !== undefined ? String(nextPayload.publicId).trim() : book.publicId),
    pdfUrl: uploadedPdf.pdfUrl ?? (nextPayload.pdfUrl !== undefined ? String(nextPayload.pdfUrl).trim() : book.pdfUrl),
    pdfPublicId: uploadedPdf.pdfPublicId ?? (nextPayload.pdfPublicId !== undefined ? String(nextPayload.pdfPublicId).trim() : book.pdfPublicId),
    format: nextPayload.format === "digital" ? "digital" : book.format,
    publisher: nextPayload.publisher !== undefined ? String(nextPayload.publisher).trim() : book.publisher,
    year: nextPayload.year !== undefined ? Number(nextPayload.year) : book.year,
    status: nextPayload.status ?? book.status,
  });

  if (uploadedCover.publicId && book.publicId && book.publicId !== uploadedCover.publicId) {
    const cloudinary = getCloudinary();
    await cloudinary.uploader.destroy(book.publicId);
  }

  if (uploadedPdf.pdfPublicId && book.pdfPublicId && book.pdfPublicId !== uploadedPdf.pdfPublicId) {
    const cloudinary = getCloudinary();
    await cloudinary.uploader.destroy(book.pdfPublicId, { resource_type: "raw" });
  }

  const updatedBook = await book.save();

  return res.status(200).json({
    message: "Book updated successfully",
    book: normalizeBook(updatedBook),
  });
});

export const deleteBook = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid book id" });
  }

  const book = await Book.findById(id);
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  if (book.publicId) {
    const cloudinary = getCloudinary();
    await cloudinary.uploader.destroy(book.publicId);
  }

  await book.deleteOne();

  return res.status(200).json({ message: "Book deleted successfully" });
});