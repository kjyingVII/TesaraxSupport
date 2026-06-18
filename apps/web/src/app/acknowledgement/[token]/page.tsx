import { AcknowledgementForm } from "./acknowledgement-form";

export default async function AcknowledgementPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <AcknowledgementForm token={token} />;
}
