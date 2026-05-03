const express = require("express");
const cartController = require("./cart.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const router = express.Router();
router.get("/", authMiddleware, cartController.getCart.bind(cartController));
router.post("/", authMiddleware, cartController.addItem.bind(cartController));
router.put("/:id", authMiddleware, cartController.updateItem.bind(cartController));
router.delete("/:id", authMiddleware, cartController.removeItem.bind(cartController));
module.exports = router;
