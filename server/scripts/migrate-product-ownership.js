import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import Product from "../models/Product.js";
import connectDatabase from "../config/database.js";

dotenv.config();

export const migrateProductOwnershipIndexes = async () => {
  await Product.collection.createIndex(
    { owner: 1, sku: 1 },
    { unique: true, name: "owner_1_sku_1" }
  );

  const indexes = await Product.collection.indexes();
  const globalSkuIndex = indexes.find(
    (index) =>
      index.unique &&
      Object.keys(index.key).length === 1 &&
      index.key.sku === 1
  );

  if (globalSkuIndex) {
    await Product.collection.dropIndex(globalSkuIndex.name);
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await connectDatabase();
    await Product.init();
    await migrateProductOwnershipIndexes();
    console.log("Product ownership indexes are ready.");
  } catch (error) {
    console.error("Failed to migrate product ownership indexes:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
