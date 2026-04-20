"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function saveSchoolPaperComment(schoolId: number, comment: string) {
  const trimmed = comment.trim();
  if (!trimmed) {
    await prisma.schoolPaperComment.deleteMany({ where: { schoolId } });
  } else {
    await prisma.schoolPaperComment.upsert({
      where: { schoolId },
      create: { schoolId, comment: trimmed },
      update: { comment: trimmed },
    });
  }
  revalidatePath(`/schools/${schoolId}`);
}
