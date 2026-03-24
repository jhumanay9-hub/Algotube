
"use client";

import React from 'react';
import { Home, TrendingUp, Users, Clock, ThumbsUp, Layers, Settings, HelpCircle, LogIn } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/firebase';

const MENU_ITEMS = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: TrendingUp, label: 'Trending', href: '/trending' },
  { icon: Layers, label: 'Subscribed', href: '/subscriptions' },
];

const LIBRARY_ITEMS = [
  { icon: Clock, label: 'History', href: '/history' },
  { icon: ThumbsUp, label: 'Liked', href: '/liked' },
  { icon: Users, label: 'Community', href: '/community' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  const SidebarItem = ({ icon: Icon, label, href }: { icon: any, label: string, href: string }) => {
    const isActive = pathname === href;
    return (
      <Link 
        href={href}
        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group ${
          isActive 
            ? 'bg-primary/20 text-accent ring-1 ring-accent/30 shadow-[0_0_15px_rgba(116,222,236,0.1)]' 
            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
        }`}
      >
        <Icon size={20} className={isActive ? 'text-accent' : 'group-hover:text-accent transition-colors'} />
        <span className="font-body font-medium">{label}</span>
      </Link>
    );
  };

  const dynamicMenuItems = [
    ...MENU_ITEMS,
    ...(user ? [] : [{ icon: LogIn, label: 'Sign In', href: '/auth' }])
  ];

  return (
    <aside className="w-64 glass-panel m-4 mt-0 rounded-2xl p-4 flex flex-col gap-8">
      <div>
        <h3 className="text-xs font-headline font-semibold text-muted-foreground uppercase tracking-widest mb-4 px-4">Menu</h3>
        <div className="space-y-1">
          {dynamicMenuItems.map((item) => (
            <SidebarItem key={item.label} {...item} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-headline font-semibold text-muted-foreground uppercase tracking-widest mb-4 px-4">Library</h3>
        <div className="space-y-1">
          {LIBRARY_ITEMS.map((item) => (
            <SidebarItem key={item.label} {...item} />
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <div className="space-y-1">
          <SidebarItem icon={Settings} label="Settings" href="/settings" />
          <SidebarItem icon={HelpCircle} label="Help" href="/help" />
        </div>
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary/20 to-accent/5 border border-white/5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            AlgoTube v1.0.42<br/>
            Security Level: <span className="text-accent">ENCRYPTED</span>
          </p>
        </div>
      </div>
    </aside>
  );
}
