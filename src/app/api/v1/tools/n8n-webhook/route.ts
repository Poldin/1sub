import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get token from query parameters
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    
    if (!token || !userId) {
      return NextResponse.json(
        { error: 'Token and userId are required' },
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

    // Simulate n8n workflow execution
    const workflows = [
      {
        name: "Send Welcome Email",
        description: "Sends a personalized welcome email to new users",
        status: "completed",
        result: "Email sent successfully to user@example.com"
      },
      {
        name: "Data Sync",
        description: "Syncs user data with external CRM system",
        status: "completed", 
        result: "15 records synchronized successfully"
      },
      {
        name: "Analytics Report",
        description: "Generates weekly analytics report",
        status: "completed",
        result: "Report generated and saved to cloud storage"
      }
    ];

    const randomWorkflow = workflows[Math.floor(Math.random() * workflows.length)];

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    return NextResponse.json({
      workflow: randomWorkflow,
      executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: verifyResult.userId,
      email: verifyResult.email,
      duration: `${Math.floor(Math.random() * 3 + 1)}s`,
      status: "success"
    });
  } catch (error) {
    console.error('Error in n8n webhook simulator:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
