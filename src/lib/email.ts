import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { EmailTemplate } from '@/components/email-template';

export type EmailTemplate = 
  | 'bidConfirmation'
  | 'outbid'
  | 'auctionWon'
  | 'auctionEnded'
  | 'welcome'
  | 'pieceShipped';

export interface EmailData {
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown>;
}

export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: EmailData
) {
  try {
    const subject = getEmailSubject(template);

    // Map the string template names to the EmailType enum in our template component
    let emailType: 'WAITLIST_APPROVED' | 'OUTBID' | 'AUCTION_WON' | 'PIECE_SHIPPED' = 'WAITLIST_APPROVED';
    if (template === 'outbid') emailType = 'OUTBID';
    else if (template === 'auctionWon') emailType = 'AUCTION_WON';
    else if (template === 'pieceShipped') emailType = 'PIECE_SHIPPED';
    else if (template === 'welcome') emailType = 'WAITLIST_APPROVED';

    const firstName = typeof data.firstName === 'string' ? data.firstName : 'Collector';
    const auctionTitle = typeof data.auctionTitle === 'string' ? data.auctionTitle : undefined;
    const rawAmount = data.amount || data.currentPrice;
    const amount = typeof rawAmount === 'number' ? rawAmount : undefined;
    const auctionId = typeof data.auctionId === 'string' ? data.auctionId : undefined;
    const trackingNumber = typeof data.trackingNumber === 'string' ? data.trackingNumber : undefined;
    const checkoutUrl = typeof data.checkoutUrl === 'string' ? data.checkoutUrl : undefined;
    
    // Render the React email template into static HTML markup
    const { renderToStaticMarkup } = await import('react-dom/server');
    const html = renderToStaticMarkup(
      EmailTemplate({
        firstName,
        emailType,
        auctionTitle,
        amount,
        auctionId,
        trackingNumber,
        checkoutUrl,
      })
    );
    const htmlContent = `<!DOCTYPE html>${html}`;

    // 1. Check if SMTP configuration is present
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      console.log('Sending email via SMTP to', to);
      const port = parseInt(process.env.SMTP_PORT || '587');
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Atelier Unlocked" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html: htmlContent,
      });

      console.log('Email sent successfully via SMTP to', to);
      return { success: true };
    } 
    // 2. Fallback to Resend API
    else if (process.env.RESEND_API_KEY) {
      console.log('Sending email via Resend to', to);
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: process.env.SMTP_FROM || 'onboarding@resend.dev',
        to,
        subject,
        html: htmlContent,
      });

      console.log('Email sent successfully via Resend to', to);
      return { success: true };
    } 
    else {
      console.warn('Neither SMTP nor Resend email service is configured. Email skipped:', { to, template });
      return null;
    }
  } catch (error) {
    console.error('Email sending error:', error);
    // Don't throw - email failures shouldn't break database writes or primary server operations
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
    pieceShipped: 'Your Acquisition has Shipped - ATELIER',
  };
  return subjects[template];
}
