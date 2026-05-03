const jwt = require("jsonwebtoken");
const presenceService = require("../modules/chat/presence.service");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (decoded.id) {
      presenceService.updatePresence(decoded.id);
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const optionalAuthMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      if (decoded.id) {
        presenceService.updatePresence(decoded.id);
      }
    }
  } catch (error) {
    // If token is invalid, we just don't set req.user, but continue as guest
  }
  next();
};

module.exports = authMiddleware;
module.exports.optionalAuthMiddleware = optionalAuthMiddleware;
