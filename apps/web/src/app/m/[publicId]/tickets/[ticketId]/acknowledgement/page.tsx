import { PublicTicketAcknowledgementPage } from "./public-ticket-acknowledgement-page";

type PageProps = {
  params: Promise<{ publicId: string; ticketId: string }>;
};

export default async function PublicTicketAcknowledgementRoute({ params }: PageProps) {
  const { publicId, ticketId } = await params;

  return <PublicTicketAcknowledgementPage publicId={publicId} ticketId={ticketId} />;
}
