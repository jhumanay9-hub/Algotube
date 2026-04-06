"use client";

import React, { useState, useEffect } from "react";
import {
  Home,
  TrendingUp,
  Users,
  Clock,
  ThumbsUp,
  Layers,
  Settings,
  HelpCircle,
  LogIn,
  LogOut,
  Zap,
  Layout,
  Upload,
  UserCircle,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SheetClose } from "@/components/ui/sheet";
import { getApiUrl, getMediaUrl } from "@/lib/config";
import { useSubscriptions } from "@/context/SubscriptionContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MENU_ITEMS = [
  { icon: Home, label: "Home", href: "/" },
  { icon: TrendingUp, label: "Trending", href: "/trending" },
  {
    icon: Zap,
    label: "Shorts",
    href: "/shorts",
    className:
      "text-red-500 hover:text-red-400 group-hover:neon-red shadow-[0_0_10px_rgba(239,68,68,0.2)]",
  },
  { icon: Layers, label: "Subscribed", href: "/subscriptions" },
];

const LIBRARY_ITEMS = [
  { icon: Layout, label: "Library", href: "/library" },
  { icon: Clock, label: "History", href: "/history" },
  { icon: ThumbsUp, label: "Liked", href: "/liked" },
  { icon: Users, label: "Community", href: "/community" },
];

interface SidebarProps {
  isMobile?: boolean;
}

const Sidebar = React.memo(({ isMobile }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { subscribedCreators, refreshSubscriptions } = useSubscriptions();
  const [subscribedChannels, setSubscribedChannels] = useState<any[]>([]);

  // Mocked user - replace with actual user context
  const user = { uid: "1", name: "Guest" };

  // Fetch subscribed channels when user is available
  useEffect(() => {
    if (user?.uid) {
      refreshSubscriptions(user.uid);

      // Fetch channel details for subscribed creators
      const fetchSubscribedChannels = async () => {
        if (subscribedCreators.size === 0) {
          setSubscribedChannels([]);
          return;
        }

        try {
          const res = await fetch(getApiUrl("get_videos.php"));
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const videos = await res.json();

          // Get unique creators from subscribed list
          const creatorIds = Array.from(subscribedCreators);
          const uniqueChannels = videos
            .filter((v: any) => creatorIds.includes(v.user_id))
            .reduce((acc: any[], v: any) => {
              if (!acc.find((c: any) => c.id === v.user_id)) {
                acc.push({
                  id: v.user_id,
                  name: v.author_name,
                  avatar: v.avatar_url,
                });
              }
              return acc;
            }, []);

          setSubscribedChannels(uniqueChannels);
        } catch (e) {
          console.error("[Sidebar] Failed to fetch subscribed channels:", e);
        }
      };

      fetchSubscribedChannels();
    }
  }, [user?.uid, subscribedCreators, refreshSubscriptions]);

  const handleLogout = async () => {
    // Future PHP session wipe logic goes here
    router.push("/trending");
  };

  const SidebarItem = ({
    icon: Icon,
    label,
    href,
    onClick,
    className,
  }: {
    icon: any;
    label: string;
    href: string;
    onClick?: () => void;
    className?: string;
  }) => {
    const isActive = pathname === href;
    const itemContent = (
      <div
        className={cn(
          "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer w-full",
          isActive
            ? "bg-primary/20 text-accent ring-1 ring-accent/30 shadow-[0_0_15px_rgba(116,222,236,0.1)]"
            : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
          className,
        )}
      >
        <Icon
          size={20}
          className={cn(
            isActive
              ? "text-accent"
              : "group-hover:text-accent transition-colors",
            label === "Shorts" && "text-red-500",
          )}
        />
        <span className="font-body font-medium">{label}</span>
      </div>
    );

    const buttonElement = onClick ? (
      <button onClick={onClick} className="w-full text-left focus:outline-none">
        {itemContent}
      </button>
    ) : (
      <Link href={href} className="w-full block">
        {itemContent}
      </Link>
    );

    // If on mobile, wrap the element in SheetClose to close the hamburger menu on click
    if (isMobile) {
      return <SheetClose asChild>{buttonElement}</SheetClose>;
    }

    return buttonElement;
  };

  return (
    <aside
      className={cn(
        "glass-panel m-4 mt-0 rounded-2xl p-4 flex flex-col gap-8",
        !isMobile && "w-64 hidden lg:flex h-[calc(100vh-120px)]",
        isMobile &&
          "w-full h-full m-0 rounded-none bg-black/90 backdrop-blur-3xl border-0",
      )}
    >
      <div>
        <h3 className="text-xs font-headline font-semibold text-muted-foreground uppercase tracking-widest mb-4 px-4">
          Navigation
        </h3>
        <div className="space-y-1">
          {MENU_ITEMS.map((item) => (
            <SidebarItem key={item.label} {...item} />
          ))}

          {!user ? (
            <SidebarItem
              icon={LogIn}
              label="Sign In"
              href="/auth"
              className="text-accent font-bold bg-accent/5 border border-accent/10 hover:bg-accent/10 shadow-[0_0_10px_rgba(116,222,236,0.1)] mt-4"
            />
          ) : (
            <SidebarItem
              icon={LogOut}
              label="Log Out"
              href="#"
              onClick={handleLogout}
              className="hover:text-destructive hover:bg-destructive/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] mt-4"
            />
          )}
        </div>
      </div>

      {/* Subscribed Channels Section */}
      {user && subscribedChannels.length > 0 && (
        <div>
          <h3 className="text-xs font-headline font-semibold text-muted-foreground uppercase tracking-widest mb-4 px-4 flex items-center gap-2">
            <UserCheck size={12} className="text-accent" />
            Subscribed
          </h3>
          <div className="space-y-1">
            {subscribedChannels.slice(0, 5).map((channel) => (
              <Link
                key={channel.id}
                href={`/channel/${channel.id}`}
                className="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group cursor-pointer w-full text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                <Avatar className="h-8 w-8 rounded-xl border border-accent/20">
                  <AvatarImage src={getMediaUrl(channel.avatar)} />
                  <AvatarFallback className="text-[10px] bg-accent/10 text-accent">
                    {channel.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-body font-medium text-sm truncate">
                  {channel.name}
                </span>
              </Link>
            ))}
            {subscribedChannels.length > 5 && (
              <Link
                href="/subscriptions"
                className="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group cursor-pointer w-full text-accent hover:bg-accent/5"
              >
                <span className="font-body font-medium text-xs">
                  View all ({subscribedChannels.length})
                </span>
              </Link>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-headline font-semibold text-muted-foreground uppercase tracking-widest mb-4 px-4">
          Your Library
        </h3>
        <div className="space-y-1">
          {LIBRARY_ITEMS.map((item) => (
            <SidebarItem key={item.label} {...item} />
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <div className="space-y-1">
          <SidebarItem icon={Upload} label="Upload" href="/upload" />
          <SidebarItem icon={UserCircle} label="Profile" href="/profile" />
          <SidebarItem icon={Settings} label="Settings" href="/settings" />
          <SidebarItem icon={HelpCircle} label="Help" href="/help" />
        </div>
        {!isMobile && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary/20 to-accent/5 border border-white/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              AlgoTube v1.2.0
              <br />
              Mesh Status:{" "}
              <span className="text-accent animate-pulse font-bold">
                STABLE
              </span>
            </p>
          </div>
        )}
      </div>
      <style jsx global>{`
        .neon-red {
          text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
      `}</style>
    </aside>
  );
});

Sidebar.displayName = "Sidebar";
export default Sidebar;
