import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_MAX_AGE,
  getAuthCookieOptions,
  getJwtSecret,
} from "../config/auth.js";

const createToken = (userId, secret) =>
  jwt.sign({ sub: userId.toString() }, secret, { expiresIn: "7d" });

const setAuthCookie = (res, userId, secret) => {
  res.cookie(AUTH_COOKIE_NAME, createToken(userId, secret), {
    ...getAuthCookieOptions(),
    maxAge: AUTH_TOKEN_MAX_AGE,
  });
};

const isValidEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const register = async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 80 ||
    !isValidEmail(email) ||
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide a name, valid email, and password of 8 to 72 bytes.",
    });
  }

  try {
    const secret = getJwtSecret();
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    setAuthCookie(res, user._id, secret);
    return res.status(201).json({ success: true, user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with that email already exists.",
      });
    }

    console.error("Failed to register user:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to register user.",
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    !isValidEmail(email) ||
    typeof password !== "string" ||
    !password ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid email and password.",
    });
  }

  try {
    const secret = getJwtSecret();
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
      "+password"
    );
    const passwordMatches =
      user && (await user.comparePassword(password));

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    setAuthCookie(res, user._id, secret);
    return res.json({ success: true, user });
  } catch (error) {
    console.error("Failed to log in user:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to log in.",
    });
  }
};

export const logout = (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
  return res.json({ success: true, message: "Logged out successfully." });
};

export const getCurrentUser = (req, res) =>
  res.json({ success: true, user: req.user });
