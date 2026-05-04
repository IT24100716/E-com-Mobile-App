const prisma = require("../../config/prisma");
const bcrypt = require("bcrypt");
const { sendEmail } = require("../../config/mailer");

class StaffService {
  generatePassword() {
    return Math.random().toString(36).slice(-10);
  }

  async create(data, roleId) {
    const password = data.password || this.generatePassword();
    console.log(`[StaffService] Creating staff member: ${data.email} with role ${roleId}`);

    try {
      // 1. Create the user
      // We strip roleId from data to avoid potential duplicates if it's already there
      const { roleId: _, ...userData } = data;
      
      const user = await prisma.user.create({
        data: { 
          ...userData, 
          roleId, 
          password: await bcrypt.hash(password, 10) 
        },
        include: { role: true }
      });

      console.log(`[StaffService] ✅ User created successfully: ${user.id}`);

      // 2. Trigger welcome email in the background
      const loginUrl = `${process.env.FRONTEND_URL || 'https://rich-apparel.vercel.app'}/login`;
      
      console.log(`[StaffService] Attempting to send welcome email to ${user.email}`);
      
      sendEmail(
        user.email,
        "Welcome to Admin Panel - Your Login Credentials",
        `Hello ${user.name},\n\nYour account has been created successfully.\n\nEmail: ${user.email}\nPassword: ${password}\n\nPlease log in and change your password immediately.\n\nLogin URL: ${loginUrl}`,
        `<h2>Welcome to Admin Panel</h2><p>Hello ${user.name},</p><p>Your account has been created successfully.</p><p><strong>Email:</strong> ${user.email}</p><p><strong>Password:</strong> ${password}</p><p>Please <a href="${loginUrl}">log in</a> and change your password immediately.</p>`
      ).then(() => {
        console.log(`[StaffService] ✅ Welcome email sent to ${user.email}`);
      }).catch(emailError => {
        console.error(`[StaffService] ❌ Failed to send welcome email to ${user.email}:`, emailError.message);
      });

      return user;
    } catch (error) {
      console.error("[StaffService] ❌ Staff creation failed:", error.message);
      throw error;
    }
  }
  async getAll(skip = 0, take = 10) { return prisma.user.findMany({ where: { role: { name: { notIn: ["Customer"] } }, isDeleted: false }, include: { role: true }, skip, take }); }
  async getById(id) { return prisma.user.findUnique({ where: { id }, include: { role: true } }); }
  async update(id, data) {
    const updateData = {};
    
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.roleId) updateData.roleId = typeof data.roleId === 'object' ? data.roleId.id : data.roleId;
    if (data.phone) updateData.phone = data.phone;

    return prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true }
    });
  }
  async delete(id) { return prisma.user.update({ where: { id }, data: { isDeleted: true } }); }
  async getTotalCount() { return prisma.user.count({ where: { role: { name: { notIn: ["Customer"] } }, isDeleted: false } }); }
}
module.exports = new StaffService();
