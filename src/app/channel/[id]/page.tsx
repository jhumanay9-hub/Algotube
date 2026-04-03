import ChannelPageClient from "./ChannelPageClient";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function ChannelPage() {
  return <ChannelPageClient />;
}
