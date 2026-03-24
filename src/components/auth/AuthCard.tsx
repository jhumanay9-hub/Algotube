
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  const db = useFirestore();
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
        toast({ title: "Welcome back!", description: "Successfully signed in." });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: fullName });

        // Create Firestore Profile
        const userProfile = {
          id: user.uid,
          username: fullName.toLowerCase().replace(/\s+/g, '_'),
          email: email,
          fullName: fullName,
          joinedAt: serverTimestamp(),
          role: 'viewer',
          interests: [],
        };

        const docRef = doc(db!, 'userProfiles', user.uid);
        await setDoc(docRef, userProfile);
        
        toast({ title: "Account created!", description: "Welcome to the community." });
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
        
        {/* Login Side */}
        <div className={`glass-panel p-8 rounded-3xl w-full backface-hidden ${!isLogin ? 'pointer-events-none opacity-0' : ''}`}>
          <h2 className="text-2xl font-headline font-bold mb-2">Welcome Back</h2>
          <p className="text-muted-foreground text-sm mb-6 font-body">Sign in to continue sharing</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-accent"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-accent pr-10"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button className="w-full bg-accent text-background hover:neon-glow font-bold h-11" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-muted-foreground">
              New to AlgoTube?{" "}
              <button onClick={() => setIsLogin(false)} className="text-accent font-bold hover:underline">
                Create Account
              </button>
            </p>
          </div>
        </div>

        {/* Sign Up Side */}
        <div className={`glass-panel p-8 rounded-3xl w-full absolute top-0 left-0 rotate-y-180 backface-hidden ${isLogin ? 'pointer-events-none opacity-0' : ''}`}>
          <h2 className="text-2xl font-headline font-bold mb-2">Create Account</h2>
          <p className="text-muted-foreground text-sm mb-6 font-body">Join the creator economy</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-accent"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input 
                id="signup-email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-accent"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input 
                id="signup-password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-accent"
                required
              />
              
              {/* Password Strength Indicators */}
              <div className="pt-2 space-y-1">
                <div className={`flex items-center gap-2 text-[10px] ${passwordStrength.length ? 'text-green-400' : 'text-muted-foreground'}`}>
                  {passwordStrength.length ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  At least 8 characters
                </div>
                <div className={`flex items-center gap-2 text-[10px] ${passwordStrength.uppercase ? 'text-green-400' : 'text-muted-foreground'}`}>
                  {passwordStrength.uppercase ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  One uppercase letter
                </div>
                <div className={`flex items-center gap-2 text-[10px] ${passwordStrength.special ? 'text-green-400' : 'text-muted-foreground'}`}>
                  {passwordStrength.special ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  One special character
                </div>
              </div>
            </div>
            <Button className="w-full bg-accent text-background hover:neon-glow font-bold h-11" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Join Community"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-muted-foreground">
              Already a member?{" "}
              <button onClick={() => setIsLogin(true)} className="text-accent font-bold hover:underline">
                Sign In
              </button>
            </p>
          </div>
        </div>

      </div>

      <style jsx>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
