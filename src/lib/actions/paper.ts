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
