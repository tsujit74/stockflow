import mongoose from "mongoose";

export const PRODUCT_CATEGORIES = [
  "Electronics",
  "Accessories",
  "Office Supplies",
  "Furniture",
  "Other",
];

export const STOCK_STATUSES = ["OUT_OF_STOCK", "LOW_STOCK", "IN_STOCK"];

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 64,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: PRODUCT_CATEGORIES,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Quantity must be a whole number.",
      },
    },
    lowStockThreshold: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Low stock threshold must be a whole number.",
      },
    },
    supplier: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", sku: "text" });
productSchema.index({ owner: 1, sku: 1 }, { unique: true });

const Product = mongoose.model("Product", productSchema);

export default Product;
