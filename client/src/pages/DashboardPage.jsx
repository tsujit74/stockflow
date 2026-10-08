import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api.js";

const initialSummary = {
  totalProducts: 0,
  totalInventoryQuantity: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  totalInventoryValue: 0,
  categories: [],
};

const metrics = [
  { key: "totalProducts", label: "Total Products", format: "number" },
  {
    key: "totalInventoryQuantity",
    label: "Total Inventory Quantity",
    format: "number",
  },
  { key: "lowStockProducts", label: "Low Stock Products", format: "number" },
  {
    key: "outOfStockProducts",
    label: "Out of Stock Products",
    format: "number",
  },
  {
    key: "totalInventoryValue",
    label: "Total Inventory Value",
    format: "currency",
  },
];

const formatMetric = (value, format) =>
  format === "currency"
    ? Number(value).toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
      })
    : Number(value).toLocaleString();

function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    apiRequest("/dashboard/summary")
      .then((response) => {
        if (isCurrent) {
          setSummary(response.summary);
          setError("");
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError.message || "Unable to load dashboard summary.");
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  const retry = () => {
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  };

  if (isLoading) {
    return (
      <p className="state-message" role="status">
        Loading dashboard...
      </p>
    );
  }

  if (error) {
    return (
      <section className="dashboard-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Overview</p>
            <h1>Dashboard</h1>
          </div>
        </div>
        <div className="inline-error" role="alert">
          <span>{error}</span>
          <button className="text-button" onClick={retry} type="button">
            Retry
          </button>
        </div>
      </section>
    );
  }

  const data = summary ?? initialSummary;
  const categories = data.categories ?? [];
  const maxCategoryQuantity = Math.max(
    0,
    ...categories.map((category) => Number(category.totalInventoryQuantity) || 0)
  );
  const isEmpty = data.totalProducts === 0;

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard</h1>
          <p className="page-description">
            A snapshot of your current inventory.
          </p>
        </div>
      </div>

      <div className="dashboard-metrics">
        {metrics.map(({ key, label, format }) => (
          <article className="metric-card" key={key}>
            <p>{label}</p>
            <strong>{formatMetric(data[key] ?? 0, format)}</strong>
          </article>
        ))}
      </div>

      {isEmpty ? (
        <section className="dashboard-empty">
          <h2>No inventory yet</h2>
          <p>
            Once products are added, their category quantities will appear here.
          </p>
        </section>
      ) : (
        <section aria-labelledby="category-summary-title" className="category-card">
          <div className="category-card-heading">
            <div>
              <p className="eyebrow">Breakdown</p>
              <h2 id="category-summary-title">Inventory by category</h2>
            </div>
            <span className="chart-legend">
              <span aria-hidden="true" className="legend-swatch" />
              Quantity
            </span>
          </div>

          {categories.length === 0 ? (
            <p className="dashboard-empty-note">
              There is no category breakdown to display.
            </p>
          ) : (
            <div
              aria-label="Inventory quantities by category"
              className="category-chart"
              role="img"
            >
              {categories.map((category) => {
                const quantity = Number(category.totalInventoryQuantity) || 0;
                const width =
                  maxCategoryQuantity > 0
                    ? `${(quantity / maxCategoryQuantity) * 100}%`
                    : "0%";

                return (
                  <div className="category-row" key={category.category}>
                    <span className="category-name">{category.category}</span>
                    <span className="category-bar-track">
                      <span
                        className="category-bar"
                        style={{ width }}
                        title={`${quantity.toLocaleString()} units`}
                      />
                    </span>
                    <span className="category-quantity">
                      {quantity.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

export default DashboardPage;
