export const AUTH_COOKIE_NAME = "token";
export const AUTH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
};

export const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});
