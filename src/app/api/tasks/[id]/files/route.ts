import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { filename, s3Key, size, mimeType, uploaderId, workspaceId } = await req.json();

    if (!filename || !s3Key || !size || !mimeType || !uploaderId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const file = await prisma.$transaction(async (tx) => {
      const f = await tx.file.create({
        data: {
          filename,
          s3Key,
          size,
          mimeType,
          uploaderId,
          workspaceId: workspaceId ?? null,
        },
      });
      await tx.taskFile.create({ data: { taskId: id, fileId: f.id } });
      return f;
    });

    return NextResponse.json(file, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
