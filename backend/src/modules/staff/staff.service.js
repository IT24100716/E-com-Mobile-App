const prisma = require("../../config/prisma");
const bcrypt = require("bcrypt");
const { sendEmail } = require("../../config/mailer");

class StaffService {
  generatePassword() {
    return Math.random().toString(36).slice(-10);
  }

  async create(data, roleId) {
    const password = data.password || this.generatePassword();
    let user;

    try {
      // Create user in database
      user = await prisma.user.create({
        data: { ...data, roleId, password: await bcrypt.hash(password, 10) },
        include: { role: true }
      });

      try {
        // Send email with password
        await sendEmail(
          user.email,
          "Welcome to Admin Panel - Your Login Credentials",
          `Hello ${user.name},\n\nYour account has been created successfully.\n\nEmail: ${user.email}\nPassword: ${password}\n\nPlease log in and change your password immediately.\n\nLogin URL: ${process.env.FRONTEND_URL}/login`,
          `<h2>Welcome to Admin Panel</h2><p>Hello ${user.name},</p><p>Your account has been created successfully.</p><p><strong>Email:</strong> ${user.email}</p><p><strong>Password:</strong> ${password}</p><p>Please <a href="${process.env.FRONTEND_URL}/login">log in</a> and change your password immediately.</p>`
        );
        return user;
      } catch (emailError) {
        // Email sending failed - rollback user creation
        console.error("Email sending failed. Rolling back staff creation:", emailError);
        await prisma.user.delete({ where: { id: user.id } });
        throw new Error(`Failed to send welcome email. Staff creation rolled back. Error: ${emailError.message}`);
      }
    } catch (error) {
      // Re-throw the error with context
      throw error;
    }
  }
  async getAll(skip = 0, take = 10) { return prisma.user.findMany({ where: { role: { name: { notIn: ["Customer"] } }, isDeleted: false }, include: { role: true }, skip, take }); }
  async getById(id) { return prisma.user.findUnique({ where: { id }, include: { role: true } }); }
  async update(id, data) { return prisma.user.update({ where: { id }, data, include: { role: true } }); }
  async delete(id) { return prisma.user.update({ where: { id }, data: { isDeleted: true } }); }
  async getTotalCount() { return prisma.user.count({ where: { role: { name: { notIn: ["Customer"] } }, isDeleted: false } }); }
}
module.exports = new StaffService();
