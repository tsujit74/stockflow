import mongoose from "mongoose";
import Product, {
  PRODUCT_CATEGORIES,
  STOCK_STATUSES,
} from "../models/Product.js";

const allowedFields = new Set([
  "name",
  "sku",
  "category",
  "price",
  "quantity",
  "lowStockThreshold",
  "supplier",
  "description",
]);

const validateProductPayload = (body, { partial = false } = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be an object.";
  }

  const keys = Object.keys(body);
  const unknownField = keys.find((key) => !allowedFields.has(key));
  if (unknownField) {
    return `Unknown product field: ${unknownField}.`;
  }

  const requiredFields = [
    "name",
    "sku",
    "category",
    "price",
    "quantity",
    "lowStockThreshold",
  ];
  if (!partial && requiredFields.some((key) => body[key] === undefined)) {
    return "Name, SKU, category, price, quantity, and lowStockThreshold are required.";
  }
  if (partial && keys.length === 0) {
    return "At least one product field is required.";
  }

  for (const key of ["name", "sku", "category", "supplier", "description"]) {
    if (body[key] !== undefined && typeof body[key] !== "string") {
      return `${key} must be a string.`;
    }
  }

  if (body.name !== undefined && !body.name.trim()) {
    return "Name cannot be empty.";
  }
  if (body.sku !== undefined && !body.sku.trim()) {
    return "SKU cannot be empty.";
  }
  if (body.category !== undefined && !PRODUCT_CATEGORIES.includes(body.category)) {
    return `Category must be one of: ${PRODUCT_CATEGORIES.join(", ")}.`;
  }

  for (const key of ["price", "quantity", "lowStockThreshold"]) {
    if (body[key] !== undefined && (typeof body[key] !== "number" || !Number.isFinite(body[key]) || body[key] < 0)) {
      return `${key} must be a nonnegative number.`;
    }
  }
  for (const key of ["quantity", "lowStockThreshold"]) {
    if (body[key] !== undefined && !Number.isSafeInteger(body[key])) {
      return `${key} must be a nonnegative whole number.`;
    }
  }

  if (body.name !== undefined && body.name.trim().length > 120) {
    return "Name must be 120 characters or fewer.";
  }
  if (body.sku !== undefined && body.sku.trim().length > 64) {
    return "SKU must be 64 characters or fewer.";
  }
  if (body.supplier !== undefined && body.supplier.trim().length > 120) {
    return "Supplier must be 120 characters or fewer.";
  }
  if (body.description !== undefined && body.description.trim().length > 2000) {
    return "Description must be 2000 characters or fewer.";
  }

  return null;
};

const validateProductId = (id) => mongoose.isValidObjectId(id);

const getStockStatus = (product) => {
  if (product.quantity === 0) return "OUT_OF_STOCK";
  if (product.quantity <= product.lowStockThreshold) return "LOW_STOCK";
  return "IN_STOCK";
};

const presentProduct = (product) => {
  const result = product.toObject();
  result.stockStatus = getStockStatus(result);
  return result;
};

const handleProductError = (res, error, action) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A product with that SKU already exists.",
    });
  }
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: error.message });
  }

  console.error(`Failed to ${action} product:`, error);
  return res.status(500).json({
    success: false,
    message: `Unable to ${action} product.`,
  });
};

export const createProduct = async (req, res) => {
  const validationError = validateProductPayload(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const product = await Product.create(req.body);
    return res.status(201).json({
      success: true,
      product: presentProduct(product),
    });
  } catch (error) {
    return handleProductError(res, error, "create");
  }
};

export const getProducts = async (req, res) => {
  const { search, category, stockStatus } = req.query;
  if (search !== undefined && typeof search !== "string") {
    return res.status(400).json({ success: false, message: "Search must be a string." });
  }
  if (category !== undefined && !PRODUCT_CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, message: "Invalid product category." });
  }
  if (stockStatus !== undefined && !STOCK_STATUSES.includes(stockStatus)) {
    return res.status(400).json({ success: false, message: "Invalid stock status." });
  }

  const filter = {};
  if (search?.trim()) {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escapedSearch, "i");
    filter.$or = [{ name: searchRegex }, { sku: searchRegex }];
  }
  if (category) filter.category = category;

  if (stockStatus === "OUT_OF_STOCK") {
    filter.quantity = 0;
  } else if (stockStatus === "LOW_STOCK") {
    filter.quantity = { $gt: 0 };
    filter.$expr = { $lte: ["$quantity", "$lowStockThreshold"] };
  } else if (stockStatus === "IN_STOCK") {
    filter.$expr = { $gt: ["$quantity", "$lowStockThreshold"] };
  }

  try {
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: products.length,
      products: products.map(presentProduct),
    });
  } catch (error) {
    return handleProductError(res, error, "retrieve");
  }
};

export const getProduct = async (req, res) => {
  if (!validateProductId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid product ID." });
  }

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    return res.json({ success: true, product: presentProduct(product) });
  } catch (error) {
    return handleProductError(res, error, "retrieve");
  }
};

export const updateProduct = async (req, res) => {
  if (!validateProductId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid product ID." });
  }
  const validationError = validateProductPayload(req.body, { partial: true });
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    Object.assign(product, req.body);
    await product.save();
    return res.json({ success: true, product: presentProduct(product) });
  } catch (error) {
    return handleProductError(res, error, "update");
  }
};

export const deleteProduct = async (req, res) => {
  if (!validateProductId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid product ID." });
  }

  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    return res.json({ success: true, message: "Product deleted successfully." });
  } catch (error) {
    return handleProductError(res, error, "delete");
  }
};
