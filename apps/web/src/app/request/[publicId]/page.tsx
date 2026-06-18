import { RequestTicketForm } from "./request-ticket-form";

export default async function RequestPage({
  params
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  return <RequestTicketForm publicId={publicId} />;
}

