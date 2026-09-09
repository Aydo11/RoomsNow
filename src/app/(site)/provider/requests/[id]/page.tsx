import { redirect } from "next/navigation";

/**
 * Keep request links sent before the consolidated requests screen was added
 * working. The destination page performs the provider access check and only
 * opens a request owned by that provider's company.
 */
export default async function LegacyProviderRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/provider/requests?request=${encodeURIComponent(id)}`);
}
