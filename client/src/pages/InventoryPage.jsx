import { useCallback, useEffect, useState } from "react";
import StockStatusBadge from "../components/StockStatusBadge.jsx";
import { getProducts } from "../lib/products.js";
import {
  adjustStock,
  getInventoryHistory,
  recordStockIn,
  recordStockOut,
} from "../lib/inventory.js";

const transactionTypes = [
  { value: "STOCK_IN", label: "Stock In" },
  { value: "STOCK_OUT", label: "Stock Out" },
  { value: "ADJUSTMENT", label: "Stock Adjustment" },
];

const formatDateTime = (date) =>
  new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [type, setType] = useState("STOCK_IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadInventory = useCallback(async () => {
    const [productsResponse, historyResponse] = await Promise.all([
      getProducts(),
      getInventoryHistory(),
    ]);

    setProducts(productsResponse.products);
    setTransactions(historyResponse.transactions);

    setSelectedProductId((current) =>
      productsResponse.products.some((product) => product._id === current)
        ? current
        : productsResponse.products[0]?._id ?? ""
    );
  }, []);

  useEffect(() => {
    let isCurrent = true;

    Promise.all([getProducts(), getInventoryHistory()])
      .then(([productsResponse, historyResponse]) => {
        if (!isCurrent) return;

        setProducts(productsResponse.products);
        setTransactions(historyResponse.transactions);

        setSelectedProductId((current) =>
          productsResponse.products.some((product) => product._id === current)
            ? current
            : productsResponse.products[0]?._id ?? ""
        );

        setLoadError("");
      })
      .catch((error) => {
        if (isCurrent) {
          setLoadError(error.message || "Unable to load inventory.");
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!selectedProductId) {
      setFormError("Select a product before recording a stock change.");
      return;
    }

    if (quantity.trim() === "") {
      setFormError("Quantity is required.");
      return;
    }

    const numericQuantity = Number(quantity);

    const validQuantity =
      type === "ADJUSTMENT"
        ? Number.isSafeInteger(numericQuantity) && numericQuantity >= 0
        : Number.isSafeInteger(numericQuantity) && numericQuantity > 0;

    if (!validQuantity) {
      setFormError(
        type === "ADJUSTMENT"
          ? "Adjustment quantity must be a nonnegative whole number."
          : "Stock-in and stock-out quantity must be a positive whole number."
      );
      return;
    }

    if (note.trim().length > 1000) {
      setFormError("Note must be 1000 characters or fewer.");
      return;
    }

    const submitTransaction = {
      productId: selectedProductId,
      quantity: numericQuantity,
      ...(note.trim() ? { note: note.trim() } : {}),
    };

    setIsSubmitting(true);

    try {
      const response =
        type === "STOCK_IN"
          ? await recordStockIn(submitTransaction)
          : type === "STOCK_OUT"
            ? await recordStockOut(submitTransaction)
            : await adjustStock(submitTransaction);

      setQuantity("");
      setNote("");

      const transactionLabel = transactionTypes.find(
        (item) => item.value === type
      )?.label;

      setSuccessMessage(
        `${transactionLabel} recorded. Quantity updated from ${response.transaction.previousQuantity} to ${response.transaction.newQuantity}.`
      );

      try {
        await loadInventory();
      } catch (refreshError) {
        setLoadError(
          `Stock change was recorded, but refreshed inventory could not be loaded: ${refreshError.message}`
        );
      }
    } catch (error) {
      setFormError(error.message || "Unable to record stock change.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError("");
    setReloadKey((key) => key + 1);
  };

  const selectedProduct = products.find(
    (product) => product._id === selectedProductId
  );

  return (
    <section className="inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Stock control</p>
          <h1>Inventory</h1>
          <p className="page-description">
            Record stock changes and review recent transaction history.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="state-message" role="status">
          Loading inventory...
        </p>
      ) : loadError ? (
        <div className="inline-error" role="alert">
          <span>{loadError}</span>
          <button className="text-button" onClick={retryLoad} type="button">
            Retry
          </button>
        </div>
      ) : (
        <>
          <section
            aria-labelledby="stock-change-title"
            className="content-card inventory-change-card"
          >
            <div className="inventory-section-heading">
              <div>
                <p className="eyebrow">Update quantities</p>
                <h2 id="stock-change-title">Record stock change</h2>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="empty-state inventory-empty">
                <h2>No products available</h2>
                <p>
                  Add a product before recording an inventory transaction.
                </p>
              </div>
            ) : (
              <form
                className="inventory-form"
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="inventory-form-grid">
                  <label className="form-field inventory-field">
                    <span>Transaction type</span>
                    <select
                      onChange={(event) => {
                        setType(event.target.value);
                        setFormError("");
                        setSuccessMessage("");
                      }}
                      value={type}
                    >
                      {transactionTypes.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field inventory-field">
                    <span>Product</span>
                    <select
                      onChange={(event) =>
                        setSelectedProductId(event.target.value)
                      }
                      value={selectedProductId}
                    >
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} ({product.sku}) — {product.quantity} in
                          stock
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field inventory-field">
                    <span>
                      {type === "ADJUSTMENT" ? "Set quantity to" : "Quantity"}
                    </span>
                    <input
                      min={type === "ADJUSTMENT" ? "0" : "1"}
                      onChange={(event) => setQuantity(event.target.value)}
                      required
                      step="1"
                      type="number"
                      value={quantity}
                    />
                  </label>

                  <label className="form-field inventory-field inventory-note-field">
                    <span>Note (optional)</span>
                    <textarea
                      maxLength="1000"
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Add a note about this stock change"
                      rows="3"
                      value={note}
                    />
                  </label>
                </div>

                {selectedProduct && (
                  <div className="selected-product-summary">
                    <div className="selected-product-info">
                      <span className="selected-product-label">
                        Selected product
                      </span>
                      <strong>{selectedProduct.name}</strong>
                      <span className="selected-product-sku">
                        SKU {selectedProduct.sku}
                      </span>
                    </div>

                    <div className="selected-product-stock">
                      <div>
                        <span className="selected-product-label">
                          Current quantity
                        </span>
                        <strong className="selected-product-quantity">
                          {selectedProduct.quantity}
                          <span> units</span>
                        </strong>
                      </div>

                      <StockStatusBadge
                        status={selectedProduct.stockStatus}
                      />
                    </div>
                  </div>
                )}

                {formError && (
                  <p
                    className="inventory-feedback inventory-feedback-error"
                    role="alert"
                  >
                    {formError}
                  </p>
                )}

                {successMessage && (
                  <p
                    className="inventory-feedback inventory-feedback-success"
                    role="status"
                  >
                    {successMessage}
                  </p>
                )}

                <div className="form-actions">
                  <button
                    className="primary-button"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? "Recording..." : "Record change"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section
            aria-labelledby="history-title"
            className="inventory-history"
          >
            <div className="inventory-section-heading">
              <div>
                <p className="eyebrow">Activity</p>
                <h2 id="history-title">Transaction history</h2>
              </div>

              <button
                className="text-button"
                onClick={retryLoad}
                type="button"
              >
                Refresh
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="empty-state">
                <h2>No transactions yet</h2>
                <p>Completed stock changes will appear here.</p>
              </div>
            ) : (
              <div
                aria-label="Inventory transaction history"
                className="product-table-wrap inventory-table-wrap"
                role="region"
                tabIndex={0}
              >
                <table className="product-table inventory-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Previous</th>
                      <th>New</th>
                      <th>Note</th>
                      <th>Date / time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction._id}>
                        <td>
                          {transaction.product?.name ?? "Deleted product"}
                          {transaction.product?.sku
                            ? ` (${transaction.product.sku})`
                            : ""}
                        </td>

                        <td>
                          <span
                            className={`transaction-type transaction-${transaction.type?.toLowerCase()}`}
                          >
                            {transaction.type?.replaceAll("_", " ")}
                          </span>
                        </td>

                        <td>{transaction.quantity}</td>
                        <td>{transaction.previousQuantity}</td>
                        <td>{transaction.newQuantity}</td>
                        <td>{transaction.note || "—"}</td>
                        <td>{formatDateTime(transaction.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export default InventoryPage;