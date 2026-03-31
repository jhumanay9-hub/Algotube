
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, FileVideo, ShieldAlert, DatabaseZap, AlertCircle, Info, Zap } from 'lucide-react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { analyzeVideoContent } from '@/ai/flows/analyze-video-content-flow';
import { getPresignedUploadUrl } from '@/app/actions/s3-actions';
import { registerB2Video } from '@/app/actions/b2-store';
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

  // Sync category if forced (e.g., from Shorts page)
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
            const errorMsg = `B2 Node rejected stream (Status ${xhr.status}). Check Bucket Permissions.`;
            reject(new Error(errorMsg));
          }
        };

        xhr.onerror = () => {
          const corsHint = "Network interruption (likely CORS). Ensure your B2 Bucket CORS allows 'PUT' from this origin.";
          reject(new Error(corsHint));
        };

        xhr.send(selectedFile);
      });

      await uploadPromise;

      // Phase 3: Metadata Persistence in B2 Registry
      const isShort = category === 'Shorts' || forcedCategory === 'Shorts';
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
        views: 0,
        likesCount: 0,
        commentsCount: 0,
        category,
        creator: user.displayName || "Explorer",
        tags,
        s3Key: fileName,
        s3Bucket: uploadAuth.bucket,
        aspectRatio: isShort ? '9:16' : '16:9'
      };

      await registerB2Video(videoData);

      toast({ title: "Broadcast Successful", description: `Transmission persisted to the B2 mesh as ${isShort ? 'a Short' : 'a Video'}.` });
      onClose();
      setIsProcessing(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedFile(null);
    } catch (error: any) {
      console.error('B2 Upload Mesh Failure:', error);
      const errorMessage = error?.message || "An unexpected error occurred during the transmission.";
      setUploadError(errorMessage);
      setIsProcessing(false);
    }
  };

  const isCorsError = uploadError?.toLowerCase().includes('cors') || uploadError?.toLowerCase().includes('interruption');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-white/10 bg-black/80 backdrop-blur-2xl text-foreground max-w-xl p-0 overflow-hidden">
        <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
              {forcedCategory === 'Shorts' ? (
                <>
                  <Zap className="text-red-500 fill-red-500" /> B2 Short Broadcast
                </>
              ) : (
                <>
                  <Upload className="text-accent" /> B2 Mesh Transmission
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {uploadError && (
            <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/20 text-destructive-foreground">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Broadcast Failure</AlertTitle>
              <AlertDescription className="text-xs font-body">
                {uploadError}
                {isCorsError && (
                  <div className="mt-4 p-3 bg-black/40 rounded-xl border border-destructive/20 space-y-2">
                    <p className="font-bold flex items-center gap-2 text-white">
                      <ShieldAlert size={14} className="text-red-400" /> Action Required: CORS Config
                    </p>
                    <p className="opacity-80">Your browser blocked the direct upload to Backblaze. To fix this:</p>
                    <ol className="list-decimal ml-4 opacity-80 space-y-1">
                      <li>Log in to <span className="text-accent">Backblaze B2 Console</span></li>
                      <li>Go to <span className="font-bold">Buckets</span> &gt; <span className="font-bold">CORS Settings</span></li>
                      <li>Add a rule: <span className="font-code text-[10px] bg-white/10 px-1">Allowed Origins: *</span></li>
                      <li>Allow Methods: <span className="font-code text-[10px] bg-white/10 px-1">PUT, GET</span></li>
                      <li>Allow Headers: <span className="font-code text-[10px] bg-white/10 px-1">Content-Type, x-amz-*</span></li>
                    </ol>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
              <div className={cn(
                "w-24 h-24 border-4 rounded-full animate-spin",
                forcedCategory === 'Shorts' ? "border-red-500/20 border-t-red-500" : "border-accent/20 border-t-accent"
              )} />
              <div className="space-y-2">
                <p className={cn(
                  "font-code text-sm font-bold uppercase tracking-widest animate-pulse",
                  forcedCategory === 'Shorts' ? "text-red-500" : "text-accent"
                )}>
                  Broadcasting: {Math.round(uploadProgress)}%
                </p>
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full border",
                  forcedCategory === 'Shorts' ? "bg-red-500/5 border-red-500/10" : "bg-accent/5 border-accent/10"
                )}>
                  <DatabaseZap size={14} className={forcedCategory === 'Shorts' ? "text-red-500" : "text-accent"} />
                  <span className={cn("text-[10px] font-code", forcedCategory === 'Shorts' ? "text-red-500" : "text-accent")}>
                    SYNCING WITH B2 CLOUD MESH
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-6 pb-2">
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className={cn(
                  "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
                  selectedFile 
                    ? (forcedCategory === 'Shorts' ? "border-red-500/40 bg-red-500/5" : "border-accent/40 bg-accent/5") 
                    : "border-white/10 hover:border-accent/40"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)} 
                  className="hidden" 
                  accept=".mp4,.mov,.webm" 
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <FileVideo size={48} className={forcedCategory === 'Shorts' ? "text-red-500" : "text-accent"} />
                    <span className={cn("font-code text-sm font-bold line-clamp-1", forcedCategory === 'Shorts' ? "text-red-500" : "text-accent")}>
                      {selectedFile.name}
                    </span>
                    <span className="text-xs opacity-50">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                ) : (
                  <>
                    <Upload size={48} className="text-white/20" />
                    <div className="text-center">
                      <p className="text-sm font-bold opacity-50">Select Media Stream</p>
                      <p className="text-[10px] opacity-30 mt-1 uppercase tracking-wider">Vertical (9:16) Recommended</p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  placeholder="Transmission Title" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="bg-white/5 border-white/10 focus:border-accent/50 h-12 rounded-xl" 
                  required
                />
              </div>

              {!forcedCategory && (
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-accent/50 outline-none text-foreground appearance-none"
                  >
                    <option value="Social Media" className="bg-background">Social Media</option>
                    <option value="Shorts" className="bg-background">Shorts (9:16)</option>
                    <option value="Entertainment" className="bg-background">Entertainment</option>
                    <option value="Computer Science" className="bg-background">Computer Science</option>
                    <option value="Physics" className="bg-background">Physics</option>
                    <option value="Cybersecurity" className="bg-background">Cybersecurity</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  placeholder="Contextual metadata for the community..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="bg-white/5 border-white/10 min-h-[100px] focus:border-accent/50 rounded-xl" 
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-transparent py-2">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl px-6">Abort</Button>
                <Button 
                  type="submit" 
                  className={cn(
                    "font-bold px-10 h-12 rounded-xl transition-all shadow-lg",
                    forcedCategory === 'Shorts' ? "bg-red-600 hover:bg-red-500 text-white" : "bg-accent text-background hover:neon-glow"
                  )} 
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
