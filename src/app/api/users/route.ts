import { NextResponse } from "next/server";
import {
  getUsers,
  createUser,
  updateUserRole,
  deleteUserById,
} from "@/lib/data";
import { auth } from "@/lib/auth";

// GET /api/users - Mengambil semua pengguna
export async function GET() {
  try {
    const session = await auth();

    // Hanya admin yang bisa mengambil data pengguna
    if (session?.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Only admins can access user data" },
        { status: 403 },
      );
    }

    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

// POST /api/users - Membuat pengguna baru
export async function POST(request: Request) {
  try {
    const session = await auth();

    // Hanya admin yang bisa membuat pengguna baru
    if (session?.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Only admins can create users" },
        { status: 403 },
      );
    }

    const data = await request.json();
    const user = await createUser(data);
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create user" },
      { status: 500 },
    );
  }
}

// PUT /api/users/:id/role - Memperbarui peran pengguna
export async function PUT(request: Request) {
  try {
    const session = await auth();

    // Hanya admin yang bisa memperbarui peran
    if (session?.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Only admins can update user roles" },
        { status: 403 },
      );
    }

    const data = await request.json();
    const { id, role } = data;

    if (!id || !role) {
      return NextResponse.json(
        { error: "User ID and role are required" },
        { status: 400 },
      );
    }

    const user = await updateUserRole(id, role);
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update user role" },
      { status: 500 },
    );
  }
}

// DELETE /api/users/:id - Menghapus pengguna
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    // Hanya admin yang bisa menghapus pengguna
    if (session?.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Only admins can delete users" },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const idToDelete = url.searchParams.get("id");

    if (!idToDelete) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const result = await deleteUserById(idToDelete);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete user" },
      { status: 500 },
    );
  }
}
