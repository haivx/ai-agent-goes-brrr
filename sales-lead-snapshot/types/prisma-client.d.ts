declare module "@prisma/client" {
  export namespace Prisma {
    type TrueKeys<T> = { [K in keyof T]: T[K] extends true ? K : never }[keyof T];

    interface Lead {
      id: string;
      createdAt: Date;
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
      embedding: Uint8Array | null;
    }

    interface LeadSelect {
      id?: boolean;
      createdAt?: boolean;
      imagePath?: boolean;
      sourceUrl?: boolean;
      name?: boolean;
      title?: boolean;
      company?: boolean;
      website?: boolean;
      domain?: boolean;
      location?: boolean;
      notes?: boolean;
      openerEmail?: boolean;
      embedding?: boolean;
    }

    type LeadGetPayload<T extends { select?: LeadSelect }> = T extends { select: infer S }
      ? S extends LeadSelect
        ? Pick<Lead, TrueKeys<S & LeadSelect>>
        : Lead
      : Lead;
  }

  export type Lead = Prisma.Lead;

  export type PrismaClientOptions = {
    log?: Array<"query" | "info" | "warn" | "error">;
  };

  export class PrismaClient {
    constructor(options?: PrismaClientOptions);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    lead: {
      findMany<T extends { select: Prisma.LeadSelect; orderBy?: { createdAt?: "asc" | "desc" } }>(
        args: T
      ): Promise<Array<Prisma.LeadGetPayload<T>>>;
      findUnique<T extends { select?: Prisma.LeadSelect }>(
        args: T & { where: Record<string, unknown> }
      ): Promise<Prisma.LeadGetPayload<T> | null>;
      create<T extends { data: Partial<Prisma.Lead>; select?: Prisma.LeadSelect }>(
        args: T
      ): Promise<Prisma.LeadGetPayload<T>>;
      update<T extends { data: Partial<Prisma.Lead>; select?: Prisma.LeadSelect }>(
        args: T & { where: Record<string, unknown> }
      ): Promise<Prisma.LeadGetPayload<T>>;
    };
  }
}
