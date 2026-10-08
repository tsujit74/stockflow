import mongoose from "mongoose";

const connectDatabase = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MongoDB connection string is missing. Set MONGO_URI in the server environment.");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};

export default connectDatabase;
