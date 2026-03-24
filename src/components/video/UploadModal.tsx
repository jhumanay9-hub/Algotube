
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Loader2, Video as VideoIcon } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [category, setCategory] = useState('Entertainment');

  const { firestore } = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    
    const videoData = {
      title,
      description,
      videoUrl,
      thumbnailUrl: `https://picsum.photos/seed/${Math.random()}/640/360`,
      uploaderId: user.uid,
      uploadDate: serverTimestamp(),
      viewsCount: 0,
      likesCount: 0,
      dislikesCount: 0,
      commentsCount: 0,
      processingStatus: 'ready',
      category,
      tags: title.split(' ').map(w => w.toLowerCase()).filter(w => w.length > 3),
    };

    try {
      const colRef = collection(firestore!, 'videos');
      await addDoc(colRef, videoData);
      
      toast({
        title: "Upload Successful!",
        description: "Your video is now live on AlgoTube.",
      });
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setVideoUrl('');
    } catch (error: any) {
      const contextualError = new FirestorePermissionError({
        operation: 'create',
        path: 'videos',
        requestResourceData: videoData,
      });
      errorEmitter.emit('permission-error', contextualError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-white/10 bg-black/80 backdrop-blur-2xl text-foreground max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
            <Upload className="text-accent" /> Share New Stream
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-body">
            Upload your high-fidelity content to the decentralized mesh.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpload} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Stream Title</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Video Source URL</Label>
              <Input 
                placeholder="https://storage.com/video.mp4" 
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-accent"
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
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white/10">Cancel</Button>
            <Button type="submit" className="bg-accent text-background hover:neon-glow font-bold" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Publish Stream"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
