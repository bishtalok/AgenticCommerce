import { z } from "zod";

export const missionCodeSchema = z.enum(["TRAVEL"]);

export const destinationTypeSchema = z.enum(["beach", "city", "mixed", "unknown"]);
export const travellerTypeSchema = z.enum(["adult", "child", "family"]);
export const urgencySchema = z.enum(["today", "1_3_days", "flexible"]);
export const sensitivitySchema = z.enum(["sensitive_skin", "fragrance_free_preference"]);
export const priceBandSchema = z.enum(["value", "mid", "premium"]);
export const categorySchema = z.enum([
  "SUN_CARE",
  "TOILETRIES",
  "HYGIENE",
  "FIRST_AID",
  "HYDRATION",
  "LIP_CARE",
  "MOISTURISER",
]);

export const answersSchema = z
  .object({
    destinationType: destinationTypeSchema.optional(),
    durationDays: z.number().int().min(1).max(60).optional(),
    travellerType: travellerTypeSchema.optional(),
    sensitivities: z.array(sensitivitySchema).optional(),
    urgency: urgencySchema.optional(),
  })
  .strict();

export const intentClassifyBody = z.object({
  query: z.string().min(1).max(500),
});

export const missionQuestionsNextBody = z.object({
  missionCode: missionCodeSchema,
  answers: answersSchema.default({}),
});

export const missionPlanBody = z.object({
  missionCode: missionCodeSchema,
  answers: answersSchema,
});

export const destinationContextSchema = z.object({
  matched: z.boolean(),
  key: z.string(),
  displayName: z.string(),
  flag: z.string(),
  region: z.string(),
  uvIndexPeak: z.number(),
  avgTempC: z.number(),
  malariaRisk: z.boolean(),
  tapWaterSafe: z.boolean(),
  healthAdvisories: z.array(z.string()),
  vaccineRecommendations: z.array(z.string()),
  spfMinimum: z.number(),
  packingNotes: z.array(z.string()),
});

export const bundleGenerateBody = z.object({
  planId: z.string().uuid(),
  priceBand: priceBandSchema.optional(),
  exclusions: z.array(categorySchema).optional(),
  removedSkus: z.array(z.string()).optional(),
  destinationContext: destinationContextSchema.optional(),
});

export const availabilityCheckBody = z.object({
  skus: z.array(z.string()).min(1).max(40),
  location: z
    .object({
      postcode: z.string().min(1).max(16),
    })
    .optional(),
  modes: z.array(z.enum(["CLICK_COLLECT", "DELIVERY"])).optional(),
});

export const cartAddBundleBody = z.object({
  basketId: z.string().uuid(),
  items: z
    .array(
      z.object({
        sku: z.string(),
        qty: z.number().int().min(1).max(10),
        reasonCode: z.string().optional(),
        why: z.string().optional(),
      })
    )
    .min(1),
});

export const cartUpdateBody = z.object({
  basketId: z.string().uuid(),
  updates: z.array(
    z.object({
      sku: z.string(),
      qty: z.number().int().min(0).max(10),
    })
  ),
});

export const checkoutCreateBody = z.object({
  basketId: z.string().uuid(),
  fulfilmentMode: z.enum(["DELIVERY", "CLICK_COLLECT"]),
  storeId: z.string().optional(),
  deliveryAddress: z
    .object({
      line1: z.string().min(1).max(200),
      line2: z.string().max(200).optional(),
      city: z.string().min(1).max(100),
      postcode: z.string().min(1).max(16),
    })
    .optional(),
});

export const consentMandateBody = z.object({
  checkoutSessionId: z.string().uuid(),
  scope: z.object({
    currency: z.literal("EUR"),
    amount: z.number().nonnegative(),
    ttlMinutes: z.number().int().min(1).max(120).default(30),
  }),
});

export const checkoutConfirmBody = z.object({
  checkoutSessionId: z.string().uuid(),
  mandateId: z.string().uuid(),
});
