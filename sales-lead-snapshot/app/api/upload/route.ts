import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createId } from "@paralleldrive/cuid2";

export const runtime = "nodejs";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ensureUploadDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const isPng = (buffer: Buffer, mimeType: string | undefined) => {
  if (mimeType !== "image/png") {
    return false;
  }

  return PNG_SIGNATURE.equals(buffer.subarray(0, PNG_SIGNATURE.length));
};

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!isPng(buffer, file.type)) {
      return NextResponse.json({ error: "Only PNG files are supported" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public/uploads");
    await ensureUploadDir(uploadDir);

    const id = createId();
    const filePath = path.join(uploadDir, `${id}.png`);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ imagePath: `/uploads/${id}.png` });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
