// Address suggestions from Photon (OpenStreetMap data, run by komoot): free, no key.
// Fair use: the caller waits until typing pauses. The typed text goes to komoot.

type PlaceProperties = {
  name?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
};

/** "Reitstall Sonnenhof, Waldweg 3, 47506 Neukirchen-Vluyn" */
export function placeLabel(p: PlaceProperties): string {
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  const town = [p.postcode, p.city].filter(Boolean).join(' ');
  return [p.name, street, town].filter(Boolean).join(', ');
}

export async function searchPlaces(query: string, signal: AbortSignal): Promise<string[]> {
  // lat/lon: prefer results in Germany
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}` +
    '&lang=de&limit=6&lat=51.2&lon=10.4';
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features: { properties: PlaceProperties }[] };
  // the same place often comes twice (e.g. as stable and as riding school)
  return [...new Set(data.features.map((f) => placeLabel(f.properties)).filter(Boolean))].slice(
    0,
    5,
  );
}
