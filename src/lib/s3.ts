import { S3Client } from "@aws-sdk/client-s3";

// Credentials come from the default provider chain: the Lambda's IAM role when
// deployed, or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in local development.
export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export const S3_BUCKET = process.env.S3_BUCKET!;
