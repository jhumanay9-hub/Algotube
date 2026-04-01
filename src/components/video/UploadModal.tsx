
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, FileVideo, DatabaseZap, AlertCircle, Zap } from 'lucide-react';
import { useUser, useStorage } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { analyzeVideoContent } from '@/ai/flows/analyze-video-content-flow';
import { generatePrefixes } from '@/lib/search-utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  forcedCategory?: string;
}

/**
 * UploadModal - Firebase Media + Turso Metadata Integration
 * Broadcasts video files to Firebase Storage and metadata to Turso SQL mesh.
 * Optimized for 4GB RAM devices.
 */
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
      // 1. AI Safety & SEO Analysis
      // We run this first to ensure content is safe before hitting storage
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

      // 2. Prepare Firebase Storage Path
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${timestamp}-${sanitizedName}`;
      const storageRef = ref(storage, `videos/${user.uid}/${fileName}`);
      
      // Memory Optimization: Clear selectedFile from state early
      // Create a local reference for the actual upload function
      const fileToUpload = selectedFile;
      setSelectedFile(null); 

      // 3. Initiate Resumable Upload to Firebase Storage
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on('state_changed', 
        (snapshot) => {
          // Track upload progress in real-time
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error('Firebase Storage Error:', error);
          let message = "Transmission interrupted.";
          if (error.code === 'storage/unauthorized') message = "Permission denied in Cloud Mesh.";
          if (error.code === 'storage/canceled') message = "Broadcast canceled by user.";
          setUploadError(message);
          setIsProcessing(false);
        }, 
        async () => {
          // 4. Finalize Metadata in Turso SQL Mesh
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const isShort = category === 'Shorts' || forcedCategory === 'Shorts';
          const searchKeywords = generatePrefixes(title);
          const tags = [...aiResult.seoTags];
          if (isShort && !tags.includes('short')) tags.push('short');

          const videoData = {
            id: fileName,
            title,
            description,
            aiSummary: aiResult.summary,
            videoUrl: downloadURL,
            thumbnail: `https://picsum.photos/seed/${timestamp}/640/360`,
            uploaderId: user.uid,
            uploadDate: new Date().toISOString(),
            category,
            tags,
            searchKeywords,
            aspectRatio: isShort ? '9:16' : '16:9'
          };

          const tursoRes = await fetch('/api/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(videoData)
          });

          if (!tursoRes.ok) throw new Error('Turso SQL Mesh Write Failed');

          toast({ 
            title: "Broadcast Successful", 
            description: "Transmission finalized and persisted to SQL Mesh." 
          });
          
          // Cleanup
          onClose();
          setIsProcessing(false);
          setTitle('');
          setDescription('');
          setUploadProgress(0);
        }
      );

    } catch (error: any) {
      console.error('Mesh Sync Failure:', error);
      setUploadError(error?.message || "Sync interrupted by node failure.");
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-white/10 bg-black/80 backdrop-blur-2xl text-foreground max-w-xl p-0 overflow-hidden">
        <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
              <Upload className="text-accent" /> Transmission Hub
            </DialogTitle>
          </DialogHeader>

          {uploadError && (
            <Alert variant="destructive" className="mb-6 bg-red-950/20 border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertTitle className="text-red-500 font-bold">Broadcast Error</AlertTitle>
              <AlertDescription className="text-red-200/80 text-xs">
                {uploadError}
              </AlertDescription>
            </Alert>
          )}

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
              <div className="w-24 h-24 border-4 rounded-full animate-spin border-accent/10 border-t-accent shadow-[0_0_20px_rgba(116,222,236,0.1)]" />
              <div className="w-full max-w-xs space-y-4">
                <Progress value={uploadProgress} className="h-2 bg-white/5" />
                <p className="font-code text-sm font-bold text-accent uppercase tracking-widest animate-pulse">
                  Syncing: {Math.round(uploadProgress)}%
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">Broadcasting to Firebase Storage Node...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className="border-2 border-dashed border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-accent/40 hover:bg-white/5 transition-all group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)} 
                  className="hidden" 
                  accept=".mp4,.mov,.webm" 
                />
                {selectedFile ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <FileVideo size={32} className="text-accent" />
                    </div>
                    <span className="text-sm font-code text-accent block truncate max-w-[200px]">{selectedFile.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                      <Upload size={32} className="text-white/20 group-hover:text-accent transition-colors" />
                    </div>
                    <p className="text-sm font-headline font-bold text-white/40">Select Video Data Stream</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">MP4, MOV, or WEBM</p>
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Title</Label>
                  <Input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="bg-white/5 border-white/10 h-11 rounded-xl focus:ring-accent/20" 
                    placeholder="Broadcast Subject"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Category</Label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 appearance-none cursor-pointer"
                    disabled={!!forcedCategory}
                  >
                    <option value="Entertainment">Entertainment</option>
                    <option value="Social Life">Social Life</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Physics">Physics</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Shorts">Shorts</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Metadata Description</Label>
                <Textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="bg-white/5 border-white/10 min-h-[100px] rounded-xl focus:ring-accent/20 text-sm" 
                  placeholder="Additional transmission context..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl h-12 px-6">Abort</Button>
                <Button 
                  type="submit" 
                  className="bg-accent text-background font-bold px-10 h-12 rounded-xl hover:neon-glow transition-all" 
                  disabled={!selectedFile || isProcessing || !title}
                >
                  {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Zap size={18} className="mr-2" />}
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
