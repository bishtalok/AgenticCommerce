import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { availabilityCheckBody } from "@/lib/zodSchemas";
import { errorResponse, ApiError } from "@/lib/errors";
import { rateLimit } from "@/lib/rateLimit";
import { getAvailability } from "@/services/availabilityService";
import { listStoresNearby } from "@/services/storeService";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = rateLimit(`mission:${ip}`);
    if (!rl.allowed) {
      throw new ApiError("RATE_LIMITED", "Too many requests", "Please slow down.", 429);
    }

    const body = availabilityCheckBody.parse(await req.json());

    const stores = await listStoresNearby(body.location?.postcode);
    const storeIds = stores.map((s) => s.storeId);
    const records = await getAvailability({ skus: body.skus, storeIds });

    // Shape response per PRD §7.3: { stores: [...], availability: { [storeId]: { [sku]: {status,qty} } } }
    const availability: Record<string, Record<string, { status: string; qty: number }>> = {};
    for (const r of records) {
      availability[r.storeId] = availability[r.storeId] ?? {};
      availability[r.storeId][r.sku] = { status: r.status, qty: r.qty };
    }

    return NextResponse.json({
      stores,
      availability,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(
        new ApiError("INVALID_INPUT", "Invalid input", "Please check your request.")
      );
    }
    return errorResponse(err);
  }
}
