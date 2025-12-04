import { useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "@/hooks/use-toast";
import imageCompression from "browser-image-compression";

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 5;

interface UseJerseyImageUploadReturn {
  images: ImageFile[];
  uploadedImageUrls: string[];
  draggedIndex: number | null;
  addImages: (files: File[]) => Promise<ImageFile[]>;
  removeImage: (id: string) => void;
  reorderImages: (fromIndex: number, toIndex: number) => void;
  setDraggedIndex: (index: number | null) => void;
  uploadToDraft: (draftJerseyId: string, userId: string, imagesToUpload?: ImageFile[]) => Promise<string[]>;
  reset: () => void;
}

function validateImageFiles(files: File[]): { valid: File[]; invalid: string[] } {
  const invalid: string[] = [];
  const valid: File[] = [];

  files.forEach((file) => {
    if (file.size > MAX_FILE_SIZE) {
      invalid.push(file.name);
    } else {
      valid.push(file);
    }
  });

  return { valid, invalid };
}

function createImageFile(file: File): ImageFile {
  return {
    id: Math.random().toString(36),
    file,
    preview: URL.createObjectURL(file),
  };
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
  }
  return url;
}

/**
 * Resize image in browser before upload to reduce file size and avoid Edge Function CPU timeout
 * Max dimension: 2000px on longest side (preserves aspect ratio)
 * Falls back to original file if compression fails
 */
async function resizeImageBeforeUpload(file: File): Promise<File> {
  const options = {
    // maxSizeMB removed - files are already < 1MB, no need for aggressive compression
    maxWidthOrHeight: 2000, // Max dimension on longest side
    useWebWorker: true, // Use Web Worker for better performance
    fileType: file.type, // Preserve original format
  };

  try {
    const compressedFile = await imageCompression(file, options);
    
    // 🔧 FIX: Bevar originalt filnavn og extension
    // browser-image-compression kan returnere File med generisk navn (fx "image.blob")
    // Vi wrapper det i en ny File med originalt navn for at bevare korrekt extension
    const preservedFile = new File([compressedFile], file.name, { type: file.type });
    
    // Log compression results in development
    if (process.env.NODE_ENV === 'development') {
      const originalSize = (file.size / 1024 / 1024).toFixed(2);
      const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
      console.log(
        `[Image Resize] Original: ${originalSize}MB → Compressed: ${compressedSize}MB`
      );
    }
    
    return preservedFile;
  } catch (error) {
    console.warn("[Image Resize] Browser compression failed, using original:", error);
    // Fallback to original if compression fails
    return file;
  }
}

async function uploadSingleImage(
  image: ImageFile,
  draftJerseyId: string,
  userId: string,
  token: string,
  sortOrder?: number
): Promise<string> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY not set");
  }

  // Resize image in browser before upload to reduce file size and avoid Edge Function CPU timeout
  const resizedFile = await resizeImageBeforeUpload(image.file);

  const formData = new FormData();
  formData.append("file", resizedFile);
  formData.append("jerseyId", draftJerseyId);
  formData.append("userId", userId);
  if (sortOrder !== undefined) {
    formData.append("sortOrder", sortOrder.toString());
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/upload-jersey-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`, // Supabase anon key for Edge Function access
      "X-Clerk-Token": token, // Clerk token in custom header
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || "Upload failed");
  }

  const data = await response.json();
  return data.url;
}

export function useJerseyImageUpload(): UseJerseyImageUploadReturn {
  const { getToken } = useAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addImages = useCallback(
    async (files: File[]): Promise<ImageFile[]> => {
      const remainingSlots = MAX_IMAGES - images.length;

      if (files.length > remainingSlots) {
        toast({
          title: "Too Many Images",
          description: `You can only upload ${remainingSlots} more image(s)`,
          variant: "destructive",
        });
        return [];
      }

      const { valid, invalid } = validateImageFiles(files);

      if (invalid.length > 0) {
        toast({
          title: "File Too Large",
          description: `${invalid.join(", ")} ${invalid.length === 1 ? "is" : "are"} larger than 10MB`,
          variant: "destructive",
        });
      }

      const newImages = valid.map(createImageFile);
      setImages((prev) => [...prev, ...newImages]);
      return newImages;
    },
    [images.length]
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      const [draggedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, draggedImage);
      return newImages;
    });
  }, []);

  const uploadToDraft = useCallback(
    async (draftJerseyId: string, userId: string, imagesToUpload?: ImageFile[]): Promise<string[]> => {
      const token = await getToken();
      if (!token) return [];

      // Use provided images or filter from state
      const imagesToProcess = imagesToUpload || images.filter(
        (img) => !uploadedImageUrls.some((url) => url.includes(img.id))
      );

      if (imagesToProcess.length === 0) return [];

      try {
        const urls: string[] = [];
        // Upload images in order, using their index as sort_order
        // First image (index 0) = cover, subsequent images = 1, 2, 3...
        for (let i = 0; i < imagesToProcess.length; i++) {
          const image = imagesToProcess[i];
          // Find the actual index in the full images array to preserve user's ordering
          const actualIndex = images.findIndex((img) => img.id === image.id);
          const sortOrder = actualIndex >= 0 ? actualIndex : i;
          const url = await uploadSingleImage(image, draftJerseyId, userId, token, sortOrder);
          urls.push(url);
        }
        setUploadedImageUrls((prev) => [...prev, ...urls]);
        return urls;
      } catch (error) {
        console.error("Failed to upload images:", error);
        toast({
          title: "Upload Error",
          description: error instanceof Error ? error.message : "Failed to upload images",
          variant: "destructive",
        });
        throw error;
      }
    },
    [images, uploadedImageUrls, getToken]
  );

  const reset = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setUploadedImageUrls([]);
    setDraggedIndex(null);
  }, [images]);

  return {
    images,
    uploadedImageUrls,
    draggedIndex,
    addImages,
    removeImage,
    reorderImages,
    setDraggedIndex,
    uploadToDraft,
    reset,
  };
}

