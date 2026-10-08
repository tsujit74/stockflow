import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import app from "../app.js";
import connectDatabase from "../config/database.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { migrateProductOwnershipIndexes } from "../scripts/migrate-product-ownership.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

let server;
let baseUrl;
const createdUserIds = [];
const createdLegacyProductIds = [];

const registerUser = async (name) => {
  const email = `ownership-${name}-${crypto.randomUUID()}@example.test`;
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: "test-password-123" }),
  });
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  const data = await response.json();
  assert.equal(response.status, 201, data.message);
  assert.ok(cookie);
  createdUserIds.push(data.user._id);
  return { id: data.user._id, cookie };
};

const request = (path, { cookie, ...options } = {}) =>
  fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
  });

const jsonRequest = (path, cookie, method, body) =>
  request(path, {
    cookie,
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const productPayload = (overrides = {}) => ({
  name: "Ownership test item",
  sku: `OWN-${crypto.randomUUID()}`,
  category: "Electronics",
  price: 9.5,
  quantity: 5,
  lowStockThreshold: 2,
  supplier: "Test supplier",
  description: "Temporary ownership test record",
  ...overrides,
});

before(async () => {
  await connectDatabase();
  await Product.init();
  await migrateProductOwnershipIndexes();
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  try {
    if (createdUserIds.length) {
      await InventoryTransaction.deleteMany({
        user: { $in: createdUserIds },
      });
      await Product.deleteMany({ owner: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (createdLegacyProductIds.length) {
      await Product.collection.deleteMany({
        _id: { $in: createdLegacyProductIds },
      });
    }
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  }
});

test("product and inventory APIs isolate every authenticated user's data", async (t) => {
  const userA = await registerUser("user-a");
  const userB = await registerUser("user-b");

  const currentUserResponse = await request("/api/auth/me", {
    cookie: userA.cookie,
  });
  assert.equal(currentUserResponse.status, 200);
  assert.equal((await currentUserResponse.json()).user._id, userA.id);

  const unauthenticatedProducts = await request("/api/products");
  assert.equal(unauthenticatedProducts.status, 401);
  const unauthenticatedInventory = await request("/api/inventory/history");
  assert.equal(unauthenticatedInventory.status, 401);

  const legacyId = new mongoose.Types.ObjectId();
  createdLegacyProductIds.push(legacyId);
  await Product.collection.insertOne({
    _id: legacyId,
    name: "Legacy unowned item",
    sku: `LEGACY-${crypto.randomUUID()}`,
    category: "Other",
    price: 1,
    quantity: 3,
    lowStockThreshold: 1,
    supplier: "",
    description: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createResponse = await jsonRequest(
    "/api/products",
    userA.cookie,
    "POST",
    productPayload()
  );
  assert.equal(createResponse.status, 201);
  const productA = (await createResponse.json()).product;
  assert.equal(productA.owner, userA.id);
  const skuA = productA.sku;
  let productBId;

  await t.test("same SKU may be used by another owner", async () => {
    const response = await jsonRequest(
      "/api/products",
      userB.cookie,
      "POST",
      productPayload({ sku: skuA })
    );
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.product.owner, userB.id);
    assert.equal(body.product.sku, skuA);
    productBId = body.product._id;
  });

  await t.test("duplicate SKU is rejected only within the same owner", async () => {
    const response = await jsonRequest(
      "/api/products",
      userA.cookie,
      "POST",
      productPayload({ sku: skuA })
    );
    assert.equal(response.status, 409);
  });

  await t.test("lists, search, filters, and legacy products are owner-scoped", async () => {
    const responseA = await request(
      `/api/products?search=${encodeURIComponent(skuA)}&category=Electronics&stockStatus=IN_STOCK`,
      { cookie: userA.cookie }
    );
    assert.equal(responseA.status, 200);
    const productsA = (await responseA.json()).products;
    assert.equal(productsA.length, 1);
    assert.equal(productsA[0]._id, productA._id);

    const responseB = await request(`/api/products?search=${encodeURIComponent(skuA)}`, {
      cookie: userB.cookie,
    });
    assert.equal(responseB.status, 200);
    const productsB = (await responseB.json()).products;
    assert.equal(productsB.length, 1);
    assert.equal(productsB[0]._id, productBId);

    const allProductsB = await request("/api/products", { cookie: userB.cookie });
    const listedProductsB = (await allProductsB.json()).products;
    assert.deepEqual(
      listedProductsB.map((product) => product._id),
      [productBId]
    );

    for (const cookie of [userA.cookie, userB.cookie]) {
      const allProducts = await request("/api/products", { cookie });
      const listedProducts = (await allProducts.json()).products;
      assert.ok(listedProducts.every((product) => product._id !== legacyId.toString()));
    }
  });

  await t.test("other users cannot get, update, or delete a product", async () => {
    assert.equal(
      (await request(`/api/products/${productA._id}`, { cookie: userB.cookie })).status,
      404
    );
    assert.equal(
      (
        await jsonRequest(`/api/products/${productA._id}`, userB.cookie, "PATCH", {
          name: "stolen",
        })
      ).status,
      404
    );
    assert.equal(
      (
        await jsonRequest(
          `/api/products/${productA._id}`,
          userB.cookie,
          "DELETE"
        )
      ).status,
      404
    );

    const ownerChange = await jsonRequest(
      `/api/products/${productA._id}`,
      userA.cookie,
      "PATCH",
      { owner: userB.id }
    );
    assert.equal(ownerChange.status, 400);
  });

  await t.test("inventory mutations and history are owner-scoped", async () => {
    for (const [path, quantity] of [
      ["/api/inventory/stock-in", 1],
      ["/api/inventory/stock-out", 1],
      ["/api/inventory/adjust", 0],
    ]) {
      const response = await jsonRequest(path, userB.cookie, "POST", {
        productId: productA._id,
        quantity,
      });
      assert.equal(response.status, 404);
    }

    const historyB = await request("/api/inventory/history", {
      cookie: userB.cookie,
    });
    assert.equal(historyB.status, 200);
    assert.equal((await historyB.json()).count, 0);
  });

  await t.test("owner stock changes record exact balances and reject invalid stock-outs", async () => {
    const stockIn = await jsonRequest("/api/inventory/stock-in", userA.cookie, "POST", {
      productId: productA._id,
      quantity: 3,
      note: "received",
    });
    assert.equal(stockIn.status, 200);
    const stockInData = await stockIn.json();
    assert.equal(stockInData.transaction.type, "STOCK_IN");
    assert.equal(stockInData.transaction.previousQuantity, 5);
    assert.equal(stockInData.transaction.newQuantity, 8);
    assert.equal(stockInData.product.quantity, 8);

    const stockOut = await jsonRequest("/api/inventory/stock-out", userA.cookie, "POST", {
      productId: productA._id,
      quantity: 2,
    });
    assert.equal(stockOut.status, 200);
    const stockOutData = await stockOut.json();
    assert.equal(stockOutData.transaction.previousQuantity, 8);
    assert.equal(stockOutData.transaction.newQuantity, 6);
    assert.equal(stockOutData.product.quantity, 6);

    const invalidStockOuts = [0, -1, 1.5, 7];
    for (const quantity of invalidStockOuts) {
      const response = await jsonRequest(
        "/api/inventory/stock-out",
        userA.cookie,
        "POST",
        { productId: productA._id, quantity }
      );
      assert.equal(response.status, 400);
    }

    const stockInInvalid = await jsonRequest(
      "/api/inventory/stock-in",
      userA.cookie,
      "POST",
      { productId: productA._id, quantity: 0 }
    );
    assert.equal(stockInInvalid.status, 400);

    const unchangedProduct = await Product.findById(productA._id);
    assert.equal(unchangedProduct.quantity, 6);
    assert.equal(
      await InventoryTransaction.countDocuments({ product: productA._id }),
      2
    );

    const adjustmentToZero = await jsonRequest(
      "/api/inventory/adjust",
      userA.cookie,
      "POST",
      { productId: productA._id, quantity: 0 }
    );
    assert.equal(adjustmentToZero.status, 200);
    const adjustmentData = await adjustmentToZero.json();
    assert.equal(adjustmentData.transaction.previousQuantity, 6);
    assert.equal(adjustmentData.transaction.newQuantity, 0);

    const stockOutAtZero = await jsonRequest(
      "/api/inventory/stock-out",
      userA.cookie,
      "POST",
      { productId: productA._id, quantity: 1 }
    );
    assert.equal(stockOutAtZero.status, 400);
    assert.equal((await Product.findById(productA._id)).quantity, 0);
    assert.equal(
      await InventoryTransaction.countDocuments({ product: productA._id }),
      3
    );

    const historyA = await request(
      `/api/inventory/history?productId=${productA._id}`,
      { cookie: userA.cookie }
    );
    assert.equal(historyA.status, 200);
    const historyData = await historyA.json();
    assert.equal(historyData.count, 3);
    assert.ok(historyData.transactions.every((transaction) => transaction.user._id === userA.id));
  });

  await t.test("product updates and deletes still work for the owner", async () => {
    const update = await jsonRequest(
      `/api/products/${productA._id}`,
      userA.cookie,
      "PATCH",
      { description: "updated by owner" }
    );
    assert.equal(update.status, 200);
    assert.equal((await update.json()).product.description, "updated by owner");

    const deleted = await jsonRequest(
      `/api/products/${productA._id}`,
      userA.cookie,
      "DELETE"
    );
    assert.equal(deleted.status, 200);
    assert.equal(
      (await request(`/api/products/${productA._id}`, { cookie: userA.cookie }))
        .status,
      404
    );
  });

  await t.test("dashboard aggregates are scoped to the authenticated owner", async () => {
    const responseA = await request("/api/dashboard/summary", {
      cookie: userA.cookie,
    });
    const responseB = await request("/api/dashboard/summary", {
      cookie: userB.cookie,
    });
    assert.equal(responseA.status, 200);
    assert.equal(responseB.status, 200);
    assert.equal((await responseA.json()).summary.totalProducts, 0);
    assert.equal((await responseB.json()).summary.totalProducts, 1);
  });
});
