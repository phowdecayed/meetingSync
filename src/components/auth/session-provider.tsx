"use client";

import { SessionProvider } from "next-auth/react";

type Props = {
  children: React.ReactNode;
};

export default function NextAuthSessionProvider({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>;
}
