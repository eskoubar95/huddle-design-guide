"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Bell, Search as SearchIcon, Settings, LogOut, User, LayoutDashboard, History, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuShortcut, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function StyleGuidePage() {
  const [date, setDate] = useState<Date>();

  return (
    <div className="container py-10 space-y-16 max-w-5xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Huddle Design System</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Official design tokens and component library. Engineered for a &quot;Dark Mode Default&quot; aesthetic using Onyx Scale &amp; Lime Flash accents.
        </p>
      </div>

      <Separator />

      {/* 1. Colors Section */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">1</span>
          <h2 className="text-3xl font-bold text-foreground">Color Palette</h2>
        </div>
        
        <div className="grid gap-10">
          {/* Primary Colors */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              Primary <span className="text-sm font-normal text-muted-foreground">(Lime Flash)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ColorCard name="Primary" class="bg-primary" hex="#80FF00" text="text-primary-foreground" />
              <ColorCard name="Primary Dark" class="bg-primary-dark" hex="#66CC00" text="text-white" />
              <ColorCard name="Primary Glow" class="bg-primary-glow" hex="#99FF33" text="text-black" />
              <ColorCard name="Primary Light" class="bg-primary-light" hex="#B3FF66" text="text-black" />
            </div>
          </div>

          {/* Background / Onyx Scale */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              Onyx Scale <span className="text-sm font-normal text-muted-foreground">(Backgrounds)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ColorCard name="Background" class="bg-background border" hex="#141414" text="text-white" />
              <ColorCard name="Card (Soft)" class="bg-card border" hex="#1E1E1E" text="text-white" />
              <ColorCard name="Elevated" class="bg-[#262626] border" hex="#262626" text="text-white" />
              <ColorCard name="Border" class="bg-border" hex="#333333" text="text-white" />
            </div>
          </div>

          {/* Hype Colors */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              Hype Colors <span className="text-sm font-normal text-muted-foreground">(Accents)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ColorCard name="Electric Blue" class="bg-hype-blue" hex="#00F0FF" text="text-black" />
              <ColorCard name="Hot Pink" class="bg-hype-pink" hex="#FF00CC" text="text-white" />
              <ColorCard name="Cyber Yellow" class="bg-hype-yellow" hex="#FFFF00" text="text-black" />
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* 2. Typography Section */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-black font-bold text-lg">2</span>
          <h2 className="text-3xl font-bold text-foreground">Typography</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Heading 1</p>
              <h1 className="text-4xl font-bold tracking-tight">The quick brown fox jumps over the lazy dog</h1>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Heading 2</p>
              <h2 className="text-3xl font-semibold tracking-tight">The quick brown fox jumps over the lazy dog</h2>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Heading 3</p>
              <h3 className="text-2xl font-semibold tracking-tight">The quick brown fox jumps over the lazy dog</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Heading 4</p>
              <h4 className="text-xl font-semibold tracking-tight">The quick brown fox jumps over the lazy dog</h4>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Body Large (Lead)</p>
              <p className="text-lg text-muted-foreground">
                A seamless marketplace for football enthusiasts. Buy, sell, and trade authentic jerseys with confidence.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Body Default</p>
              <p className="leading-7">
                Once you place a bid, funds are held securely until the auction ends. If you win, the jersey is shipped directly to our authentication center for verification.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Small / Metadata</p>
              <p className="text-sm text-muted-foreground font-medium">
                Posted 2 hours ago • Ends in 3d 4h
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Monospace (Numbers/Code)</p>
              <p className="font-mono text-sm bg-muted p-2 rounded inline-block">
                ORD-2025-8821X
              </p>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* 3. Shadows & Glows */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-hype-blue text-black font-bold text-lg">3</span>
          <h2 className="text-3xl font-bold text-foreground">Shadows & Effects</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-xl bg-card border shadow-card flex flex-col items-center justify-center gap-4 h-48">
            <p className="font-medium">Shadow Card</p>
            <p className="text-xs text-muted-foreground text-center">Standard depth for cards<br/>`shadow-card`</p>
          </div>
          
          <div className="p-8 rounded-xl bg-background border border-primary/50 shadow-[0_0_10px_hsl(90_100%_50%_/_0.25)] flex flex-col items-center justify-center gap-4 h-48 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5"></div>
            <p className="font-medium text-primary relative z-10">Primary Glow</p>
            <p className="text-xs text-muted-foreground text-center relative z-10">Active items & highlights<br/>Ultra tight (10px)</p>
          </div>

          <div className="p-8 rounded-xl bg-background border border-hype-blue/50 shadow-[0_0_10px_hsl(190_100%_50%_/_0.25)] flex flex-col items-center justify-center gap-4 h-48 relative overflow-hidden">
             <div className="absolute inset-0 bg-hype-blue/5"></div>
            <p className="font-medium text-hype-blue relative z-10">Hype Glow</p>
            <p className="text-xs text-muted-foreground text-center relative z-10">Futures & Tech<br/>Ultra tight (10px)</p>
          </div>
        </div>
      </section>

      <Separator />

      {/* 4. UI Components */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-hype-pink text-white font-bold text-lg">4</span>
          <h2 className="text-3xl font-bold text-foreground">UI Components</h2>
        </div>

        <div className="grid gap-12">
          
          {/* Interactive Elements */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold border-b pb-2">Buttons & Inputs</h3>
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Button Variants</p>
                <div className="flex flex-wrap gap-4">
                  <Button variant="brand">Brand Action</Button>
                  <Button variant="secondary">Secondary (White)</Button>
                  <Button variant="default">Primary (Standard)</Button>
                  <Button variant="outline">Outline (Minimal)</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon" variant="outline">
                    <span className="h-4 w-4">★</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-4 max-w-sm">
                <p className="text-sm text-muted-foreground">Input Fields</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" placeholder="name@example.com" />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="search">Search</Label>
                     <div className="relative">
                       <Input id="search" placeholder="Search jerseys..." className="pl-9 bg-white/5 border-white/10 focus-visible:border-primary/50 focus-visible:ring-primary/20" />
                       <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">🔍</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Badges */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold border-b pb-2">Status & Indicators</h3>
            <div className="flex flex-wrap gap-8">
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Badges</p>
                <div className="flex gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
                <div className="flex gap-2">
                   <Badge className="bg-hype-blue/10 text-hype-blue hover:bg-hype-blue/20 border border-hype-blue/20">Tech</Badge>
                   <Badge className="bg-hype-pink/10 text-hype-pink hover:bg-hype-pink/20 border border-hype-pink/20">Hot</Badge>
                   <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">Active</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Avatars</p>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-12 w-12 ring-2 ring-primary">
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                      <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-background"></span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Live Indicators</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card border shadow-sm cursor-default">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                    <span className="text-xs font-medium">Live Auction</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-hype-pink/10 border border-hype-pink/20 cursor-default">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hype-pink opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-hype-pink"></span>
                    </span>
                    <span className="text-xs font-medium text-hype-pink">Trending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold border-b pb-2">Card System</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Standard Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Standard Card</CardTitle>
                  <CardDescription>Uses bg-card and default border</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">The foundation of the interface. Subtle separation from the background.</p>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="outline" className="w-full">Action</Button>
                </CardFooter>
              </Card>

              {/* Highlight Card */}
              <Card className="border-primary/50 bg-primary/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-bl-lg">
                  FEATURED
                </div>
                <CardHeader>
                  <CardTitle className="text-primary">Highlight Card</CardTitle>
                  <CardDescription>Uses primary accents</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">For promoted content or active user items.</p>
                </CardContent>
                <CardFooter>
                  <Button size="sm" className="w-full">Main Action</Button>
                </CardFooter>
              </Card>

              {/* Glass Card */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm flex flex-col">
                <div className="space-y-2 mb-4">
                  <h3 className="font-semibold leading-none tracking-tight text-white">Glass Overlay</h3>
                  <p className="text-sm text-muted-foreground">Frosted glass effect</p>
                </div>
                <div className="flex-1 text-sm text-muted-foreground">
                  Perfect for floating panels, toasts, or content over complex backgrounds.
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Glass Footer</span>
                  <Button size="sm" variant="ghost" className="h-8 text-white hover:bg-white/10">Close</Button>
                </div>
              </div>
            </div>

            <h4 className="text-lg font-medium mt-8 mb-4 text-muted-foreground">Specialty Variants (Inspired by Sorare/Missions)</h4>
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Corner Glow Card (Missions Style) */}
              <div className="relative rounded-2xl border bg-card overflow-hidden">
                {/* Top-left glow effect */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 blur-3xl -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"></div>
                
                <div className="p-6 relative z-10 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold tracking-tight uppercase">Missions</h3>
                    <Badge variant="secondary" className="bg-white/5 border-white/10">
                      <span className="mr-1">🔒</span> Limited
                    </Badge>
                  </div>

                  {/* Inner Action Cards */}
                  <div className="space-y-3">
                    <div className="group p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-1 rounded bg-primary/20 text-primary">
                           {/* Icon placeholder */}
                           <div className="w-4 h-4 border-2 border-primary rounded-sm"></div>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">Bundesliga Picker</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            Pick a player with an L15 between 10 and 45...
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="group p-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-1 rounded bg-white/10 text-muted-foreground">
                           {/* Icon placeholder */}
                           <div className="w-4 h-4 border-2 border-current rounded-sm"></div>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">Decisive Picker</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Earn 200 XP for each player you select...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-white/5 hover:bg-white/10 border-0 text-white">View all</Button>
                </div>
              </div>

              {/* Corner Gradient Card (Refined Pro) */}
              <div className="relative p-[1px] rounded-2xl bg-gradient-to-br from-hype-pink via-border to-border overflow-hidden group">
                {/* Inner background with matching corner glow */}
                <div className="relative h-full bg-[#141414] rounded-2xl p-6 flex flex-col justify-between overflow-hidden">
                  
                  {/* The Glow: Radial gradient from top-left */}
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,_hsl(320_100%_50%_/_0.15),_transparent_70%)] pointer-events-none"></div>
                  
                  <div className="relative z-10 space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-hype-pink/20 text-hype-pink flex items-center justify-center mb-4 border border-hype-pink/50">
                      <span className="font-bold text-lg">★</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">Pro Membership</h3>
                    <p className="text-sm text-muted-foreground">
                      Unlock exclusive access to limited edition drops with a single focused highlight.
                    </p>
                  </div>
                  <div className="relative z-10 mt-6">
                     <Button variant="secondary" className="w-full border-0">Upgrade Now</Button>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          {/* Jersey Cards Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold border-b pb-2">Jersey Cards Context</h3>
            <div className="grid md:grid-cols-4 gap-6">
              
              {/* 1. Marketplace: Auction */}
              <div className="group rounded-xl bg-card border hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col shadow-card hover:shadow-md">
                <div className="aspect-[4/5] bg-[#1a1a1a] relative flex items-center justify-center overflow-hidden">
                   <div className="absolute top-3 left-3 z-10">
                     <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hype-yellow opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-hype-yellow"></span>
                        </span>
                        <span className="text-[10px] font-bold text-white uppercase tracking-wide">Live</span>
                     </div>
                   </div>
                   <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black text-white border-0 backdrop-blur-sm">
                       ♥
                     </Button>
                   </div>
                   <img 
                     src="/JW_FCK_1.jpg" 
                     alt="Jersey" 
                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                   />
                </div>
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <div>
                    <h4 className="font-bold text-foreground line-clamp-1">FC København 2024 Home</h4>
                    <p className="text-xs text-muted-foreground">Match Worn • Size L</p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border/50 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Current Bid</p>
                      <p className="text-lg font-mono font-medium text-primary">€ 4,250</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Ends In</p>
                      <p className="text-sm font-mono text-foreground">2h 14m</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Marketplace: Fixed Price */}
              <div className="group rounded-xl bg-card border hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col shadow-card">
                <div className="aspect-[4/5] bg-[#1a1a1a] relative flex items-center justify-center overflow-hidden">
                   <div className="absolute top-3 left-3 z-10">
                     <Badge variant="outline" className="bg-black/40 backdrop-blur-md text-white border-white/20">Fixed Price</Badge>
                   </div>
                   <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black text-white border-0 backdrop-blur-sm">
                       ♥
                     </Button>
                   </div>
                   <img 
                     src="/JW_FCK_1.jpg" 
                     alt="Jersey" 
                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 grayscale group-hover:grayscale-0"
                   />
                </div>
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <div>
                    <h4 className="font-bold text-foreground line-clamp-1">FCK Home (Classic)</h4>
                    <p className="text-xs text-muted-foreground">Authentic • BNWT • Size M</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <p className="text-lg font-mono font-medium text-white">€ 120</p>
                    <Button size="sm" variant="secondary" className="flex-1 h-8">Buy Now</Button>
                  </div>
                </div>
              </div>

              {/* 3. Wardrobe: Own (Manage) */}
              <div className="group rounded-xl bg-card border border-dashed hover:border-solid hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col shadow-sm">
                <div className="aspect-[4/5] bg-[#1a1a1a] relative flex items-center justify-center overflow-hidden">
                   <img 
                     src="/JW_FCK_2.jpg" 
                     alt="Jersey" 
                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                   />
                   {/* Hover Actions */}
                   <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                      <Button size="sm" variant="secondary" className="w-full">List for Sale</Button>
                      <Button size="sm" variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">Edit Details</Button>
                   </div>
                </div>
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div>
                    <h4 className="font-medium text-foreground line-clamp-1 text-sm">FC København 2024 Away</h4>
                    <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
                      <span className="bg-white/5 px-1.5 py-0.5 rounded">2024</span>
                      <span className="bg-white/5 px-1.5 py-0.5 rounded">Adidas</span>
                      <span className="bg-white/5 px-1.5 py-0.5 rounded">XL</span>
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border/50 flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">Acquired Oct 24</span>
                    <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-muted-foreground">Private</Badge>
                  </div>
                </div>
              </div>

              {/* 4. Wardrobe: Other User (View) */}
              <div className="group rounded-xl bg-card border hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col shadow-sm">
                <div className="aspect-[4/5] bg-[#1a1a1a] relative flex items-center justify-center overflow-hidden">
                   <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black text-white border-0 backdrop-blur-sm">
                       ♥
                     </Button>
                   </div>
                   <img 
                     src="/JW_FCK_2.jpg" 
                     alt="Jersey" 
                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                   />
                </div>
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div>
                    <h4 className="font-medium text-foreground line-clamp-1 text-sm">FC København 2024 Away</h4>
                    <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
                      <span className="bg-white/5 px-1.5 py-0.5 rounded">2024</span>
                      <span className="bg-white/5 px-1.5 py-0.5 rounded">Adidas</span>
                      <span className="bg-white/5 px-1.5 py-0.5 rounded">XL</span>
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border/50">
                    <Button size="sm" className="w-full h-8 text-xs bg-white/5 hover:bg-white/10 border-0 text-white">Make Offer</Button>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      <Separator />

      {/* 5. Forms & Interactive */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-black font-bold text-lg">5</span>
          <h2 className="text-3xl font-bold text-foreground">Forms & Interactive</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          
          <div className="space-y-6">
            <h3 className="text-xl font-semibold border-b pb-2">Input Fields</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Standard Input</Label>
                <Input placeholder="Enter text..." />
              </div>
              <div className="space-y-2">
                <Label>Disabled Input</Label>
                <Input disabled placeholder="Cannot type here" />
              </div>
              <div className="space-y-2">
                <Label>Textarea</Label>
                <Textarea placeholder="Type your message here." />
              </div>
              <div className="space-y-2">
                <Label>Select Menu</Label>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a fruit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                 <Label htmlFor="username-input">Username</Label>
                 <div className="relative">
                   <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">@</span>
                   <Input id="username-input" placeholder="username" className="pl-8 font-mono" />
                 </div>
              </div>

              <div className="space-y-2">
                <Label>Date Picker</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-11 bg-white/5 border-input/50 hover:bg-white/10 hover:border-white/20 hover:text-white",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      captionLayout="dropdown-buttons"
                      fromYear={1980}
                      toYear={2030}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-semibold border-b pb-2">Selection Controls</h3>
            <div className="space-y-6">
              
              <div className="space-y-3">
                <Label>Toggles</Label>
                <div className="flex items-center space-x-2">
                  <Switch id="airplane-mode" />
                  <Label htmlFor="airplane-mode">Airplane Mode</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="marketing-emails" defaultChecked />
                  <Label htmlFor="marketing-emails">Marketing Emails</Label>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Checkboxes</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Accept terms and conditions
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="checked" defaultChecked />
                  <label
                    htmlFor="checked"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Already agreed
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Radio Group</Label>
                <RadioGroup defaultValue="option-one">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option-one" id="option-one" />
                    <Label htmlFor="option-one">Option One</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option-two" id="option-two" />
                    <Label htmlFor="option-two">Option Two</Label>
                  </div>
                </RadioGroup>
              </div>

            </div>
          </div>

          {/* Dialog Demo (Static Visual) */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-xl font-semibold border-b pb-2">Dialog Overlay</h3>
            <div className="relative rounded-xl border bg-background shadow-2xl overflow-hidden max-w-lg mx-auto">
              {/* Backdrop simulation */}
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"></div>
              
              {/* Dialog Content */}
              <div className="relative z-10 bg-background p-6 space-y-4 border m-8 rounded-lg shadow-lg">
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">Edit Profile</h4>
                  <p className="text-sm text-muted-foreground">
                    Make changes to your profile here. Click save when you&apos;re done.
                  </p>
                </div>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" value="Nicklas Eskou" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="username" className="text-right">Username</Label>
                    <Input id="username" value="@nicklas" className="col-span-3" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Cancel</Button>
                  <Button type="submit">Save changes</Button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <Separator />

      {/* 6. Navigation & Header */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-black font-bold text-lg">6</span>
          <h2 className="text-3xl font-bold text-foreground">Navigation & Layout</h2>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold border-b pb-2">Global Top Navigation</h3>
          <p className="text-muted-foreground">
            Sticky header with glass effect (`bg-background/80 backdrop-blur-md`). Includes Search, Notifications, and User Profile.
            <br/>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 mt-2 inline-block">
               Optimized: No Logo • Enhanced Dropdowns • Glass Styling
            </span>
          </p>
          
          {/* HEADER DEMO CONTAINER */}
          <div className="rounded-xl border border-white/10 overflow-hidden relative shadow-2xl bg-[#0a0a0a]">
             {/* Fake Content Background */}
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background opacity-50 pointer-events-none"></div>
             
             {/* THE HEADER */}
             <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
               <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
                 
                 {/* Left: Empty (No Logo as requested) or Breadcrumbs could go here */}
                 <div className="flex items-center gap-2">
                   {/* <span className="text-muted-foreground text-sm">Dashboard / Overview</span> */}
                 </div>

                 {/* Right: Actions */}
                 <div className="flex items-center gap-2">
                   
                   {/* 1. Search Trigger (Round Glass Button) */}
                   <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-transparent hover:border-white/10">
                     <SearchIcon className="h-5 w-5" />
                   </Button>

                   {/* 2. Notifications Dropdown (Optimized) */}
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-transparent hover:border-white/10 group">
                         <Bell className="h-5 w-5 group-hover:scale-105 transition-transform" />
                         {/* Lime Dot Indicator */}
                         <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-primary rounded-full ring-2 ring-[#0a0a0a] animate-pulse"></span>
                       </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-96 p-0 border-white/10 bg-[#141414]/95 backdrop-blur-xl shadow-2xl rounded-xl overflow-hidden mt-2">
                       
                       {/* Header */}
                       <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                         <div className="flex items-center gap-2">
                           <h4 className="font-semibold text-sm text-white">Notifications</h4>
                           <Badge variant="brand" className="h-5 px-1.5 text-[10px] font-mono">3</Badge>
                         </div>
                         <button className="text-xs text-muted-foreground hover:text-primary transition-colors">
                           Mark all read
                         </button>
                       </div>

                       {/* List */}
                       <div className="max-h-[400px] overflow-y-auto">
                          <div className="group flex gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 relative">
                             <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary opacity-100"></div>
                             <div className="mt-1 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary border border-primary/20 shadow-[0_0_10px_hsl(90_100%_50%_/_0.1)]">
                               <History className="h-5 w-5" />
                             </div>
                             <div className="space-y-1 flex-1">
                               <div className="flex justify-between items-start">
                                 <p className="text-sm font-medium text-white">Auction Ending</p>
                                 <span className="text-[10px] text-muted-foreground">2m</span>
                               </div>
                               <p className="text-xs text-muted-foreground leading-relaxed">
                                 <span className="text-white font-medium">FCK 2024 Home</span> is ending in 15 minutes. Current bid: €4,250.
                               </p>
                             </div>
                          </div>

                          <div className="group flex gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 relative">
                             <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-hype-blue opacity-100"></div>
                             <div className="mt-1 h-10 w-10 rounded-full bg-hype-blue/10 flex items-center justify-center shrink-0 text-hype-blue border border-hype-blue/20 shadow-[0_0_10px_hsl(190_100%_50%_/_0.1)]">
                               <CreditCard className="h-5 w-5" />
                             </div>
                             <div className="space-y-1 flex-1">
                               <div className="flex justify-between items-start">
                                 <p className="text-sm font-medium text-white">Offer Received</p>
                                 <span className="text-[10px] text-muted-foreground">1h</span>
                               </div>
                               <p className="text-xs text-muted-foreground leading-relaxed">
                                 User <span className="text-white">@soccerfan</span> offered <span className="text-white font-mono">€85</span> for your Arsenal Away.
                               </p>
                               <div className="flex gap-2 mt-2">
                                 <Button size="sm" className="h-7 text-xs w-full bg-white/10 hover:bg-white/20 border-0 text-white">View</Button>
                                 <Button size="sm" variant="brand" className="h-7 text-xs w-full">Accept</Button>
                               </div>
                             </div>
                          </div>
                       </div>

                       {/* Footer */}
                       <div className="p-2 bg-white/5 border-t border-white/5">
                         <Button variant="ghost" size="sm" className="w-full text-xs h-8 text-muted-foreground hover:text-white hover:bg-white/5">
                           View all history
                         </Button>
                       </div>
                     </DropdownMenuContent>
                   </DropdownMenu>

                   {/* 3. User Avatar Dropdown */}
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-transparent p-0 ml-2 ring-2 ring-white/5 hover:ring-white/20 transition-all">
                         <Avatar className="h-10 w-10">
                           <AvatarImage src="https://github.com/shadcn.png" alt="@nicklas" />
                           <AvatarFallback>NE</AvatarFallback>
                         </Avatar>
                       </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent className="w-56 border-white/10 bg-[#141414]/95 backdrop-blur-xl" align="end" forceMount>
                       <DropdownMenuLabel className="font-normal p-3">
                         <div className="flex flex-col space-y-1">
                           <p className="text-sm font-medium leading-none text-white">Nicklas Eskou</p>
                           <p className="text-xs leading-none text-muted-foreground">
                             nicklas@example.com
                           </p>
                         </div>
                       </DropdownMenuLabel>
                       <DropdownMenuSeparator className="bg-white/10" />
                       <DropdownMenuGroup>
                         <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                           <LayoutDashboard className="mr-2 h-4 w-4" />
                           <span>Dashboard</span>
                           <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                         </DropdownMenuItem>
                         <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                           <User className="mr-2 h-4 w-4" />
                           <span>Profile</span>
                           <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                         </DropdownMenuItem>
                         <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                           <Settings className="mr-2 h-4 w-4" />
                           <span>Settings</span>
                           <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                         </DropdownMenuItem>
                       </DropdownMenuGroup>
                       <DropdownMenuSeparator className="bg-white/10" />
                       <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10 hover:text-red-500 hover:bg-red-500/10 cursor-pointer">
                         <LogOut className="mr-2 h-4 w-4" />
                         <span>Log out</span>
                         <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                       </DropdownMenuItem>
                     </DropdownMenuContent>
                   </DropdownMenu>

                 </div>
               </div>
             </header>
             
             {/* Dummy Page Content to show transparency */}
             <div className="p-8 space-y-4 opacity-40 min-h-[200px]">
                <div className="h-8 w-1/3 bg-white/10 rounded mb-8"></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-32 bg-white/5 rounded-xl"></div>
                  <div className="h-32 bg-white/5 rounded-xl"></div>
                  <div className="h-32 bg-white/5 rounded-xl"></div>
                </div>
             </div>
          </div>

          {/* SIDEBAR & MOBILE NAV DEMOS */}
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Sidebar Demo */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sidebar (Desktop)</h3>
              <div className="h-[600px] rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl overflow-hidden flex flex-col relative shadow-2xl">
                <div className="p-6">
                  <img src="/Primary Logo White SVG.svg" alt="Huddle" className="h-8 w-auto opacity-90" />
                </div>
                
                <nav className="flex-1 px-4 space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 text-white shadow-sm text-sm font-medium cursor-default relative overflow-hidden group">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_hsl(90_100%_50%_/_0.5)]"></span>
                    <LayoutDashboard className="w-5 h-5 text-primary" />
                    <span>Home</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 text-sm font-medium cursor-default transition-colors">
                    <SearchIcon className="w-5 h-5" />
                    <span>Marketplace</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 text-sm font-medium cursor-default transition-colors">
                    <CalendarIcon className="w-5 h-5" />
                    <span>Wardrobe</span>
                  </div>
                  <div className="pt-4 mt-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 text-sm font-medium cursor-default transition-colors">
                      <Bell className="w-5 h-5" />
                      <span>Notifications</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 text-sm font-medium cursor-default transition-colors">
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </div>
                  </div>
                </nav>

                <div className="p-4 border-t border-white/5 space-y-2 mt-auto">
                  <div className="text-xs text-muted-foreground mb-2 px-2">
                    Signed in as <span className="font-medium text-foreground">Nicklas</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-2 text-muted-foreground text-sm">
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Nav & Command Bar */}
            <div className="space-y-8">
              
              {/* Mobile Nav */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Bottom Nav (Mobile)</h3>
                <div className="h-[200px] rounded-xl border border-white/10 bg-[url('/JW_FCK_1.jpg')] bg-cover bg-center relative overflow-hidden flex items-end justify-center">
                   <div className="absolute inset-0 bg-black/60"></div>
                   
                   {/* The Nav Bar */}
                   <div className="w-full bg-background/80 backdrop-blur-xl border-t border-white/5 pb-4 pt-2 px-2 flex justify-between items-center relative z-10">
                      <div className="flex-1 flex flex-col items-center gap-1 text-primary">
                        <div className="p-1.5 rounded-full bg-primary/10 shadow-[0_0_10px_hsl(90_100%_50%_/_0.2)]">
                          <LayoutDashboard className="w-5 h-5 fill-primary/20" />
                        </div>
                        <span className="text-[10px] font-medium">Home</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1 text-muted-foreground">
                        <div className="p-1.5">
                          <SearchIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-medium">Shop</span>
                      </div>
                      
                      {/* Central Action Button */}
                      <div className="flex-1 flex justify-center -mt-8">
                        <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_20px_hsl(90_100%_50%_/_0.4)]">
                           <span className="text-2xl font-light">+</span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-center gap-1 text-muted-foreground">
                        <div className="p-1.5">
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-medium">Wardrobe</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1 text-muted-foreground">
                        <div className="p-1.5 relative">
                          <Bell className="w-5 h-5" />
                          <span className="absolute top-0 right-0 h-2 w-2 bg-primary rounded-full border-2 border-background"></span>
                        </div>
                        <span className="text-[10px] font-medium">Messages</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Command Bar Visual */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Command Bar (Search)</h3>
                <div className="rounded-xl border border-white/10 bg-[#141414]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                  <div className="flex items-center border-b border-white/5 px-3">
                    <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <div className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50">
                      Search jerseys...
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Recent Searches</div>
                    <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-white/5 hover:text-white">
                      <History className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>FC København 2024</span>
                    </div>
                    <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-white/5 hover:text-white">
                      <History className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Lionel Messi</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

function ColorCard({ name, class: className, hex, text }: { name: string, class: string, hex: string, text: string }) {
  return (
    <div className="group space-y-2 cursor-pointer">
      <div className={`h-24 w-full rounded-xl shadow-sm flex items-end p-3 ${className} transition-transform group-hover:scale-105 ring-2 ring-transparent group-hover:ring-white/20`}>
        <div className="flex justify-between w-full items-end">
          <span className={`text-xs font-mono font-bold ${text}`}>{hex}</span>
          {name.includes("Primary") && <div className="h-2 w-2 rounded-full bg-current animate-pulse"></div>}
        </div>
      </div>
      <div>
        <p className="font-medium text-sm text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground font-mono">{className.split(' ')[0]}</p>
      </div>
    </div>
  );
}
