import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["Pending", "Ready", "Expired", "Cancelled"],
      default: "Pending",
      index: true,
    },
    readyAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reservationSchema.index({ user: 1, book: 1, status: 1 });

reservationSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    delete returnedObject.__v;
    return returnedObject;
  },
});

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;