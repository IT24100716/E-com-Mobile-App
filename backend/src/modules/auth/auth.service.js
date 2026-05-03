const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/prisma");
const { sendEmail } = require("../../config/mailer");

class AuthService {
  async register(data) {
    const { name, email, phone, password } = data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    // Find Customer role (case-insensitive)
    const customerRole = await prisma.role.findFirst({
      where: { name: { equals: "Customer", mode: "insensitive" } }
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with Customer role
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        roleId: customerRole?.id
      }
    });

    // Create cart for user
    await prisma.cart.create({
      data: {
        userId: user.id
      }
    });

    return { id: user.id, name: user.name, email: user.email, phone: user.phone };
  }

  async login(data) {
    const { email, password } = data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role?.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role?.name }
    };
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async forgotPassword(data) {
    const { email } = data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error("User not found");
    }

    // Generate 6-digit OTP
    const otp = this.generateOTP();

    // Save OTP to database with 15 minute expiry
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.oTP.create({
      data: {
        email,
        code: otp,
        purpose: "password_reset",
        expiresAt
      }
    });

    // Send email with OTP
    await sendEmail(
      email,
      "Password Reset OTP",
      `Your OTP for password reset is: ${otp}. This OTP will expire in 15 minutes.`,
      `<p>Your OTP for password reset is: <strong>${otp}</strong></p><p>This OTP will expire in 15 minutes.</p>`
    );

    return { message: "OTP sent to your email" };
  }

  async verifyOTP(data) {
    const { email, otp } = data;

    // Find the OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        code: otp,
        purpose: "password_reset"
      }
    });

    if (!otpRecord) {
      throw new Error("Invalid OTP");
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      throw new Error("OTP has expired");
    }

    return { message: "OTP verified successfully" };
  }

  async resetPassword(data) {
    const { email, otp, password } = data;

    // Verify OTP
    const validOTP = await prisma.oTP.findFirst({
      where: {
        email,
        code: otp,
        purpose: "password_reset",
        expiresAt: { gt: new Date() }
      }
    });

    if (!validOTP) {
      throw new Error("Invalid or expired OTP");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // Delete used OTP
    await prisma.oTP.delete({ where: { id: validOTP.id } });

    return { message: "Password reset successfully" };
  }

  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });
    
    if (!user) throw new Error("User not found");
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name
    };
  }
}

module.exports = new AuthService();
