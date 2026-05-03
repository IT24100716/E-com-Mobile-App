const express = require("express");
const categoriesController = require("./categories.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validateRequest = require("../../middleware/validate.middleware");
const multer = require("../../config/multerMemory");
const { createCategorySchema, updateCategorySchema } = require("./categories.validation");

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("admin", "product manager"), multer.single("image"), validateRequest(createCategorySchema), categoriesController.create.bind(categoriesController));
router.get("/", categoriesController.getAll.bind(categoriesController));
router.get("/:id", categoriesController.getById.bind(categoriesController));
router.put("/:id", authMiddleware, roleMiddleware("admin", "product manager"), multer.single("image"), validateRequest(updateCategorySchema), categoriesController.update.bind(categoriesController));
router.delete("/:id", authMiddleware, roleMiddleware("admin", "product manager"), categoriesController.delete.bind(categoriesController));

module.exports = router;
