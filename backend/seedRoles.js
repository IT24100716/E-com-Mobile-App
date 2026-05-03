const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding manager roles and test users...");

    const rolesToCreate = [
        { name: "Product Manager", email: "product@shop.com" },
        { name: "Order Manager", email: "order@shop.com" },
        { name: "Loyalty Manager", email: "loyalty@shop.com" },
        { name: "User Manager", email: "user@shop.com" },
        { name: "Review Manager", email: "review@shop.com" },
        { name: "Supplier Manager", email: "supplier@shop.com" },
    ];

    const hashedPassword = await bcrypt.hash("Password123!", 10);

    for (const r of rolesToCreate) {
        let role = await prisma.role.findFirst({ where: { name: r.name } });
        if (!role) {
            role = await prisma.role.create({ data: { name: r.name } });
            console.log(`✅ Role created: ${r.name}`);
        } else {
            console.log(`ℹ️  Role exists: ${r.name}`);
        }

        const user = await prisma.user.upsert({
            where: { email: r.email },
            update: {
                password: hashedPassword,
                roleId: role.id,
            },
            create: {
                name: r.name,
                email: r.email,
                password: hashedPassword,
                roleId: role.id,
            },
        });
        console.log(`👤 User ensured for ${r.name}: ${user.email}`);
    }

    let adminRole = await prisma.role.findFirst({ where: { name: "Admin" } });
    if (!adminRole) {
        adminRole = await prisma.role.create({ data: { name: "Admin" } });
        console.log("✅ Role created: Admin");
    }

    await prisma.user.upsert({
        where: { email: "admin@shop.com" },
        update: {
            password: hashedPassword,
            roleId: adminRole.id,
        },
        create: {
            name: "Super Admin",
            email: "admin@shop.com",
            password: hashedPassword,
            roleId: adminRole.id,
        },
    });
    console.log("👤 User ensured for Admin: admin@shop.com");

    console.log("✨ Seeding completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
