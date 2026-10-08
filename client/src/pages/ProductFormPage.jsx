import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductForm from "../components/ProductForm.jsx";
import { createProduct, getProduct, updateProduct } from "../lib/products.js";

function ProductFormPage({ mode }) {
  const isEdit = mode === "edit";
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!isEdit) return undefined;
    let isCurrent = true;
    getProduct(id)
      .then((response) => {
        if (isCurrent) setProduct(response.product);
      })
      .catch((error) => {
        if (isCurrent) setLoadError(error.message || "Unable to load product.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [id, isEdit]);

  const handleSubmit = async (values) => {
    const response = isEdit
      ? await updateProduct(id, values)
      : await createProduct(values);
    navigate(`/products/${response.product._id}`, { replace: true });
  };

  if (isLoading) return <p className="state-message" role="status">Loading product...</p>;
  if (loadError) {
    return (
      <div className="inline-error" role="alert">
        <span>{loadError}</span>
        <Link className="text-button" to="/products">Back to products</Link>
      </div>
    );
  }

  return (
    <section className="product-page">
      <Link className="back-link" to={isEdit ? `/products/${id}` : "/products"}>
        ← {isEdit ? "Product details" : "Products"}
      </Link>
      <div className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>{isEdit ? "Edit product" : "Add product"}</h1>
        </div>
      </div>
      <div className="content-card">
        <ProductForm
          initialProduct={product}
          onSubmit={handleSubmit}
          submitLabel={isEdit ? "Save changes" : "Create product"}
        />
      </div>
    </section>
  );
}

export default ProductFormPage;
