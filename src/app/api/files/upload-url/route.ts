import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

import { s3, S3_BUCKET } from "@/lib/s3";

// Returns a presigned PUT URL the client uses to upload directly to S3.
// After the upload completes, the client calls POST /api/files to save
// the File record in the database with the resulting s3Key.
export async function POST(req: NextRequest) {
  const { filename, mimeType, size, folderId, workspaceId, projectId } =
    await req.json();

  if (!filename || !mimeType || !size) {
    return NextResponse.json(
      { error: "filename, mimeType, and size are required" },
      { status: 400 }
    );
  }

  // Scope the key by workspace/project so objects are logically grouped
  const prefix = projectId
    ? `projects/${projectId}`
    : workspaceId
      ? `workspaces/${workspaceId}`
      : "misc";

  const s3Key = `${prefix}/${randomUUID()}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    ContentType: mimeType,
    ContentLength: size,
    // Folder/workspace metadata stored as object tags for reference
    Tagging: [
      folderId ? `folderId=${folderId}` : null,
      workspaceId ? `workspaceId=${workspaceId}` : null,
      projectId ? `projectId=${projectId}` : null,
    ]
      .filter(Boolean)
      .join("&"),
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

  return NextResponse.json({ uploadUrl, s3Key });
}
