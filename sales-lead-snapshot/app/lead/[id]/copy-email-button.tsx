"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type CopyEmailButtonProps = {
  email: string | null;
};

export function CopyEmailButton({ email }: CopyEmailButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!email) {
      return;
    }

    try {
      await navigator.clipboard.writeText(email);
      setIsCopied(true);
      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy email", error);
      setIsCopied(false);
    }
  };

  return (
    <Button onClick={handleCopy} variant="secondary" disabled={!email}>
      {isCopied ? "Copied" : "Copy email"}
    </Button>
  );
}
