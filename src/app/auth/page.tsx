
'use client';

import React, { useState } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function AuthPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] -z-10 animate-pulse" style={{ animationDelay: '2s' }} />

      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center group-hover:neon-glow transition-all">
          <Shield className="text-accent" size={28} />
        </div>
        <span className="font-headline font-bold text-3xl tracking-tight bg-gradient-to-r from-white to-accent bg-clip-text text-transparent">
          AlgoTube
        </span>
      </Link>

      <AuthCard />

      <p className="mt-8 text-muted-foreground text-sm font-body">
        By continuing, you agree to AlgoTube's Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
