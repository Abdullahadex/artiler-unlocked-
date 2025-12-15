'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, X, Loader2 } from 'lucide-react';
import { useCreateAuction } from '@/hooks/useAuctions';
import { supabase } from '@/integrations/supabase/client';

interface ImagePreview {
  file: File;
  preview: string;
}

export default function SubmissionForm() {
  const router = useRouter();
  const { user } = useAuth();
  const createAuction = useCreateAuction();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    materials: '',
    sizing: '',
    startPrice: '',
    requiredBidders: '3',
    endTime: '',
  });
  
  const [images, setImages] = useState<ImagePreview[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    files.forEach((file) => {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only JPEG, PNG, and WebP images are allowed`);
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File size must be less than 5MB`);
        return;
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages((prev) => [
            ...prev,
            {
              file,
              preview: reader.result as string,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to submit a piece');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images to Supabase storage
      const imageUrls: string[] = [];
      
      for (const imagePreview of images) {
        const fileExt = imagePreview.file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('auction-images')
          .upload(fileName, imagePreview.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from('auction-images')
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }

      // Calculate end time (default to 7 days from now if not specified)
      const endTime = formData.endTime 
        ? new Date(formData.endTime).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Create auction
      await createAuction.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        materials: formData.materials || null,
        sizing: formData.sizing || null,
        images: imageUrls,
        startPrice: parseInt(formData.startPrice),
        requiredBidders: parseInt(formData.requiredBidders),
        endTime,
      });

      toast.success('Piece submitted successfully! It will appear on The Floor shortly.');
      router.push('/floor');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit piece. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="ui-label">
          Piece Title *
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Midnight Velvet Gown"
          required
          className="bg-card border-border focus:border-accent"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="ui-label">
          Description
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your piece in detail..."
          rows={4}
          className="bg-card border-border focus:border-accent resize-none"
        />
      </div>

      {/* Images Upload */}
      <div className="space-y-2">
        <Label className="ui-label">
          Images * (At least 1 required)
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative aspect-square group">
              <img
                src={image.preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover rounded-sm border border-border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <label className="aspect-square border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="ui-label text-xs">Add Image</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
          )}
        </div>
        <p className="ui-caption">Upload up to 5 images. First image will be the main display.</p>
      </div>

      {/* Materials & Sizing */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="materials" className="ui-label">
            Materials
          </Label>
          <Input
            id="materials"
            value={formData.materials}
            onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
            placeholder="e.g., 100% Silk Velvet, Swarovski Crystals"
            className="bg-card border-border focus:border-accent"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sizing" className="ui-label">
            Sizing
          </Label>
          <Input
            id="sizing"
            value={formData.sizing}
            onChange={(e) => setFormData({ ...formData, sizing: e.target.value })}
            placeholder="e.g., EU 36-42 | Made to Order"
            className="bg-card border-border focus:border-accent"
          />
        </div>
      </div>

      {/* Pricing & Auction Details */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="startPrice" className="ui-label">
            Starting Price (€) *
          </Label>
          <Input
            id="startPrice"
            type="number"
            min="0"
            value={formData.startPrice}
            onChange={(e) => setFormData({ ...formData, startPrice: e.target.value })}
            placeholder="2800"
            required
            className="bg-card border-border focus:border-accent"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requiredBidders" className="ui-label">
            Required Bidders *
          </Label>
          <Input
            id="requiredBidders"
            type="number"
            min="1"
            max="10"
            value={formData.requiredBidders}
            onChange={(e) => setFormData({ ...formData, requiredBidders: e.target.value })}
            required
            className="bg-card border-border focus:border-accent"
          />
          <p className="ui-caption">Number of unique bidders needed to unlock</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime" className="ui-label">
            Auction End Date
          </Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            min={new Date().toISOString().slice(0, 16)}
            className="bg-card border-border focus:border-accent"
          />
          <p className="ui-caption">Defaults to 7 days from now</p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span className="ui-label">Submitting...</span>
            </>
          ) : (
            <span className="ui-label">Submit Piece</span>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/vault')}
          className="px-8 py-6"
        >
          <span className="ui-label">Cancel</span>
        </Button>
      </div>
    </form>
  );
}

