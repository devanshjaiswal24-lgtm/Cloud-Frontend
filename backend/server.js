import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

try {
  await connectDB();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error("Failed to connect to MongoDB:", error);
  // If running the server directly (not imported by Vercel), exit with failure
  if (process.argv[1] === __filename) {
    process.exit(1);
  }
}

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Debug logging for auth routes during development to help track request payloads
if (process.env.NODE_ENV !== "production") {
  app.use("/api/auth", (req, _res, next) => {
    // eslint-disable-next-line no-console
    console.log("[auth-debug]", req.method, req.originalUrl, "headers:", req.headers["content-type"]);
    // eslint-disable-next-line no-console
    console.log("[auth-debug] body:", req.body);
    next();
  });
}

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reservations", reservationRoutes);

app.use(notFound);
app.use(errorHandler);

try {
  await connectDB();
} catch (error) {
  console.error("Failed to connect to MongoDB:", error);
}

export default app;

if (process.argv[1] === __filename) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${PORT}`);
  });
}