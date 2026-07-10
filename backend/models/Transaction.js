import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    relatedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ["borrow", "return", "reservation", "cancellation", "fine"],
      required: true,
      index: true,
    },
    borrowDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    returnDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Active", "Returned", "Overdue"],
      default: "Active",
      index: true,
    },
    fineAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    daysLate: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["Not Required", "Pending", "Paid"],
      default: "Not Required",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ user: 1, book: 1, type: 1, status: 1 });

transactionSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    delete returnedObject.__v;
    return returnedObject;
  },
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;