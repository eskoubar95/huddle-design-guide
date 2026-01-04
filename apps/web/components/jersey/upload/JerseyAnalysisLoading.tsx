"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shirt, Search, Database, Sparkles, ScanLine } from "lucide-react";

export const JerseyAnalysisLoading = () => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 0: Initial (0s) - Upload/Prep
    // Stage 1: Analyzing (3s) - Vision AI
    // Stage 2: Matching (9s) - Metadata Search
    // Stage 3: Finalizing (15s) - Completion

    const timers = [
      setTimeout(() => setStage(1), 3000),
      setTimeout(() => setStage(2), 9000),
      setTimeout(() => setStage(3), 15000),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-8">
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Background Pulse Ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/20"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-4 rounded-full border border-primary/10"
          animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.05, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />

        <AnimatePresence mode="wait">
          {/* Stage 0 & 1: Scanning Jersey */}
          {stage <= 1 && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative flex items-center justify-center"
            >
              <div className="relative bg-muted/30 p-6 rounded-2xl border border-border">
                <Shirt className="w-24 h-24 text-muted-foreground" strokeWidth={1} />
                
                {/* Scanning Beam */}
                <motion.div
                  className="absolute left-0 right-0 h-1 bg-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.6)]"
                  initial={{ top: "10%" }}
                  animate={{ top: "90%" }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    repeatType: "reverse", 
                    ease: "easeInOut" 
                  }}
                />
                
                {/* Scanning Icon Overlay */}
                <div className="absolute -right-3 -top-3 bg-background p-1.5 rounded-full border border-border shadow-sm">
                  <ScanLine className="w-4 h-4 text-primary animate-pulse" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Stage 2: Data Lookup */}
          {stage === 2 && (
            <motion.div
              key="lookup"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative flex items-center justify-center"
            >
              <div className="relative bg-muted/30 p-6 rounded-2xl border border-border">
                <Database className="w-24 h-24 text-muted-foreground" strokeWidth={1} />
                
                {/* Floating Search Icon */}
                <motion.div
                  className="absolute -right-4 -bottom-4 bg-primary text-primary-foreground p-3 rounded-full shadow-lg"
                  animate={{ 
                    y: [0, -5, 0],
                    rotate: [0, 10, 0] 
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Search className="w-6 h-6" />
                </motion.div>

                {/* Data particles */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-primary rounded-full"
                    initial={{ opacity: 0, x: 0, y: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      x: [0, (i - 1) * 30],
                      y: [0, -40]
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      delay: i * 0.4,
                      ease: "easeOut"
                    }}
                    style={{ left: '50%', top: '50%' }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Stage 3: Finalizing */}
          {stage === 3 && (
            <motion.div
              key="finalizing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex items-center justify-center"
            >
              <div className="relative bg-muted/30 p-6 rounded-2xl border border-border">
                <Sparkles className="w-24 h-24 text-primary" strokeWidth={1} />
                <motion.div
                  className="absolute inset-0 bg-primary/5 rounded-2xl"
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center space-y-2"
          >
            <h3 className="text-xl font-semibold tracking-tight">
              {stage === 0 && "Uploading and scanning..."}
              {stage === 1 && "AI Vision analyzing details..."}
              {stage === 2 && "Matching against database..."}
              {stage === 3 && "Finalizing results..."}
            </h3>
            <p className="text-muted-foreground text-sm">
              {stage === 0 && "Preparing your images for analysis"}
              {stage === 1 && "Finding sponsors, badges and jersey type"}
              {stage === 2 && "Identifying season, club and players"}
              {stage === 3 && "Almost done, finalizing everything"}
            </p>
          </motion.div>
        </AnimatePresence>
        
        <div className="pt-4">
          <div className="h-1.5 w-48 mx-auto bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: stage === 3 ? "95%" : `${(stage + 1) * 25}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

