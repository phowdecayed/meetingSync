import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { saveZoomCredentials } from "@/lib/zoom";

// GET - Mendapatkan semua akun Zoom (hanya untuk admin)
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const zoomCredentials = await prisma.zoomCredentials.findMany({
      select: {
        id: true,
        clientId: true,
        accountId: true,
        hostKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(zoomCredentials);
  } catch (error) {
    console.error("Error fetching Zoom accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch Zoom accounts" },
      { status: 500 },
    );
  }
}

// POST - Menambahkan kredensial Zoom baru (hanya untuk admin)
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, clientSecret, accountId, hostKey } = await request.json();

    // Validasi input
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Client ID dan Client Secret diperlukan" },
        { status: 400 },
      );
    }

    // Simpan kredensial
    await saveZoomCredentials(clientId, clientSecret, accountId, hostKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving Zoom credentials:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 409 }); // 409 Conflict
    }
    return NextResponse.json(
      { error: "Failed to save Zoom credentials" },
      { status: 500 },
    );
  }
}

// DELETE - Menghapus akun Zoom (hanya untuk admin)
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Zoom credentials ID is required" },
        { status: 400 },
      );
    }

    await prisma.zoomCredentials.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Zoom account:", error);
    return NextResponse.json(
      { error: "Failed to delete Zoom account" },
      { status: 500 },
    );
  }
}
