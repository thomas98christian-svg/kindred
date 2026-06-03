import { NextResponse } from "next/server";

const MOCK_DETAILS: Record<string, { lat: number; lng: number }> = {
  // Cities
  "seattle_wa": { lat: 47.6062, lng: -122.3321 },
  "boston_ma": { lat: 42.3601, lng: -71.0589 },
  "sf_ca": { lat: 37.7749, lng: -122.4194 },
  "nyc_ny": { lat: 40.7128, lng: -74.0060 },
  "austin_tx": { lat: 30.2672, lng: -97.7431 },
  "la_ca": { lat: 34.0522, lng: -118.2437 },
  "chicago_il": { lat: 41.8781, lng: -87.6298 },
  "miami_fl": { lat: 25.7617, lng: -80.1918 },
  "providence_ri": { lat: 41.8240, lng: -71.4128 },
  // Venues
  "place_seattle_coffee_1": { lat: 47.6101, lng: -122.3421 },
  "place_seattle_coffee_2": { lat: 47.6081, lng: -122.3351 },
  "place_seattle_coffee_3": { lat: 47.6051, lng: -122.3301 },
  "place_seattle_coffee_4": { lat: 47.6121, lng: -122.3451 },
  "place_boston_coffee_1": { lat: 42.3592, lng: -71.0620 },
  "place_boston_coffee_2": { lat: 42.3501, lng: -71.0710 },
  "place_nyc_coffee_1": { lat: 40.7306, lng: -73.9975 },
  "place_austin_coffee_1": { lat: 30.2650, lng: -97.7400 },
  "place_sf_coffee_1": { lat: 37.7833, lng: -122.4167 },
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("place_id") || "";

    if (!placeId) {
      return NextResponse.json({ error: "Missing place_id" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      const details = MOCK_DETAILS[placeId] || { lat: 47.6062, lng: -122.3321 };
      return NextResponse.json({ result: { geometry: { location: details } } });
    }

    // Call real Google Places Details API
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "geometry");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== "OK") {
      return NextResponse.json({ error: data.error_message || "Google API error" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Places details API error:", err);
    return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 });
  }
}
