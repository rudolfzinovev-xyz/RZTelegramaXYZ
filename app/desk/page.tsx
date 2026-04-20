import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ResponsiveDesk } from "./ResponsiveDesk";

export default async function DeskPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  return <ResponsiveDesk user={session.user as any} />;
}
