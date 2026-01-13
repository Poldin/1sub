/**
 * API Endpoint: GET /api/public/tools/[slug]/reviews
 * 
 * Fetches reviews for a specific tool from the database.
 * Returns reviews with stars, description, and reviewer information.
 * 
 * Auth: Public (no authentication required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/database/client';

interface ReviewData {
  id: string;
  created_at: string;
  stars: number;
  metadata: {
    description?: string;
    reviewer?: string;
  };
}

interface ReviewResponse {
  id: string;
  rating: number;
  comment: string;
  author: string;
  created_at: string;
}

interface ReviewsApiResponse {
  success: boolean;
  reviews: ReviewResponse[];
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
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = createServiceClient();

    // First, get the tool ID from the slug
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (toolError || !tool) {
      return NextResponse.json<ReviewsApiResponse>(
        {
          success: false,
          reviews: [],
          stats: {
            average_rating: 0,
            total_reviews: 0,
            distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
          },
          error: 'Tool not found',
        },
        { status: 404 }
      );
    }

    // Fetch reviews for this tool
    const { data: reviews, error: reviewsError } = await supabase
      .from('tool_reviews')
      .select('id, created_at, stars, metadata')
      .eq('tool_id', tool.id)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('[Reviews API] Error fetching reviews:', reviewsError);
      return NextResponse.json<ReviewsApiResponse>(
        {
          success: false,
          reviews: [],
          stats: {
            average_rating: 0,
            total_reviews: 0,
            distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
          },
          error: 'Failed to fetch reviews',
        },
        { status: 500 }
      );
    }

    // Transform reviews to the expected format
    const transformedReviews: ReviewResponse[] = (reviews || []).map((review: ReviewData) => ({
      id: review.id,
      rating: Math.round(Number(review.stars)), // Round to nearest integer
      comment: review.metadata?.description || 'No comment provided',
      author: review.metadata?.reviewer || 'Anonymous',
      created_at: review.created_at,
    }));

    // Calculate statistics
    const totalReviews = transformedReviews.length;
    const distribution = {
      '5': 0,
      '4': 0,
      '3': 0,
      '2': 0,
      '1': 0,
    };

    let sumRatings = 0;

    transformedReviews.forEach((review) => {
      sumRatings += review.rating;
      const rating = review.rating.toString() as '1' | '2' | '3' | '4' | '5';
      if (rating in distribution) {
        distribution[rating]++;
      }
    });

    const averageRating = totalReviews > 0 ? sumRatings / totalReviews : 0;

    return NextResponse.json<ReviewsApiResponse>(
      {
        success: true,
        reviews: transformedReviews,
        stats: {
          average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          total_reviews: totalReviews,
          distribution,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[Reviews API] Unexpected error:', error);
    return NextResponse.json<ReviewsApiResponse>(
      {
        success: false,
        reviews: [],
        stats: {
          average_rating: 0,
          total_reviews: 0,
          distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
        },
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
