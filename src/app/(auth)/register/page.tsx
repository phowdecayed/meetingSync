"use client";
import { RegisterForm } from "@/components/auth-components";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [allowRegistration, setAllowRegistration] = useState<boolean | null>(
    null,
  );
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
      return;
    }
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Gagal mengambil pengaturan");
        const data = await res.json();
        setAllowRegistration(data.allowRegistration);
      } catch (err) {
        setAllowRegistration(true); // fallback: tetap izinkan jika gagal fetch
      }
    }
    fetchSettings();
  }, [status, router]);

  if (status === "loading" || allowRegistration === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span>Memuat pengaturan...</span>
      </div>
    );
  }

  if (!allowRegistration) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Pendaftaran Dinonaktifkan</h1>
          <p className="text-muted-foreground">
            Pendaftaran pengguna baru saat ini tidak diizinkan oleh admin.
          </p>
        </div>
      </div>
    );
  }

  return <RegisterForm />;
}
