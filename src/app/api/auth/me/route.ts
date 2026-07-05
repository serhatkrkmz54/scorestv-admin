import { NextResponse } from "next/server";
import { resolveUser, isEditorOrAdmin } from "@/lib/auth-server";

export async function GET() {
  const user = await resolveUser();
  if (!user) {
    return NextResponse.json({ message: "Oturum yok." }, { status: 401 });
  }
  if (!isEditorOrAdmin(user)) {
    return NextResponse.json(
      { message: "Panel erişim yetkisi yok." },
      { status: 403 },
    );
  }
  return NextResponse.json(user);
}
