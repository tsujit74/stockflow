import { Router } from "express";
import {
  adjustStock,
  getInventoryHistory,
  stockIn,
  stockOut,
} from "../controllers/inventoryController.js";
import authenticate from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);
router.post("/stock-in", stockIn);
router.post("/stock-out", stockOut);
router.post("/adjust", adjustStock);
router.get("/history", getInventoryHistory);

export default router;
