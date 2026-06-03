import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat1 = parseFloat(searchParams.get("lat1") || "0");
    const lng1 = parseFloat(searchParams.get("lng1") || "0");
    const lat2 = parseFloat(searchParams.get("lat2") || "0");
    const lng2 = parseFloat(searchParams.get("lng2") || "0");
    const category = searchParams.get("category") || "cafe";

    if (!lat1 || !lng1 || !lat2 || !lng2) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    // Calculate midpoint
    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      // Mock results near the calculated midpoint
      const recommendations = [
        {
          name: "Midpoint Coffee Haven",
          address: "102 Halfway Ave, Near Midpoint Hub",
          placeId: "place_mock_mid_1",
          rating: 4.8,
          userRatingsTotal: 154,
          lat: midLat + 0.0005,
          lng: midLng - 0.0003,
        },
        {
          name: "Convergence Meeting Lounge",
          address: "88 Connection Blvd, Hub District",
          placeId: "place_mock_mid_2",
          rating: 4.6,
          userRatingsTotal: 92,
          lat: midLat - 0.0008,
          lng: midLng + 0.0006,
        },
        {
          name: "The Halftime Commons",
          address: "31 Meeting Point St, Center City",
          placeId: "place_mock_mid_3",
          rating: 4.7,
          userRatingsTotal: 215,
          lat: midLat + 0.0012,
          lng: midLng + 0.0009,
        },
      ];

      return NextResponse.json({
        midpoint: { lat: midLat, lng: midLng },
        results: recommendations,
      });
    }

    // Query real Google Places Nearby Search API
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${midLat},${midLng}`);
    url.searchParams.set("radius", "3000"); // 3km radius
    url.searchParams.set("type", category);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json({ error: data.error_message || "Google API error" }, { status: 500 });
    }

    const results = (data.results || []).slice(0, 5).map((place: any) => ({
      name: place.name,
      address: place.vicinity || place.formatted_address,
      placeId: place.place_id,
      rating: place.rating || 4.5,
      userRatingsTotal: place.user_ratings_total || 10,
      lat: place.geometry?.location?.lat || midLat,
      lng: place.geometry?.location?.lng || midLng,
    }));

    return NextResponse.json({
      midpoint: { lat: midLat, lng: midLng },
      results,
    });
  } catch (err) {
    console.error("Midpoint API error:", err);
    return NextResponse.json({ error: "Failed to fetch midpoint recommendations" }, { status: 500 });
  }
}
