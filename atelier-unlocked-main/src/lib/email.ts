import { createClient } from '@/integrations/supabase/server';

export type EmailTemplate = 
  | 'bidConfirmation'
  | 'outbid'
  | 'auctionWon'
  | 'auctionEnded'
  | 'welcome';

export interface EmailData {
  [key: string]: any;
}

export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: EmailData
) {
  try {
    const subject = getEmailSubject(template);
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        template,
        data,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Email sending error:', error);
    // Don't throw - email failures shouldn't break the app
    return null;
  }
}

function getEmailSubject(template: EmailTemplate): string {
  const subjects: Record<EmailTemplate, string> = {
    bidConfirmation: 'Bid Confirmation - ATELIER',
    outbid: 'You\'ve Been Outbid - ATELIER',
    auctionWon: 'Congratulations! You Won - ATELIER',
    auctionEnded: 'Auction Ended - ATELIER',
    welcome: 'Welcome to ATELIER',
  };
  return subjects[template];
}

