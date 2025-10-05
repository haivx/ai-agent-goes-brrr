import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Upload Screenshot</CardTitle>
            <CardDescription>
              Drag and drop a profile or company screenshot, or click to browse your files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="flex flex-col gap-4">
                <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/40 p-10 text-center">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Drop your PNG screenshot here
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      We&apos;ll analyze it with AI agents and turn it into a ready-to-send outreach email.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG files up to 10MB are supported. Upload processing will be added soon.
                </p>
              </div>
              <Button className="md:self-start">Choose file</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Leads</h2>
            <p className="text-sm text-muted-foreground">Uploaded screenshots will appear here once processed.</p>
          </div>
          <Button variant="outline" disabled>
            Export CSV
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-background py-14 text-center">
          <p className="text-sm font-medium text-muted-foreground">No leads yet</p>
          <p className="max-w-md text-sm text-muted-foreground/80">
            Upload a screenshot to let the agents extract contact details and craft a personalized outreach email.
          </p>
        </div>
      </section>
    </div>
  );
}
