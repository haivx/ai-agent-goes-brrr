import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import type { LeadDto } from "@/app/api/leads/route";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import { CopyEmailButton } from "./copy-email-button";

async function fetchLead(id: string): Promise<LeadDto | null> {
  const headersList = headers();
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const host = headersList.get("host");
  const baseUrl = host ? `${protocol}://${host}` : "";

  const response = await fetch(`${baseUrl}/api/leads/${id}`, {
    cache: "no-store"
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load lead ${id}`);
  }

  const { data } = (await response.json()) as { data: LeadDto };
  return data;
}

export default async function LeadDetailPage({
  params
}: {
  params: { id: string };
}) {
  const lead = await fetchLead(params.id);

  if (!lead) {
    notFound();
  }

  const fields: { label: string; value: string | null }[] = [
    { label: "Name", value: lead.name },
    { label: "Title", value: lead.title },
    { label: "Company", value: lead.company },
    { label: "Website", value: lead.website },
    { label: "Domain", value: lead.domain },
    { label: "Location", value: lead.location },
    { label: "Source URL", value: lead.sourceUrl },
    { label: "Created", value: new Date(lead.createdAt).toLocaleString() }
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/">← Back to leads</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {lead.name ?? "Lead details"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {lead.company ?? "Company unavailable"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Image preview</CardTitle>
            <CardDescription>
              The screenshot that was analyzed to extract this lead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lead.imagePath ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
                <Image
                  src={lead.imagePath}
                  alt={`Screenshot for ${lead.name ?? "lead"}`}
                  fill
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
                No image available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead details</CardTitle>
            <CardDescription>Structured data extracted from the screenshot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid grid-cols-1 gap-4">
              {fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">
                    {field.label}
                  </dt>
                  <dd className="text-foreground">
                    {field.value ?? "Not available"}
                  </dd>
                </div>
              ))}
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">
                  Notes
                </dt>
                <dd className="text-foreground">
                  {lead.notes ?? "No notes provided"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Outreach email</CardTitle>
            <CardDescription>
              Copy the generated opener to share it with your outreach tools.
            </CardDescription>
          </div>
          <CopyEmailButton email={lead.openerEmail} />
        </CardHeader>
        <CardContent>
          {lead.openerEmail ? (
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-4 text-sm text-foreground">
              {lead.openerEmail}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              No opener email has been generated for this lead yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
