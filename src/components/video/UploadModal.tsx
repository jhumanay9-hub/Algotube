
'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Loader2, Video as VideoIcon, Music, FileVideo, CheckCircle2, Sparkles, ShieldAlert } from 'lucide-react';
import { useFirestore, useUser, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { analyzeVideoContent } from '@/ai/flows/analyze-video-content-flow';
import { cn } from '@/lib/utils';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CircularProgress = ({ progress, label }: { progress: number, label?: string }) => {
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

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tech');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { firestore } = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
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
          description: "Please upload .mp4, .mov, .mp3, or .wav",
        });
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation Algorithm
    const isInvalid = !title.trim() || !category || !selectedFile;
    if (isInvalid) {
      setShowErrors(true);
      toast({
        variant: "destructive",
        title: "Missing Metadata",
        description: "Please fill in all required fields and select a file.",
      });
      return;
    }

    if (!user || !storage || !firestore) return;

    setIsUploading(true);
    console.log('Upload Started...');
    
    const mediaType = selectedFile.type.startsWith('video') ? 'videos' : 'audio';
    const fileName = `${Date.now()}-${selectedFile.name}`;
    const storagePath = `users/${user.uid}/${mediaType}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload Error:', error);
        setIsUploading(false);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: error.message,
        });
      },
      async () => {
        try {
          setIsUploading(false);
          setIsAnalyzing(true);
          console.log('File successfully written to Storage. Starting AI Analysis...');
          
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const aiResult = await analyzeVideoContent({ title, description });

          if (!aiResult.isSafe) {
            console.warn('AI Safety Flag triggered:', aiResult.safetyReason);
            toast({
              variant: "destructive",
              title: "Content Flagged",
              description: `Community safety violation detected: ${aiResult.safetyReason || 'Inappropriate content'}`,
            });
            setIsAnalyzing(false);
            return;
          }

          const aspectRatio = (selectedFile.size < 50 * 1024 * 1024) ? "9:16" : "16:9";

          const videoData = {
            title,
            description,
            aiSummary: aiResult.summary,
            videoUrl: downloadUrl,
            thumbnailUrl: `https://picsum.photos/seed/${Math.random()}/640/360`,
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
            safetyFlag: false,
            duration: 15,
            aspectRatio: aspectRatio,
          };

          const docRef = await addDoc(collection(firestore, 'videos'), videoData);
          console.log('Database Entry Created:', docRef.id);
          
          toast({
            title: "Content Published!",
            description: "AI analysis complete. Your media is live.",
          });
          
          // Reset and close
          setTitle('');
          setDescription('');
          setSelectedFile(null);
          setShowErrors(false);
          onClose();
        } catch (error: any) {
          console.error('Finalization Error:', error);
          toast({
            variant: "destructive",
            title: "Processing Error",
            description: "Failed to finalize media processing.",
          });
        } finally {
          setIsAnalyzing(false);
        }
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-white/10 bg-black/80 backdrop-blur-2xl text-foreground max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar p-0">
        <div className="p-6 sm:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
              <Upload className="text-accent" /> Share New Media
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-body">
              Upload your high-fidelity content to the decentralized mesh.
            </DialogDescription>
          </DialogHeader>

          {isUploading || isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <CircularProgress 
                progress={isUploading ? uploadProgress : 100} 
                label={isUploading ? "Uploading to mesh..." : "AI is analyzing your video..."} 
              />
              {isAnalyzing && (
                <div className="flex flex-col items-center gap-2 animate-pulse">
                  <Sparkles size={20} className="text-accent" />
                  <p className="text-[10px] text-accent font-code font-bold">OPTIMIZING SEO & SAFETY</p>
                </div>
              )}
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
                      Remove
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:neon-glow transition-all">
                      <Upload className="text-muted-foreground group-hover:text-accent" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">Click to select or drag & drop</p>
                      <p className="text-[10px] text-muted-foreground mt-1">MP4, MOV, MP3, WAV (MAX 100MB)</p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label className={cn(showErrors && !title.trim() && "text-destructive")}>Media Title</Label>
                <Input 
                  placeholder="Deep Dive into React 19" 
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
                  placeholder="Tell the community about your content..." 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-accent min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className={cn(showErrors && !category && "text-destructive")}>Category</Label>
                <select 
                  className={cn(
                    "flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 appearance-none",
                    showErrors && !category && "border-destructive shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                  )}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="" disabled>Select a category</option>
                  {["Cybersecurity", "Social Life", "Computer Science", "Physics", "Tech", "Entertainment"].map(c => (
                    <option key={c} value={c} className="bg-background text-foreground">{c}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-white/5">
                {isUploading && (
                  <span className="text-xs font-code text-accent animate-pulse">
                    Uploading: {Math.round(uploadProgress)}%
                  </span>
                )}
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button type="button" variant="ghost" onClick={onClose} className="flex-1 sm:flex-none hover:bg-white/10">Cancel</Button>
                  <Button 
                    type="submit" 
                    className="flex-1 sm:flex-none bg-accent text-background hover:neon-glow font-bold"
                    disabled={isUploading || isAnalyzing}
                  >
                    {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" size={16} />}
                    PUBLISH CONTENT
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
