
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, FileVideo, ShieldAlert, DatabaseZap, AlertCircle, Zap } from 'lucide-react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { analyzeVideoContent } from '@/ai/flows/analyze-video-content-flow';
import { getPresignedUploadUrl } from '@/app/actions/s3-actions';
import { generatePrefixes } from '@/lib/search-utils';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [category, setCategory] = useState(forcedCategory || 'Social Media');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (forcedCategory) setCategory(forcedCategory);
  }, [forcedCategory, isOpen]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile || !title) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      const fileName = `${Date.now()}-${selectedFile.name.replace(/\s+/g, '_')}`;
      
      const [aiResult, uploadAuth] = await Promise.all([
        analyzeVideoContent({ title, description }),
        getPresignedUploadUrl(fileName, selectedFile.type)
      ]);

      if (!aiResult.isSafe) {
        toast({ variant: "destructive", title: "Transmission Denied", description: aiResult.safetyReason || "Content flagged by safety mesh." });
        setIsProcessing(false);
        return;
      }

      const uploadPromise = new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadAuth.url);
        xhr.setRequestHeader('Content-Type', selectedFile.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress((e.loaded / e.total) * 100);
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`B2 rejection`));
        xhr.onerror = () => reject(new Error("CORS or Network error"));
        xhr.send(selectedFile);
      });

      await uploadPromise;

      const isShort = category === 'Shorts' || forcedCategory === 'Shorts';
      const searchKeywords = generatePrefixes(title);
      const tags = [...aiResult.seoTags];
      if (isShort && !tags.includes('short')) tags.push('short');

      const videoData = {
        id: fileName,
        title,
        description,
        aiSummary: aiResult.summary,
        videoUrl: fileName,
        thumbnail: `https://picsum.photos/seed/${Math.floor(Math.random() * 1000)}/640/360`,
        uploaderId: user.uid,
        uploadDate: new Date().toISOString(),
        category,
        tags,
        searchKeywords,
        s3Key: fileName,
        s3Bucket: uploadAuth.bucket,
        aspectRatio: isShort ? '9:16' : '16:9'
      };

      // PERSIST TO TURSO MESH
      const tursoRes = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoData)
      });

      if (!tursoRes.ok) throw new Error('Turso Mesh Write Failed');

      toast({ title: "Broadcast Successful", description: "Metadata persisted to Turso SQL Mesh." });
      onClose();
      setIsProcessing(false);
      setTitle('');
      setDescription('');
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Mesh Failure:', error);
      setUploadError(error?.message || "Transmission interrupted.");
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-white/10 bg-black/80 backdrop-blur-2xl text-foreground max-w-xl p-0 overflow-hidden">
        <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
              <Upload className="text-accent" /> Turso SQL Transmission
            </DialogTitle>
          </DialogHeader>

          {uploadError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Broadcast Failure</AlertTitle>
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
              <div className="w-24 h-24 border-4 rounded-full animate-spin border-accent/20 border-t-accent" />
              <p className="font-code text-sm font-bold text-accent uppercase tracking-widest animate-pulse">
                Broadcasting to Mesh: {Math.round(uploadProgress)}%
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-6">
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-accent/40">
                <input type="file" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="hidden" accept=".mp4,.mov,.webm" />
                {selectedFile ? (
                  <div className="text-center">
                    <FileVideo size={48} className="text-accent mx-auto mb-2" />
                    <span className="text-xs text-accent font-code">{selectedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={48} className="text-white/20" />
                    <p className="text-sm opacity-50">Select Media Stream</p>
                  </>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl" required />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-white/5 border-white/10 min-h-[100px] rounded-xl" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>Abort</Button>
                <Button type="submit" className="bg-accent text-background font-bold px-10 h-12 rounded-xl" disabled={!selectedFile || isProcessing || !title}>
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
