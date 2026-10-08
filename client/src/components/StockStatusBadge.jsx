const labels = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
};

function StockStatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status?.toLowerCase() ?? "unknown"}`}>
      {labels[status] ?? "Unknown"}
    </span>
  );
}

export default StockStatusBadge;
