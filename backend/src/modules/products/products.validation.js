const { z } = require("zod");

const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().positive("Price must be positive"),
  costPrice: z.coerce.number().nonnegative("Cost price must be non-negative").optional().default(0),
  stock: z.coerce.number().int().nonnegative("Stock must be non-negative"),
  categoryId: z.string(),
  supplierId: z.string().optional(),
  variants: z.string().or(z.array(z.any())).optional(),
  isActive: z.coerce.boolean().optional(),
  sku: z.string().min(3, "SKU must be at least 3 characters").max(20, "SKU cannot exceed 20 characters").optional().or(z.literal("")),
  existingImages: z.string().optional(),
  images: z.array(z.string()).optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").optional(),
  price: z.coerce.number().positive("Price must be positive").optional(),
  costPrice: z.coerce.number().nonnegative("Cost price must be non-negative").optional(),
  stock: z.coerce.number().int().nonnegative("Stock must be non-negative").optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  variants: z.string().or(z.array(z.any())).optional(),
  isActive: z.coerce.boolean().optional(),
  sku: z.string().min(3, "SKU must be at least 3 characters").max(20, "SKU cannot exceed 20 characters").optional().or(z.literal("")),
  existingImages: z.string().optional(),
  images: z.array(z.string()).optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema
};
