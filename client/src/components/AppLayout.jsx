import { NavLink, Outlet } from "react-router-dom";

const navigation = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Products", to: "/products" },
  { label: "Inventory", to: "/inventory" },
];

function AppLayout() {
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
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
