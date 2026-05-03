import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // 1. Create Roles
  console.log("📋 Creating roles...");
  const roles = [
    "Admin",
    "Product Manager",
    "Supplier Manager",
    "Order Manager",
    "Review Manager",
    "Loyalty Manager",
    "User Manager",
    "Staff",
    "Customer"
  ];

  const roleMap = {};
  for (const roleName of roles) {
    const role = await prisma.role.findFirst({ where: { name: roleName } })
      ?? await prisma.role.create({ data: { name: roleName } });
    roleMap[roleName] = role.id;
    console.log(`✅ ${roleName} role created/found:`, role.id);
  }

  // 2. Create Admin and Manager Users
  console.log("👤 Creating admin and manager users...");
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const users = [
    { name: "System Admin", email: "admin@store.com", role: "Admin" },
    { name: "Product Manager", email: "product@shop.com", role: "Product Manager" },
    { name: "Supplier Manager", email: "supplier@shop.com", role: "Supplier Manager" },
    { name: "Order Manager", email: "order@shop.com", role: "Order Manager" },
    { name: "Review Manager", email: "review@shop.com", role: "Review Manager" },
    { name: "Loyalty Manager", email: "loyalty@shop.com", role: "Loyalty Manager" },
    { name: "User Manager", email: "user@shop.com", role: "User Manager" },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        password: hashedPassword,
        roleId: roleMap[userData.role],
      },
      create: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        roleId: roleMap[userData.role],
      },
    });
    console.log(`✅ ${userData.role} user created/updated:`, user.id);
  }

  // 3. Create Sample Categories
  console.log("🏷️  Creating sample categories...");
  const electronics = await prisma.category.findFirst({ where: { name: "Electronics" } })
    ?? await prisma.category.create({ data: { name: "Electronics" } });
  console.log("✅ Electronics category created:", electronics.id);

  const clothing = await prisma.category.findFirst({ where: { name: "Clothing" } })
    ?? await prisma.category.create({ data: { name: "Clothing" } });
  console.log("✅ Clothing category created:", clothing.id);

  const books = await prisma.category.findFirst({ where: { name: "Books" } })
    ?? await prisma.category.create({ data: { name: "Books" } });
  console.log("✅ Books category created:", books.id);

  // 4. Create Sample Suppliers
  console.log("🏭 Creating sample suppliers...");
  const supplier1 = await prisma.supplier.findFirst({ where: { email: "supplier1@company.com" } })
    ?? await prisma.supplier.create({
      data: {
        name: "Tech Supplies Inc",
        email: "supplier1@company.com",
        phone: "+1-555-0101",
      },
    });
  console.log("✅ Supplier 1 created:", supplier1.id);

  const supplier2 = await prisma.supplier.findFirst({ where: { email: "supplier2@company.com" } })
    ?? await prisma.supplier.create({
      data: {
        name: "Fashion Wholesale Ltd",
        email: "supplier2@company.com",
        phone: "+1-555-0102",
      },
    });
  console.log("✅ Supplier 2 created:", supplier2.id);

  // 5. Create Sample Products
  console.log("📦 Creating sample products...");
  const product1 = await prisma.product.findFirst({ where: { name: "Wireless Headphones" } })
    ?? await prisma.product.create({
      data: {
        name: "Wireless Headphones",
        description: "High-quality wireless headphones with noise cancellation",
        price: 79.99,
        stock: 50,
        categoryId: electronics.id,
        supplierId: supplier1.id,
        imageUrl: null,
      },
    });
  console.log("✅ Product 1 created:", product1.id);

  const product2 = await prisma.product.findFirst({ where: { name: "Cotton T-Shirt" } })
    ?? await prisma.product.create({
      data: {
        name: "Cotton T-Shirt",
        description: "100% organic cotton comfortable t-shirt",
        price: 24.99,
        stock: 100,
        categoryId: clothing.id,
        supplierId: supplier2.id,
        imageUrl: null,
      },
    });
  console.log("✅ Product 2 created:", product2.id);

  const product3 = await prisma.product.findFirst({ where: { name: "JavaScript Guide" } })
    ?? await prisma.product.create({
      data: {
        name: "JavaScript Guide",
        description: "Comprehensive guide to modern JavaScript",
        price: 34.99,
        stock: 30,
        categoryId: books.id,
        supplierId: supplier1.id,
        imageUrl: null,
      },
    });
  console.log("✅ Product 3 created:", product3.id);

  // 6. Create Sample Coupons
  console.log("🎟️  Creating sample coupons...");
  const coupon1 = await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      discount: 10,
      minCartValue: 50,
      firstOrder: true,
    },
  });
  console.log("✅ Coupon 1 created:", coupon1.id);

  const coupon2 = await prisma.coupon.upsert({
    where: { code: "SUMMER20" },
    update: {},
    create: {
      code: "SUMMER20",
      discount: 20,
      minCartValue: 100,
      firstOrder: false,
    },
  });
  console.log("✅ Coupon 2 created:", coupon2.id);

  console.log("\n✨ Database seeding completed successfully!");
  console.log("\n📝 Login credentials:");
  console.log("   Email: admin@store.com");
  console.log("   Password: admin123");
  console.log("\n🎯 Test with:");
  console.log("   curl -X POST http://localhost:5001/api/v1/auth/login \\");
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"email":"admin@store.com","password":"admin123"}\'');
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
