"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return session;
}

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "staff"]),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "staff"]).optional(),
});

export async function createUser(data: z.infer<typeof CreateUserSchema>) {
  await requireAdmin();
  const parsed = CreateUserSchema.parse(data);
  const hashed = await bcrypt.hash(parsed.password, 10);
  await prisma.user.create({
    data: { name: parsed.name, email: parsed.email, password: hashed, role: parsed.role },
  });
  revalidatePath("/admin");
}

export async function updateUser(id: string, data: z.infer<typeof UpdateUserSchema>) {
  await requireAdmin();
  const parsed = UpdateUserSchema.parse(data);
  await prisma.user.update({ where: { id }, data: parsed });
  revalidatePath("/admin");
}

export async function deleteUser(id: string) {
  const session = await requireAdmin();
  if (session.user?.id === id) throw new Error("Cannot delete your own account.");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin");
}

export async function adminResetPassword(userId: string, newPassword: string) {
  await requireAdmin();
  if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const session = await requireAuth();
  if (newPassword.length < 6) throw new Error("New password must be at least 6 characters.");

  const user = await prisma.user.findUnique({ where: { id: session.user!.id } });
  if (!user) throw new Error("User not found.");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new Error("Current password is incorrect.");

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
}
