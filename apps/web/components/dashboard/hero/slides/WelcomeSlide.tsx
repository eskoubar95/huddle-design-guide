'use client'

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export const WelcomeSlide = () => {
  const router = useRouter();

  return (
    <div className="relative h-full w-full flex flex-col justify-center items-center text-center p-6 md:p-12 z-10">
      <h2 className="text-xl md:text-2xl font-mono text-white font-bold tracking-widest uppercase mb-4">
        Welcome to Huddle
      </h2>
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight mb-8 max-w-4xl">
        The Ultimate Jersey Marketplace
      </h1>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => router.push("/marketplace")} 
          size="lg" 
          className="bg-white text-black hover:bg-white/90 font-bold text-lg px-8 rounded-full"
        >
          Explore Marketplace
        </Button>
        <Button 
          onClick={() => router.push("/sign-up")} 
          size="lg" 
          variant="outline" 
          className="text-white border-white hover:bg-white/10 font-bold text-lg px-8 rounded-full"
        >
          Join the Club
        </Button>
      </div>
    </div>
  );
};

