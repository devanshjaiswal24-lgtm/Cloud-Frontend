import validator from "validator";

export const validateBookInput = ({ title, author, isbn, category, description, totalCopies, availableCopies, reservedCount, coverImage, format, pdfUrl }) => {
  const errors = [];

  if (!title || !String(title).trim()) errors.push("Title is required");
  if (!author || !String(author).trim()) errors.push("Author is required");
  if (!isbn || !String(isbn).trim()) errors.push("ISBN is required");
  if (!category || !String(category).trim()) errors.push("Category is required");
  if (!description || !String(description).trim()) errors.push("Description is required");
  if (!coverImage || !String(coverImage).trim()) errors.push("Cover image is required");
  if (format === "digital" && !pdfUrl && !String(pdfUrl ?? "").trim()) errors.push("PDF is required for digital books");

  if (isbn && !validator.isISBN(String(isbn).replace(/[-\s]/g, ""), 10) && !validator.isISBN(String(isbn).replace(/[-\s]/g, ""), 13)) {
    errors.push("ISBN must be valid");
  }

  // Coerce numeric fields to sensible defaults when omitted
  const copies = Number.isFinite(Number(totalCopies)) ? Number(totalCopies) : 1;
  const available = Number.isFinite(Number(availableCopies)) ? Number(availableCopies) : copies;
  const reserved = Number.isFinite(Number(reservedCount)) ? Number(reservedCount) : 0;

  if (!Number.isInteger(copies) || copies < 0) errors.push("Total copies cannot be negative");
  if (!Number.isInteger(available) || available < 0) errors.push("Available copies cannot be negative");
  if (!Number.isInteger(reserved) || reserved < 0) errors.push("Reserved count cannot be negative");
  if (Number.isInteger(copies) && Number.isInteger(available) && available > copies) errors.push("Available copies cannot exceed total copies");

  return errors;
};

export const parsePaginationParams = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 12, 1), 100);

  return { page, limit, skip: (page - 1) * limit };
};