/**
 * Skeleton placeholder for ToolCard during loading
 * Provides a shimmer effect for better perceived performance
 */

export default function ToolCardSkeleton() {
  return (
    <div className="group bg-[#1f2937] rounded-xl border border-[#374151] flex flex-col h-full relative overflow-hidden">
      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      
      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1">
        {/* Header: Logo + Name */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#374151] animate-pulse" />
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-[#374151] rounded animate-pulse w-3/4" />
            <div className="h-3 bg-[#374151] rounded animate-pulse w-1/2" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2 mb-3">
          <div className="h-3 bg-[#374151] rounded animate-pulse w-full" />
          <div className="h-3 bg-[#374151] rounded animate-pulse w-5/6" />
        </div>

        {/* Preview Image */}
        <div className="mb-3 rounded-md overflow-hidden bg-[#111111] -mx-4 w-[calc(100%+2rem)] aspect-video">
          <div className="w-full h-full bg-[#374151] animate-pulse" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <div className="h-6 w-16 bg-[#374151] rounded-full animate-pulse" />
          <div className="h-6 w-20 bg-[#374151] rounded-full animate-pulse" />
          <div className="h-6 w-14 bg-[#374151] rounded-full animate-pulse" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3">
          <div className="h-4 w-16 bg-[#374151] rounded animate-pulse" />
          <div className="h-4 w-20 bg-[#374151] rounded animate-pulse" />
        </div>

        {/* Pricing */}
        <div className="mt-auto pt-3 border-t border-[#374151]">
          <div className="flex items-center justify-between">
            <div className="h-6 w-24 bg-[#374151] rounded animate-pulse" />
            <div className="h-9 w-24 bg-[#374151] rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

