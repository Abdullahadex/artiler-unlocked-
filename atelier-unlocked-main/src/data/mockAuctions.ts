export type AuctionStatus = 'LOCKED' | 'UNLOCKED' | 'SOLD' | 'VOID';

export interface Auction {
  id: string;
  title: string;
  designer: string;
  images: string[];
  startPrice: number;
  currentPrice: number;
  endTime: Date;
  status: AuctionStatus;
  uniqueBidderCount: number;
  requiredBidders: number;
  description: string;
  materials: string;
  sizing: string;
}

export interface Bid {
  id: string;
  collectorId: string;
  amount: number;
  timestamp: Date;
}

// High-fashion placeholder images from Unsplash
const fashionImages = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80',
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80',
  'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80',
  'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800&q=80',
];

export const mockAuctions: Auction[] = [
  {
    id: '1',
    title: 'Midnight Velvet Gown',
    designer: 'Maison Noir',
    images: [fashionImages[0], fashionImages[1]],
    startPrice: 2800,
    currentPrice: 3400,
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 4), // 4 hours
    status: 'UNLOCKED',
    uniqueBidderCount: 3,
    requiredBidders: 3,
    description: 'An exquisite floor-length gown crafted from Italian velvet, featuring a dramatic train and hand-sewn crystal embellishments along the décolletage.',
    materials: '100% Silk Velvet, Swarovski Crystals',
    sizing: 'EU 36-42 | Made to Order',
  },
  {
    id: '2',
    title: 'Sculptural Wool Coat',
    designer: 'Atelier Blanc',
    images: [fashionImages[2]],
    startPrice: 4200,
    currentPrice: 4200,
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 8), // 8 hours
    status: 'LOCKED',
    uniqueBidderCount: 1,
    requiredBidders: 3,
    description: 'A masterwork of architectural fashion. This oversized coat features exaggerated shoulders and an asymmetric closure, cut from virgin wool.',
    materials: '100% Virgin Wool, Silk Lining',
    sizing: 'One Size',
  },
  {
    id: '3',
    title: 'Gilded Corset Top',
    designer: 'Oro Studio',
    images: [fashionImages[3]],
    startPrice: 1600,
    currentPrice: 2100,
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours
    status: 'UNLOCKED',
    uniqueBidderCount: 4,
    requiredBidders: 3,
    description: 'A modern interpretation of the classic corset, featuring 24k gold-plated boning and hand-applied leaf details.',
    materials: 'Duchess Satin, 24K Gold Plating',
    sizing: 'XS-L',
  },
  {
    id: '4',
    title: 'Deconstructed Blazer',
    designer: 'House of Grey',
    images: [fashionImages[4]],
    startPrice: 3800,
    currentPrice: 3800,
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 12), // 12 hours
    status: 'LOCKED',
    uniqueBidderCount: 2,
    requiredBidders: 3,
    description: 'Avant-garde tailoring at its finest. This deconstructed blazer plays with form and function, featuring raw edges and exposed construction.',
    materials: 'Japanese Wool Blend',
    sizing: 'EU 34-44',
  },
  {
    id: '5',
    title: 'Crystal Mesh Dress',
    designer: 'Lumière',
    images: [fashionImages[5]],
    startPrice: 5600,
    currentPrice: 6200,
    endTime: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes
    status: 'UNLOCKED',
    uniqueBidderCount: 5,
    requiredBidders: 3,
    description: 'A cascade of hand-set crystals on Italian mesh, creating a liquid-light effect. Each dress takes 200 hours to complete.',
    materials: 'Italian Mesh, Hand-Set Crystals',
    sizing: 'Made to Measure',
  },
  {
    id: '6',
    title: 'Leather Opera Gloves',
    designer: 'Maison Noir',
    images: [fashionImages[6]],
    startPrice: 890,
    currentPrice: 890,
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
    status: 'LOCKED',
    uniqueBidderCount: 0,
    requiredBidders: 3,
    description: 'Elbow-length opera gloves in buttery lambskin, featuring subtle tonal embroidery and mother-of-pearl button closures.',
    materials: 'Lambskin Leather, Mother of Pearl',
    sizing: 'S/M/L',
  },
  {
    id: '7',
    title: 'Pleated Silk Ensemble',
    designer: 'Maison Plissé',
    images: [fashionImages[7]],
    startPrice: 4800,
    currentPrice: 5400,
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 6), // 6 hours
    status: 'UNLOCKED',
    uniqueBidderCount: 3,
    requiredBidders: 3,
    description: 'Inspired by Fortuny\'s legendary pleating technique, this ensemble features permanently pleated silk that moves like water.',
    materials: '100% Silk Charmeuse',
    sizing: 'Universal',
  },
  {
    id: '8',
    title: 'Archive Trench Coat',
    designer: 'Heritage London',
    images: [fashionImages[0]],
    startPrice: 3200,
    currentPrice: 3200,
    endTime: new Date(Date.now() - 1000 * 60 * 60), // Ended
    status: 'VOID',
    uniqueBidderCount: 2,
    requiredBidders: 3,
    description: 'A reimagined classic featuring waterproof gabardine and contemporary proportions. Limited archive release.',
    materials: 'Cotton Gabardine, Wool Lining',
    sizing: 'EU 36-46',
  },
];

export const mockBids: Record<string, Bid[]> = {
  '1': [
    { id: 'b1', collectorId: '8492', amount: 3400, timestamp: new Date(Date.now() - 1000 * 60 * 5) },
    { id: 'b2', collectorId: '2341', amount: 3200, timestamp: new Date(Date.now() - 1000 * 60 * 15) },
    { id: 'b3', collectorId: '7823', amount: 3000, timestamp: new Date(Date.now() - 1000 * 60 * 45) },
    { id: 'b4', collectorId: '8492', amount: 2900, timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  ],
  '3': [
    { id: 'b5', collectorId: '4521', amount: 2100, timestamp: new Date(Date.now() - 1000 * 60 * 2) },
    { id: 'b6', collectorId: '9012', amount: 1900, timestamp: new Date(Date.now() - 1000 * 60 * 10) },
    { id: 'b7', collectorId: '3456', amount: 1800, timestamp: new Date(Date.now() - 1000 * 60 * 20) },
  ],
  '5': [
    { id: 'b8', collectorId: '1234', amount: 6200, timestamp: new Date(Date.now() - 1000 * 60 * 1) },
    { id: 'b9', collectorId: '5678', amount: 6000, timestamp: new Date(Date.now() - 1000 * 60 * 3) },
    { id: 'b10', collectorId: '9101', amount: 5800, timestamp: new Date(Date.now() - 1000 * 60 * 8) },
  ],
};

export const getAuctionById = (id: string): Auction | undefined => {
  return mockAuctions.find(auction => auction.id === id);
};

export const getBidsForAuction = (auctionId: string): Bid[] => {
  return mockBids[auctionId] || [];
};
