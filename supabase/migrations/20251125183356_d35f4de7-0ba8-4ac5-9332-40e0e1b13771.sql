-- Add foreign key constraints for jersey relationships
ALTER TABLE public.sale_listings
ADD CONSTRAINT sale_listings_jersey_id_fkey
FOREIGN KEY (jersey_id) REFERENCES public.jerseys(id) ON DELETE CASCADE;

ALTER TABLE public.auctions
ADD CONSTRAINT auctions_jersey_id_fkey
FOREIGN KEY (jersey_id) REFERENCES public.jerseys(id) ON DELETE CASCADE;

-- Enable realtime for auctions and bids tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;

-- Set replica identity for auctions to get full row data on updates
ALTER TABLE public.auctions REPLICA IDENTITY FULL;
ALTER TABLE public.bids REPLICA IDENTITY FULL;