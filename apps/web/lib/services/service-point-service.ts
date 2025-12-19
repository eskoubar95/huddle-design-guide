import { query } from "@/lib/db/postgres-connection";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

export interface ServicePoint {
  id: string;
  provider: "gls" | "dhl" | "postnord" | "dpd";
  provider_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  type: "service_point" | "locker" | "store";
  opening_hours: Record<string, any> | null;
  distance_km: number | null;
}

export interface ServicePointSearchParams {
  latitude: number;
  longitude: number;
  country: string; // ISO 2-letter
  carrier?: "gls" | "dhl" | "postnord" | "dpd";
  radiusKm?: number; // Default: 10km
  limit?: number; // Default: 20
}

/**
 * ServicePointService - Integrates with Eurosender PUDO API for pickup point search
 *
 * Note: Direct carrier API integration (DHL, PostNord, GLS, DPD) removed.
 * Will use Eurosender PUDO API in Phase 4.
 *
 * Caches results in database for performance
 */
export class ServicePointService {
  /**
   * Search service points by GPS coordinates
   */
  async searchByCoordinates(
    params: ServicePointSearchParams
  ): Promise<ServicePoint[]> {
    try {
      const {
        latitude,
        longitude,
        country,
        carrier,
        radiusKm = 10,
        limit = 20,
      } = params;

      // 1. Check cache first (points within radius)
      const cached = await this.getCachedPoints(
        latitude,
        longitude,
        country,
        carrier,
        radiusKm,
        limit
      );

      if (cached.length >= limit) {
        return cached;
      }

      // 2. TODO: Implement Eurosender PUDO API in Phase 4
      // For now, return cached points only
      console.log("[SERVICE_POINTS] Returning cached points only (Eurosender PUDO integration in progress)");
      
      // Return cached points (sorted by distance)
      return cached
        .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
        .slice(0, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: {
          component: "service_point_service",
          operation: "search_by_coordinates",
        },
        extra: { errorMessage, params },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to search service points",
        502
      );
    }
  }

  /**
   * Search service points by postal code
   */
  async searchByPostalCode(
    postalCode: string,
    country: string,
    carrier?: "gls" | "dhl" | "postnord" | "dpd",
    limit: number = 20
  ): Promise<ServicePoint[]> {
    try {
      // For postal code search, we need to:
      // 1. Geocode postal code to get coordinates
      // 2. Then use coordinate search

      // Simplified: Use geocoding service (Google Maps Geocoding API or similar)
      // For MVP: Return cached points for postal code

      const points = await query<ServicePoint>(
        `
        SELECT 
          id,
          provider,
          provider_id,
          name,
          address,
          city,
          postal_code,
          country,
          latitude,
          longitude,
          type,
          opening_hours,
          distance_km
        FROM public.service_points
        WHERE country = $1
          AND postal_code = $2
          ${carrier ? `AND provider = $3` : ""}
        ORDER BY name ASC
        LIMIT $${carrier ? 4 : 3}
        `,
        carrier
          ? [country, postalCode, carrier, limit]
          : [country, postalCode, limit]
      );

      return points;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: {
          component: "service_point_service",
          operation: "search_by_postal_code",
        },
        extra: { errorMessage, postalCode, country, carrier },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to search service points by postal code",
        502
      );
    }
  }

  /**
   * Get cached points from database
   */
  private async getCachedPoints(
    latitude: number,
    longitude: number,
    country: string,
    carrier?: string,
    radiusKm: number = 10,
    limit: number = 20
  ): Promise<ServicePoint[]> {
    // Use PostGIS for geospatial queries (if available)
    // Otherwise, use simple distance calculation
    const points = await query<ServicePoint & { distance_km: number }>(
      `
      SELECT 
        id,
        provider,
        provider_id,
        name,
        address,
        city,
        postal_code,
        country,
        latitude,
        longitude,
        type,
        opening_hours,
        -- Calculate distance (Haversine formula, simplified)
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )
        ) as distance_km
      FROM public.service_points
      WHERE country = $3
        ${carrier ? `AND provider = $4` : ""}
        AND (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )
        ) <= $${carrier ? 5 : 4}
      ORDER BY distance_km ASC
      LIMIT $${carrier ? 6 : 5}
      `,
      carrier
        ? [latitude, longitude, country, carrier, radiusKm, limit]
        : [latitude, longitude, country, radiusKm, limit]
    );

    return points;
  }

  // NOTE: Direct carrier API methods (fetchFromCarriers, fetchFromCarrier, fetchGLS, fetchDHL, fetchPostNord, fetchDPD)
  // have been removed. Will use Eurosender PUDO API in Phase 4.

  /**
   * Cache service points in database
   */
  private async cachePoints(
    points: ServicePoint[],
    searchLat: number,
    searchLng: number
  ): Promise<void> {
    for (const point of points) {
      // Calculate distance if not set
      if (!point.distance_km) {
        point.distance_km = this.calculateDistance(
          searchLat,
          searchLng,
          point.latitude,
          point.longitude
        );
      }

      try {
        // Upsert point using direct SQL (since table not in types yet)
        await query(
          `
          INSERT INTO public.service_points (
            provider, provider_id, name, address, city, postal_code,
            country, latitude, longitude, type, opening_hours, distance_km
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (provider, provider_id)
          DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            postal_code = EXCLUDED.postal_code,
            country = EXCLUDED.country,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            type = EXCLUDED.type,
            opening_hours = EXCLUDED.opening_hours,
            distance_km = EXCLUDED.distance_km,
            updated_at = NOW()
          `,
          [
            point.provider,
            point.provider_id,
            point.name,
            point.address,
            point.city,
            point.postal_code,
            point.country,
            point.latitude,
            point.longitude,
            point.type,
            point.opening_hours ? JSON.stringify(point.opening_hours) : null,
            point.distance_km,
          ]
        );
      } catch (error) {
        // Log but continue
        Sentry.captureException(error, {
          tags: {
            component: "service_point_service",
            operation: "cache_points",
          },
          extra: { provider: point.provider, provider_id: point.provider_id },
        });
      }
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

