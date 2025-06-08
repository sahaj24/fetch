import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // In a production environment, you would typically:
    // 1. Send an email using a service like SendGrid, AWS SES, or Nodemailer
    // 2. Store the message in a database
    // 3. Send notifications to your support team

    // For now, we'll just log the message and return success
    console.log('Contact form submission:', {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json(
      { 
        success: true, 
        message: 'Your message has been sent successfully! We\'ll get back to you within 24-48 hours.' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

// Handle GET requests (optional - for testing)
export async function GET() {
  return NextResponse.json(
    { message: 'Contact API endpoint is working' },
    { status: 200 }
  );
}
