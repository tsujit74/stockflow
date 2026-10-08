import { apiRequest } from "./api.js";

export const getInventoryHistory = () => apiRequest("/inventory/history");

export const recordStockIn = (transaction) =>
  apiRequest("/inventory/stock-in", {
    method: "POST",
    body: JSON.stringify(transaction),
  });

export const recordStockOut = (transaction) =>
  apiRequest("/inventory/stock-out", {
    method: "POST",
    body: JSON.stringify(transaction),
  });

export const adjustStock = (transaction) =>
  apiRequest("/inventory/adjust", {
    method: "POST",
    body: JSON.stringify(transaction),
  });
