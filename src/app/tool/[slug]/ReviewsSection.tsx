'use client';

import { useState, useEffect } from 'react';
import { Tool } from '@/lib/tool-types';

interface Review {
  id: string;
  author: string;
  initials: string;
  rating: number;
  comment: string;
  gradient: string;
  created_at: string;
}

interface ReviewsData {
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    author: string;
    created_at: string;
  }>;
  stats: {
    average_rating: number;
    total_reviews: number;
    distribution: {
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
  };
}

// Gradient options for avatars
const GRADIENTS = [
  'from-[#3ecf8e] to-[#2dd4bf]',
  'from-[#f97316] to-[#ea580c]',
  'from-[#8b5cf6] to-[#7c3aed]',
  'from-[#ec4899] to-[#db2777]',
  'from-[#06b6d4] to-[#0891b2]',
  'from-[#eab308] to-[#ca8a04]',
];

// Generate initials from author name
function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Get consistent gradient for a name
function getGradientForName(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

interface ReviewsSectionProps {
  tool: Tool;
}

export default function ReviewsSection({ tool }: ReviewsSectionProps) {
  const [visibleCount, setVisibleCount] = useState(6);
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/tools/${tool.slug}/reviews`);
        const data = await response.json();
        
        if (data.success) {
          setReviewsData(data);
        } else {
          setError(data.error || 'Failed to load reviews');
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [tool.slug]);

  // Transform reviews with initials and gradients
  const transformedReviews: Review[] = (reviewsData?.reviews || []).map(review => ({
    id: review.id,
    author: review.author,
    initials: getInitials(review.author),
    rating: review.rating,
    comment: review.comment,
    gradient: getGradientForName(review.author),
    created_at: review.created_at,
  }));

  const visibleReviews = transformedReviews.slice(0, visibleCount);
  const hasMore = visibleCount < transformedReviews.length;
  
  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + 6, transformedReviews.length));
  };

  // Calculate percentage distribution
  const calculatePercentage = (count: number, total: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  const stats = reviewsData?.stats;
  const totalReviews = stats?.total_reviews || 0;
  const distribution = stats?.distribution || { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  
  // Show loading state
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-[#374151] rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-[#374151] rounded w-48 mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (error || !reviewsData) {
    return (
      <section className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center">
          <p className="text-[#9ca3af]">No reviews available yet.</p>
        </div>
      </section>
    );
  }

  // Don't render if no reviews
  if (totalReviews === 0) {
    return (
      <section className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#ededed] mb-3">
            Reviews
          </h2>
          <p className="text-[#9ca3af]">No reviews yet. Be the first to review this tool after testing and using it!</p>
        </div>
      </section>
    );
  }
  
  return (
    <section className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#ededed] mb-3">
          What users are saying
        </h2>
        <p className="text-[#9ca3af] text-sm sm:text-base mb-6">
          Real feedback from our community
        </p>
        
        {/* Rating Summary */}
        <div className="flex flex-col items-center gap-4 mb-6">
          {/* Average Rating */}
          <div className="flex items-center gap-2">
            <span className="text-4xl sm:text-5xl font-bold text-[#ededed]">
              {(stats?.average_rating ?? 0).toFixed(1)}
            </span>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="w-5 h-5 sm:w-6 sm:h-6 text-[#3ecf8e] fill-[#3ecf8e]"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
          
          {/* Rating Breakdown */}
          <div className="bg-[#111111] border border-[#374151] rounded-lg p-4 sm:p-6 w-full max-w-md">
            <p className="text-[#9ca3af] text-sm mb-3 text-center">
              Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
            </p>
            <div className="space-y-2">
              {/* 5 Stars */}
              <div className="flex items-center gap-3">
                <span className="text-[#d1d5db] text-xs sm:text-sm w-12 text-right">5 stars</span>
                <div className="flex-1 h-2 bg-[#374151] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#3ecf8e]" 
                    style={{ width: `${calculatePercentage(distribution['5'], totalReviews)}%` }}
                  ></div>
                </div>
                <span className="text-[#9ca3af] text-xs sm:text-sm w-8">
                  {calculatePercentage(distribution['5'], totalReviews)}%
                </span>
              </div>
              {/* 4 Stars */}
              <div className="flex items-center gap-3">
                <span className="text-[#d1d5db] text-xs sm:text-sm w-12 text-right">4 stars</span>
                <div className="flex-1 h-2 bg-[#374151] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#3ecf8e]" 
                    style={{ width: `${calculatePercentage(distribution['4'], totalReviews)}%` }}
                  ></div>
                </div>
                <span className="text-[#9ca3af] text-xs sm:text-sm w-8">
                  {calculatePercentage(distribution['4'], totalReviews)}%
                </span>
              </div>
              {/* 3 Stars */}
              <div className="flex items-center gap-3">
                <span className="text-[#d1d5db] text-xs sm:text-sm w-12 text-right">3 stars</span>
                <div className="flex-1 h-2 bg-[#374151] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#3ecf8e]" 
                    style={{ width: `${calculatePercentage(distribution['3'], totalReviews)}%` }}
                  ></div>
                </div>
                <span className="text-[#9ca3af] text-xs sm:text-sm w-8">
                  {calculatePercentage(distribution['3'], totalReviews)}%
                </span>
              </div>
              {/* 2 Stars */}
              <div className="flex items-center gap-3">
                <span className="text-[#d1d5db] text-xs sm:text-sm w-12 text-right">2 stars</span>
                <div className="flex-1 h-2 bg-[#374151] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#3ecf8e]" 
                    style={{ width: `${calculatePercentage(distribution['2'], totalReviews)}%` }}
                  ></div>
                </div>
                <span className="text-[#9ca3af] text-xs sm:text-sm w-8">
                  {calculatePercentage(distribution['2'], totalReviews)}%
                </span>
              </div>
              {/* 1 Star */}
              <div className="flex items-center gap-3">
                <span className="text-[#d1d5db] text-xs sm:text-sm w-12 text-right">1 star</span>
                <div className="flex-1 h-2 bg-[#374151] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#3ecf8e]" 
                    style={{ width: `${calculatePercentage(distribution['1'], totalReviews)}%` }}
                  ></div>
                </div>
                <span className="text-[#9ca3af] text-xs sm:text-sm w-8">
                  {calculatePercentage(distribution['1'], totalReviews)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Reviews Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {visibleReviews.map((review) => (
          <div 
            key={review.id}
            className="bg-[#111111] border border-[#374151] rounded-xl p-5 sm:p-6 hover:border-[#3ecf8e] transition-colors"
          >
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    i < review.rating 
                      ? 'text-[#3ecf8e] fill-[#3ecf8e]' 
                      : 'text-[#374151] fill-[#374151]'
                  }`}
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-[#d1d5db] text-sm sm:text-base leading-relaxed mb-4">
              "{review.comment}"
            </p>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${review.gradient} flex items-center justify-center ${review.gradient.includes('3ecf8e') || review.gradient.includes('eab308') ? 'text-black' : 'text-white'} font-bold text-sm`}>
                {review.initials}
              </div>
              <div>
                <p className="text-[#ededed] font-semibold text-sm">{review.author}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            className="px-6 py-3 bg-[#374151] hover:bg-[#4b5563] text-[#ededed] rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            Load more reviews
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-[#9ca3af] text-xs sm:text-sm mt-6">
        <span className="text-[#3ecf8e] font-bold">*</span>
        <p className="leading-relaxed">
          All reviews are from verified users of {tool.name} who have used the tool through our platform.
        </p>
      </div>
    </section>
  );
}
