const { z } = require("zod");

const createSupplierSchema = z.object({
  supplierId: z.string().optional(),
  name: z.string().min(2, "Supplier name must be at least 2 characters"),
  type: z.string().optional(),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(7, "Phone must be at least 7 characters"),
  address: z.string().optional(),
  productTypes: z.string().optional(),
  description: z.string().optional(),
  paymentInfo: z.string().optional(),
});

const updateSupplierSchema = z.object({
  supplierId: z.string().optional(),
  name: z.string().min(2, "Supplier name must be at least 2 characters").optional(),
  type: z.string().optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().min(7, "Phone must be at least 7 characters").optional(),
  address: z.string().optional(),
  productTypes: z.string().optional(),
  description: z.string().optional(),
  paymentInfo: z.string().optional(),
});

module.exports = {
  createSupplierSchema,
  updateSupplierSchema,
};
