import mongoose from "mongoose";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Product from "../models/Product.js";

class InventoryRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const validateTransactionInput = (body, { adjustment = false } = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be an object.";
  }

  const allowedFields = new Set(["productId", "quantity", "note"]);
  const unknownField = Object.keys(body).find(
    (field) => !allowedFields.has(field),
  );
  if (unknownField) return `Unknown field: ${unknownField}.`;

  if (
    typeof body.productId !== "string" ||
    !mongoose.isValidObjectId(body.productId)
  ) {
    return "A valid productId is required.";
  }

  const validQuantity = adjustment
    ? Number.isSafeInteger(body.quantity) && body.quantity >= 0
    : Number.isSafeInteger(body.quantity) && body.quantity > 0;
  if (!validQuantity) {
    return adjustment
      ? "Quantity must be a nonnegative whole number."
      : "Quantity must be a positive whole number.";
  }

  if (
    body.note !== undefined &&
    (typeof body.note !== "string" || body.note.trim().length > 1000)
  ) {
    return "Note must be a string of 1000 characters or fewer.";
  }

  return null;
};

const changeStock = async (req, res, { type, adjustment = false }) => {
  const validationError = validateTransactionInput(req.body, { adjustment });
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const { productId, quantity } = req.body;
  const session = await mongoose.startSession();

  try {
    let changedProduct;
    let previousQuantity;
    let transaction;

    await session.withTransaction(async () => {
      if (adjustment) {
        const currentProduct = await Product.findOne({
          _id: productId,
          owner: req.user._id,
        }).session(session);

        if (!currentProduct) {
          throw new InventoryRequestError(404, "Product not found.");
        }

        previousQuantity = currentProduct.quantity;

        changedProduct = await Product.findOneAndUpdate(
          { _id: productId, owner: req.user._id },
          { $set: { quantity } },
          { new: true, runValidators: true, session },
        );

        if (!changedProduct) {
          throw new InventoryRequestError(404, "Product not found.");
        }
      } else {
        const update =
          type === "STOCK_IN"
            ? { $inc: { quantity } }
            : { $inc: { quantity: -quantity } };
        const conditions = { _id: productId, owner: req.user._id };
        if (type === "STOCK_OUT") {
          conditions.quantity = { $gte: quantity };
        } else {
          conditions.quantity = { $lte: Number.MAX_SAFE_INTEGER - quantity };
        }

        changedProduct = await Product.findOneAndUpdate(conditions, update, {
          new: true,
          session,
        });

        if (!changedProduct) {
          const exists = await Product.exists({
            _id: productId,
            owner: req.user._id,
          }).session(session);
          if (!exists) {
            throw new InventoryRequestError(404, "Product not found.");
          }
          if (type === "STOCK_OUT") {
            throw new InventoryRequestError(
              400,
              "Insufficient stock for this stock-out.",
            );
          }
          throw new InventoryRequestError(
            400,
            "Stock quantity would exceed the supported maximum.",
          );
        }
        previousQuantity =
          type === "STOCK_IN"
            ? changedProduct.quantity - quantity
            : changedProduct.quantity + quantity;
      }

      [transaction] = await InventoryTransaction.create(
        [
          {
            product: changedProduct._id,
            user: req.user._id,
            type,
            quantity,
            previousQuantity,
            newQuantity: changedProduct.quantity,
            note: req.body.note?.trim() ?? "",
          },
        ],
        { session },
      );
    });

    return res.json({
      success: true,
      product: changedProduct,
      transaction,
    });
  } catch (error) {
    if (error instanceof InventoryRequestError) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    if (
      error instanceof mongoose.Error.ValidationError ||
      error instanceof mongoose.Error.CastError
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    console.error(`Failed to perform ${type.toLowerCase()} operation:`, error);
    return res.status(500).json({
      success: false,
      message: "Unable to record inventory change.",
    });
  } finally {
    await session.endSession();
  }
};

export const stockIn = (req, res) =>
  changeStock(req, res, { type: "STOCK_IN" });

export const stockOut = (req, res) =>
  changeStock(req, res, { type: "STOCK_OUT" });

export const adjustStock = (req, res) =>
  changeStock(req, res, { type: "ADJUSTMENT", adjustment: true });

export const getInventoryHistory = async (req, res) => {
  const { productId } = req.query;
  if (
    productId !== undefined &&
    (typeof productId !== "string" || !mongoose.isValidObjectId(productId))
  ) {
    return res.status(400).json({
      success: false,
      message: "productId must be a valid product ID.",
    });
  }

  try {
    const ownedProductIds = await Product.distinct("_id", {
      owner: req.user._id,
      ...(productId ? { _id: productId } : {}),
    });
    const filter = { product: { $in: ownedProductIds } };
    const transactions = await InventoryTransaction.find(filter)
      .populate("product", "name sku")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Failed to retrieve inventory history:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve inventory history.",
    });
  }
};
