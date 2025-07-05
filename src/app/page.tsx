"use client";

import { Loader2 } from 'lucide-react';

// This page acts as a loading/redirect hub.
// The middleware in `middleware.ts` handles the actual redirection logic
// based on authentication state.
export default function HomePage() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
