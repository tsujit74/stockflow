import { useState } from "react";
import { PRODUCT_CATEGORIES } from "../lib/products.js";

const emptyValues = {
  name: "",
  sku: "",
  category: "Other",
  price: "",
  quantity: "",
  lowStockThreshold: "",
  supplier: "",
  description: "",
};

function ProductForm({ initialProduct, onSubmit, submitLabel }) {
  const [form, setForm] = useState(() => ({
    ...emptyValues,
    ...initialProduct,
    price: initialProduct?.price ?? "",
    quantity: initialProduct?.quantity ?? "",
    lowStockThreshold: initialProduct?.lowStockThreshold ?? "",
  }));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.price === "") return setError("Price is required.");
    if (form.quantity === "") return setError("Quantity is required.");
    if (form.lowStockThreshold === "") {
      return setError("Low-stock threshold is required.");
    }

    const price = Number(form.price);
    const quantity = Number(form.quantity);
    const lowStockThreshold = Number(form.lowStockThreshold);

    if (!form.name.trim()) return setError("Product name is required.");
    if (!form.sku.trim()) return setError("SKU is required.");
    if (!PRODUCT_CATEGORIES.includes(form.category)) {
      return setError("Select a valid category.");
    }
    if (!Number.isFinite(price) || price < 0) {
      return setError("Price must be a nonnegative number.");
    }
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      return setError("Quantity must be a nonnegative whole number.");
    }
    if (!Number.isSafeInteger(lowStockThreshold) || lowStockThreshold < 0) {
      return setError("Low-stock threshold must be a nonnegative whole number.");
    }
    if (form.name.trim().length > 120) {
      return setError("Name must be 120 characters or fewer.");
    }
    if (form.sku.trim().length > 64) {
      return setError("SKU must be 64 characters or fewer.");
    }
    if (form.supplier.trim().length > 120) {
      return setError("Supplier must be 120 characters or fewer.");
    }
    if (form.description.trim().length > 2000) {
      return setError("Description must be 2000 characters or fewer.");
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category,
        price,
        quantity,
        lowStockThreshold,
        supplier: form.supplier.trim(),
        description: form.description.trim(),
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to save product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="product-form" onSubmit={handleSubmit} noValidate>
      <div className="product-form-grid">
        <label className="form-field">
          <span>Name</span>
          <input maxLength="120" name="name" onChange={handleChange} required value={form.name} />
        </label>
        <label className="form-field">
          <span>SKU</span>
          <input maxLength="64" name="sku" onChange={handleChange} required value={form.sku} />
        </label>
        <label className="form-field">
          <span>Category</span>
          <select name="category" onChange={handleChange} value={form.category}>
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Price</span>
          <input
            min="0"
            name="price"
            onChange={handleChange}
            required
            step="any"
            type="number"
            value={form.price}
          />
        </label>
        <label className="form-field">
          <span>Quantity</span>
          <input
            min="0"
            name="quantity"
            onChange={handleChange}
            required
            step="1"
            type="number"
            value={form.quantity}
          />
        </label>
        <label className="form-field">
          <span>Low-stock threshold</span>
          <input
            min="0"
            name="lowStockThreshold"
            onChange={handleChange}
            required
            step="1"
            type="number"
            value={form.lowStockThreshold}
          />
        </label>
        <label className="form-field">
          <span>Supplier</span>
          <input maxLength="120" name="supplier" onChange={handleChange} value={form.supplier} />
        </label>
      </div>
      <label className="form-field">
        <span>Description</span>
        <textarea
          maxLength="2000"
          name="description"
          onChange={handleChange}
          rows="4"
          value={form.description}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default ProductForm;
