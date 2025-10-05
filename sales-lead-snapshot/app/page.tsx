"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import type { LeadDto, LeadResponse } from "@/app/api/leads/route";

export default function HomePage() {
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLeads = async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/leads");

        if (!response.ok) {
          throw new Error("Failed to load leads");
        }

        const { data } = (await response.json()) as LeadResponse;

        if (isMounted) {
          setLeads(data);
          setError(null);
        }
      } catch (unknownError) {
        if (!isMounted) {
          return;
        }

        console.error(unknownError);
        setError("Something went wrong while loading leads. Please try again.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchLeads();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Browse the latest leads generated from your uploaded screenshots.
        </p>
      </section>

      <section className="space-y-4">
        {isLoading ? <LeadListSkeleton /> : null}
        {!isLoading && error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {!isLoading && !error && leads.length === 0 ? <EmptyState /> : null}
        {!isLoading && !error && leads.length > 0 ? <LeadList leads={leads} /> : null}
      </section>
    </div>
  );
}

function LeadList({ leads }: { leads: LeadDto[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {leads.map((lead) => (
        <li key={lead.id}>
          <Link href={`/lead/${lead.id}`} className="block h-full">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {lead.name ?? "Unnamed lead"}
                </CardTitle>
                <CardDescription>
                  {lead.title ?? "Title unavailable"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {lead.company ?? "Company unavailable"}
                  </p>
                  {lead.location ? <p>{lead.location}</p> : null}
                </div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                  Created {new Date(lead.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LeadListSkeleton() {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <li key={index}>
          <Card className="h-full animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
              <div className="h-2 w-1/2 rounded bg-muted" />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-background py-20 text-center">
      <p className="text-sm font-medium text-muted-foreground">No leads yet</p>
      <p className="max-w-md text-sm text-muted-foreground/80">
        Upload a screenshot to let the agents extract contact details and craft a personalized outreach email.
      </p>
    </div>
  );
}
