const { PrismaClient } = require("./prisma/generated/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

async function testPasswordUpdate() {
  try {
    const email = "user@test.com"; // Real email from DB
    const newPassword = "newpassword123";
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log("USER NOT FOUND");
      return;
    }

    console.log("UPDATING PASSWORD FOR:", user.name);
    const oldHash = user.password;
    
    // Simulate what StaffService.update does
    const dataFromApp = {
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      password: newPassword
    };

    const updateData = {};
    if (dataFromApp.name) updateData.name = dataFromApp.name;
    if (dataFromApp.email) updateData.email = dataFromApp.email;
    if (dataFromApp.roleId) updateData.roleId = typeof dataFromApp.roleId === 'object' ? dataFromApp.roleId.id : dataFromApp.roleId;

    if (dataFromApp.password && dataFromApp.password.trim() !== '') {
      updateData.password = await bcrypt.hash(dataFromApp.password, 10);
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    console.log("OLD HASH:", oldHash);
    console.log("NEW HASH:", updatedUser.password);
    console.log("HASHES ARE DIFFERENT:", oldHash !== updatedUser.password);
    
    const match = await bcrypt.compare(newPassword, updatedUser.password);
    console.log("NEW PASSWORD WORKS:", match);
    
  } catch (error) {
    console.error("TEST ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testPasswordUpdate();
