import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3, S3_BUCKET } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

// Returns a short-lived presigned GET URL for a file.
// Enforces visibility: client portal requests can only access files
// belonging to their workspace.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const file = await prisma.file.findUnique({
    where: { id },
    select: {
      id: true,
      s3Key: true,
      filename: true,
      mimeType: true,
      workspaceId: true,
      projectId: true,
    },
  });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Visibility check: if the request carries a client workspace slug header
  // (set by the client portal layout), verify the file belongs to that workspace.
  const clientWorkspaceId = req.headers.get("x-client-workspace-id");
  if (clientWorkspaceId) {
    const belongsToWorkspace =
      file.workspaceId === clientWorkspaceId ||
      (file.projectId &&
        (await prisma.project.findFirst({
          where: { id: file.projectId, workspaceId: clientWorkspaceId },
          select: { id: true },
        })));

    if (!belongsToWorkspace) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: file.s3Key,
    ResponseContentDisposition: `inline; filename="${file.filename}"`,
    ResponseContentType: file.mimeType,
  });

  const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hr

  return NextResponse.json({ downloadUrl });
}
