import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createId } from "@paralleldrive/cuid2";

import { mapLeadToDto, leadSelect } from "@/app/api/leads/route";
import { embedLeadCanonical, extractLeadFromImage, generateOpenerEmail } from "@/lib/ai";
import { cosine } from "@/lib/cosine";
import prisma from "@/lib/prisma";

import type { Lead } from "@prisma/client";

import type { LeadDto } from "@/app/api/leads/route";

export const runtime = "nodejs";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ensureUploadDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const isPng = (buffer: Buffer, mimeType: string | undefined) => {
  const normalizedMimeType = mimeType?.toLowerCase();
  const hasValidMimeType =
    !normalizedMimeType ||
    normalizedMimeType === "image/png" ||
    normalizedMimeType === "image/x-png";

  if (!hasValidMimeType) {
    return false;
  }

  if (buffer.length < PNG_SIGNATURE.length) {
    return false;
  }

  return PNG_SIGNATURE.equals(buffer.subarray(0, PNG_SIGNATURE.length));
};

type UploadResponse = { data: LeadDto };

const bufferToFloat32Array = (bytes: Uint8Array): Float32Array => {
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  );

  return new Float32Array(arrayBuffer);
};

const float32ArrayToBuffer = (array: Float32Array): Buffer =>
  Buffer.from(array.buffer, array.byteOffset, array.byteLength);

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }

    const formData = await request.formData();
    const url = new URL(request.url);

    const dedupeValues = [url.searchParams.get("dedupe"), formData.get("dedupe")]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toLowerCase());

    const dedupeRequested = dedupeValues.some(
      (value) => value === "1" || value === "true"
    );

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

    const imagePath = `/uploads/${id}.png`;
    const sourceUrlEntry = formData.get("sourceUrl");
    const sourceUrl =
      typeof sourceUrlEntry === "string" && sourceUrlEntry.trim().length > 0
        ? sourceUrlEntry.trim()
        : null;
    const productContextEntry = formData.get("productContext");
    const productContext =
      typeof productContextEntry === "string" && productContextEntry.trim().length > 0
        ? productContextEntry.trim()
        : undefined;

    const hasOpenAiKey =
      typeof process.env.OPENAI_API_KEY === "string" && process.env.OPENAI_API_KEY.trim().length > 0;

    let extracted: Partial<Lead> = {};
    let embedding: Float32Array | null = null;

    if (hasOpenAiKey) {
      try {
        extracted = await extractLeadFromImage({
          imagePath,
          absoluteFilePath: filePath
        });
      } catch (error) {
        console.error("Lead extraction failed", error);
      }

      try {
        embedding = await embedLeadCanonical({
          name: extracted.name ?? null,
          title: extracted.title ?? null,
          company: extracted.company ?? null,
          domain: extracted.domain ?? null
        });
      } catch (error) {
        console.error("Failed to compute lead embedding", error);
      }
    } else {
      console.warn("Skipping lead extraction because OPENAI_API_KEY is not set");
    }

    if (dedupeRequested && embedding) {
      const candidates = await prisma.lead.findMany({
        where: { embedding: { not: null } },
        select: { id: true, embedding: true }
      });

      let bestMatch: { id: string; similarity: number } | null = null;

      for (const candidate of candidates) {
        if (!candidate.embedding) {
          continue;
        }

        const candidateEmbedding = bufferToFloat32Array(candidate.embedding);
        const similarity = cosine(embedding, candidateEmbedding);

        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { id: candidate.id, similarity };
        }
      }

      if (bestMatch && bestMatch.similarity >= 0.9) {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.warn("Failed to cleanup duplicate upload", error);
        }

        return NextResponse.json({ duplicateOf: bestMatch.id });
      }
    } else if (dedupeRequested && !embedding) {
      console.warn("Deduplication requested but embedding could not be computed");
    }

    const createdLead = await prisma.lead.create({
      data: {
        imagePath,
        sourceUrl,
        ...extracted,
        embedding: embedding ? float32ArrayToBuffer(embedding) : undefined
      }
    });

    let openerEmail: string | null = null;

    if (hasOpenAiKey) {
      try {
        openerEmail = await generateOpenerEmail(createdLead, productContext);
      } catch (error) {
        console.error("Failed to generate opener email", error);
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id: createdLead.id },
      data: { openerEmail },
      select: leadSelect
    });

    return NextResponse.json<UploadResponse>({ data: mapLeadToDto(updatedLead) });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
