'use client'

import { Trash2, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface WardrobeActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onSetPublic: () => void;
  onSetPrivate: () => void;
  onClearSelection: () => void;
}

export function WardrobeActionBar({
  selectedCount,
  onDelete,
  onSetPublic,
  onSetPrivate,
  onClearSelection,
}: WardrobeActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSetPublic}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Make Public
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSetPrivate}
                className="gap-2"
              >
                <EyeOff className="w-4 h-4" />
                Make Private
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
