import destinationsRaw from "@/data/destinations.json";

export interface DestinationContext {
  matched: boolean;
  key: string;
  displayName: string;
  flag: string;
  region: string;
  uvIndexPeak: number;
  avgTempC: number;
  malariaRisk: boolean;
  tapWaterSafe: boolean;
  healthAdvisories: string[];
  vaccineRecommendations: string[];
  spfMinimum: number;
  packingNotes: string[];
}

const destinations = destinationsRaw as Record<string, Omit<DestinationContext, "matched" | "key">>;

/** Keyword → destination key mapping (order matters — longer phrases first) */
const ALIASES: Array<[string, string]> = [
  // Canary Islands (before spain to avoid false match on "island")
  ["canary islands", "canaries"],
  ["canaries", "canaries"],
  ["tenerife", "canaries"],
  ["gran canaria", "canaries"],
  ["lanzarote", "canaries"],
  ["fuerteventura", "canaries"],
  // Maldives
  ["maldives", "maldives"],
  // Bali
  ["bali", "bali"],
  ["indonesia", "bali"],
  // Spain
  ["spain", "spain"],
  ["spanish", "spain"],
  ["malaga", "spain"],
  ["barcelona", "spain"],
  ["madrid", "spain"],
  ["ibiza", "spain"],
  ["majorca", "spain"],
  ["mallorca", "spain"],
  ["costa del sol", "spain"],
  ["benidorm", "spain"],
  ["alicante", "spain"],
  ["seville", "spain"],
  ["granada", "spain"],
  ["valencia", "spain"],
  // Portugal
  ["portugal", "portugal"],
  ["lisbon", "portugal"],
  ["porto", "portugal"],
  ["algarve", "portugal"],
  ["faro", "portugal"],
  // Greece
  ["greece", "greece"],
  ["greek", "greece"],
  ["santorini", "greece"],
  ["mykonos", "greece"],
  ["crete", "greece"],
  ["corfu", "greece"],
  ["rhodes", "greece"],
  ["athens", "greece"],
  ["zakynthos", "greece"],
  ["zante", "greece"],
  ["kos", "greece"],
  // Turkey
  ["turkey", "turkey"],
  ["turkish", "turkey"],
  ["istanbul", "turkey"],
  ["antalya", "turkey"],
  ["bodrum", "turkey"],
  ["marmaris", "turkey"],
  ["dalaman", "turkey"],
  // Italy
  ["italy", "italy"],
  ["italian", "italy"],
  ["rome", "italy"],
  ["milan", "italy"],
  ["naples", "italy"],
  ["sicily", "italy"],
  ["sardinia", "italy"],
  ["amalfi", "italy"],
  ["venice", "italy"],
  ["florence", "italy"],
  // France
  ["france", "france"],
  ["french", "france"],
  ["paris", "france"],
  ["nice", "france"],
  ["cannes", "france"],
  ["côte d'azur", "france"],
  ["cote d azur", "france"],
  // Croatia
  ["croatia", "croatia"],
  ["croatian", "croatia"],
  ["dubrovnik", "croatia"],
  ["split", "croatia"],
  ["hvar", "croatia"],
  // Egypt
  ["egypt", "egypt"],
  ["egyptian", "egypt"],
  ["cairo", "egypt"],
  ["sharm", "egypt"],
  ["hurghada", "egypt"],
  ["luxor", "egypt"],
  // Thailand
  ["thailand", "thailand"],
  ["thai", "thailand"],
  ["bangkok", "thailand"],
  ["phuket", "thailand"],
  ["koh samui", "thailand"],
  ["chiang mai", "thailand"],
  // Dubai / UAE
  ["dubai", "dubai"],
  ["uae", "dubai"],
  ["abu dhabi", "dubai"],
  ["emirates", "dubai"],
  // Morocco
  ["morocco", "morocco"],
  ["moroccan", "morocco"],
  ["marrakech", "morocco"],
  ["marrakesh", "morocco"],
  ["casablanca", "morocco"],
  ["fez", "morocco"],
  // Cyprus
  ["cyprus", "cyprus"],
  ["paphos", "cyprus"],
  ["ayia napa", "cyprus"],
  ["nicosia", "cyprus"],
  // Malta
  ["malta", "malta"],
  ["valletta", "malta"],
  // Ireland (domestic)
  ["ireland", "ireland"],
  ["kerry", "ireland"],
  ["west coast", "ireland"],
  ["galway", "ireland"],
  ["donegal", "ireland"],
  // UK
  ["uk", "uk"],
  ["england", "uk"],
  ["scotland", "uk"],
  ["wales", "uk"],
  ["london", "uk"],
  ["edinburgh", "uk"],
];

/** Extract destination context from a free-text query. */
export function extractDestinationContext(query: string): DestinationContext {
  const q = query.toLowerCase();

  for (const [alias, key] of ALIASES) {
    if (q.includes(alias)) {
      const dest = destinations[key];
      if (dest) {
        return { matched: true, key, ...dest };
      }
    }
  }

  return unmatched();
}

/** UV index label for UI display. */
export function uvLabel(uvIndex: number): string {
  if (uvIndex <= 2) return "Low";
  if (uvIndex <= 5) return "Moderate";
  if (uvIndex <= 7) return "High";
  if (uvIndex <= 10) return "Very High";
  return "Extreme";
}

/** Urgency-adjusted packing note for high-risk destinations. */
export function getHealthAlert(ctx: DestinationContext): string | null {
  if (ctx.malariaRisk) {
    return "⚠️ Malaria risk — speak to a pharmacist before travelling.";
  }
  if (ctx.vaccineRecommendations.length > 0) {
    return `💉 Vaccines advised: ${ctx.vaccineRecommendations.join(", ")}. Consult your GP.`;
  }
  if (!ctx.tapWaterSafe) {
    return "🚱 Tap water unsafe — bottled water essential.";
  }
  return null;
}

function unmatched(): DestinationContext {
  return {
    matched: false,
    key: "",
    displayName: "",
    flag: "",
    region: "",
    uvIndexPeak: 0,
    avgTempC: 20,
    malariaRisk: false,
    tapWaterSafe: true,
    healthAdvisories: [],
    vaccineRecommendations: [],
    spfMinimum: 30,
    packingNotes: [],
  };
}
