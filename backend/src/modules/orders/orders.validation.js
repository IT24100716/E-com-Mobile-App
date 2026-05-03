const { z } = require("zod");

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    variantAttributes: z.any().optional(),
  })).min(1, "Order must have at least one item"),
  total: z.coerce.number().positive("Total must be positive"),
  address: z.string().min(1, "Address is required"),
  contactNumber: z.string().min(7, "Contact number is required"),
  contactEmail: z.string().email("Valid contact email is required"),
  deliveryMethod: z.enum(["standard_delivery", "express_delivery", "pickup"], {
    errorMap: () => ({ message: "deliveryMethod must be standard_delivery, express_delivery, or pickup" }),
  }),
  shippingFee: z.coerce.number().min(0).optional(),
});

const updateOrderSchema = z.object({
  address: z.string().min(1, "Address is required").optional(),
  contactNumber: z.string().min(7, "Contact number is required").optional(),
  contactEmail: z.string().email("Valid contact email is required").optional(),
  deliveryMethod: z.enum(["standard_delivery", "express_delivery", "pickup"], {
    errorMap: () => ({ message: "deliveryMethod must be standard_delivery, express_delivery, or pickup" }),
  }).optional(),
}).refine(
  (data) => Object.values(data).some((val) => val !== undefined),
  "At least one field must be provided for update"
);

module.exports = { createOrderSchema, updateOrderSchema };
