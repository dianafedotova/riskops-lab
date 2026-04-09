import { AdminPersonProfile } from "@/components/admin-person-profile";

export default async function AdminStaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminPersonProfile targetAppUserId={id} mode="staff" />;
}
