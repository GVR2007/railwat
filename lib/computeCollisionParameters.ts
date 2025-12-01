
// computeCollisionParameters.ts
import { haversine } from "./haversine";

export function computeCollisionParameters(trains: any[]) {
  const params: Record<string, number> = {};

  const speeds = trains.map((t) => t.speed ?? 0);
  const avgSpeed = speeds.length
    ? speeds.reduce((a, b) => a + b, 0) / speeds.length
    : 0;

  const pairRel: number[] = [];
  const pairDist: number[] = [];
  const pairTtc: number[] = [];
  const prioCount = trains.filter((t) => (t.priority ?? 1) >= 3).length;

  // Compute pairwise metrics
  for (let i = 0; i < trains.length; i++) {
    for (let j = i + 1; j < trains.length; j++) {
      const A = trains[i];
      const B = trains[j];

      if (A.lat == null || A.lon == null || B.lat == null || B.lon == null)
        continue;

      const d = haversine(A.lat, A.lon, B.lat, B.lon);
      pairDist.push(d);

      const vA = Math.max(0.1, A.speed ?? 0) * (1000 / 3600);
      const vB = Math.max(0.1, B.speed ?? 0) * (1000 / 3600);
      const rel = Math.abs(vA - vB) + 1e-6;

      pairRel.push(rel);
      pairTtc.push(Math.min(d / rel, 1e6));
    }
  }

  const avgRel = pairRel.length
    ? pairRel.reduce((a, b) => a + b, 0) / pairRel.length
    : 0;

  const avgDist = pairDist.length
    ? pairDist.reduce((a, b) => a + b, 0) / pairDist.length
    : 1e6;

  const avgTtc = pairTtc.length
    ? pairTtc.reduce((a, b) => a + b, 0) / pairTtc.length
    : 1e6;

  const trainCount = Math.max(1, trains.length);

  function setp(i: number, v: number) {
    params[`p${i}`] = Math.max(0, Math.min(1, v));
  }

  // --- Collision Parameters (p61–p80) ---
  setp(61, avgRel / 20);                          // relative speed
  setp(62, avgRel / 20);                          // acceleration proxy
  setp(63, 0.5);                                   // bearing unknown
  setp(64, 1 - avgDist / 20000);                   // closing distance
  setp(65, 1 - Math.min(avgTtc / 60, 1));          // TTC risk

  const avgBrk =
    speeds.length > 0
      ? speeds
          .map((s) => ((s * 1000) / 3600) ** 2 / (2 * 1)) // v^2/(2a)
          .reduce((a, b) => a + b, 0) / speeds.length
      : 0;

  setp(66, avgBrk / 2000);                         // braking distance
  setp(67, (0.5 * avgSpeed * avgSpeed) / 1e6);     // impact energy

  const collisionProb =
    ((params["p64"] ?? 0) * 0.5 + (params["p65"] ?? 0) * 0.5) *
    (1 + prioCount / trainCount);

  setp(68, collisionProb);                         // overall collision probability
  setp(69, collisionProb * 0.6);                   // head-on
  setp(70, collisionProb * 0.2);                   // rear-end
  setp(71, collisionProb * 0.3);                   // side-impact
  setp(72, 0.05);                                  // hazard probability
  setp(73, collisionProb * 0.8);                   // severity amplifier
  setp(74, 1 - params["p73"]);                     // avoidance margin
  setp(75, collisionProb * 0.9 + (params["p67"] ?? 0) * 0.1); // impact severity
  setp(76, prioCount / trainCount);                // high-priority density
  setp(77, 0.05 + (trainCount / (trainCount + 1)) * 0.2); // density
  setp(78, Math.min(avgTtc, 1e5) / 100);           // TTC stability
  setp(79, 1 - Math.min(avgTtc / 10, 1));          // reaction window
  setp(80, 0.5 * (params["p64"] ?? 0) + 0.5 * (params["p67"] ?? 0)); // collision-track coupling

  return params;
}
