import { render, screen } from '@testing-library/react';
import AuctionCard from '@/components/AuctionCard';
import type { Auction } from '@/types/database';

const mockAuction: Auction = {
  id: '1',
  designer_id: 'designer-1',
  title: 'Test Auction',
  description: 'Test description',
  images: ['https://example.com/image.jpg'],
  materials: 'Test materials',
  sizing: 'Test sizing',
  start_price: 1000,
  current_price: 1500,
  end_time: new Date(Date.now() + 86400000).toISOString(),
  status: 'LOCKED',
  unique_bidder_count: 2,
  required_bidders: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  designer: {
    id: 'designer-1',
    display_name: 'Test Designer',
    role: 'designer',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

describe('AuctionCard', () => {
  it('renders auction title', () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText('Test Auction')).toBeInTheDocument();
  });

  it('renders designer name', () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText('Test Designer')).toBeInTheDocument();
  });

  it('displays current price', () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText(/€1,500/)).toBeInTheDocument();
  });

  it('shows protocol progress', () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
  });

  it('shows locked status for locked auctions', () => {
    render(<AuctionCard auction={mockAuction} />);
    const statusBadge = screen.getByRole('link').querySelector('[class*="bg-muted"]');
    expect(statusBadge).toBeInTheDocument();
  });
});

