import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { prisma } from "@/lib/prisma";
import { s3, S3_BUCKET } from "@/lib/s3";

// Redirects to a short-lived presigned URL for the expense's receipt.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense?.receiptS3Key) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: expense.receiptS3Key,
        ResponseContentDisposition: `inline; filename="${expense.receiptFilename ?? "receipt"}"`,
      }),
      { expiresIn: 300 }
    );
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
