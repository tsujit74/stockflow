import { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext.jsx";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { login, register } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const validate = () => {
    if (isRegister && !form.name.trim()) return "Enter your name.";
    if (!emailPattern.test(form.email.trim())) return "Enter a valid email address.";
    if (!form.password) return "Enter your password.";
    if (isRegister && form.password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (isRegister && new TextEncoder().encode(form.password).length > 72) {
      return "Password must be no more than 72 bytes.";
    }
    if (isRegister && form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
      } else {
        await login({ email: form.email.trim(), password: form.password });
      }

      const destination = location.state?.from;
      navigate(
        destination
          ? `${destination.pathname}${destination.search ?? ""}${destination.hash ?? ""}`
          : "/dashboard",
        { replace: true }
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to authenticate. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-main">
      <section aria-labelledby="auth-title" className="auth-card">
        <p className="eyebrow">StockFlow</p>
        <h1 id="auth-title">{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-description">
          {isRegister
            ? "Register to get started with StockFlow."
            : "Sign in to continue to StockFlow."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <label className="form-field">
              <span>Name</span>
              <input
                autoComplete="name"
                name="name"
                onChange={updateField}
                required
                value={form.name}
              />
            </label>
          )}
          <label className="form-field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={updateField}
              required
              type="email"
              value={form.email}
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              autoComplete={isRegister ? "new-password" : "current-password"}
              name="password"
              onChange={updateField}
              required
              type="password"
              value={form.password}
            />
          </label>
          {isRegister && (
            <label className="form-field">
              <span>Confirm password</span>
              <input
                autoComplete="new-password"
                name="confirmPassword"
                onChange={updateField}
                required
                type="password"
                value={form.confirmPassword}
              />
            </label>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to StockFlow?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}

export default AuthPage;
