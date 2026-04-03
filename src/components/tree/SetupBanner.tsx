"use client";

import { useState } from "react";
import { AlertTriangle, X, Copy, Check } from "lucide-react";

export default function SetupBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (dismissed) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      "Go to Supabase Dashboard → SQL Editor → paste the contents of supabase/migrations/002_tree_traversal.sql → Run"
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-4 mt-2 mb-0 bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 flex items-start gap-3 relative z-20">
      <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-text mb-1">
          Database setup required for full tree traversal
        </p>
        <p className="text-secondary">
          Run the migration to enable tree merging. Go to{" "}
          <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded">
            Supabase Dashboard → SQL Editor
          </span>{" "}
          and paste the contents of{" "}
          <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded">
            supabase/migrations/002_tree_traversal.sql
          </span>{" "}
          then click Run.
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleCopy}
          className="p-1 text-text-light hover:text-text transition-colors cursor-pointer"
          title="Copy instructions"
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-text-light hover:text-text transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
