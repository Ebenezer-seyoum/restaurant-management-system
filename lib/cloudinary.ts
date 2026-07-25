import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

type CloudinaryImageUpload = {
  bytes: Buffer;
  originalName?: string;
};

const defaultFolder = "emrakel-house";
let configured = false;

export function isCloudinaryConfigured() {
  if (String(process.env.CLOUDINARY_URL || "").startsWith("cloudinary://")) {
    return true;
  }

  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function configureCloudinary() {
  if (configured) return;

  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Add CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }

  configured = true;
}

function safeDisplayName(value = "") {
  return (
    value
      .replace(/\.[^.]+$/, "")
      .trim()
      .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
      .slice(0, 100) || "restaurant-image"
  );
}

export async function uploadImageToCloudinary({
  bytes,
  originalName
}: CloudinaryImageUpload) {
  configureCloudinary();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        asset_folder: process.env.CLOUDINARY_FOLDER || defaultFolder,
        display_name: safeDisplayName(originalName),
        use_filename: true,
        unique_filename: true,
        overwrite: false
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error || new Error("Cloudinary did not return an uploaded image."));
          return;
        }
        resolve(uploaded);
      }
    );

    upload.end(bytes);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    assetId: result.asset_id,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    folder: result.asset_folder || process.env.CLOUDINARY_FOLDER || defaultFolder
  };
}
