import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from "../controllers/productController.js";
import authenticate from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);
router.route("/").post(createProduct).get(getProducts);
router
  .route("/:id")
  .get(getProduct)
  .put(updateProduct)
  .patch(updateProduct)
  .delete(deleteProduct);

export default router;
