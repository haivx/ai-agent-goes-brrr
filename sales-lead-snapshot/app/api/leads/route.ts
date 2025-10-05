import { NextResponse } from "next/server";
import type { Lead } from "@prisma/client";

import prisma from "@/lib/prisma";

export type LeadResponse = {
  data: Lead[];
};

export async function GET(): Promise<NextResponse<LeadResponse>> {
  const leads = await prisma.lead.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({ data: leads });
}
