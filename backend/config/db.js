import mongoose from "mongoose";

mongoose.set("strictQuery", true);

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  // Reuse existing connection when running in serverless environments
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      // useNewUrlParser and useUnifiedTopology are default in mongoose v6+
    });

    // eslint-disable-next-line no-console
    console.log(`MongoDB connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

export default connectDB;