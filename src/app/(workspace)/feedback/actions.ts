"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { feedbackSubmissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  FEEDBACK_FIELD_LIMITS,
  fieldLimitError,
} from "@/lib/field-limits";
import {
  canSubmitProductFeedback,
  canViewFeedbackInbox,
} from "@/lib/permissions";
import { getFeedbackImage } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_BYTES = 900_000;

export type SubmitFeedbackResult = {
  error?: string;
  success?: boolean;
  submittedAt?: number;
};

export type UpdateFeedbackStatusResult = {
  error?: string;
  success?: boolean;
};

function readText(formData: FormData, key: string, max: number): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function submitProductFeedback(
  _prev: SubmitFeedbackResult,
  formData: FormData,
): Promise<SubmitFeedbackResult> {
  const user = await getCurrentUser();
  if (!user || !canSubmitProductFeedback(user)) {
    return { error: "You must be logged in to send feedback." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const pagePath = readText(formData, "pagePath", 500) || "/";
  const pageUrl = readText(formData, "pageUrl", 1000) || null;
  const userAgent = readText(formData, "userAgent", 500) || null;
  const viewport = readText(formData, "viewport", 40) || null;

  const titleError = fieldLimitError(
    "Title",
    title,
    FEEDBACK_FIELD_LIMITS.title,
  );
  if (titleError) return { error: titleError };

  const descriptionError = fieldLimitError(
    "Description",
    description,
    FEEDBACK_FIELD_LIMITS.description,
  );
  if (descriptionError) return { error: descriptionError };

  const image = formData.get("image");
  let imageFileName: string | null = null;
  let imageMimeType: string | null = null;
  let imageData: string | null = null;

  if (image instanceof File && image.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return { error: "Screenshots must be PNG, JPEG, WebP, or GIF." };
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return {
        error: "Screenshot is too large. Try a cropped image under 1 MB.",
      };
    }
    imageFileName = image.name.slice(0, 255);
    imageMimeType = image.type;
    imageData = await fileToDataUrl(image);
  }

  await db.insert(feedbackSubmissions).values({
    title,
    description,
    submitterId: user.id,
    pagePath,
    pageUrl,
    userAgent,
    viewport,
    imageFileName,
    imageMimeType,
    imageData,
    status: "open",
  });

  revalidatePath("/feedback");
  return { success: true, submittedAt: Date.now() };
}

export async function updateFeedbackStatus(
  id: number,
  status: "open" | "resolved",
): Promise<UpdateFeedbackStatusResult> {
  const user = await getCurrentUser();
  if (!user || !canViewFeedbackInbox(user)) {
    return { error: "You do not have access to the feedback inbox." };
  }

  const [updated] = await db
    .update(feedbackSubmissions)
    .set({ status })
    .where(eq(feedbackSubmissions.id, id))
    .returning({ id: feedbackSubmissions.id });

  if (!updated) {
    return { error: "Feedback item was not found." };
  }

  revalidatePath("/feedback");
  return { success: true };
}

export async function loadFeedbackImage(id: number): Promise<{
  imageData?: string;
  imageFileName?: string | null;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user || !canViewFeedbackInbox(user)) {
    return { error: "You do not have access to the feedback inbox." };
  }

  const image = await getFeedbackImage(id);
  if (!image) return { error: "No screenshot on this item." };
  return image;
}
