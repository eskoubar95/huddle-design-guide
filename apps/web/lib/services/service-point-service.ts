import { query } from "@/lib/db/postgres-connection";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";
import { EurosenderService } from "./eurosender-service";

export interface ServicePoint {
  id: string;
  provider: "gls" | "dhl" | "postnord" | "dpd" | "eurosender";
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
  latitude?: number; // Made optional for postal code search
  longitude?: number; // Made optional for postal code search
  postalCode?: string; // Added for postal code search
  country: string; // ISO 2-letter
  carrier?: "gls" | "dhl" | "postnord" | "dpd" | "eurosender";
  courierId?: number; // Required for Eurosender PUDO search
  radiusKm?: number; // Default: 10km
  limit?: number; // Default: 20
  // Optional parcel dimensions for PUDO search (defaults used if not provided)
  parcelWeight?: number; // kg
  parcelLength?: number; // cm
  parcelWidth?: number; // cm
  parcelHeight?: number; // cm
}

/**
 * ServicePointService - Integrates with Eurosender PUDO API for pickup point search
 *
 * Uses Eurosender PUDO API for service point search (requires courierId from quote).
 * Falls back to cached points if courierId not provided.
 *
 * Caches results in database for performance
 */
export class ServicePointService {
  private eurosenderService: EurosenderService;

  constructor() {
    this.eurosenderService = new EurosenderService();
  }
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
        courierId,
        radiusKm = 10,
        limit = 20,
      } = params;

      if (latitude === undefined || longitude === undefined) {
        throw new ApiError(
          "BAD_REQUEST",
          "Latitude and longitude are required for coordinate search.",
          400
        );
      }

      // 1. If courierId provided, use Eurosender PUDO API
      if (courierId) {
        return this.searchEurosenderPudoPoints({
          ...params,
          latitude,
          longitude,
          courierId,
        });
      }

      // 2. Check cache first (points within radius)
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

      // 3. Return cached points only (no direct carrier APIs)
      console.log("[SERVICE_POINTS] Returning cached points only (courierId required for Eurosender PUDO search)");
      
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
    params: ServicePointSearchParams
  ): Promise<ServicePoint[]> {
    try {
      const { postalCode, country, carrier, courierId, limit = 20 } = params;

      if (!postalCode) {
        throw new ApiError("BAD_REQUEST", "Postal code is required.", 400);
      }

      // 1. If courierId provided, we need coordinates for Eurosender PUDO
      // TODO: Geocode postal code to get coordinates, then call searchEurosenderPudoPoints
      // For now, return cached points only when courierId is provided with postal code
      if (courierId) {
        console.log(
          "[SERVICE_POINTS] Postal code search with courierId requires geocoding (not yet implemented). Returning cached points only."
        );
        // Could throw error here, but for now return cached points as fallback
        // throw new ApiError(
        //   "BAD_REQUEST",
        //   "Postal code search with courierId requires coordinates. Please provide lat/lng or use coordinate search.",
        //   400
        // );
      }

      // 2. Return cached points for postal code
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
        extra: { errorMessage, postalCode: params.postalCode, country: params.country, carrier: params.carrier },
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

  /**
   * Search service points using Eurosender PUDO API
   * Requires courierId from quote - must get quote first
   */
  private async searchEurosenderPudoPoints(
    params: ServicePointSearchParams & { courierId: number; latitude: number; longitude: number }
  ): Promise<ServicePoint[]> {
    try {
      const {
        courierId,
        country,
        latitude,
        longitude,
        radiusKm = 10,
        limit = 20,
        parcelWeight = 0.5, // Default jersey weight (kg)
        parcelLength = 30, // Default jersey dimensions (cm)
        parcelWidth = 20,
        parcelHeight = 5,
      } = params;

      console.log("[SERVICE_POINTS] Searching Eurosender PUDO points:", {
        courierId,
        country,
        latitude,
        longitude,
        radiusKm,
        limit,
      });

      // Call Eurosender PUDO API
      // Parcels structure: Nested object with parcels array (as per implementation plan)
      const pudoResponse = await this.eurosenderService.searchPudoPoints({
        courierId,
        country,
        geolocation: { latitude, longitude },
        distanceFromLocation: radiusKm,
        parcels: {
          parcels: [
            {
              parcelId: "HuddleJersey",
              weight: parcelWeight,
              length: parcelLength,
              width: parcelWidth,
              height: parcelHeight,
            },
          ],
        },
        filterBySide: "deliverySide", // For buyer pickup points
        resultsLimit: limit,
      });

      console.log("[SERVICE_POINTS] Eurosender PUDO response:", {
        pointsCount: pudoResponse.points.length,
      });

      // Map to ServicePoint format with enhanced fields
      const points: ServicePoint[] = pudoResponse.points.map((pudo) => {
        // Calculate distance from search location
        const distanceKm = this.calculateDistance(
          latitude,
          longitude,
          pudo.geolocation.latitude,
          pudo.geolocation.longitude
        );

        // Build opening hours object (preserve Eurosender format)
        const openingHours = pudo.openingHours
          ? {
              openingHours: pudo.openingHours,
              shippingCutOffTime: pudo.shippingCutOffTime,
              features: pudo.features,
              pointEmail: pudo.pointEmail,
              pointPhone: pudo.pointPhone,
              holidayDates: pudo.holidayDates,
            }
          : null;

        return {
          id: pudo.pudoPointCode,
          provider: "eurosender",
          provider_id: pudo.pudoPointCode,
          name: pudo.locationName,
          address: `${pudo.street}, ${pudo.zip} ${pudo.city}`,
          city: pudo.city,
          postal_code: pudo.zip,
          country,
          latitude: pudo.geolocation.latitude,
          longitude: pudo.geolocation.longitude,
          type: "service_point", // Default type (could be enhanced to detect locker/store from features)
          opening_hours: openingHours,
          distance_km: distanceKm,
        };
      });

      // Cache points (with error handling)
      try {
        await this.cachePoints(points, latitude, longitude);
      } catch (cacheError) {
        // Log but don't fail the request
        console.error("[SERVICE_POINTS] Failed to cache points:", cacheError);
        Sentry.captureException(cacheError, {
          tags: {
            component: "service_point_service",
            operation: "cache_pudo_points",
          },
          extra: { pointsCount: points.length, courierId },
        });
      }

      // Sort by distance and return
      return points.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[SERVICE_POINTS] Eurosender PUDO search failed:", errorMessage);

      Sentry.captureException(error, {
        tags: {
          component: "service_point_service",
          operation: "search_eurosender_pudo_points",
        },
        extra: {
          errorMessage,
          courierId: params.courierId,
          country: params.country,
          latitude: params.latitude,
          longitude: params.longitude,
        },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to search Eurosender PUDO points. Please try again later.",
        502
      );
    }
  }

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

