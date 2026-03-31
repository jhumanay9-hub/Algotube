
'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, FileVideo, Music, Sparkles } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { analyzeVideoContent } from '@/ai/flows/analyze-video-content-flow';
import { getPresignedUploadUrl } from '@/app/actions/s3-actions';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface CircularProgressProps {
  progress: number;
  label?: string;
}

const CircularProgress = ({ progress, label }: CircularProgressProps) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg className="w-24 h-24 transform -rotate-90">
        <circle
          className="text-white/10"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="48"
          cy="48"
        />
        <circle
          className="text-accent transition-all duration-300 ease-in-out"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="48"
          cy="48"
        />
      </svg>
      <span className="absolute text-xs font-code font-bold text-accent">{Math.round(progress)}%</span>
      {label && <p className="text-[10px] text-muted-foreground font-code mt-4 uppercase tracking-widest text-center max-w-[150px]">{label}</p>}
    </div>
  );
};

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
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/wav'];
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
        setShowErrors(false);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Supported formats: .mp4, .mov, .mp3, .wav",
        });
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUserLoading || !user) {
      toast({ variant: "destructive", title: "Sign In Required" });
      return;
    }

    if (!title.trim() || !category || !selectedFile) {
      setShowErrors(true);
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    
    try {
      const fileName = `${Date.now()}-${selectedFile.name.replace(/\s+/g, '_')}`;
      
      // 1. Parallel Start: AI Analysis & Presigned URL Generation
      const aiPromise = analyzeVideoContent({ title, description });
      const uploadAuthPromise = getPresignedUploadUrl(fileName, selectedFile.type);

      const [uploadAuth, aiResult] = await Promise.all([uploadAuthPromise, aiPromise]);

      if (!aiResult.isSafe) {
        toast({ variant: "destructive", title: "Safety Flag", description: aiResult.safetyReason });
        setIsProcessing(false);
        return;
      }

      // 2. Perform the actual upload to Backblaze using XMLHttpRequest to track progress
      const uploadPromise = new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadAuth.url);
        xhr.setRequestHeader('Content-Type', selectedFile.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress((event.loaded / event.total) * 100);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            resolve();
          } else {
            reject(new Error(`B2 Upload Failed: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network Error during B2 Upload'));
        xhr.send(selectedFile);
      });

      await uploadPromise;

      // 3. Construct and Save Firestore Document
      const videoData = {
        title,
        description,
        aiSummary: aiResult.summary,
        videoUrl: fileName, // Store the KEY, not the full URL
        thumbnailUrl: `https://picsum.photos/seed/${Math.floor(Math.random() * 1000)}/640/360`,
        uploaderId: user.uid,
        uploadDate: serverTimestamp(),
        viewsCount: 0,
        likesCount: 0,
        dislikesCount: 0,
        commentsCount: 0,
        shareCount: 0,
        processingStatus: 'ready',
        category,
        mediaType: selectedFile.type,
        tags: aiResult.seoTags,
        duration: 15,
        aspectRatio: (selectedFile.size < 50 * 1024 * 1024) ? "9:16" : "16:9",
        creator: user.displayName || "New Creator",
        s3Key: fileName,
        s3Bucket: uploadAuth.bucket
      };

      addDoc(collection(firestore, 'videos'), videoData)
        .then(() => {
          toast({ title: "Post Published!" });
          onClose();
          setTitle('');
          setDescription('');
          setSelectedFile(null);
          setIsProcessing(false);
        })
        .catch((err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'videos',
            operation: 'create',
            requestResourceData: videoData
          }));
          setIsProcessing(false);
        });

    } catch (error: any) {
      toast({ variant: "destructive", title: "Transmission Failed", description: error.message });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-white/10 bg-black/80 backdrop-blur-2xl text-foreground max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar p-0 shadow-2xl">
        <div className="p-6 sm:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
              <Upload className="text-accent" /> Share Your Story
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-body">
              Upload your high-fidelity content to the AlgoTube community.
            </DialogDescription>
          </DialogHeader>

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <CircularProgress 
                progress={uploadProgress} 
                label={uploadProgress < 100 ? `Broadcasting: ${Math.round(uploadProgress)}%` : "Finalizing Transmission..."} 
              />
              <div className="flex flex-col items-center gap-2 animate-pulse text-center px-8">
                <Sparkles size={20} className="text-accent" />
                <p className="text-[10px] text-accent font-code font-bold uppercase tracking-widest">
                  Backblaze B2 Storage Node: CONNECTED
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/5 transition-all group",
                  showErrors && !selectedFile ? "border-destructive" : "border-white/10 hover:border-accent/40"
                )}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".mp4,.mov,.mp3,.wav" />
                {selectedFile ? (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                      <FileVideo size={24} />
                    </div>
                    <span className="text-sm font-code text-accent font-bold truncate max-w-full px-4">{selectedFile.name}</span>
                  </>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto mb-2 text-muted-foreground group-hover:text-accent" />
                    <p className="text-sm font-bold">Select media file</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Post Title</Label>
                <Input placeholder="What's this about?" value={title} onChange={e => setTitle(e.target.value)} className="bg-white/5 border-white/10" />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Tell your viewers more..." value={description} onChange={e => setDescription(e.target.value)} className="bg-white/5 border-white/10" />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <select className="flex h-10 w-full rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm" value={category} onChange={e => setCategory(e.target.value)}>
                  {["Social Media", "Entertainment", "Tech", "Music", "Vlogs"].map(c => (
                    <option key={c} value={c} className="bg-background">{c}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" className="bg-accent text-background hover:neon-glow font-bold" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin" /> : "PUBLISH POST"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
