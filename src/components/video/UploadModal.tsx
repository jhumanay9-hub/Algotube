
'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, FileVideo, Sparkles, DatabaseZap } from 'lucide-react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { analyzeVideoContent } from '@/ai/flows/analyze-video-content-flow';
import { getPresignedUploadUrl } from '@/app/actions/s3-actions';
import { registerB2Video } from '@/app/actions/b2-store';
import { cn } from '@/lib/utils';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Social Media');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile || !title) return;

    setIsProcessing(true);
    setUploadProgress(0);
    
    try {
      const fileName = `${Date.now()}-${selectedFile.name.replace(/\s+/g, '_')}`;
      
      // Phase 1: AI Content Audit & B2 Permission Handshake
      const [aiResult, uploadAuth] = await Promise.all([
        analyzeVideoContent({ title, description }),
        getPresignedUploadUrl(fileName, selectedFile.type)
      ]);

      if (!aiResult.isSafe) {
        toast({ variant: "destructive", title: "Transmission Denied", description: aiResult.safetyReason || "Content flagged by safety mesh." });
        setIsProcessing(false);
        return;
      }

      // Phase 2: Direct Broadcast to B2 Persistence Node
      const uploadPromise = new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadAuth.url);
        xhr.setRequestHeader('Content-Type', selectedFile.type);
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress((e.loaded / e.total) * 100);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`B2 Node rejected stream with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network interruption during B2 broadcast."));
        xhr.send(selectedFile);
      });

      await uploadPromise;

      // Phase 3: Metadata Persistence in B2 Registry
      const videoData = {
        id: fileName,
        title,
        description,
        aiSummary: aiResult.summary,
        videoUrl: fileName,
        thumbnail: `https://picsum.photos/seed/${Math.floor(Math.random() * 1000)}/640/360`,
        uploaderId: user.uid,
        uploadDate: new Date().toISOString(),
        views: 0,
        likesCount: 0,
        commentsCount: 0,
        category,
        creator: user.displayName || "Explorer",
        tags: aiResult.seoTags,
        s3Key: fileName,
        s3Bucket: uploadAuth.bucket
      };

      await registerB2Video(videoData);

      toast({ title: "Broadcast Successful", description: "Transmission persisted to the B2 mesh." });
      onClose();
      setIsProcessing(false);
    } catch (error: any) {
      console.error('B2 Upload Mesh Failure:', error);
      toast({ 
        variant: "destructive", 
        title: "Broadcast Failed", 
        description: error?.message || "An unexpected error occurred during the transmission." 
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-white/10 bg-black/80 backdrop-blur-2xl text-foreground max-w-xl p-0">
        <div className="p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
              <Upload className="text-accent" /> B2 Mesh Transmission
            </DialogTitle>
          </DialogHeader>

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
              <div className="w-24 h-24 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
              <div className="space-y-2">
                <p className="font-code text-accent text-sm font-bold uppercase tracking-widest animate-pulse">
                  Broadcasting: {Math.round(uploadProgress)}%
                </p>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/5 border border-accent/10">
                  <DatabaseZap size={14} className="text-accent" />
                  <span className="text-[10px] text-accent font-code">SYNCING WITH BACKBLAZE B2</span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-6">
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-accent/40 transition-all">
                <input type="file" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="hidden" accept=".mp4,.mov" />
                {selectedFile ? (
                  <div className="flex items-center gap-2 text-accent">
                    <FileVideo size={20} />
                    <span className="font-code text-xs font-bold">{selectedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="text-white/20" />
                    <p className="text-sm font-bold opacity-50">Select Media Stream</p>
                  </>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  placeholder="Transmission Title" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="bg-white/5 border-white/10" 
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  placeholder="Contextual metadata for the community..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="bg-white/5 border-white/10" 
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>Abort</Button>
                <Button 
                  type="submit" 
                  className="bg-accent text-background hover:neon-glow font-bold px-8" 
                  disabled={!selectedFile || isProcessing || !title}
                >
                  START BROADCAST
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
