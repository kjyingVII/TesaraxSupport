import { PublicTicketAcknowledgementPage } from "../../../acknowledgement/public-ticket-acknowledgement-page";

export default async function ServiceReportAcknowledgementRoute({
  params
}: {
  params: Promise<{ publicId: string; ticketId: string; serviceReportId: string }>;
}) {
  const { publicId, ticketId, serviceReportId } = await params;
  return <PublicTicketAcknowledgementPage publicId={publicId} ticketId={ticketId} serviceReportId={serviceReportId} />;
}
