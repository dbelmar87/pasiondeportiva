"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";


function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function publishArticle(id: string, updatedTitle: string) {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin
    .from("articles")
    .update({
      title: updatedTitle,
      status: "published",
    })
    .eq("id", id);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function rejectArticle(id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin
    .from("articles")
    .update({ status: "rejected" })
    .eq("id", id);

  revalidatePath("/admin");
}

export async function createManualArticle(formData: FormData) {
  const supabaseAdmin = getSupabaseAdmin();
  const title = formData.get("title") as string;
  const sport = formData.get("sport") as string;
  const section = formData.get("section") as string;
  const content = formData.get("content") as string;

  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const coverImage = `/api/og?title=${encodeURIComponent(title)}&sport=${encodeURIComponent(sport)}&tag=${encodeURIComponent(section)}`;

  await supabaseAdmin.from("articles").insert({
    title,
    slug: `${slug}-${Date.now().toString().slice(-4)}`,
    content,
    sport,
    section,
    cover_image: coverImage,
    status: "published",
    featured: true,
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteReportedComment(commentId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await supabaseAdmin.from("article_comments").delete().eq("id", commentId);
  revalidatePath("/admin");
}

export async function dismissCommentReport(reportId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await supabaseAdmin
    .from("comment_reports")
    .update({ status: "dismissed" })
    .eq("id", reportId);
  revalidatePath("/admin");
}

