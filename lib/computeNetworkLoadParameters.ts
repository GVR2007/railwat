// computeNetworkLoadParameters.ts
// Auto-fill Network Load Parameters p101 – p120

type Train = {
  lat?: number;
  lon?: number;
  speed?: number;
  priority?: number;
  path?: string[];
  progress?: number;
};

type Station = { name: string; lat: number; lon: number };
type Edge = { source: string; target: string };

function clamp(v: number, a = 0, b = 1) {
  if (isNaN(v)) return a;
  return Math.max(a, Math.min(b, v));
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dlat = ((lat2 - lat1) * Math.PI) / 180;
  const dlon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dlon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function computeNetworkLoadParameters(
  trains: Train[],
  stations: Station[],
  edges: Edge[],
  collisionParams: Record<string, number> // must include p112 & p107
): Record<string, number> {
  const params: Record<string, number> = {};
  const trainCount = Math.max(1, trains.length);

  const setp = (i: number, v: number) => (params[`p${i}`] = clamp(v));

  // Distance-based counts
  let within10k = 0,
    within25k = 0,
    within50k = 0;

  for (let i = 0; i < trains.length; i++) {
    for (let j = i + 1; j < trains.length; j++) {
      const A = trains[i];
      const B = trains[j];
      if (A.lat == null || A.lon == null || B.lat == null || B.lon == null)
        continue;

      const d = haversine(A.lat, A.lon, B.lat, B.lon);

      if (d <= 10000) within10k++;
      if (d <= 25000) within25k++;
      if (d <= 50000) within50k++;
    }
  }

  // Slow trains
  const slowCount = trains.filter((t) => (t.speed ?? 0) < 60).length;

  // Priority-1 (low priority) trains
  const lowPriority = trains.filter((t) => (t.priority ?? 1) <= 1).length;

  // Path conflict computations
  let pathPairs = 0;
  let conflicts = 0;

  for (let i = 0; i < trains.length; i++) {
    for (let j = i + 1; j < trains.length; j++) {
      const pi = new Set(trains[i].path || []);
      const pj = new Set(trains[j].path || []);

      const overlap = [...pi].filter((x) => pj.has(x));
      if (overlap.length > 0) {
        pathPairs++;
        if (
          Math.abs((trains[i].progress ?? 0) - (trains[j].progress ?? 0)) < 0.15
        ) {
          conflicts++;
        }
      }
    }
  }

  const conflictScore = pathPairs ? conflicts / pathPairs : 0;

  // ================================
  // 📡 NETWORK LOAD PARAMETERS p101–p120
  // ================================

  setp(101, within10k / trainCount);
  setp(102, within25k / trainCount);
  setp(103, within50k / trainCount);
  setp(104, collisionParams["avg_speed"] ?? 0); // optional reuse
  setp(105, slowCount / trainCount);
  setp(106, lowPriority / trainCount);
  setp(107, trainCount / Math.max(1, edges.length + 1));
  setp(108, 1000 / Math.max(1, edges.length + 1));
  setp(109, 1 - edges.length / 200);
  setp(110, clamp((params["p107"] ?? collisionParams["p107"]) * 0.8));

  // Path conflict (core part)
  setp(112, conflictScore);
  setp(113, 1 - params["p112"]);
  setp(114, clamp(params["p112"] * 0.8 + (edges.length / 100) * 0.2));
  setp(115, clamp((params["p114"] * 30) / 60));
  setp(116, edges.length / Math.max(1, stations.length));
  setp(117, params["p112"] * 0.8);
  setp(118, params["p112"] * 0.9);
  setp(119, params["p112"] * 0.9);
  setp(120, clamp((params["p107"] ?? collisionParams["p107"]) * 0.9));

  return params;
}
