
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Loader2, FileVideo, AlertCircle, Zap, CheckCircle2 } from 'lucide-react';
import { useUser, useStorage } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { analyzeVideoContent } from '@/ai/flows/analyze-video-content-flow';
import { generatePrefixes } from '@/lib/search-utils';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  forcedCategory?: string;
}

export function UploadModal({ isOpen, onClose, forcedCategory }: UploadModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(forcedCategory || 'Social Life');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { user } = useUser();
  const storage = useStorage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 100 * 1024 * 1024) { // 100MB limit for stability
        toast({ 
          variant: "destructive", 
          title: "File too large", 
          description: "Please limit transmissions to 100MB for mesh stability." 
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile || !title || !storage) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      // 1. AI Safety & SEO Analysis (Parallel with initial upload setup)
      const aiResult = await analyzeVideoContent({ title, description });

      if (!aiResult.isSafe) {
        toast({ 
          variant: "destructive", 
          title: "Transmission Denied", 
          description: aiResult.safetyReason || "Content flagged by AI safety mesh." 
        });
        setIsProcessing(false);
        return;
      }

      // 2. Setup Firebase Storage Resumable Upload
      const fileId = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `videos/${user.uid}/${fileId}`);
      
      // Keep a reference to the file then clear from state to save RAM
      const fileToUpload = selectedFile;
      setSelectedFile(null); 
      if (fileInputRef.current) fileInputRef.current.value = '';

      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        }, 
        (error) => {
          console.error('Firebase Storage Error:', error);
          setUploadError(`Storage Node Error: ${error.message}`);
          setIsProcessing(false);
        }, 
        async () => {
          // 3. Finalize: Get URL and Sync with Turso SQL
          const videoUrl = await getDownloadURL(uploadTask.snapshot.ref);
          
          const isShort = category === 'Shorts' || forcedCategory === 'Shorts';
          const videoData = {
            id: fileId,
            title,
            description,
            aiSummary: aiResult.summary,
            videoUrl: videoUrl,
            thumbnail: `https://picsum.photos/seed/${fileId}/640/360`,
            uploaderId: user.uid,
            uploadDate: new Date().toISOString(),
            category,
            tags: aiResult.seoTags,
            searchKeywords: generatePrefixes(title),
            aspectRatio: isShort ? '9:16' : '16:9'
          };

          const tursoRes = await fetch('/api/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(videoData)
          });

          if (!tursoRes.ok) throw new Error('Turso SQL Mesh Write Failed');

          toast({ title: "Broadcast Successful", description: "Persisted to SQL Mesh." });
          onClose();
          setIsProcessing(false);
          setTitle('');
          setDescription('');
        }
      );

    } catch (error: any) {
      console.error('Mesh Sync Failure:', error);
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
          <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
            <Upload className="text-accent" />
            New Transmission
          </DialogTitle>
          <p className="text-muted-foreground text-xs font-code uppercase tracking-widest mt-1">Broadcast to SQL Mesh</p>
        </DialogHeader>

        <form onSubmit={handleUpload} className="p-8 pt-0 space-y-6">
          {!selectedFile && !isProcessing && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-accent/40 hover:bg-accent/5 transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:neon-glow transition-all">
                <FileVideo className="text-muted-foreground group-hover:text-accent" size={32} />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">Drop transmission file</p>
                <p className="text-xs text-muted-foreground mt-1">MP4 or MOV preferred</p>
              </div>
            </div>
          )}

          {selectedFile && !isProcessing && (
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-center justify-between animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-3">
                <FileVideo className="text-accent" />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate max-w-[200px]">{selectedFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)} className="text-xs">Change</Button>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="video/*" 
            className="hidden" 
          />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transmission Title</Label>
              <Input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
                className="bg-white/5 border-white/10 focus:border-accent/40 rounded-xl"
                required
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Encrypted Description</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional metadata..."
                className="bg-white/5 border-white/10 focus:border-accent/40 rounded-xl min-h-[100px]"
                disabled={isProcessing}
              />
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between text-xs font-code">
                <div className="flex items-center gap-2 text-accent">
                  <Loader2 className="animate-spin" size={12} />
                  <span>SYNCING MESH: {uploadProgress}%</span>
                </div>
                <span className="text-muted-foreground">Broadcasting...</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5 bg-white/5" />
            </div>
          )}

          {uploadError && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold">Transmission Interrupted</AlertTitle>
              <AlertDescription className="text-[10px] opacity-80">{uploadError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose} 
              className="flex-1 rounded-xl font-bold"
              disabled={isProcessing}
            >
              CANCEL
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-accent text-background hover:bg-accent/90 rounded-xl font-bold neon-glow transition-all"
              disabled={!selectedFile || !title || isProcessing}
            >
              {isProcessing ? "PROCESSING..." : "BROADCAST"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
