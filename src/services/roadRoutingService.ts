export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RoadRouteResult {
  coordinates: LatLng[];
  distanceKm: number;
  durationMinutes: number;
  isRealRoad: boolean;
}

// In-memory cache for ultra-fast instant lookups (<1ms)
const routeCache = new Map<string, RoadRouteResult>();

/**
 * Generate a cache key from an array of waypoints
 */
function getRouteCacheKey(waypoints: LatLng[]): string {
  return waypoints
    .map(w => `${w.latitude.toFixed(5)},${w.longitude.toFixed(5)}`)
    .join('|');
}

/**
 * Decode Google encoded polyline string
 */
export function decodeGooglePolyline(encoded: string): LatLng[] {
  if (!encoded) return [];
  const points: LatLng[] = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;
  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

/**
 * Dense fallback interpolation when offline
 */
function generateDenseFallbackRoute(waypoints: LatLng[]): RoadRouteResult {
  const coordinates: LatLng[] = [];
  let totalKm = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];

    const dLat = p2.latitude - p1.latitude;
    const dLng = p2.longitude - p1.longitude;
    const straightDistKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
    totalKm += straightDistKm * 1.25; // estimated road winding factor

    const steps = Math.max(10, Math.round(straightDistKm * 8));
    for (let s = 0; s < steps; s++) {
      const frac = s / steps;
      coordinates.push({
        latitude: p1.latitude + dLat * frac,
        longitude: p1.longitude + dLng * frac,
      });
    }
  }

  if (waypoints.length > 0) {
    coordinates.push(waypoints[waypoints.length - 1]);
  }

  return {
    coordinates,
    distanceKm: Math.round(totalKm * 10) / 10,
    durationMinutes: Math.round((totalKm / 45) * 60), // avg 45km/h
    isRealRoad: false,
  };
}

/**
 * Fetch 100% Real-World Road Route matching actual streets, highways, and turns
 * Uses OSRM Driving Engine with high-precision road geometry
 */
export async function fetchRoadRoute(waypoints: LatLng[]): Promise<RoadRouteResult> {
  const validWaypoints = (waypoints || []).filter(
    w => w && !isNaN(w.latitude) && !isNaN(w.longitude) && (w.latitude !== 0 || w.longitude !== 0)
  );

  if (validWaypoints.length < 2) {
    return {
      coordinates: validWaypoints,
      distanceKm: 0,
      durationMinutes: 0,
      isRealRoad: false,
    };
  }

  const cacheKey = getRouteCacheKey(validWaypoints);
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // 1. Try OSRM Free OpenStreetMap Turn-by-Turn Road Routing
  try {
    const coordString = validWaypoints.map(w => `${w.longitude},${w.latitude}`).join(';');
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=false`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoords: [number, number][] = route.geometry?.coordinates || [];

        if (rawCoords.length >= 2) {
          const coordinates: LatLng[] = rawCoords.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
          }));

          const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
          const durationMinutes = Math.round(route.duration / 60);

          const result: RoadRouteResult = {
            coordinates,
            distanceKm,
            durationMinutes,
            isRealRoad: true,
          };

          routeCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (err: any) {
    console.warn('[RoadRouting] OSRM query failed or timed out:', err?.message || err);
  }

  // 2. Fallback: High-density smooth road interpolation
  const fallback = generateDenseFallbackRoute(validWaypoints);
  routeCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Snap a moving coordinate to the closest point along a road route
 */
export function snapToRoadRoute(
  pos: LatLng,
  routeCoords: LatLng[]
): { snapped: LatLng; segmentIndex: number; distanceMeters: number } {
  if (!routeCoords || routeCoords.length === 0) {
    return { snapped: pos, segmentIndex: 0, distanceMeters: 0 };
  }

  let minDistance = Infinity;
  let bestPoint = routeCoords[0];
  let bestIndex = 0;

  for (let i = 0; i < routeCoords.length; i++) {
    const pt = routeCoords[i];
    const dLat = (pt.latitude - pos.latitude) * 111320;
    const dLng = (pt.longitude - pos.longitude) * 111320 * Math.cos((pos.latitude * Math.PI) / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

    if (dist < minDistance) {
      minDistance = dist;
      bestPoint = pt;
      bestIndex = i;
    }
  }

  return { snapped: bestPoint, segmentIndex: bestIndex, distanceMeters: minDistance };
}

/**
 * Calculate bearing/heading angle between two points for vehicle rotation on road
 */
export function calculateRoadHeading(from: LatLng, to: LatLng): number {
  if (!from || !to) return 0;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}
