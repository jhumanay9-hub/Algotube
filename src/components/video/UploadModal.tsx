"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Loader2, FileVideo, AlertCircle } from 'lucide-react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  forcedCategory?: string;
}

/**
 * UploadModal - Refactored for EXACT Turso SQL Schema
 * Uses title, description, url, author_name.
 * Releases memory immediately to support 4GB RAM devices.
 */
export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile || !title) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setUploadError(null);
    
    // Capture metadata and release large file object from memory immediately
    const authorName = user.displayName || user.email || 'Anonymous';
    const capturedTitle = title;
    const capturedDescription = description;
    
    // Clear state early to save RAM
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      // Simulate high-fidelity broadcast progress
      for (let i = 0; i <= 100; i += 20) {
        setUploadProgress(i);
        await new Promise(r => setTimeout(r, 150));
      }

      // Exact key mapping for Turso: title, description, url, author_name
      const videoData = {
        title: capturedTitle,
        description: capturedDescription,
        url: "https://placeholder.com/video.mp4", // Placeholder as per instructions
        author_name: authorName
      };

      const tursoRes = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoData)
      });

      if (!tursoRes.ok) throw new Error('Turso SQL Mesh Write Rejected');

      toast({ title: "Broadcast Successful", description: "Transmission registered in SQL Mesh." });
      
      onClose();
      setIsProcessing(false);
      setTitle('');
      setDescription('');

    } catch (error: any) {
      setUploadError(error?.message || "Sync interrupted.");
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] glass-panel border-white/10 rounded-3xl p-0 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent/20">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
        </div>

        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2 text-white">
            <Upload className="text-accent" />
            New Transmission
          </DialogTitle>
          <p className="text-muted-foreground text-[10px] font-code uppercase tracking-widest mt-1">Turso SQL Registry Mode</p>
        </DialogHeader>

        <form onSubmit={handleUpload} className="p-8 pt-0 space-y-6">
          {!selectedFile && !isProcessing && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-accent/40 hover:bg-accent/5 transition-all cursor-pointer group"
            >
              <FileVideo className="text-muted-foreground group-hover:text-accent" size={32} />
              <div className="text-center">
                <p className="font-bold text-sm text-white">Select Transmission File</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-code">SQL Metadata Mode</p>
              </div>
            </div>
          )}

          {selectedFile && !isProcessing && (
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-center justify-between animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-3">
                <FileVideo className="text-accent" size={20} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate max-w-[200px]">{selectedFile.name}</p>
                  <p className="text-[9px] text-muted-foreground">READY FOR MESH SYNC</p>
                </div>
              </div>
            </div>
          )}

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transmission Title</Label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Transmission identity..."
                className="bg-white/5 border-white/10 focus:border-accent/40 rounded-xl text-sm"
                required
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Encrypted Description</Label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional metadata packets..."
                className="bg-white/5 border-white/10 focus:border-accent/40 rounded-xl min-h-[100px] text-sm"
                disabled={isProcessing}
              />
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-code">
                <div className="flex items-center gap-2 text-accent">
                  <Loader2 className="animate-spin" size={12} />
                  <span>SQL SYNC: {uploadProgress}%</span>
                </div>
              </div>
              <Progress value={uploadProgress} className="h-1 bg-white/5" />
            </div>
          )}

          {uploadError && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold">Mesh Error</AlertTitle>
              <AlertDescription className="text-[10px]">{uploadError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 rounded-xl font-bold text-[11px] uppercase" disabled={isProcessing}>CANCEL</Button>
            <Button 
              type="submit" 
              className="flex-1 bg-accent text-background hover:bg-accent/90 rounded-xl font-bold text-[11px] uppercase neon-glow"
              disabled={!selectedFile && !isProcessing || !title || isProcessing}
            >
              {isProcessing ? "SYNCING..." : "BROADCAST"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
