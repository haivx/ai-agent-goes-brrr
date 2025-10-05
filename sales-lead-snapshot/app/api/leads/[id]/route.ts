import { NextResponse } from "next/server";
import type { Lead } from "@prisma/client";

import prisma from "@/lib/prisma";

export type LeadDetailResponse = {
  data: Lead | null;
  message?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<LeadDetailResponse>> {
  const lead = await prisma.lead.findUnique({
    where: {
      id: params.id
    }
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

  return NextResponse.json({ data: lead });
}
