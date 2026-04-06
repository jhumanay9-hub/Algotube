import VideoPageClient from "./VideoPageClient";

// Generate static params for dynamic routes (required for output: 'export')
export function generateStaticParams() {
  // Return empty array - routes will be generated on-demand client-side
  return [];
}

export default function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <VideoPageClient />;
}
