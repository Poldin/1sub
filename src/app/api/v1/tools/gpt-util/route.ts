import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { token, userId, prompt } = await req.json();
    
    if (!token || !userId || !prompt) {
      return NextResponse.json(
        { error: 'Token, userId, and prompt are required' },
        { status: 400 }
      );
    }

    // Verify token with our verify-token endpoint
    const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/v1/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const verifyResult = await verifyResponse.json();

    if (!verifyResult.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Verify userId matches token
    if (verifyResult.userId !== userId) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      );
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured',
          generatedText: `Mock response for: "${prompt}"\n\nThis is a placeholder response. Configure OPENAI_API_KEY to enable real GPT generation.`
        },
        { status: 200 }
      );
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate text with OpenAI' },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const generatedText = openaiData.choices[0]?.message?.content || 'No response generated';

    return NextResponse.json({
      generatedText,
      prompt,
      timestamp: new Date().toISOString(),
      userId: verifyResult.userId,
      email: verifyResult.email,
      model: 'gpt-3.5-turbo',
      tokensUsed: openaiData.usage?.total_tokens || 0
    });
  } catch (error) {
    console.error('Error in GPT utility API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
