import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StockStatusBadge from "../components/StockStatusBadge.jsx";
import {
  PRODUCT_CATEGORIES,
  STOCK_STATUSES,
  deleteProduct,
  getProducts,
} from "../lib/products.js";

const statusLabels = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
};

function ProductsPage() {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    stockStatus: "",
  });
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    const timer = window.setTimeout(() => {
      getProducts(filters)
        .then((response) => {
          if (isCurrent) {
            setProducts(response.products);
            setError("");
          }
        })
        .catch((requestError) => {
          if (isCurrent) setError(requestError.message || "Unable to load products.");
        })
        .finally(() => {
          if (isCurrent) setIsLoading(false);
        });
    }, filters.search ? 250 : 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [filters, reloadKey]);

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setIsLoading(true);
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete ${product.name} (${product.sku})?`)) return;
    try {
      await deleteProduct(product._id);
      setIsLoading(true);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message || "Unable to delete product.");
    }
  };

  return (
    <section className="product-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Products</h1>
          <p className="page-description">Browse and manage your stock catalog.</p>
        </div>
        <Link className="primary-link" to="/products/new">
          Add product
        </Link>
      </div>

      <div aria-label="Product filters" className="product-filters">
        <label className="form-field search-field">
          <span>Search name or SKU</span>
          <input
            name="search"
            onChange={updateFilter}
            placeholder="Search products"
            type="search"
            value={filters.search}
          />
        </label>
        <label className="form-field">
          <span>Category</span>
          <select name="category" onChange={updateFilter} value={filters.category}>
            <option value="">All categories</option>
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Stock status</span>
          <select
            name="stockStatus"
            onChange={updateFilter}
            value={filters.stockStatus}
          >
            <option value="">All statuses</option>
            {STOCK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="inline-error" role="alert">
          <span>{error}</span>
          <button
            className="text-button"
            onClick={() => {
              setIsLoading(true);
              setReloadKey((key) => key + 1);
            }}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="state-message" role="status">Loading products...</p>
      ) : !error && products.length === 0 ? (
        <div className="empty-state">
          <h2>No products found</h2>
          <p>
            {filters.search || filters.category || filters.stockStatus
              ? "Try changing or clearing your search and filters."
              : "Add your first product to get started."}
          </p>
          {!filters.search && !filters.category && !filters.stockStatus && (
            <Link className="primary-link" to="/products/new">
              Add product
            </Link>
          )}
        </div>
      ) : (
        !error && (
          <div className="product-table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <Link className="product-name-link" to={`/products/${product._id}`}>
                        {product.name}
                      </Link>
                    </td>
                    <td>{product.sku}</td>
                    <td>{product.category}</td>
                    <td>{Number(product.price).toLocaleString(undefined, { style: "currency", currency: "USD" })}</td>
                    <td>{product.quantity}</td>
                    <td><StockStatusBadge status={product.stockStatus} /></td>
                    <td className="table-actions">
                      <Link className="text-button" to={`/products/${product._id}/edit`}>
                        Edit
                      </Link>
                      <button
                        className="text-button danger-text"
                        onClick={() => handleDelete(product)}
                        type="button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}

export default ProductsPage;
