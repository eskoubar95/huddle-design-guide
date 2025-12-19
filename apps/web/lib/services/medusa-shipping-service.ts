import { query } from "@/lib/db/postgres-connection";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

export interface MedusaRegion {
  id: string;
  name: string;
  currency_code: string;
  countries: string[]; // ISO 2-letter codes
}

export interface MedusaShippingOption {
  id: string;
  name: string;
  price_type: string; // 'flat' | 'calculated'
  provider_id: string;
  service_zone_id: string;
  shipping_profile_id: string;
  type_code: string; // 'standard' | 'express'
  type_label: string;
  type_description: string | null;
  prices: Array<{
    currency_code: string;
    amount: number; // in minor units (cents)
    region_id?: string;
  }>;
}

export interface MedusaServiceZone {
  id: string;
  name: string;
  fulfillment_set_id: string;
  geo_zones: Array<{
    id: string;
    country_code: string;
    type: string;
  }>;
}

/**
 * MedusaShippingService - Queries Medusa schema for shipping data
 *
 * Uses direct SQL queries to medusa.* schema (pattern from countries API)
 * Genbrugelig service for HUD-36 (calculation) og HUD-42 (label generation)
 *
 * ⚠️ IMPORTANT: READ-ONLY queries only. This service does NOT modify Medusa's shop data.
 * Medusa is both our marketplace engine AND shop - we must not interfere with shop functionality.
 */
export class MedusaShippingService {
  /**
   * Get all regions from Medusa
   */
  async getRegions(): Promise<MedusaRegion[]> {
    try {
      const regions = await query<{
        id: string;
        name: string;
        currency_code: string;
      }>(
        `
        SELECT id, name, currency_code
        FROM medusa.region
        ORDER BY name ASC
        `
      );

      // Get countries for each region
      const regionsWithCountries: MedusaRegion[] = await Promise.all(
        regions.map(async (region) => {
          const countries = await query<{ iso_2: string }>(
            `
            SELECT iso_2
            FROM medusa.region_country
            WHERE region_id = $1
            ORDER BY iso_2 ASC
            `,
            [region.id]
          );

          return {
            id: region.id,
            name: region.name,
            currency_code: region.currency_code,
            countries: countries.map((c) => c.iso_2),
          };
        })
      );

      return regionsWithCountries;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_shipping_service", operation: "get_regions" },
        extra: { errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to fetch shipping regions",
        502
      );
    }
  }

  /**
   * Get region by country code
   */
  async getRegionByCountry(countryCode: string): Promise<MedusaRegion | null> {
    try {
      // Use case-insensitive matching for country codes
      const result = await query<{
        region_id: string;
        region_name: string;
        currency_code: string;
      }>(
        `
        SELECT DISTINCT
          r.id as region_id,
          r.name as region_name,
          r.currency_code
        FROM medusa.region r
        INNER JOIN medusa.region_country rc ON r.id = rc.region_id
        WHERE LOWER(rc.iso_2) = LOWER($1)
        LIMIT 1
        `,
        [countryCode]
      );

      if (result.length === 0) {
        return null;
      }

      const region = result[0];
      const countries = await query<{ iso_2: string }>(
        `
        SELECT iso_2
        FROM medusa.region_country
        WHERE region_id = $1
        ORDER BY iso_2 ASC
        `,
        [region.region_id]
      );

      return {
        id: region.region_id,
        name: region.region_name,
        currency_code: region.currency_code,
        countries: countries.map((c) => c.iso_2),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_shipping_service", operation: "get_region_by_country" },
        extra: { errorMessage, countryCode },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to fetch region by country",
        502
      );
    }
  }

  /**
   * Get shipping options for a region
   *
   * @param regionId Medusa region ID
   * @param serviceType Optional filter: 'home_delivery' | 'pickup_point'
   */
  async getShippingOptions(
    regionId: string,
    serviceType?: "home_delivery" | "pickup_point"
  ): Promise<MedusaShippingOption[]> {
    try {
      // Query shipping options with prices
      // Medusa v2 uses: shipping_option → shipping_option_price_set → price_set → price → price_rule (for region_id)
      // IMPORTANT: Read-only queries - we don't modify Medusa's shop data
      const options = await query<{
        id: string;
        name: string;
        price_type: string;
        provider_id: string;
        service_zone_id: string;
        shipping_profile_id: string;
        type_code: string;
        type_label: string;
        type_description: string | null;
        price_amount: number;
        price_currency: string;
        region_id: string | null;
      }>(
        `
        SELECT DISTINCT
          so.id,
          so.name,
          so.price_type,
          so.provider_id,
          so.service_zone_id,
          so.shipping_profile_id,
          sot.code as type_code,
          sot.label as type_label,
          sot.description as type_description,
          p.amount as price_amount,
          p.currency_code as price_currency,
          pr.value as region_id
        FROM medusa.shipping_option so
        LEFT JOIN medusa.shipping_option_type sot ON so.shipping_option_type_id = sot.id
        LEFT JOIN medusa.shipping_option_price_set sop ON so.id = sop.shipping_option_id
        LEFT JOIN medusa.price_set ps ON sop.price_set_id = ps.id
        LEFT JOIN medusa.price p ON ps.id = p.price_set_id
        LEFT JOIN medusa.price_rule pr ON p.id = pr.price_id AND pr.attribute = 'region_id'
        WHERE (pr.value = $1 OR pr.value IS NULL)
        ORDER BY so.name ASC
        `,
        [regionId]
      );

      // Group prices by shipping option
      const optionsMap = new Map<string, MedusaShippingOption>();

      for (const row of options) {
        if (!optionsMap.has(row.id)) {
          optionsMap.set(row.id, {
            id: row.id,
            name: row.name,
            price_type: row.price_type,
            provider_id: row.provider_id,
            service_zone_id: row.service_zone_id,
            shipping_profile_id: row.shipping_profile_id,
            type_code: row.type_code,
            type_label: row.type_label,
            type_description: row.type_description,
            prices: [],
          });
        }

        const option = optionsMap.get(row.id)!;
        if (row.price_amount && row.price_currency) {
          option.prices.push({
            currency_code: row.price_currency,
            amount: row.price_amount, // Already in minor units (cents)
            region_id: row.region_id || regionId, // Use actual region_id from price_rule if available
          });
        }
      }

      let result = Array.from(optionsMap.values());

      // Filter by service type if provided
      // Note: Medusa doesn't have service_type field - we'll map based on type_code
      // Standard/Express = home_delivery, future: pickup_point options
      if (serviceType === "pickup_point") {
        // For now, return empty (pickup points will be handled by Eurosender PUDO API in Phase 4)
        result = [];
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_shipping_service", operation: "get_shipping_options" },
        extra: { errorMessage, regionId, serviceType },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to fetch shipping options",
        502
      );
    }
  }

  /**
   * Get service zones for a region
   */
  async getServiceZones(regionId: string): Promise<MedusaServiceZone[]> {
    try {
      // Query service zones via fulfillment_set
      // This is complex - simplified for MVP
      const zones = await query<{
        id: string;
        name: string;
        fulfillment_set_id: string;
      }>(
        `
        SELECT DISTINCT
          sz.id,
          sz.name,
          sz.fulfillment_set_id
        FROM medusa.service_zone sz
        INNER JOIN medusa.fulfillment_set fs ON sz.fulfillment_set_id = fs.id
        WHERE EXISTS (
          SELECT 1
          FROM medusa.geo_zone gz
          WHERE gz.service_zone_id = sz.id
          AND EXISTS (
            SELECT 1
            FROM medusa.region_country rc
            WHERE rc.region_id = $1
            AND rc.iso_2 = gz.country_code
          )
        )
        `,
        [regionId]
      );

      // Get geo zones for each service zone
      const zonesWithGeoZones: MedusaServiceZone[] = await Promise.all(
        zones.map(async (zone) => {
          const geoZones = await query<{
            id: string;
            country_code: string;
            type: string;
          }>(
            `
            SELECT id, country_code, type
            FROM medusa.geo_zone
            WHERE service_zone_id = $1
            `,
            [zone.id]
          );

          return {
            id: zone.id,
            name: zone.name,
            fulfillment_set_id: zone.fulfillment_set_id,
            geo_zones: geoZones,
          };
        })
      );

      return zonesWithGeoZones;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_shipping_service", operation: "get_service_zones" },
        extra: { errorMessage, regionId },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to fetch service zones",
        502
      );
    }
  }
}

