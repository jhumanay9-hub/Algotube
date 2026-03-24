
'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, FileVideo, Music, Sparkles, AlertCircle } from 'lucide-react';
import { useFirestore, useUser, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { analyzeVideoContent } from '@/ai/flows/analyze-video-content-flow';
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
  const storage = useStorage();
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
    
    console.log('[TRANSMISSION DEBUGGER] Phase 1: Init Validation');

    if (isUserLoading) {
      console.warn('[TRANSMISSION DEBUGGER] Stall: Auth is still loading.');
      return;
    }

    if (!user) {
      console.error('[TRANSMISSION DEBUGGER] Error: No user session found.');
      toast({
        variant: "destructive",
        title: "Sign In Required",
        description: "You must be logged in to post videos to the community.",
      });
      return;
    }

    const isInvalid = !title.trim() || !category || !selectedFile;
    if (isInvalid) {
      console.error('[TRANSMISSION DEBUGGER] Error: Missing required fields (Title/Category/File).');
      setShowErrors(true);
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide a title, category, and select a media file.",
      });
      return;
    }

    if (!firestore || !storage) {
       console.error('[TRANSMISSION DEBUGGER] Critical: Firebase services (Firestore/Storage) not initialized.');
       toast({ variant: "destructive", title: "Config Error", description: "Firebase storage or database is missing." });
       return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    
    try {
      console.log('[TRANSMISSION DEBUGGER] Phase 2: Starting Parallel Execution');
      
      const mediaType = selectedFile.type.startsWith('video') ? 'videos' : 'audio';
      const fileName = `${Date.now()}-${selectedFile.name.replace(/\s+/g, '_')}`;
      const storagePath = `users/${user.uid}/${mediaType}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      console.log('[TRANSMISSION DEBUGGER] Target path:', storagePath);

      // 1. Parallel Start: AI Analysis & Media Upload
      const aiPromise = analyzeVideoContent({ title, description });
      
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);
      const uploadPromise = new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`[TRANSMISSION DEBUGGER] Upload Progress: ${Math.round(progress)}%`);
            setUploadProgress(progress);
          },
          (error) => {
            console.error('[TRANSMISSION DEBUGGER] Storage Error:', error.code, error.message);
            reject(error);
          },
          async () => {
            console.log('[TRANSMISSION DEBUGGER] Upload Complete. Fetching URL...');
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          }
        );
      });

      // 2. Wait for both to finish
      const [downloadUrl, aiResult] = await Promise.all([uploadPromise, aiPromise]);
      console.log('[TRANSMISSION DEBUGGER] Phase 3: AI Analysis Results Received');

      if (!aiResult.isSafe) {
        console.error('[TRANSMISSION DEBUGGER] Rejected: Safety Audit Failed.', aiResult.safetyReason);
        toast({
          variant: "destructive",
          title: "Safety Flag",
          description: `Post rejected: ${aiResult.safetyReason || 'Community guideline violation'}`,
        });
        setIsProcessing(false);
        return;
      }

      console.log('[TRANSMISSION DEBUGGER] Phase 4: Constructing Document');

      const videoData = {
        title,
        description,
        aiSummary: aiResult.summary,
        videoUrl: downloadUrl,
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
        creator: user.displayName || "New Creator"
      };

      // 3. Database Entry
      console.log('[TRANSMISSION DEBUGGER] Phase 5: Committing to Firestore Mesh...');
      
      addDoc(collection(firestore, 'videos'), videoData)
        .then((docRef) => {
          console.log('[TRANSMISSION DEBUGGER] SUCCESS: Video ID:', docRef.id);
          toast({
            title: "Post Published!",
            description: "Your content is now live on the AlgoTube feed.",
          });
          
          setTitle('');
          setDescription('');
          setSelectedFile(null);
          setShowErrors(false);
          setIsProcessing(false);
          onClose();
        })
        .catch(async (error) => {
          console.error('[TRANSMISSION DEBUGGER] Firestore Error:', error.message);
          
          const permissionError = new FirestorePermissionError({
            path: 'videos',
            operation: 'create',
            requestResourceData: videoData
          });

          // Emit the error so the global listener can catch it
          errorEmitter.emit('permission-error', permissionError);
          
          toast({
            variant: "destructive",
            title: "Publish Failed",
            description: "Permission denied by the mesh. Check the debugger overlay.",
          });
          setIsProcessing(false);
        });

    } catch (error: any) {
      console.error('[TRANSMISSION DEBUGGER] General Catch Block:', error.message);
      toast({
        variant: "destructive",
        title: "Transmission Failed",
        description: error.message || "An unexpected error occurred during the transmission.",
      });
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
              Upload your high-fidelity content to the AlgoTube creator community.
            </DialogDescription>
          </DialogHeader>

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <CircularProgress 
                progress={uploadProgress} 
                label={uploadProgress < 100 ? `Broadcasting: ${Math.round(uploadProgress)}%` : "AI Optimization in progress..."} 
              />
              <div className="flex flex-col items-center gap-2 animate-pulse text-center px-8">
                <Sparkles size={20} className="text-accent" />
                <p className="text-[10px] text-accent font-code font-bold uppercase tracking-widest">
                  {uploadProgress < 100 ? "Sending Data to Mesh" : "Processing Semantic Insights"}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/5 transition-all group",
                  showErrors && !selectedFile 
                    ? "border-destructive shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                    : "border-white/10 hover:border-accent/40"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".mp4,.mov,.mp3,.wav"
                />
                {selectedFile ? (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                      {selectedFile.type.startsWith('video') ? <FileVideo size={24} /> : <Music size={24} />}
                    </div>
                    <span className="text-sm font-code text-accent font-bold truncate max-w-full px-4">{selectedFile.name}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="text-xs text-muted-foreground hover:text-destructive">
                      Change File
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:neon-glow transition-all">
                      <Upload className="text-muted-foreground group-hover:text-accent" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">Select video or audio</p>
                      <p className="text-[10px] text-muted-foreground mt-1">MP4, MOV, MP3, WAV (Max 100MB)</p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label className={cn(showErrors && !title.trim() && "text-destructive")}>Post Title</Label>
                <Input 
                  placeholder="What's this about?" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className={cn(
                    "bg-white/5 border-white/10 focus:border-accent",
                    showErrors && !title.trim() && "border-destructive shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  placeholder="Tell your viewers more about this..." 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-accent min-h-[100px] custom-scrollbar"
                />
              </div>

              <div className="space-y-2">
                <Label className={cn(showErrors && !category && "text-destructive")}>Category</Label>
                <select 
                  className={cn(
                    "flex h-10 w-full rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent appearance-none",
                    showErrors && !category && "border-destructive shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                  )}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="" disabled>Choose a Category</option>
                  {["Social Media", "Entertainment", "Social Life", "Tech", "Computer Science", "Physics", "Music", "Vlogs"].map(c => (
                    <option key={c} value={c} className="bg-background text-foreground">{c}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-white/5 sticky bottom-0 bg-black/50 backdrop-blur-md pb-2">
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button type="button" variant="ghost" onClick={onClose} className="flex-1 sm:flex-none hover:bg-white/10">Cancel</Button>
                  <Button 
                    type="submit" 
                    className="flex-1 sm:flex-none bg-accent text-background hover:neon-glow font-bold shadow-[0_0_15px_rgba(116,222,236,0.3)]"
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" size={16} />}
                    PUBLISH POST
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(116, 222, 236, 0.15);
          border-radius: 10px;
        }
      `}</style>
    </Dialog>
  );
}
