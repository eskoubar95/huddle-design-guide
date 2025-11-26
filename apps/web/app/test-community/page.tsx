'use client'

import { useState } from "react";
import { CreatePost } from "@/components/community/CreatePost";
import { PostComments } from "@/components/community/PostComments";
import { ActivitySnapshot } from "@/components/community/home/ActivitySnapshot";
import { CommunityPreview } from "@/components/community/home/CommunityPreview";
import { HeroSpotlight } from "@/components/community/home/HeroSpotlight";
import { MarketplaceForYou } from "@/components/community/home/MarketplaceForYou";
import { QuickActions } from "@/components/community/home/QuickActions";
import { RightSidebar } from "@/components/community/home/RightSidebar";
import { Button } from "@/components/ui/button";

export default function TestCommunityPage() {
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [testPostId] = useState("test-post-id-123"); // Mock post ID for testing

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            Community Components Test
          </h1>
          <p className="text-muted-foreground mb-6">
            Test side for validering af migrerede Community komponenter
          </p>
        </div>

        {/* Component Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Component Status</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>CreatePost - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>PostComments - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>ActivitySnapshot - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>CommunityPreview - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>HeroSpotlight - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>MarketplaceForYou - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>QuickActions - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>RightSidebar - Imported and rendered</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setCreatePostOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Open Create Post Dialog
            </Button>
            <Button
              onClick={() => setCommentsOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Open Post Comments Dialog
            </Button>
          </div>
        </div>

        {/* Component Examples */}
        <div className="space-y-12">
          {/* ActivitySnapshot */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">ActivitySnapshot</h2>
            <ActivitySnapshot />
          </div>

          {/* QuickActions */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">QuickActions</h2>
            <QuickActions />
          </div>

          {/* HeroSpotlight */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">HeroSpotlight</h2>
            <HeroSpotlight />
          </div>

          {/* CommunityPreview */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">CommunityPreview</h2>
            <CommunityPreview />
          </div>

          {/* MarketplaceForYou */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">MarketplaceForYou</h2>
            <MarketplaceForYou />
          </div>
        </div>

        {/* RightSidebar - Note: This is typically used in a layout, but showing here for testing */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">RightSidebar</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Note: This component is typically used in a layout. Showing here for testing purposes.
          </p>
          <div className="max-w-sm">
            <RightSidebar />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreatePost
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onPostCreated={() => {
          console.log("Post created successfully!");
        }}
      />

      <PostComments
        postId={testPostId}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </div>
  );
}

