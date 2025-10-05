import { promises as fs } from "fs";
import OpenAI from "openai";

import type { Lead } from "@prisma/client";

const SYSTEM_PROMPT = `You are an expert sales research assistant. Extract structured lead details from a business or professional screenshot. Return ONLY a JSON object that strictly matches this schema:
{
  "name": string | null,
  "title": string | null,
  "company": string | null,
  "website": string | null,
  "domain": string | null,
  "location": string | null,
  "notes": string | null
}
Rules:
- Always include all keys.
- Use null when a field is unknown, missing, or uncertain.
- "website" should be a fully qualified URL if visible; otherwise null.
- "domain" should be the root domain (without protocol) if it can be inferred from the website or image; otherwise null.
- Keep "notes" short (1-2 sentences) with any extra relevant context, or null if nothing notable.
- Do not add explanations or any extra keys.`;

const leadSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "title",
    "company",
    "website",
    "domain",
    "location",
    "notes"
  ],
  properties: {
    name: { type: ["string", "null"] },
    title: { type: ["string", "null"] },
    company: { type: ["string", "null"] },
    website: { type: ["string", "null"] },
    domain: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    notes: { type: ["string", "null"] }
  }
} as const;

type ExtractLeadArgs = {
  imagePath: string;
  absoluteFilePath: string;
};

let cachedClient: OpenAI | null = null;

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return cachedClient;
};

const coerceNullableString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value == null) {
    return null;
  }

  return null;
};

export const extractLeadFromImage = async ({
  imagePath,
  absoluteFilePath
}: ExtractLeadArgs): Promise<Partial<Lead>> => {
  const client = getClient();
  const imageBuffer = await fs.readFile(absoluteFilePath);
  const imageBase64 = imageBuffer.toString("base64");

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: SYSTEM_PROMPT
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Extract the lead details from this screenshot. Image path: ${imagePath}`
          },
          {
            type: "input_image",
            image_base64: imageBase64
          }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "lead_extraction_result",
        schema: leadSchema
      }
    }
  });

  const responseData = response as unknown as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  const outputText =
    responseData.output_text ??
    responseData.output
      ?.flatMap((item) => item.content ?? [])
      .map((contentItem) => contentItem.text ?? "")
      .join("") ??
    "{}";

  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    throw new Error("Failed to parse lead data from model response");
  }

  const fields: Array<keyof Pick<Lead, "name" | "title" | "company" | "website" | "domain" | "location" | "notes">> = [
    "name",
    "title",
    "company",
    "website",
    "domain",
    "location",
    "notes"
  ];

  const extracted = fields.reduce<Partial<Lead>>((acc, key) => {
    acc[key] = coerceNullableString(parsed[key]);
    return acc;
  }, {});

  return extracted;
};

export type { ExtractLeadArgs };
