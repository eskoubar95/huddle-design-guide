-- Create RPC function for atomic bid placement
-- This ensures both bid creation and auction.current_bid update happen atomically
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id UUID,
  p_bidder_id UUID,
  p_amount TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_auction RECORD;
  v_bid RECORD;
BEGIN
  -- Check auction exists and is active
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id AND status = 'active'
  FOR UPDATE; -- Lock row for transaction

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction is not active' USING ERRCODE = 'P0001';
  END IF;

  -- Check if auction has ended
  IF v_auction.ends_at < NOW() THEN
    RAISE EXCEPTION 'Auction has ended' USING ERRCODE = 'P0001';
  END IF;

  -- Validate bid amount
  IF p_amount::NUMERIC <= COALESCE(v_auction.current_bid, v_auction.starting_bid)::NUMERIC THEN
    RAISE EXCEPTION 'Bid must be higher than current bid' USING ERRCODE = 'P0001';
  END IF;

  -- Check if user is bidding on their own auction
  IF v_auction.seller_id = p_bidder_id THEN
    RAISE EXCEPTION 'Cannot bid on your own auction' USING ERRCODE = 'P0001';
  END IF;

  -- Insert bid
  INSERT INTO bids (auction_id, bidder_id, amount)
  VALUES (p_auction_id, p_bidder_id, p_amount::NUMERIC)
  RETURNING * INTO v_bid;

  -- Update auction current_bid atomically
  UPDATE auctions
  SET current_bid = p_amount::NUMERIC, updated_at = NOW()
  WHERE id = p_auction_id;

  RETURN row_to_json(v_bid)::JSONB;
END;
$$;

