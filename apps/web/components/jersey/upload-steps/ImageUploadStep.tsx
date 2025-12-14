'use client'

import { ImageIcon, GripVertical, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status?: 'pending' | 'uploading' | 'ready' | 'error';
  error?: string;
}

interface ImageUploadStepProps {
  images: ImageFile[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

export const ImageUploadStep = ({
  images,
  fileInputRef,
  onFileSelect,
  onRemoveImage,
  onDragStart,
  onDragOver,
  onDragEnd,
}: ImageUploadStepProps) => {
  return (
    <div className="space-y-6">
      <div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFileSelect}
          className="hidden"
          aria-label="Upload jersey images"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {images.map((image, index) => {
            const isUploading = image.status === 'uploading' || image.status === 'pending';
            const isError = image.status === 'error';
            const isReady = image.status === 'ready';

            return (
              <div
                key={image.id}
                draggable={!isUploading}
                onDragStart={() => !isUploading && onDragStart(index)}
                onDragOver={(e) => !isUploading && onDragOver(e, index)}
                onDragEnd={onDragEnd}
                className={cn(
                  "relative aspect-3/4 rounded-lg border-2 overflow-hidden group transition-colors",
                  isError
                    ? "border-destructive cursor-not-allowed"
                    : isUploading
                    ? "border-border cursor-wait"
                    : "border-border cursor-move hover:border-primary"
                )}
              >
                {/* Skeleton loader for uploading state */}
                {isUploading && (
                  <div className="absolute inset-0 bg-secondary animate-pulse">
                    <div className="absolute inset-4 rounded-lg border border-border/40">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                      </div>
                    </div>
                    {/* Sonar effect overlay */}
                    <div className="absolute inset-0 bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
                  </div>
                )}

                {/* Error state */}
                {isError && (
                  <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center p-2">
                    <p className="text-xs text-destructive text-center">{image.error || 'Upload failed'}</p>
                  </div>
                )}

                {/* Image preview */}
                <img
                  src={image.preview}
                  alt={`Upload ${index + 1}`}
                  className={cn(
                    "w-full h-full object-cover transition-opacity",
                    isUploading ? "opacity-30" : "opacity-100"
                  )}
                />

                {/* Overlay controls (hidden during upload) */}
                {!isUploading && (
                  <>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <GripVertical className="w-6 h-6 text-white" />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRemoveImage(image.id)}
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {/* Cover badge */}
                {index === 0 && (
                  <BadgeUI className="absolute top-2 left-2">Cover</BadgeUI>
                )}

                {/* Upload status badge */}
                {isUploading && (
                  <BadgeUI variant="secondary" className="absolute top-2 right-2">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Uploading...
                  </BadgeUI>
                )}
              </div>
            );
          })}

          {images.length < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-3/4 rounded-lg border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Add more photos"
            >
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground text-center px-2">
                Add Photo
                <br />
                <span className="text-xs">Max 5 images, drag to reorder</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

