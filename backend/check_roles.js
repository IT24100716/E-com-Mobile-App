const { PrismaClient } = require("./prisma/generated/client");
const prisma = new PrismaClient();

async function checkRoles() {
  try {
    const roles = await prisma.role.findMany({ where: { isDeleted: false } });
    console.log("ROLES IN DB:", JSON.stringify(roles, null, 2));
  } catch (error) {
    console.error("DB ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoles();
