import { useContext, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext.jsx";

const navigation = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Products", to: "/products" },
  { label: "Inventory", to: "/inventory" },
];

function AppLayout() {
  const { user, logout } = useContext(AuthContext);
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setLogoutError("");
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(error.message || "Unable to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="brand" to="/dashboard">
          StockFlow
        </NavLink>
        <nav aria-label="Main navigation" className="main-navigation">
          {navigation.map(({ label, to }) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? "navigation-link active" : "navigation-link"
              }
              key={to}
              to={to}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="account-actions">
          {user?.name && <span className="account-name">{user.name}</span>}
          <button
            className="secondary-button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>
      {logoutError && (
        <p className="logout-error" role="alert">
          {logoutError}
        </p>
      )}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
