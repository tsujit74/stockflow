import mongoose from "mongoose";

export const INVENTORY_TRANSACTION_TYPES = [
  "STOCK_IN",
  "STOCK_OUT",
  "ADJUSTMENT",
];

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: INVENTORY_TRANSACTION_TYPES,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Transaction quantity must be a whole number.",
      },
    },
    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Previous quantity must be a whole number.",
      },
    },
    newQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "New quantity must be a whole number.",
      },
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ createdAt: -1 });

const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);

export default InventoryTransaction;
