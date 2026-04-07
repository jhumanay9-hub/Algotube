import ChannelPageClient from "./ChannelPageClient";

// Generate static params for dynamic routes (required for output: 'export')
export function generateStaticParams() {
  // Return empty array - routes will be generated on-demand client-side
  return [];
}

export default function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ChannelPageClient />;
}
