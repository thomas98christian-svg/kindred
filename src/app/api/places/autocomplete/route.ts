import { NextResponse } from "next/server";

const MOCK_CITIES = [
  { description: "Seattle, WA, USA", place_id: "seattle_wa", terms: ["Seattle", "WA"] },
  { description: "Boston, MA, USA", place_id: "boston_ma", terms: ["Boston", "MA"] },
  { description: "San Francisco, CA, USA", place_id: "sf_ca", terms: ["San Francisco", "CA"] },
  { description: "New York, NY, USA", place_id: "nyc_ny", terms: ["New York", "NY"] },
  { description: "Austin, TX, USA", place_id: "austin_tx", terms: ["Austin", "TX"] },
  { description: "Los Angeles, CA, USA", place_id: "la_ca", terms: ["Los Angeles", "CA"] },
  { description: "Chicago, IL, USA", place_id: "chicago_il", terms: ["Chicago", "IL"] },
  { description: "Miami, FL, USA", place_id: "miami_fl", terms: ["Miami", "FL"] },
  { description: "Providence, RI, USA", place_id: "providence_ri", terms: ["Providence", "RI"] },
];

const MOCK_VENUES = [
  { description: "Kindred Coffee Co., Pike St, Seattle, WA", place_id: "place_seattle_coffee_1" },
  { description: "Convergence Cafe, Pine St, Seattle, WA", place_id: "place_seattle_coffee_2" },
  { description: "Midpoint Coffee House, Union St, Seattle, WA", place_id: "place_seattle_coffee_3" },
  { description: "Starlight Bakery & Coffee, 2nd Ave, Seattle, WA", place_id: "place_seattle_coffee_4" },
  { description: "Boston Brew Center, Tremont St, Boston, MA", place_id: "place_boston_coffee_1" },
  { description: "Halftime Coffee Parlor, Boylston St, Boston, MA", place_id: "place_boston_coffee_2" },
  { description: "Central Perk, West 4th St, New York, NY", place_id: "place_nyc_coffee_1" },
  { description: "Stripe Brew Lab, Congress Ave, Austin, TX", place_id: "place_austin_coffee_1" },
  { description: "Claude AI Social Spot, Mission St, San Francisco, CA", place_id: "place_sf_coffee_1" },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const input = searchParams.get("input") || "";
    const types = searchParams.get("types") || "";

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    // Check if API key exists, otherwise serve mock data
    if (!apiKey) {
      const lowerInput = input.toLowerCase().trim();
      
      if (!lowerInput) {
        return NextResponse.json({ predictions: [] });
      }

      // Filter predictions
      if (types === "(cities)") {
        const filtered = MOCK_CITIES.filter(
          (c) => c.description.toLowerCase().includes(lowerInput)
        );
        return NextResponse.json({ predictions: filtered });
      } else {
        const filtered = MOCK_VENUES.filter(
          (v) => v.description.toLowerCase().includes(lowerInput)
        );
        // Fallback to match cities if no venue found
        if (filtered.length === 0) {
          const cityMatches = MOCK_CITIES.filter(
            (c) => c.description.toLowerCase().includes(lowerInput)
          );
          return NextResponse.json({ predictions: cityMatches });
        }
        return NextResponse.json({ predictions: filtered });
      }
    }

    // Call real Google Places Autocomplete API
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("key", apiKey);
    if (types) {
      url.searchParams.set("types", types);
    }

    const res = await fetch(url.toString());
    const data = await res.json();

    return NextResponse.json(data);
  } catch (err) {
    console.error("Autocomplete proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch autocomplete predictions" }, { status: 500 });
  }
}
