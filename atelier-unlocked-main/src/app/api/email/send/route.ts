import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import nodemailer from 'nodemailer';

// Email transporter setup (using Supabase or external service)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { to, subject, template, data } = await request.json();

    if (!to || !subject || !template) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Email templates
    const templates: Record<string, (data: any) => string> = {
      bidConfirmation: (data) => `
        <h2>Bid Confirmation</h2>
        <p>Your bid of €${data.amount.toLocaleString()} has been placed on "${data.auctionTitle}".</p>
        <p>You will be notified if you are outbid.</p>
      `,
      outbid: (data) => `
        <h2>You've Been Outbid</h2>
        <p>Your bid on "${data.auctionTitle}" has been exceeded.</p>
        <p>Current highest bid: €${data.currentPrice.toLocaleString()}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/piece/${data.auctionId}">Place a new bid</a>
      `,
      auctionWon: (data) => `
        <h2>Congratulations! You Won!</h2>
        <p>You are the winning bidder for "${data.auctionTitle}".</p>
        <p>Winning bid: €${data.amount.toLocaleString()}</p>
        <p>Please complete payment within 48 hours.</p>
      `,
      auctionEnded: (data) => `
        <h2>Auction Ended</h2>
        <p>The auction for "${data.auctionTitle}" has ended.</p>
        <p>Status: ${data.status}</p>
      `,
      welcome: (data) => `
        <h2>Welcome to ATELIER</h2>
        <p>Thank you for joining our exclusive auction platform.</p>
        <p>Start exploring unique pieces on The Floor.</p>
      `,
    };

    const html = templates[template]?.(data) || '';

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@atelier.com',
      to,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

