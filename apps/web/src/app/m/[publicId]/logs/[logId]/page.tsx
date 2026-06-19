import { PublicMachineLogDetailPage } from "./public-machine-log-detail-page";

export default async function PublicMachineLogDetailRoute({
  params
}: {
  params: Promise<{ publicId: string; logId: string }>;
}) {
  const { publicId, logId } = await params;

  return <PublicMachineLogDetailPage publicId={publicId} logId={logId} />;
}
