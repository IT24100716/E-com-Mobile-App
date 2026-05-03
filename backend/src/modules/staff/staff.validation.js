const { z } = require("zod");

const createStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  roleId: z.string().min(1, "Role is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  phone: z.string().optional(),
});

const updateStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  roleId: z.string().min(1, "Role is required").optional(),
  phone: z.string().optional(),
});

module.exports = {
  createStaffSchema,
  updateStaffSchema,
};
