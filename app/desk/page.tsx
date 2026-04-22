import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ResponsiveDesk } from "./ResponsiveDesk";

export default async function DeskPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Always read line from DB — JWT may be stale (issued before the field existed).
  const fresh = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { line: true },
  });
  const user = { ...(session.user as any), line: fresh?.line ?? 1 };

  return <ResponsiveDesk user={user} />;
}
