'use client'

import { ImageIcon, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge as BadgeUI } from "@/components/ui/badge";

interface ImageFile {
  id: string;
  file: File;
  preview: string;
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
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragEnd={onDragEnd}
              className="relative aspect-3/4 rounded-lg border-2 border-border overflow-hidden group cursor-move hover:border-primary transition-colors"
            >
              <img
                src={image.preview}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />
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
              {index === 0 && (
                <BadgeUI className="absolute top-2 left-2">Cover</BadgeUI>
              )}
            </div>
          ))}

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

