import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StockStatusBadge from "../components/StockStatusBadge.jsx";
import { deleteProduct, getProduct } from "../lib/products.js";

function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    getProduct(id)
      .then((response) => {
        if (isCurrent) setProduct(response.product);
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message || "Unable to load product.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${product.name} (${product.sku})?`)) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteProduct(id);
      navigate("/products", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to delete product.");
      setIsDeleting(false);
    }
  };

  if (isLoading) return <p className="state-message" role="status">Loading product...</p>;
  if (error && !product) {
    return (
      <div className="inline-error" role="alert">
        <span>{error}</span>
        <Link className="text-button" to="/products">Back to products</Link>
      </div>
    );
  }

  return (
    <section className="product-page">
      <Link className="back-link" to="/products">← Products</Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Product details</p>
          <h1>{product.name}</h1>
          <p className="page-description">SKU: {product.sku}</p>
        </div>
        <div className="heading-actions">
          <Link className="secondary-link" to={`/products/${id}/edit`}>Edit product</Link>
          <button
            className="danger-button"
            disabled={isDeleting}
            onClick={handleDelete}
            type="button"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="content-card">
        <dl className="product-details-grid">
          <div><dt>Category</dt><dd>{product.category}</dd></div>
          <div>
            <dt>Price</dt>
            <dd>{Number(product.price).toLocaleString(undefined, { style: "currency", currency: "USD" })}</dd>
          </div>
          <div><dt>Quantity</dt><dd>{product.quantity}</dd></div>
          <div><dt>Low-stock threshold</dt><dd>{product.lowStockThreshold}</dd></div>
          <div><dt>Stock status</dt><dd><StockStatusBadge status={product.stockStatus} /></dd></div>
          <div><dt>Supplier</dt><dd>{product.supplier || "—"}</dd></div>
          <div className="detail-description"><dt>Description</dt><dd>{product.description || "—"}</dd></div>
        </dl>
      </div>
    </section>
  );
}

export default ProductDetailsPage;
