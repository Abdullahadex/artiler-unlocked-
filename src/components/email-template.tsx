import * as React from 'react';

type EmailType = 'WAITLIST_APPROVED' | 'OUTBID' | 'AUCTION_WON' | 'PIECE_SHIPPED';

interface EmailTemplateProps {
  firstName: string;
  emailType?: EmailType;
  // Optional dynamic data
  auctionTitle?: string;
  amount?: number;
  auctionId?: string;
  trackingNumber?: string;
  checkoutUrl?: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
  emailType = 'WAITLIST_APPROVED',
  auctionTitle = 'Item',
  amount = 0,
  auctionId = '',
  trackingNumber = '',
  checkoutUrl = '',
}) => {
  const getHeaderPill = () => {
    switch (emailType) {
      case 'WAITLIST_APPROVED': return { text: 'Approved', color: 'hsl(36, 91%, 37%)', bg: 'hsla(36, 91%, 37%, 0.1)' };
      case 'OUTBID': return { text: 'Action Required', color: 'hsl(0, 84%, 60%)', bg: 'hsla(0, 84%, 60%, 0.1)' };
      case 'AUCTION_WON': return { text: 'Won', color: 'hsl(142, 71%, 45%)', bg: 'hsla(142, 71%, 45%, 0.1)' };
      case 'PIECE_SHIPPED': return { text: 'Shipped', color: 'hsl(217, 91%, 60%)', bg: 'hsla(217, 91%, 60%, 0.1)' };
    }
  };

  const pill = getHeaderPill();

  return (
    <div style={{ backgroundColor: 'hsl(0, 0%, 5%)', padding: '40px 20px', fontFamily: '"Inter", "Helvetica Neue", Helvetica, sans-serif', color: 'hsl(0, 0%, 98%)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'hsl(0, 0%, 7%)', border: '1px solid hsl(0, 0%, 18%)', borderRadius: '12px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid hsl(0, 0%, 18%)', paddingBottom: '24px', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0, letterSpacing: '-0.02em', color: 'hsl(0, 0%, 98%)', textTransform: 'uppercase' }}>
            Atelier Unlocked
          </h1>
          {/* Status Pill Badge */}
          <div style={{ backgroundColor: pill.bg, color: pill.color, border: `1px solid ${pill.color.replace(')', ', 0.2)').replace('hsl', 'hsla')}`, padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {pill.text}
          </div>
        </div>

        {/* Body Content */}
        {emailType === 'WAITLIST_APPROVED' && (
          <>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'hsl(0, 0%, 98%)', margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
              Welcome, {firstName}.
            </h2>
            <p style={{ fontSize: '15px', lineHeight: '24px', color: 'hsl(0, 0%, 75%)', margin: '0 0 24px 0' }}>
              Your waitlist application has been successfully reviewed and verified. The Floor is now fully unlocked and accessible to you. You can now browse live auctions, monitor interest signals, and interact with the community.
            </p>
            <div style={{ backgroundColor: 'hsl(0, 0%, 3%)', border: '1px solid hsl(0, 0%, 18%)', borderRadius: '8px', padding: '16px', marginBottom: '32px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'hsl(0, 0%, 75%)', fontFamily: 'monospace' }}>
                <span style={{ color: 'hsl(36, 91%, 37%)' }}>Status:</span> Waitlist requirement bypassed.<br />
                <span style={{ color: 'hsl(36, 91%, 37%)' }}>Permissions:</span> Vault_Access_Granted
              </p>
            </div>
            <div style={{ marginTop: '32px' }}>
              <a href={process.env.NEXT_PUBLIC_APP_URL || 'https://artiler-unlocked.vercel.app/'} style={{ display: 'inline-block', backgroundColor: 'hsl(36, 91%, 37%)', color: 'hsl(0, 0%, 98%)', padding: '12px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Enter The Floor
              </a>
            </div>
          </>
        )}

        {emailType === 'OUTBID' && (
          <>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'hsl(0, 0%, 98%)', margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
              Position Lost: You've been outbid.
            </h2>
            <p style={{ fontSize: '15px', lineHeight: '24px', color: 'hsl(0, 0%, 75%)', margin: '0 0 24px 0' }}>
              Your bid on <strong style={{ color: '#fff' }}>"{auctionTitle}"</strong> has been exceeded. The current highest bid is now <strong style={{ color: '#fff' }}>€{amount.toLocaleString()}</strong>.
            </p>
            <div style={{ marginTop: '32px' }}>
              <a href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://artiler-unlocked.vercel.app'}/piece/${auctionId}`} style={{ display: 'inline-block', backgroundColor: 'hsl(36, 91%, 37%)', color: 'hsl(0, 0%, 98%)', padding: '12px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reclaim Position
              </a>
            </div>
          </>
        )}

        {emailType === 'AUCTION_WON' && (
          <>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'hsl(0, 0%, 98%)', margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
              Congratulations, {firstName}. You Won.
            </h2>
            <p style={{ fontSize: '15px', lineHeight: '24px', color: 'hsl(0, 0%, 75%)', margin: '0 0 24px 0' }}>
              You are the winning bidder for <strong style={{ color: '#fff' }}>"{auctionTitle}"</strong> with a final bid of <strong style={{ color: '#fff' }}>€{amount.toLocaleString()}</strong>.
            </p>
            <p style={{ fontSize: '15px', lineHeight: '24px', color: 'hsl(0, 0%, 75%)', margin: '0 0 24px 0' }}>
              Please complete payment within 48 hours to secure your acquisition and arrange shipping.
            </p>
            {checkoutUrl && (
              <div style={{ marginTop: '32px' }}>
                <a href={checkoutUrl} style={{ display: 'inline-block', backgroundColor: 'hsl(36, 91%, 37%)', color: 'hsl(0, 0%, 98%)', padding: '12px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Complete Checkout
                </a>
              </div>
            )}
          </>
        )}

        {emailType === 'PIECE_SHIPPED' && (
          <>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'hsl(0, 0%, 98%)', margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
              Your acquisition is on the way.
            </h2>
            <p style={{ fontSize: '15px', lineHeight: '24px', color: 'hsl(0, 0%, 75%)', margin: '0 0 24px 0' }}>
              <strong style={{ color: '#fff' }}>"{auctionTitle}"</strong> has been securely shipped.
            </p>
            <div style={{ backgroundColor: 'hsl(0, 0%, 3%)', border: '1px solid hsl(0, 0%, 18%)', borderRadius: '8px', padding: '16px', marginBottom: '32px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'hsl(0, 0%, 75%)', fontFamily: 'monospace' }}>
                <span style={{ color: 'hsl(36, 91%, 37%)' }}>Tracking Number:</span><br />
                <span style={{ color: '#fff', fontSize: '16px' }}>{trackingNumber}</span>
              </p>
            </div>
            <div style={{ marginTop: '32px' }}>
              <a href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://artiler-unlocked.vercel.app'}/vault`} style={{ display: 'inline-block', backgroundColor: 'hsl(36, 91%, 37%)', color: 'hsl(0, 0%, 98%)', padding: '12px 24px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                View in Vault
              </a>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: '48px', borderTop: '1px solid hsl(0, 0%, 18%)', paddingTop: '24px' }}>
          <p style={{ fontSize: '12px', color: 'hsl(0, 0%, 75%)', margin: 0 }}>
            Atelier Unlocked &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};
