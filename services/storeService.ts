import { prisma } from "@/lib/db";

export interface StoreDto {
  storeId: string;
  name: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
  supportsClickCollect: boolean;
  distanceKm?: number;
}

// Approximate centroids for common Irish postcode prefixes.
// Used only by the prototype locator — real impl would hit a geocoder.
const POSTCODE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  D01: { lat: 53.3498, lng: -6.2603 },
  D02: { lat: 53.3434, lng: -6.2598 },
  D04: { lat: 53.329, lng: -6.225 },
  D14: { lat: 53.289, lng: -6.2426 },
  T12: { lat: 51.8985, lng: -8.4755 },
  H91: { lat: 53.2733, lng: -9.0491 },
  V94: { lat: 52.638, lng: -8.6308 },
};

export async function listStoresNearby(postcode?: string): Promise<StoreDto[]> {
  const rows = await prisma.store.findMany();
  const base: StoreDto[] = rows.map((r) => ({
    storeId: r.id,
    name: r.name,
    city: r.city,
    postcode: r.postcode,
    lat: Number(r.lat.toString()),
    lng: Number(r.lng.toString()),
    supportsClickCollect: r.supportsClickCollect,
  }));

  if (!postcode) return base;

  const prefix = postcode.toUpperCase().slice(0, 3);
  const origin = POSTCODE_CENTROIDS[prefix];

  if (!origin) {
    return base; // unknown postcode → return unsorted
  }

  return base
    .map((s) => ({ ...s, distanceKm: haversineKm(origin, { lat: s.lat, lng: s.lng }) }))
    .sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9))
    .slice(0, 5);
}

export async function getStore(storeId: string): Promise<StoreDto | null> {
  const r = await prisma.store.findUnique({ where: { id: storeId } });
  if (!r) return null;
  return {
    storeId: r.id,
    name: r.name,
    city: r.city,
    postcode: r.postcode,
    lat: Number(r.lat.toString()),
    lng: Number(r.lng.toString()),
    supportsClickCollect: r.supportsClickCollect,
  };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}
