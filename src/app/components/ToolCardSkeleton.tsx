/**
 * Skeleton placeholder for ToolCard during loading
 * Provides a shimmer effect for better perceived performance
 * Optimized for mobile and desktop viewports
 */

export default function ToolCardSkeleton() {
  return (
    <div className="group bg-[#1a1a1a] border border-[#374151] rounded-lg p-4 pt-10 flex flex-col h-full relative overflow-hidden">
      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      
      {/* Phase Badge Skeleton */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
        <div className="h-6 w-20 bg-[#374151] rounded-full animate-pulse" />
      </div>
      
      {/* Header: Logo + Name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#2a2a2a] animate-pulse" />
        
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-[#374151] rounded animate-pulse w-3/4 mb-2" />
        </div>
      </div>

      {/* Description */}
      <div className="h-10 mb-3">
        <div className="h-3 bg-[#374151] rounded animate-pulse w-full mb-1" />
        <div className="h-3 bg-[#374151] rounded animate-pulse w-5/6" />
      </div>

      {/* Preview Image */}
      <div className="mb-3 rounded-md overflow-hidden bg-[#111111] -mx-4 w-[calc(100%+2rem)] aspect-video">
        <div className="w-full h-full bg-[#374151] animate-pulse" />
      </div>

      {/* Tags */}
      <div className="min-h-[1.75rem] mb-3">
        <div className="flex flex-wrap gap-1.5">
          <div className="h-5 w-16 bg-[#374151] rounded animate-pulse" />
          <div className="h-5 w-20 bg-[#374151] rounded animate-pulse" />
          <div className="h-5 w-14 bg-[#374151] rounded animate-pulse" />
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-3">
        <div className="h-6 w-32 bg-[#374151] rounded animate-pulse" />
      </div>

      {/* Stats & Button */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-3">
          <div className="h-4 w-12 bg-[#374151] rounded animate-pulse" />
          <div className="h-4 w-12 bg-[#374151] rounded animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-[#374151] rounded-md animate-pulse" />
      </div>
    </div>
  );
}

