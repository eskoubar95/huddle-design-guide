-- Create sale listings table
CREATE TABLE public.sale_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jersey_id UUID NOT NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  shipping_worldwide BOOLEAN DEFAULT true,
  shipping_local_only BOOLEAN DEFAULT false,
  shipping_cost_buyer BOOLEAN DEFAULT true,
  shipping_cost_seller BOOLEAN DEFAULT false,
  shipping_free_in_country BOOLEAN DEFAULT false,
  negotiable BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  sold_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create auctions table
CREATE TABLE public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jersey_id UUID NOT NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starting_bid DECIMAL(10, 2) NOT NULL,
  current_bid DECIMAL(10, 2),
  buy_now_price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'EUR',
  duration_hours INTEGER NOT NULL CHECK (duration_hours IN (24, 48, 72, 168)),
  shipping_worldwide BOOLEAN DEFAULT true,
  shipping_local_only BOOLEAN DEFAULT false,
  shipping_cost_buyer BOOLEAN DEFAULT true,
  shipping_cost_seller BOOLEAN DEFAULT false,
  shipping_free_in_country BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bids table
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('sale', 'auction')),
  listing_id UUID NOT NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Sale listings policies
CREATE POLICY "Anyone can view active sale listings"
  ON public.sale_listings FOR SELECT
  USING (status = 'active');

CREATE POLICY "Sellers can view their own listings"
  ON public.sale_listings FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create sale listings"
  ON public.sale_listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own listings"
  ON public.sale_listings FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own listings"
  ON public.sale_listings FOR DELETE
  USING (auth.uid() = seller_id);

-- Auction policies
CREATE POLICY "Anyone can view active auctions"
  ON public.auctions FOR SELECT
  USING (status = 'active');

CREATE POLICY "Sellers can view their own auctions"
  ON public.auctions FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create auctions"
  ON public.auctions FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own auctions"
  ON public.auctions FOR UPDATE
  USING (auth.uid() = seller_id);

-- Bids policies
CREATE POLICY "Anyone can view bids"
  ON public.bids FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can place bids"
  ON public.bids FOR INSERT
  WITH CHECK (auth.uid() = bidder_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "System can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update transactions"
  ON public.transactions FOR UPDATE
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_sale_listings_updated_at
  BEFORE UPDATE ON public.sale_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically update auction current_bid
CREATE OR REPLACE FUNCTION public.update_auction_current_bid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.auctions
  SET current_bid = NEW.amount
  WHERE id = NEW.auction_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update current_bid on new bid
CREATE TRIGGER update_auction_bid_trigger
  AFTER INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.update_auction_current_bid();

-- Create indexes for better performance
CREATE INDEX idx_sale_listings_seller ON public.sale_listings(seller_id);
CREATE INDEX idx_sale_listings_status ON public.sale_listings(status);
CREATE INDEX idx_auctions_seller ON public.auctions(seller_id);
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_ends_at ON public.auctions(ends_at);
CREATE INDEX idx_bids_auction ON public.bids(auction_id);
CREATE INDEX idx_bids_bidder ON public.bids(bidder_id);
CREATE INDEX idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON public.transactions(seller_id);