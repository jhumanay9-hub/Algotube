
'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Loader2, Video as VideoIcon, Music, FileVideo, CheckCircle2 } from 'lucide-react';
import { useFirestore, useUser, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CircularProgress = ({ progress }: { progress: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
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
    </div>
  );
};

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tech');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    if (!user || !selectedFile || !storage || !firestore) return;

    setIsUploading(true);
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
        console.error("Upload error:", error);
        setIsUploading(false);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: error.message,
        });
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        
        const videoData = {
          title,
          description,
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
          tags: title.split(' ').map(w => w.toLowerCase()).filter(w => w.length > 3),
        };

        try {
          await addDoc(collection(firestore, 'videos'), videoData);
          toast({
            title: "Content Published!",
            description: "Your media is now live on the mesh.",
          });
          onClose();
          setTitle('');
          setDescription('');
          setSelectedFile(null);
          setUploadProgress(0);
        } catch (error: any) {
          const contextualError = new FirestorePermissionError({
            operation: 'create',
            path: 'videos',
            requestResourceData: videoData,
          });
          errorEmitter.emit('permission-error', contextualError);
        } finally {
          setIsUploading(false);
        }
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-white/10 bg-black/80 backdrop-blur-2xl text-foreground max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
            <Upload className="text-accent" /> Share New Media
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-body">
            Upload your high-fidelity content to the decentralized mesh.
          </DialogDescription>
        </DialogHeader>

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-6">
            <CircularProgress progress={uploadProgress} />
            <div className="text-center">
              <h3 className="text-lg font-headline font-bold text-accent animate-pulse">
                UPLOADING TO MESH
              </h3>
              <p className="text-xs text-muted-foreground font-code mt-1">
                {selectedFile?.name}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="space-y-4 mt-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-accent/40 hover:bg-white/5 transition-all group"
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
                  <span className="text-sm font-code text-accent font-bold">{selectedFile.name}</span>
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
              <Label>Media Title</Label>
              <Input 
                placeholder="Deep Dive into React 19" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-accent"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Tell the community about your content..." 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-accent min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="Tech">Tech</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Education">Education</option>
                <option value="Gaming">Gaming</option>
                <option value="Music">Music</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white/10">Cancel</Button>
              <Button type="submit" className="bg-accent text-background hover:neon-glow font-bold" disabled={!selectedFile}>
                PUBLISH CONTENT
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
