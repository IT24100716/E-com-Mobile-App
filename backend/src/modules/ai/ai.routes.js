const express = require("express");
const aiController = require("./ai.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");

const router = express.Router();

// AI Routes - Require admin or product manager authentication
router.get(
    "/generate-category-description", // Changed for clarity
    authMiddleware,
    roleMiddleware("admin", "product manager"),
    aiController.generateCategoryDescription
);

router.get(
    "/generate-product-description",
    authMiddleware,
    roleMiddleware("admin", "product manager"),
    aiController.generateProductDescription
);

// Fallback for any stale frontend calls
router.get(
    "/generate-description",
    authMiddleware,
    roleMiddleware("admin", "product manager"),
    aiController.generateProductDescription
);

// Image Generation - proxied through backend to avoid browser CORS
router.get(
    "/generate-image",
    authMiddleware,
    roleMiddleware("admin", "product manager"),
    aiController.generateCategoryImage
);

module.exports = router;
