# ATELIER - Luxury Validated by Desire

A luxury auction platform where exclusive pieces are unlocked by collective desire.

## Getting Started

### Prerequisites

- Node.js 18+ and npm installed
- Supabase account and project

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd atelier-unlocked-main
```

2. Install dependencies:
```sh
npm install
```

3. Set up environment variables:
```sh
cp env.template .env.local
```

Then update `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

4. Run the development server:
```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```sh
npm run build
npm start
```

## Technologies

This project is built with:

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Supabase** - Backend and authentication
- **shadcn-ui** - UI component library
- **Tailwind CSS** - Styling
- **React Query** - Data fetching and caching

## Project Structure

```
src/
├── app/              # Next.js app router pages
│   ├── page.tsx      # Landing page
│   ├── floor/        # Auction floor
│   ├── piece/[id]/   # Individual piece details
│   ├── vault/        # User vault
│   └── auth/         # Authentication
├── components/       # React components
├── contexts/         # React contexts
├── hooks/           # Custom React hooks
├── integrations/    # Third-party integrations
└── types/           # TypeScript types
```

## Features

- **Auction System** - Lock/unlock mechanism based on bidder count
- **User Authentication** - Sign up and sign in with Supabase
- **Real-time Bidding** - Place bids on exclusive pieces
- **User Roles** - Collectors and Designers
- **Personal Vault** - Track your auctions and acquisitions
