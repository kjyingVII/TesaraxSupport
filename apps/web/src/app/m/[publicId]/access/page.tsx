import { MachineAccessPage } from "./machine-access-page";

export default async function AccessPage({
  params
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  return <MachineAccessPage publicId={publicId} />;
}
