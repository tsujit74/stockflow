import { Navigate, Route, Routes } from "react-router-dom";
import AuthRoute from "./components/AuthRoute.jsx";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<AuthRoute />}>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={<PlaceholderPage title="Dashboard" />}
          />
          <Route
            path="/products"
            element={<PlaceholderPage title="Products" />}
          />
          <Route
            path="/products/new"
            element={<PlaceholderPage title="New product" />}
          />
          <Route
            path="/products/:id"
            element={<PlaceholderPage title="Product details" />}
          />
          <Route
            path="/products/:id/edit"
            element={<PlaceholderPage title="Edit product" />}
          />
          <Route
            path="/inventory"
            element={<PlaceholderPage title="Inventory" />}
          />
        </Route>
      </Route>

      <Route path="*" element={<PlaceholderPage title="Page not found" />} />
    </Routes>
  );
}

export default App;
