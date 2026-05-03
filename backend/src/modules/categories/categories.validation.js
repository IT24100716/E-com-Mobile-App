const { z } = require("zod");

const createCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional(),
  variantConfig: z.string().optional(), // Expected as JSON string from multipart/form-data
  isActive: z.union([z.boolean(), z.string()]).optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").optional(),
  description: z.string().optional(),
  variantConfig: z.string().optional(),
  isActive: z.union([z.boolean(), z.string()]).optional(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema
};
