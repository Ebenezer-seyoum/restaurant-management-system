// @ts-nocheck
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { forbidden, isAdminRequest } from "@/lib/cms";
import { getSupabaseAdmin } from "@/lib/supabase";
import { uploadImageToS3 } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp", "image/gif"]);
const extensionByType = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || "emrakel-images";
const maxUploadBytes = 8 * 1024 * 1024;

async function ensureStorageBucket(supabase) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(listError.message);
  }

  const bucket = (buckets || []).find((item) => item.name === storageBucket);

  if (!bucket) {
    const { error: createError } = await supabase.storage.createBucket(storageBucket, {
      public: true
    });

    if (createError) {
      throw new Error(createError.message);
    }

    return;
  }

  if (bucket.public === false) {
    const { error: updateError } = await supabase.storage.updateBucket(storageBucket, {
      public: true
    });

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}

export async function POST(request) {
  try {
    if (!isAdminRequest(request)) {
      return forbidden();
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return Response.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!allowedTypes.has(file.type)) {
      return Response.json({ error: "Upload a JPG, PNG, WEBP, or GIF image." }, { status: 400 });
    }

    const originalExtension = path.extname(file.name || "").toLowerCase();
    const extension = originalExtension === ".jfif" ? ".jpg" : extensionByType[file.type] || originalExtension || ".jpg";
    const safeName = `admin-${Date.now()}-${Math.random().toString(16).slice(2, 8)}${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    if (!bytes.length) {
      return Response.json({ error: "The selected image is empty." }, { status: 400 });
    }
    if (bytes.length > maxUploadBytes) {
      return Response.json({ error: "Image must be 8 MB or smaller." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const provider =
      process.env.IMAGE_STORAGE_PROVIDER ||
      (supabase ? "supabase" : "local");

    if (provider === "s3") {
      const storagePath = `house/${safeName}`;
      const uploaded = await uploadImageToS3({
        bytes,
        contentType: file.type,
        key: storagePath
      });

      return Response.json({
        message: "Image uploaded.",
        url: uploaded.url,
        provider: "s3",
        bucket: uploaded.bucket,
        path: uploaded.path
      });
    }

    if (provider === "local") {
      const uploadDirectory = path.resolve(
        process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads", "admin")
      );
      await mkdir(uploadDirectory, { recursive: true });
      await writeFile(path.join(uploadDirectory, safeName), bytes);
      const publicBase = String(process.env.UPLOAD_PUBLIC_URL || "/uploads/admin").replace(/\/$/, "");

      return Response.json({
        message: "Image uploaded.",
        url: `${publicBase}/${safeName}`,
        provider: "local"
      });
    }

    if (!supabase) {
      return Response.json(
        { error: "Supabase Storage is not configured. Use IMAGE_STORAGE_PROVIDER=local for VPS storage." },
        { status: 500 }
      );
    }

    const storagePath = `house/${safeName}`;
    await ensureStorageBucket(supabase);

    const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false
    });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from(storageBucket).getPublicUrl(storagePath);

    return Response.json({
      message: "Image uploaded.",
      url: data.publicUrl,
      bucket: storageBucket,
      path: storagePath
    });
  } catch (error) {
    const message = String(error.message || error || "Image upload failed.");
    const help =
      message === "fetch failed"
        ? "Supabase Storage request failed. Check that NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY belong to the same active Supabase project."
        : message;

    return Response.json({ error: help }, { status: 500 });
  }
}

