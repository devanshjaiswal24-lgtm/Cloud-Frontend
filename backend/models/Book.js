import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      index: true,
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
      index: true,
    },
    isbn: {
      type: String,
      required: [true, "ISBN is required"],
      unique: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    totalCopies: {
      type: Number,
      required: [true, "Total copies is required"],
      min: [0, "Total copies cannot be negative"],
      default: 1,
    },
    availableCopies: {
      type: Number,
      required: [true, "Available copies is required"],
      min: [0, "Available copies cannot be negative"],
      default: 1,
    },
    reservedCount: {
      type: Number,
      required: [true, "Reserved count is required"],
      min: [0, "Reserved count cannot be negative"],
      default: 0,
    },
    coverImage: {
      type: String,
      required: [true, "Cover image is required"],
    },
    publicId: {
      type: String,
      default: "",
    },
    pdfUrl: {
      type: String,
      default: "",
    },
    pdfPublicId: {
      type: String,
      default: "",
    },
    format: {
      type: String,
      enum: ["physical", "digital"],
      default: "physical",
      index: true,
    },
    publisher: {
      type: String,
      default: "",
      trim: true,
    },
    year: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["available", "borrowed", "reserved"],
      default: "available",
      index: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

bookSchema.index({ title: "text", author: "text", isbn: "text", category: "text" });

bookSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    delete returnedObject.__v;
    return returnedObject;
  },
});

const Book = mongoose.model("Book", bookSchema);

export default Book;