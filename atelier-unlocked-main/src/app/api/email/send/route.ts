import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

// Email transporter setup (using Supabase or external service)
// Only create transporter if SMTP is configured
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (!host || !port || !user || !password) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure: false,
    auth: {
      user,
      pass: password,
    },
  });
};

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
    
    if (!supabase) {
      console.warn('Database not configured. Email auth skipped.');
      return NextResponse.json({ 
        success: false, 
        message: 'Database not configured' 
      });
    }
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Email templates
    const templates: Record<string, (data: Record<string, unknown>) => string> = {
      bidConfirmation: (data) => {
        const amount = typeof data.amount === 'number' ? data.amount : 0;
        const auctionTitle = typeof data.auctionTitle === 'string' ? data.auctionTitle : 'Auction';
        return `
        <h2>Bid Confirmation</h2>
        <p>Your bid of €${amount.toLocaleString()} has been placed on "${auctionTitle}".</p>
        <p>You will be notified if you are outbid.</p>
      `;
      },
      outbid: (data) => {
        const currentPrice = typeof data.currentPrice === 'number' ? data.currentPrice : 0;
        const auctionTitle = typeof data.auctionTitle === 'string' ? data.auctionTitle : 'Auction';
        const auctionId = typeof data.auctionId === 'string' ? data.auctionId : '';
        return `
        <h2>You've Been Outbid</h2>
        <p>Your bid on "${auctionTitle}" has been exceeded.</p>
        <p>Current highest bid: €${currentPrice.toLocaleString()}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/piece/${auctionId}">Place a new bid</a>
      `;
      },
      auctionWon: (data) => {
        const amount = typeof data.amount === 'number' ? data.amount : 0;
        const auctionTitle = typeof data.auctionTitle === 'string' ? data.auctionTitle : 'Auction';
        return `
        <h2>Congratulations! You Won!</h2>
        <p>You are the winning bidder for "${auctionTitle}".</p>
        <p>Winning bid: €${amount.toLocaleString()}</p>
        <p>Please complete payment within 48 hours.</p>
      `;
      },
      auctionEnded: (data) => {
        const auctionTitle = typeof data.auctionTitle === 'string' ? data.auctionTitle : 'Auction';
        const status = typeof data.status === 'string' ? data.status : 'Ended';
        return `
        <h2>Auction Ended</h2>
        <p>The auction for "${auctionTitle}" has ended.</p>
        <p>Status: ${status}</p>
      `;
      },
      welcome: () => `
        <h2>Welcome to ATELIER</h2>
        <p>Thank you for joining our exclusive auction platform.</p>
        <p>Start exploring unique pieces on The Floor.</p>
      `,
    };

    const html = templates[template]?.(data) || '';

    const transporter = getTransporter();
    if (!transporter) {
      console.warn('SMTP not configured. Email not sent:', { to, subject });
      // Don't fail the request if email is not configured
      return NextResponse.json({ 
        success: false, 
        message: 'Email service not configured' 
      });
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@atelier.com',
      to,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    console.error('Email error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

