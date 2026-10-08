# StockFlow

## 1. Project Name and Description

StockFlow is an inventory management application for tracking products, stock changes, and inventory summaries. Each authenticated user has a separate product inventory.

## 2. Features

* Register, log in, restore an authenticated session, and log out using an HTTP-only authentication cookie.
* Create, view, search, filter, update, and delete products.
* Filter products by category and stock status.
* Search products by name or SKU through the backend API.
* Record stock-in, stock-out, and stock-adjustment transactions with notes and quantity history.
* Prevent stock-out requests from exceeding available stock.
* View transaction history for owned products.
* View an API-backed dashboard with product, quantity, stock-status, inventory-value, and category summaries.
* Keep products, inventory operations, transaction history, and dashboard results scoped to the signed-in user.
* Display loading, empty, validation, and API error states in the frontend.

Stock status is determined as follows:

* `OUT_OF_STOCK`: quantity is `0`.
* `LOW_STOCK`: quantity is greater than `0` and less than or equal to the low-stock threshold.
* `IN_STOCK`: quantity is greater than the low-stock threshold.

## 3. Technologies Used

* **Frontend:** React, Vite, React Router, CSS
* **Backend:** Node.js, Express.js (ES modules)
* **Database:** MongoDB, Mongoose
* **Authentication:** JSON Web Tokens (JWT) in HTTP-only cookies, bcryptjs for password hashing
* **Other backend packages:** dotenv, cookie-parser, cors

## 4. Project Structure

```text
StockFlow/

├── client/
│   ├── src/
│   │   ├── components/       # Shared layout, route guards, and product UI
│   │   ├── contexts/         # Authentication state
│   │   ├── lib/              # API, product, and inventory requests
│   │   ├── pages/            # Login/register, dashboard, products, inventory
│   │   ├── App.jsx           # Frontend route configuration
│   │   └── index.css         # Application styles
│   └── package.json
├── server/
│   ├── config/               # MongoDB and authentication configuration
│   ├── controllers/          # Authentication, product, inventory, dashboard APIs
│   ├── middleware/           # Authentication middleware
│   ├── models/               # User, Product, InventoryTransaction
│   ├── routes/               # Express API routes
│   ├── scripts/              # Product ownership index migration
│   ├── tests/                # Backend ownership integration test
│   ├── app.js                # Express application and route mounting
│   ├── server.js             # Environment loading, database connection, startup
│   └── package.json
└── README.md
```

## 5. Setup and Installation

1. Install a current Node.js release and make MongoDB available. Inventory changes use MongoDB transactions, so the database must support transactions, such as a replica set or sharded cluster.

2. Create `server/.env` using the environment variables described below.

3. Install the frontend and backend dependencies:

```bash
cd server
npm install

cd ../client
npm install
```

4. For a database that already contains products from before per-user ownership was added, run the ownership index migration once from the `server` directory:

```bash
cd server
node scripts/migrate-product-ownership.js
```

The migration prepares per-owner SKU uniqueness and removes the old globally unique SKU index if present. Products without an owner remain inaccessible to users; they are not automatically assigned to an account.

## 6. Environment Variables

Create `server/.env`:

```dotenv
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/stockflow?replicaSet=rs0
JWT_SECRET=replace-with-a-long-random-secret
```

| Variable       | Required                         | Description                                                                                                                        |
| -------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `MONGO_URI`    | Yes, unless `MONGODB_URI` is set | MongoDB connection string. The local setup uses the `rs0` replica set because inventory operations use MongoDB transactions.       |
| `MONGODB_URI`  | Alternative                      | Supported alternative name for the MongoDB connection string.                                                                      |
| `JWT_SECRET`   | Yes                              | Secret used to sign and verify authentication JWTs.                                                                                |
| `PORT`         | No                               | Backend listening port; defaults to `5000`.                                                                                        |
| `VITE_API_URL` | No                               | Frontend API base URL. Defaults to `http://localhost:5000/api`. Set this in the client environment when using a different API URL. |

For the frontend, `VITE_API_URL` can be added to `client/.env` when needed:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Do not commit real credentials or secrets. The frontend sends requests with credentials enabled so the browser can include the HTTP-only authentication cookie.

## 7. How to Run the Application

Run the backend from one terminal:

```bash
cd server
npm run dev
```

The backend connects to MongoDB before it starts listening. For a non-development start, use:

```bash
npm start
```

from the `server/` directory.

Run the frontend from another terminal:

```bash
cd client
npm run dev
```

Open the local URL printed by Vite, normally:

```text
http://localhost:5173
```

The backend listens on port `5000` by default.

### Frontend Routes

| Route                | Page                                     |
| -------------------- | ---------------------------------------- |
| `/login`             | Sign in                                  |
| `/register`          | Create an account                        |
| `/dashboard`         | Inventory summary and category breakdown |
| `/products`          | Product list, search, and filters        |
| `/products/new`      | Add a product                            |
| `/products/:id`      | Product details and delete action        |
| `/products/:id/edit` | Edit a product                           |
| `/inventory`         | Stock operations and transaction history |

Dashboard, product, and inventory pages require authentication. Signed-in users visiting `/login` or `/register` are redirected to the dashboard.

## 8. API Overview

The API is mounted at `/api`. Except for registration, login, logout, and the health check, application data endpoints require the authentication cookie.

| Method         | Endpoint                   | Description                                                                             |
| -------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| `GET`          | `/api/health`              | Backend health check.                                                                   |
| `POST`         | `/api/auth/register`       | Register with name, email, and password.                                                |
| `POST`         | `/api/auth/login`          | Log in with email and password; sets the authentication cookie.                         |
| `POST`         | `/api/auth/logout`         | Clear the authentication cookie.                                                        |
| `GET`          | `/api/auth/me`             | Return the current authenticated user.                                                  |
| `GET`          | `/api/products`            | List owned products. Supports `search`, `category`, and `stockStatus` query parameters. |
| `POST`         | `/api/products`            | Create a product for the current user.                                                  |
| `GET`          | `/api/products/:id`        | Get an owned product.                                                                   |
| `PUT`, `PATCH` | `/api/products/:id`        | Update an owned product.                                                                |
| `DELETE`       | `/api/products/:id`        | Delete an owned product.                                                                |
| `POST`         | `/api/inventory/stock-in`  | Add a positive whole-number quantity to a product.                                      |
| `POST`         | `/api/inventory/stock-out` | Remove a positive whole-number quantity if sufficient stock is available.               |
| `POST`         | `/api/inventory/adjust`    | Set a product's quantity to a nonnegative whole number.                                 |
| `GET`          | `/api/inventory/history`   | List owned-product transactions; optionally filter by `productId`.                      |
| `GET`          | `/api/dashboard/summary`   | Return summary totals and category breakdown for the current user.                      |

Product fields are:

`name`, `sku`, `category`, `price`, `quantity`, `lowStockThreshold`, `supplier`, and `description`.

Categories are:

* `Electronics`
* `Accessories`
* `Office Supplies`
* `Furniture`
* `Other`

SKUs are unique within each user's inventory.

Stock-change requests use `productId`, `quantity`, and an optional `note`. For adjustments, `quantity` is the target stock level. A successful stock operation updates the product and records its previous and new quantities in an inventory transaction.

## 9. Testing

The application was tested across the main authentication, product, inventory, dashboard, and ownership flows.

### Automated Testing

The backend ownership integration test covers:

* Product creation and ownership
* Product listing and filtering
* Duplicate SKU validation
* Cross-user product access protection
* Product update and deletion
* Inventory stock-in and stock-out
* Insufficient stock handling
* Inventory transaction history
* Dashboard ownership scoping

Run the backend test with:

```bash
node --test server/tests/product-ownership.test.js
```

The current test suite passes all 9 tests.

### Additional Verification

The following were also verified during development:

* User registration and login
* HTTP-only authentication cookie
* Session restoration using `/auth/me`
* Logout and cookie clearing
* Product search and category/stock-status filters
* Product CRUD operations
* Stock adjustment
* Dashboard summary and category breakdown
* Frontend production build
* Frontend ESLint checks

## 10. Code0 / AI Usage

Code0, an AI development assistant, was used during the development of StockFlow for project analysis, implementation assistance, debugging and testing, and review. AI suggestions were treated as development assistance and were reviewed before being kept.

## 11. AI Development Experience

I used Code0 to help understand the existing project structure, implement parts of the backend and frontend, investigate issues, and review the application. I reviewed the generated changes, tested the application, identified issues during development, and made the decisions about requirements, behavior, and which changes to retain.

AI assistance helped speed up implementation and debugging, but I remained responsible for checking that the result matched the assignment and the intended application behavior.

## 12. AI-Assisted Tasks

1. **Project structure analysis and planning:** Reviewed the starter structure and identified how to extend the existing client and server without introducing unrelated architecture.

2. **MongoDB/Mongoose integration:** Set up environment loading and database connection before the Express server begins listening.

3. **Authentication implementation:** Added registration, login, logout, protected session restoration, password hashing, and HTTP-only cookie-based JWT authentication across the backend and frontend.

4. **Product and inventory backend implementation:** Implemented product APIs, filtering, stock operations, transaction history, validation, and per-user ownership isolation.

5. **Frontend implementation and integration:** Connected authentication, product, dashboard, and inventory pages to the backend APIs and added loading, empty, validation, and error states.
