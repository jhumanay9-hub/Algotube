'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AuthCard() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    special: false,
  });

  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const validatePassword = () => {
    return passwordStrength.length && passwordStrength.uppercase && passwordStrength.special;
  };

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!isLogin && !validatePassword()) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Please meet all password requirements.",
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Welcome back!", description: "Successfully signed in via SQL mesh." });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: fullName });

        // PERSIST TO TURSO SQL PROFILES
        const profileData = {
          id: user.uid,
          username: fullName.toLowerCase().replace(/\s+/g, '_'),
          email: email,
          joinedAt: new Date().toISOString()
        };

        await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        });
        
        toast({ title: "Account created!", description: "Profile persisted to SQL mesh." });
      }
      router.push('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] perspective-1000">
      <div className={`relative w-full transition-all duration-700 preserve-3d ${isLogin ? '' : 'rotate-y-180'}`}>
        
        <div className={`glass-panel p-8 rounded-3xl w-full backface-hidden ${!isLogin ? 'pointer-events-none opacity-0' : ''}`}>
          <h2 className="text-2xl font-headline font-bold mb-2">Welcome Back</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10" required />
            </div>
            <Button className="w-full bg-accent text-background font-bold h-11" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsLogin(false)} className="text-accent text-sm font-bold hover:underline">Create Account</button>
          </div>
        </div>

        <div className={`glass-panel p-8 rounded-3xl w-full absolute top-0 left-0 rotate-y-180 backface-hidden ${isLogin ? 'pointer-events-none opacity-0' : ''}`}>
          <h2 className="text-2xl font-headline font-bold mb-2">Create Account</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white/5 border-white/10" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10" required />
            </div>
            <Button className="w-full bg-accent text-background font-bold h-11" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Join Community"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsLogin(true)} className="text-accent text-sm font-bold hover:underline">Sign In</button>
          </div>
        </div>

      </div>
      <style jsx>{`.perspective-1000 { perspective: 1000px; } .preserve-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }`}</style>
    </div>
  );
}
