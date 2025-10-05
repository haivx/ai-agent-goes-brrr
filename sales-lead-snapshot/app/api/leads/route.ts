import { NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

export type LeadDto = {
  id: string;
  createdAt: string;
  imagePath: string;
  sourceUrl: string | null;
  name: string | null;
  title: string | null;
  company: string | null;
  website: string | null;
  domain: string | null;
  location: string | null;
  notes: string | null;
  openerEmail: string | null;
};

export type LeadResponse = {
  data: LeadDto[];
};

export const leadSelect = {
  id: true,
  createdAt: true,
  imagePath: true,
  sourceUrl: true,
  name: true,
  title: true,
  company: true,
  website: true,
  domain: true,
  location: true,
  notes: true,
  openerEmail: true
} as const satisfies Prisma.LeadSelect;

type LeadRecord = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

export const mapLeadToDto = (lead: LeadRecord): LeadDto => ({
  ...lead,
  createdAt: lead.createdAt.toISOString()
});

export async function GET(): Promise<NextResponse<LeadResponse>> {
  const leads = await prisma.lead.findMany({
    orderBy: {
      createdAt: "desc"
    },
    select: leadSelect
  });

  return NextResponse.json({ data: leads.map(mapLeadToDto) });
}
