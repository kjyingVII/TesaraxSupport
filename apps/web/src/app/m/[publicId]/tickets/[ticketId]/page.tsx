import { PublicTicketPage } from "./public-ticket-page";

export default async function TicketPage({
  params
}: {
  params: Promise<{ publicId: string; ticketId: string }>;
}) {
  const { publicId, ticketId } = await params;

  return <PublicTicketPage publicId={publicId} ticketId={ticketId} />;
}
