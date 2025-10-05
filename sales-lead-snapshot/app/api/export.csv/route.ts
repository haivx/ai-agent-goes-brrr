import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

const leadSelect = {
  id: true,
  createdAt: true,
  name: true,
  title: true,
  company: true,
  website: true,
  domain: true,
  location: true,
  notes: true,
  openerEmail: true
} as const satisfies Prisma.LeadSelect;

type LeadForExport = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

const columns = [
  "id",
  "createdAt",
  "name",
  "title",
  "company",
  "website",
  "domain",
  "location",
  "notes",
  "openerEmail"
] as const satisfies ReadonlyArray<keyof LeadForExport>;

const escapeCsvValue = (value: string | Date | null): string => {
  if (value === null) {
    return "";
  }

  const stringValue =
    value instanceof Date ? value.toISOString() : value.toString();
  const escaped = stringValue.replace(/"/g, '""');

  return `"${escaped}"`;
};

const mapLeadToRow = (lead: LeadForExport): string =>
  columns.map((column) => escapeCsvValue(lead[column] ?? null)).join(",");

export async function GET(): Promise<Response> {
  const leads = await prisma.lead.findMany({
    orderBy: {
      createdAt: "desc"
    },
    select: leadSelect
  });

  const header = columns.join(",");
  const rows = leads.map(mapLeadToRow);
  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="leads.csv"'
    }
  });
}
