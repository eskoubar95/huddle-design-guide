import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import {
  ServicePointService,
  ServicePoint,
} from "@/lib/services/service-point-service";
import * as Sentry from "@sentry/nextjs";

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    const searchParams = req.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const postalCode = searchParams.get("postal_code");
    const country = searchParams.get("country");
    const carrier = searchParams.get("carrier") as
      | "gls"
      | "dhl"
      | "postnord"
      | "dpd"
      | "eurosender"
      | null;
    const courierIdParam = searchParams.get("courier_id");
    const courierId = courierIdParam ? parseInt(courierIdParam, 10) : undefined;
    const radiusKm = searchParams.get("radius_km")
      ? parseInt(searchParams.get("radius_km")!)
      : 10;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 20;

    // Validate required parameters
    if (!country) {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "country parameter is required" } },
        { status: 400 }
      );
    }

    // Validate search method (either coordinates or postal code required)
    if (!lat && !lng && !postalCode) {
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Either lat/lng (coordinates) or postal_code is required",
          },
        },
        { status: 400 }
      );
    }

    // If courierId provided, coordinates are required for Eurosender PUDO API
    if (courierId && (!lat || !lng)) {
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message:
              "lat and lng are required when courier_id is provided (Eurosender PUDO API requires coordinates)",
          },
        },
        { status: 400 }
      );
    }

    // Validate coordinate format if provided
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (isNaN(latNum) || isNaN(lngNum)) {
        return Response.json(
          {
            error: {
              code: "BAD_REQUEST",
              message: "lat and lng must be valid numbers",
            },
          },
          { status: 400 }
        );
      }
      if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        return Response.json(
          {
            error: {
              code: "BAD_REQUEST",
              message: "lat must be between -90 and 90, lng must be between -180 and 180",
            },
          },
          { status: 400 }
        );
      }
    }

    const service = new ServicePointService();
    let points: ServicePoint[];

    if (lat && lng) {
      // Search by coordinates
      points = await service.searchByCoordinates({
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        country: country.toUpperCase(),
        carrier: carrier || undefined,
        courierId,
        radiusKm,
        limit,
      });
    } else if (postalCode) {
      // Search by postal code
      points = await service.searchByPostalCode({
        postalCode,
        country: country.toUpperCase(),
        carrier: carrier || undefined,
        courierId,
        limit,
      });
    } else {
      // This should never happen due to validation above, but TypeScript needs it
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Either lat/lng or postal_code required",
          },
        },
        { status: 400 }
      );
    }

    // Ensure points are sorted by distance (ServicePointService should already do this, but ensure it)
    const sortedPoints = points.sort((a, b) => {
      const distA = a.distance_km ?? Infinity;
      const distB = b.distance_km ?? Infinity;
      return distA - distB;
    });

    return Response.json({ points: sortedPoints });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "service-points-api" },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

