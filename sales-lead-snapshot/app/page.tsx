"use client";

import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

type UploadState = {
  imagePath: string;
  createdAt: number;
};

const TOAST_DURATION_MS = 3000;

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);

    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const handleUpload = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      if (file.type !== "image/png") {
        setErrorMessage("Only PNG files are supported.");
        return;
      }

      setErrorMessage(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data: { imagePath: string } = await response.json();
        setUploads((current) => [
          { imagePath: data.imagePath, createdAt: Date.now() },
          ...current
        ]);
        setToastMessage("Uploaded");
      } catch (error) {
        console.error(error);
        setErrorMessage("Something went wrong while uploading. Please try again.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    []
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      void handleUpload(event.target.files?.[0] ?? null);
    },
    [handleUpload]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const [file] = Array.from(event.dataTransfer.files);
      void handleUpload(file ?? null);
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
                <div
                  className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/40 p-10 text-center"
                  onClick={handleButtonClick}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleButtonClick();
                    }
                  }}
                  aria-label="Upload PNG screenshot"
                >
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
                {errorMessage ? (
                  <p className="text-xs text-destructive">{errorMessage}</p>
                ) : null}
              </div>
              <div className="flex flex-col items-stretch gap-2 md:self-start">
                <Button onClick={handleButtonClick} disabled={isUploading}>
                  {isUploading ? "Uploading..." : "Choose file"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
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
        {uploads.length > 0 ? (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {uploads.map((upload) => (
              <li
                key={`${upload.imagePath}-${upload.createdAt}`}
                className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
              >
                <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                  <Image
                    src={upload.imagePath}
                    alt="Uploaded screenshot"
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(upload.createdAt).toLocaleTimeString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-background py-14 text-center">
            <p className="text-sm font-medium text-muted-foreground">No leads yet</p>
            <p className="max-w-md text-sm text-muted-foreground/80">
              Upload a screenshot to let the agents extract contact details and craft a personalized outreach email.
            </p>
          </div>
        )}
      </section>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
