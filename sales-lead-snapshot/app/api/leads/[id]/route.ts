import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

import type { LeadDto } from "../route";
import { leadSelect, mapLeadToDto } from "../route";

export type LeadDetailResponse = {
  data: LeadDto | null;
  message?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<LeadDetailResponse>> {
  const lead = await prisma.lead.findUnique({
    where: {
      id: params.id
    },
    select: leadSelect
  });

  if (!lead) {
    return NextResponse.json(
      {
        data: null,
        message: "Lead not found"
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: mapLeadToDto(lead) });
}
