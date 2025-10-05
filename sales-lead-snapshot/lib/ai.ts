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

type ResponseCreateParams = Parameters<OpenAI["responses"]["create"]>[0];

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
            type: "input_text",
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
            image_url: `data:image/png;base64,${imageBase64}`
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "lead_extraction_result",
        schema: leadSchema
      }
    }
  } as ResponseCreateParams);

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

type LeadCanonicalFields = Pick<Lead, "name" | "title" | "company" | "domain">;

const normalizeCanonicalField = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
};

const canonicalFields: Array<keyof LeadCanonicalFields> = [
  "name",
  "title",
  "company",
  "domain"
];

export const embedLeadCanonical = async (
  leadFields: Partial<LeadCanonicalFields>
): Promise<Float32Array> => {
  const client = getClient();

  const canonical = canonicalFields
    .map((field) => normalizeCanonicalField(leadFields[field]))
    .join("|");

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: canonical
  });

  const vector = response.data[0]?.embedding;

  if (!vector) {
    throw new Error("Failed to compute lead embedding");
  }

  return Float32Array.from(vector);
};

const formatLeadForPrompt = (lead: Lead) => {
  const fields: Array<
    [
      keyof Pick<
        Lead,
        | "name"
        | "title"
        | "company"
        | "notes"
        | "location"
        | "website"
        | "domain"
        | "sourceUrl"
        | "imagePath"
      >,
      string
    ]
  > = [
    ["name", "Name"],
    ["title", "Title"],
    ["company", "Company"],
    ["notes", "Notes"],
    ["location", "Location"],
    ["website", "Website"],
    ["domain", "Domain"],
    ["sourceUrl", "Source URL"],
    ["imagePath", "Image Path"]
  ];

  return fields
    .map(([key, label]) => {
      const value = lead[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return `${label}: ${value.trim()}`;
      }

      return `${label}: (unknown)`;
    })
    .join("\n");
};

export const generateOpenerEmail = async (
  lead: Lead,
  productContext?: string
): Promise<string> => {
  const client = getClient();

  const promptLines = [
    "Write a short, friendly cold outreach email of around 90 words.",
    "Use a helpful, conversational tone and end with a gentle question inviting a response.",
    "Reference any relevant lead details that are available.",
    productContext
      ? `Keep in mind the following product or company context: ${productContext}`
      : null,
    "Do not add a subject line or greeting that sounds robotic.",
    "Return only the email body."
  ].filter(Boolean);

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You are Agent B, an expert SDR copywriter crafting personable outreach emails."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `${promptLines.join("\n")}\n\nLead Details:\n${formatLeadForPrompt(lead)}`
          }
        ]
      }
    ]
  } as ResponseCreateParams);

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
    "";

  const email = outputText.trim();

  if (!email) {
    throw new Error("Failed to generate opener email");
  }

  return email;
};

export type { ExtractLeadArgs };
