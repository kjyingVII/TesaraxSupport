import { PublicMachineLogPage } from "./public-machine-log-page";

export default async function PublicMachineLogRoute({
  params
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  return <PublicMachineLogPage publicId={publicId} />;
}
