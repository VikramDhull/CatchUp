import jwt from "jsonwebtoken";
import User from "../models/User.js";

// middleware to protect routes
// export const protectRoute = async (req, res, next) => {
//   try {
//     const token = req.headers.token;
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const user = await User.findById(decoded.userId).select("-password");

//     if (!user) {
//       return res.json({ success: false, message: "User not found" });
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     console.log(error.message);
//     res.json({ success: false, message: error.message });
//   }
// };

export const protectRoute = async (req, res, next) => {
  try {
    // Read Authorization header
    const authHeader = req.headers.authorization;

    // Check it exists and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "jwt must be provided" });
    }

    // Extract token string after "Bearer "
    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user from decoded token payload
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Attach user to request and continue
    req.user = user;
    next();
  } catch (error) {
    console.log(error.message);
    return res.status(401).json({ success: false, message: error.message });
  }
};
