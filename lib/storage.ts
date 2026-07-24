// @ts-nocheck
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type ImageUpload = {
  bytes: Buffer;
  contentType: string;
  key: string;
};

let s3Client: S3Client | null = null;

function getS3Client() {
  if (!process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) return null;
  s3Client ||= new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_S3_ENDPOINT || undefined,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true"
  });
  return s3Client;
}

function publicUrl(key: string) {
  const configuredBase = String(process.env.AWS_S3_PUBLIC_URL || "").replace(/\/$/, "");
  if (configuredBase) return `${configuredBase}/${key}`;
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function uploadImageToS3({ bytes, contentType, key }: ImageUpload) {
  const client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;
  if (!client || !bucket) {
    throw new Error("AWS S3 storage is not configured.");
  }

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: bytes,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable"
  }));

  return { url: publicUrl(key), bucket, path: key };
}

