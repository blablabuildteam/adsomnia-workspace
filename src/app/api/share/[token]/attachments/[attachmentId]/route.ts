import { NextResponse } from "next/server";
import { verifyShareToken } from "@/lib/share";
import { getWorkstreamAttachmentFile } from "@/lib/workstream-attachments";

type Props = {
  params: Promise<{ token: string; attachmentId: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const { token, attachmentId } = await params;
  const initiativeId = verifyShareToken(token);
  const fileId = Number.parseInt(attachmentId, 10);
  if (initiativeId == null || !Number.isFinite(fileId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = await getWorkstreamAttachmentFile(initiativeId, fileId);
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
