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
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
