const MAX_EDGE = 1400;
const QUALITY = 0.72;
const MAX_BYTES = 700_000;

export async function compressFeedbackImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please attach an image file.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process the image.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Could not compress the image.")),
      "image/jpeg",
      QUALITY,
    );
  });

  if (blob.size > MAX_BYTES) {
    throw new Error(
      "Screenshot is still too large after compression. Try a cropped image.",
    );
  }

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
