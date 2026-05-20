'use client';

import { useState, useCallback } from 'react';
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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
// Protocol Anti-Leakage: PII Sanitization
const PII_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b)|(@[A-Za-z0-9_]+)|(whatsapp|dm me|direct message|insta|instagram|twitter|x\.com)/i;


const stripExif = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const cleanFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: 'image/webp',
            });
            resolve(cleanFile);
          } else {
            reject(new Error('Blob creation failed'));
          }
        },
        'image/webp',
        0.9
      );
    };
    img.onerror = () => reject(new Error('Image loading failed'));
    img.src = url;
  });
};

export default function SubmissionForm() {
  const router = useRouter();
  const { user, profile, isWaitlisted } = useAuth();
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

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(async (file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only JPEG, PNG, and WebP images are allowed`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File size must be less than 5MB`);
        return;
      }

      if (file.type.startsWith('image/')) {
        // Zero-footprint processing (EXIF stripping via Canvas)
        try {
          const strippedFile = await stripExif(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setImages((prev) => [
              ...prev,
              {
                file: strippedFile,
                preview: reader.result as string,
              },
            ]);
          };
          reader.readAsDataURL(strippedFile);
        } catch (error) {
          toast.error(`Failed to sanitize image ${file.name}`);
        }
      }
    });
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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

    if (profile?.is_authorized_seller === false) {
      if (profile?.seller_status === 'PENDING') {
        toast.error('Your seller application is pending administrator approval. Please wait for authorization.');
      } else if (profile?.seller_status === 'NONE') {
        toast.error('You must apply for seller authorization in your vault before listing items.');
      } else {
        toast.error('[SYSTEM_ERROR]: Access Revoked. Your account has been administratively suspended.');
      }
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

    if (PII_REGEX.test(formData.description) || PII_REGEX.test(formData.materials)) {
      toast.error('[ERROR]: Contact information detected. Safety standards require data sanitization. Remove contact details to proceed.');
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrls: string[] = [];
      
      for (const imagePreview of images) {
        const fileExt = imagePreview.file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase
          .storage
          .from('auction-images')
          .upload(fileName, imagePreview.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase
          .storage
          .from('auction-images')
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }

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

      await createAuction.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        materials: formData.materials || null,
        sizing: formData.sizing || null,
        images: imageUrls,
        startPrice: priceInEUR,
        requiredBidders: 3,
        endTime,
      });

      toast.success('[SUCCESS]: Piece published to the Hub. Interest registration active.');
      await new Promise(resolve => setTimeout(resolve, 800));
      router.push('/intel');
    } catch (error) {
      console.error('Submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit piece. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, profile, images, formData, supabase, createAuction, isWaitlisted, router]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      <div className="space-y-2">
        <Label htmlFor="title" className="ui-label text-sm sm:text-base">
          Piece Title *
        </Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Midnight Velvet Gown"
          required
          className="bg-card border-border focus:border-accent text-sm sm:text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="ui-label text-sm sm:text-base">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your piece in detail..."
          rows={4}
          className="bg-card border-border focus:border-accent resize-none text-sm sm:text-base"
        />
      </div>

      <div className="space-y-2">
        <Label className="ui-label text-sm sm:text-base">
          Images * (At least 1 required)
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
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
                id="images-upload"
                name="images"
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

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="materials" className="ui-label text-sm sm:text-base">
            Materials
          </Label>
          <Input
            id="materials"
            name="materials"
            value={formData.materials}
            onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
            placeholder="e.g., 100% Silk Velvet, Swarovski Crystals"
            className="bg-card border-border focus:border-accent text-sm sm:text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sizing" className="ui-label text-sm sm:text-base">
            Sizing
          </Label>
          <Input
            id="sizing"
            name="sizing"
            value={formData.sizing}
            onChange={(e) => setFormData({ ...formData, sizing: e.target.value })}
            placeholder="e.g., EU 36-42 | Made to Order"
            className="bg-card border-border focus:border-accent text-sm sm:text-base"
          />
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div className="p-4 sm:p-6 bg-accent/10 border border-accent/30 rounded-sm">
          <h3 className="heading-display text-lg sm:text-xl mb-3 sm:mb-4 text-accent">Auction Pricing</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="startPrice" className="ui-label text-sm sm:text-base text-accent">
                Starting Bid *
          </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
          <Input
            id="startPrice"
            name="startPrice"
            type="number"
            min="0"
                    step="0.01"
            value={formData.startPrice}
            onChange={(e) => setFormData({ ...formData, startPrice: e.target.value })}
                    placeholder="2800.00"
            required
                    className="bg-card border-accent/50 focus:border-accent text-base sm:text-lg font-serif"
                  />
                </div>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="w-full sm:w-32 bg-card border-accent/50 focus:border-accent">
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
                <p className="ui-caption text-xs sm:text-sm text-accent">
                  ≈ €{Math.round(convertToEUR(parseFloat(formData.startPrice), formData.currency)).toLocaleString()} EUR
                </p>
              )}
              <p className="ui-caption text-xs sm:text-sm">Price will be converted to EUR for display</p>
        </div>
        <div className="space-y-2">
              <Label htmlFor="requiredBidders" className="ui-label text-sm sm:text-base">
                Required Bidders
          </Label>
              <div className="relative">
          <Input
            id="requiredBidders"
            type="number"
                  value="3"
                  readOnly
                  disabled
                  className="bg-muted border-border text-muted-foreground cursor-not-allowed text-sm sm:text-base"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="ui-label text-xs text-muted-foreground">Fixed</span>
                </div>
              </div>
              <p className="ui-caption text-xs sm:text-sm">3 unique bidders required to unlock (compulsory)</p>
        </div>
        <div className="space-y-2">
              <Label htmlFor="endTime" className="ui-label text-sm sm:text-base">
            Auction End Date
          </Label>
          <Input
            id="endTime"
            name="endTime"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            min={new Date().toISOString().slice(0, 16)}
                max={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                className="bg-card border-border focus:border-accent text-sm sm:text-base"
          />
              <p className="ui-caption text-xs sm:text-sm">Maximum 3 days from now (defaults to 3 days)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span className="ui-label text-sm sm:text-base">Submitting...</span>
            </>
          ) : (
            <span className="ui-label text-sm sm:text-base">Submit Piece</span>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/vault')}
          className="px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto"
        >
          <span className="ui-label text-sm sm:text-base">Cancel</span>
        </Button>
      </div>
    </form>
  );
}

