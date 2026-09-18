import { NextResponse } from "next/server";
import { getInitiativeById } from "@/lib/queries";
import { canViewInitiative } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { getWorkstreamAttachmentFile } from "@/lib/workstream-attachments";

type Props = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const { id, attachmentId } = await params;
  const initiativeId = Number.parseInt(id, 10);
  const fileId = Number.parseInt(attachmentId, 10);
  if (!Number.isFinite(initiativeId) || !Number.isFinite(fileId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const initiative = await getInitiativeById(initiativeId);
  if (
    !user ||
    !initiative ||
    !canViewInitiative(user, { submitterId: initiative.submitter.id })
  ) {
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
