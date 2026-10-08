import { apiRequest } from "./api.js";

export const PRODUCT_CATEGORIES = [
  "Electronics",
  "Accessories",
  "Office Supplies",
  "Furniture",
  "Other",
];

export const STOCK_STATUSES = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
];

export const getProducts = (filters = {}) => {
  const params = new URLSearchParams();
  for (const key of ["search", "category", "stockStatus"]) {
    if (filters[key]) params.set(key, filters[key]);
  }
  const query = params.toString();
  return apiRequest(`/products${query ? `?${query}` : ""}`);
};

export const getProduct = (id) => apiRequest(`/products/${encodeURIComponent(id)}`);

export const createProduct = (product) =>
  apiRequest("/products", {
    method: "POST",
    body: JSON.stringify(product),
  });

export const updateProduct = (id, product) =>
  apiRequest(`/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(product),
  });

export const deleteProduct = (id) =>
  apiRequest(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
