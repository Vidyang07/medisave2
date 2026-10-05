import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Helper to generate signed JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      address,
      role = "user",
      organizationName,
      organizationType,
      locality,
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: name, email, and password",
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "A user with this email address already exists",
      });
    }

    let assignedRole = "user";
    let assignedPartnerStatus = "none";
    let isVerifiedUser = false;

    if (role === "admin") {
      const expectedAdminKey = process.env.ADMIN_SECURITY_KEY || "MEDISAVE-ADMIN-2026";
      if (!req.body.adminSecretKey || req.body.adminSecretKey.trim() !== expectedAdminKey) {
        return res.status(403).json({
          success: false,
          message: "Invalid Administrator / Coordinator Security Key",
        });
      }
      assignedRole = "admin";
      isVerifiedUser = true;
    } else if (role === "partner") {
      if (!organizationName || !organizationName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Organization name is required for Partner / NGO registration",
        });
      }
      assignedRole = "partner";
      assignedPartnerStatus = "pending";
    } else {
      assignedRole = "user";
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone ? phone.trim() : "",
      address: address ? address.trim() : "",
      role: assignedRole,
      organizationName: organizationName ? organizationName.trim() : "",
      organizationType: organizationType || (assignedRole === "partner" ? "NGO" : ""),
      locality: locality ? locality.trim() : "Katraj",
      partnerStatus: assignedPartnerStatus,
      isVerified: isVerifiedUser,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message:
        assignedRole === "partner"
          ? "Partner account registered and submitted for verification"
          : "User registered successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          avatar: user.avatar,
          isVerified: user.isVerified,
          organizationName: user.organizationName,
          organizationType: user.organizationType,
          locality: user.locality,
          partnerStatus: user.partnerStatus,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

// In-memory rate limiting map for login attempts: max 5 failed attempts per 15-minute window
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const clientIp = req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "local";
    const normalizedEmail = email.toLowerCase().trim();
    const rateKey = `${clientIp}_${normalizedEmail}`;
    const now = Date.now();

    const attemptRecord = loginAttempts.get(rateKey);

    if (attemptRecord && attemptRecord.lockedUntil && now < attemptRecord.lockedUntil) {
      const remainingMinutes = Math.ceil((attemptRecord.lockedUntil - now) / (60 * 1000));
      return res.status(429).json({
        success: false,
        message: `Too many failed login attempts. Account temporarily locked. Please try again in ${remainingMinutes} minute(s).`,
      });
    }

    // Check for user
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const currentCount = (attemptRecord && now - attemptRecord.firstAttempt < LOCKOUT_WINDOW_MS) ? attemptRecord.count + 1 : 1;
      const firstAttempt = (attemptRecord && now - attemptRecord.firstAttempt < LOCKOUT_WINDOW_MS) ? attemptRecord.firstAttempt : now;
      const lockedUntil = currentCount >= MAX_LOGIN_ATTEMPTS ? now + LOCKOUT_WINDOW_MS : null;
      loginAttempts.set(rateKey, { count: currentCount, firstAttempt, lockedUntil });

      if (lockedUntil) {
        return res.status(429).json({
          success: false,
          message: "Too many failed login attempts. Account temporarily locked for 15 minutes.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const currentCount = (attemptRecord && now - attemptRecord.firstAttempt < LOCKOUT_WINDOW_MS) ? attemptRecord.count + 1 : 1;
      const firstAttempt = (attemptRecord && now - attemptRecord.firstAttempt < LOCKOUT_WINDOW_MS) ? attemptRecord.firstAttempt : now;
      const lockedUntil = currentCount >= MAX_LOGIN_ATTEMPTS ? now + LOCKOUT_WINDOW_MS : null;
      loginAttempts.set(rateKey, { count: currentCount, firstAttempt, lockedUntil });

      if (lockedUntil) {
        return res.status(429).json({
          success: false,
          message: "Too many failed login attempts. Account temporarily locked for 15 minutes.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Successful login: clear attempt record
    loginAttempts.delete(rateKey);

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          avatar: user.avatar,
          isVerified: user.isVerified,
          organizationName: user.organizationName,
          organizationType: user.organizationType,
          locality: user.locality,
          partnerStatus: user.partnerStatus,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// @desc    Get currently logged-in user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          avatar: user.avatar,
          isVerified: user.isVerified,
          organizationName: user.organizationName,
          organizationType: user.organizationType,
          locality: user.locality,
          partnerStatus: user.partnerStatus,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("GetMe Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error retrieving user profile",
      error: error.message,
    });
  }
};
