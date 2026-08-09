const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageBase64Payload = {
  base64: string;
  contentType: string;
};

function normalizeContentType(mime: string): string {
  const t = mime.trim().toLowerCase();
  if (t === "image/jpeg" || t === "image/jpg") return "image/jpg";
  if (t === "image/png") return "image/png";
  if (t === "image/webp") return "image/webp";
  return t || "image/jpg";
}

export function readImageFileAsBase64(file: File): Promise<ImageBase64Payload> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("Image must be 5 MB or smaller."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read image file."));
        return;
      }
      const comma = result.indexOf(",");
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      if (!base64) {
        reject(new Error("Could not read image file."));
        return;
      }
      resolve({
        base64,
        contentType: normalizeContentType(file.type),
      });
    };
    reader.readAsDataURL(file);
  });
}
