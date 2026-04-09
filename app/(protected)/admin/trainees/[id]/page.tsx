import { AdminPersonProfile } from "@/components/admin-person-profile";

export default async function AdminTraineeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminPersonProfile targetAppUserId={id} mode="trainee" />;
}
