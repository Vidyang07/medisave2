import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Not authorized, token missing",
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by ID without returning password
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User belonging to this token no longer exists",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error.message);
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid or expired token",
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no Bearer token provided",
    });
  }
};

// Middleware to enforce Partner access (or Admin override)
export const verifiedPartnerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, authentication required",
    });
  }

  // Admins always have access
  if (req.user.role === "admin") {
    return next();
  }

  // Check if user is a partner
  if (req.user.role !== "partner") {
    return res.status(403).json({
      success: false,
      message: "Access forbidden: Partner credentials required",
    });
  }

  // Check if partner was rejected
  if (req.user.partnerStatus === "rejected") {
    return res.status(403).json({
      success: false,
      message: "Partner access rejected by administrator",
    });
  }

  next();
};

export const partnerOrAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authorized",
    });
  }

  if (req.user.role === "admin" || (req.user.role === "partner" && req.user.partnerStatus !== "rejected")) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access forbidden: Partner or Admin required",
  });
};
