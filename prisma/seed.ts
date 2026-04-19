import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@ccfp.local" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@ccfp.local",
      password,
      role: "admin",
    },
  });

  console.log(`✓ Admin user ready: ${user.email} / admin123`);

  const milkTypes = [
    { id: 1,  name: "1%",           labelColor: "Light Blue" },
    { id: 2,  name: "Whole",        labelColor: "Red" },
    { id: 13, name: "2%",           labelColor: "Blue" },
    { id: 14, name: "Chocolate",    labelColor: "Cho." },
    { id: 16, name: "Strawberry",   labelColor: "Strawb." },
    { id: 18, name: "Lactose Free", labelColor: "Soy" },
  ];

  for (const mt of milkTypes) {
    await prisma.milkType.upsert({
      where: { id: mt.id },
      update: { name: mt.name, labelColor: mt.labelColor },
      create: mt,
    });
  }
  console.log(`✓ MilkType seed: ${milkTypes.length} types`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
