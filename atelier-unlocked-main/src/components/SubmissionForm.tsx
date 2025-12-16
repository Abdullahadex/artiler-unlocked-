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
import { getSupabaseClient } from '@/integrations/supabase/client';
import { convertToEUR, CURRENCY_NAMES, getCurrencySymbol } from '@/lib/currency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ImagePreview {
  file: File;
  preview: string;
}

export default function SubmissionForm() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const createAuction = useCreateAuction();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = getSupabaseClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    materials: '',
    sizing: '',
    startPrice: '',
    currency: 'EUR',
    requiredBidders: '3',
    endTime: '',
  });
  
  const [images, setImages] = useState<ImagePreview[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    files.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only JPEG, PNG, and WebP images are allowed`);
        return;
      }

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

    if (profile?.role !== 'designer') {
      toast.error('Only designers can submit pieces. Please update your role in your vault.');
      router.push('/vault');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }
    
    if (!supabase) {
      toast.error('Database not configured');
      return;
    }

    setIsSubmitting(true);

    try {
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

        const { data: { publicUrl } } = supabase
          .storage
          .from('auction-images')
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }

      const MAX_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const maxEndTime = now + MAX_DURATION_MS;
      
      let endTime: string;
      if (formData.endTime) {
        const localDate = new Date(formData.endTime);
        const localDateMs = localDate.getTime();
        
        if (isNaN(localDateMs) || localDateMs <= now) {
          toast.error('End date must be in the future');
          setIsSubmitting(false);
          return;
        }
        
        if (localDateMs > maxEndTime) {
          toast.error('Auction duration cannot exceed 3 days');
          setIsSubmitting(false);
          return;
        }
        
        endTime = localDate.toISOString();
      } else {
        const defaultEndDate = new Date(now + MAX_DURATION_MS);
        endTime = defaultEndDate.toISOString();
      }

      const priceInOriginalCurrency = parseFloat(formData.startPrice);
      if (isNaN(priceInOriginalCurrency) || priceInOriginalCurrency <= 0) {
        toast.error('Please enter a valid starting price');
        setIsSubmitting(false);
        return;
      }

      const priceInEUR = Math.round(convertToEUR(priceInOriginalCurrency, formData.currency));

      const newAuction = await createAuction.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        materials: formData.materials || null,
        sizing: formData.sizing || null,
        images: imageUrls,
        startPrice: priceInEUR,
        requiredBidders: 3,
        endTime,
      });

      toast.success('Piece submitted successfully! Redirecting to The Floor...');
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      router.push('/floor');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit piece. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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

      <div className="space-y-6">
        <div className="p-6 bg-accent/10 border border-accent/30 rounded-sm">
          <h3 className="heading-display text-xl mb-4 text-accent">Auction Pricing</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="startPrice" className="ui-label text-accent">
                Starting Bid *
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="startPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.startPrice}
                    onChange={(e) => setFormData({ ...formData, startPrice: e.target.value })}
                    placeholder="2800.00"
                    required
                    className="bg-card border-accent/50 focus:border-accent text-lg font-serif"
                  />
                </div>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="w-32 bg-card border-accent/50 focus:border-accent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CURRENCY_NAMES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {getCurrencySymbol(code)} {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.startPrice && !isNaN(parseFloat(formData.startPrice)) && formData.currency !== 'EUR' && (
                <p className="ui-caption text-accent">
                  ≈ €{Math.round(convertToEUR(parseFloat(formData.startPrice), formData.currency)).toLocaleString()} EUR
                </p>
              )}
              <p className="ui-caption">Price will be converted to EUR for display</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="requiredBidders" className="ui-label">
                Required Bidders
              </Label>
              <div className="relative">
                <Input
                  id="requiredBidders"
                  type="number"
                  value="3"
                  readOnly
                  disabled
                  className="bg-muted border-border text-muted-foreground cursor-not-allowed"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="ui-label text-xs text-muted-foreground">Fixed</span>
                </div>
              </div>
              <p className="ui-caption">3 unique bidders required to unlock (compulsory)</p>
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
                max={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                className="bg-card border-border focus:border-accent"
              />
              <p className="ui-caption">Maximum 3 days from now (defaults to 3 days)</p>
            </div>
          </div>
        </div>
      </div>

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

