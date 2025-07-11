import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateAuthUser } from "@/lib/data";

// PUT /api/profile - Memperbarui profil pengguna
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to update your profile" },
        { status: 401 },
      );
    }

    const data = await request.json();
    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const updatedUser = await updateAuthUser(session.user.id, {
      name: data.name,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update profile" },
      { status: 500 },
    );
  }
}
