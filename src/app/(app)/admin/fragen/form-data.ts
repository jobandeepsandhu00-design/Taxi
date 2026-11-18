import { prisma } from "@/lib/db";

export async function loadQuestionFormData() {
  const [categories, sources] = await Promise.all([
    prisma.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, topics: { select: { id: true, name: true }, orderBy: { order: "asc" } } } }),
    prisma.questionSource.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true, verified: true } }),
  ]);
  return { categories, sources };
}
