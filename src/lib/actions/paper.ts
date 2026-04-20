"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

type AmountRow = { schoolId: number; paperId: number; paperSizeId: number | null; totalQty: number };

export async function saveProductionRun(formData: FormData) {
  const paperGroupId = formData.get("paperGroupId") ? Number(formData.get("paperGroupId")) : null;
  const startDate = new Date(String(formData.get("startDate")) + "T00:00:00");
  const endDate = new Date(String(formData.get("endDate")) + "T00:00:00");
  const amounts: AmountRow[] = JSON.parse(String(formData.get("amounts")));

  const run = await prisma.paperProductionRun.create({
    data: {
      paperGroupId,
      startDate,
      endDate,
      amounts: {
        create: amounts.map((a) => ({
          schoolId: a.schoolId,
          paperId: a.paperId,
          paperSizeId: a.paperSizeId,
          totalQty: a.totalQty,
        })),
      },
    },
  });

  revalidatePath("/paper-goods");
  redirect(`/paper-goods/runs/${run.id}`);
}

// ─── Paper Items ──────────────────────────────────────────────────────────────

export async function createPaperItem(name: string) {
  const agg = await prisma.paperItem.aggregate({ _max: { id: true } });
  const nextId = (agg._max.id ?? 0) + 1;
  await prisma.paperItem.create({ data: { id: nextId, name: name.trim() } });
  revalidatePath("/admin");
}

export async function updatePaperItem(id: number, name: string, active: boolean) {
  await prisma.paperItem.update({ where: { id }, data: { name: name.trim(), active } });
  revalidatePath("/admin");
}

// ─── Paper Groups ─────────────────────────────────────────────────────────────

export async function createPaperGroup(name: string) {
  const agg = await prisma.paperGroup.aggregate({ _max: { id: true } });
  const nextId = (agg._max.id ?? 0) + 1;
  await prisma.paperGroup.create({ data: { id: nextId, name: name.trim() } });
  revalidatePath("/admin");
}

export async function updatePaperGroup(id: number, name: string) {
  await prisma.paperGroup.update({ where: { id }, data: { name: name.trim() } });
  revalidatePath("/admin");
}

export async function deletePaperGroup(id: number) {
  await prisma.schoolPaperGroup.deleteMany({ where: { paperGroupId: id } });
  await prisma.paperGroup.delete({ where: { id } });
  revalidatePath("/admin");
}

export async function addSchoolToPaperGroup(schoolId: number, paperGroupId: number) {
  const agg = await prisma.schoolPaperGroup.aggregate({ _max: { id: true } });
  const nextId = (agg._max.id ?? 0) + 1;
  const exists = await prisma.schoolPaperGroup.findFirst({ where: { schoolId, paperGroupId } });
  if (!exists) {
    await prisma.schoolPaperGroup.create({ data: { id: nextId, schoolId, paperGroupId } });
  }
  revalidatePath("/admin");
}

export async function removeSchoolFromPaperGroup(schoolId: number, paperGroupId: number) {
  await prisma.schoolPaperGroup.deleteMany({ where: { schoolId, paperGroupId } });
  revalidatePath("/admin");
}

// ─── School Paper Comments ────────────────────────────────────────────────────

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
