-- Cleanup: Slet Medusa tabeller fra public schema
-- Disse tabeller skal kun være i medusa schema
-- Related to: HUD-15

-- Slet migrations tabel fra public (behold kun i medusa)
DROP TABLE IF EXISTS public.mikro_orm_migrations CASCADE;

-- Slet andre Medusa tabeller fra public hvis de eksisterer
DROP TABLE IF EXISTS public.stock_location_address CASCADE;
DROP TABLE IF EXISTS public.stock_location CASCADE;
DROP TABLE IF EXISTS public.inventory_level CASCADE;
DROP TABLE IF EXISTS public.inventory_item CASCADE;
DROP TABLE IF EXISTS public.reservation_item CASCADE;

