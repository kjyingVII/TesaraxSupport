import { MachinePortalPage } from "./machine-portal-page";

export default async function PublicMachinePage({
  params
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  return <MachinePortalPage publicId={publicId} />;
}
