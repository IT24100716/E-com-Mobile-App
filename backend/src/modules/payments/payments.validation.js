const { z } = require("zod");

const createPaymentSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["cash_on_delivery", "card", "bank_deposit"], {
    errorMap: () => ({ message: "method must be cash_on_delivery, card, or bank_deposit" }),
  }),
  status: z.string().optional().default("pending"),
});

module.exports = { createPaymentSchema };
