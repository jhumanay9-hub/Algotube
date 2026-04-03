import VideoPageClient from "./VideoPageClient";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function VideoPage() {
  return <VideoPageClient />;
}
