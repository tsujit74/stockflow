import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AUTH_COOKIE_NAME, getJwtSecret } from "../config/auth.js";

const authenticate = async (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
    }
    return next(error);
  }

  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  req.user = user;
  return next();
};

export default authenticate;
