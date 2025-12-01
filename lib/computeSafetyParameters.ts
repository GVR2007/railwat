// computeSafetyParameters.ts
// Auto-fill Signalling & Safety Parameters p41 – p60

type Train = { speed?: number };
type Edge = { source: string; target: string };

function clamp(v: number, a = 0, b = 1) {
  if (isNaN(v)) return a;
  return Math.max(a, Math.min(b, v));
}

export function computeSafetyParameters(
  trains: Train[],
  edges: Edge[]
): Record<string, number> {
  const params: Record<string, number> = {};
  const trainCount = Math.max(1, trains.length);

  const setp = (i: number, v: number) => (params[`p${i}`] = clamp(v));

  // ================================
  // 🚦 SIGNALLING & SAFETY (p41–p60)
  // ================================

  setp(41, 0.9);                     // Signal aspect ahead (good)
  setp(42, 0.3);                     // Signal distance ahead
  setp(43, 0.1);                     // Last signal passed (normalized)
  setp(44, clamp(trains.length / Math.max(1, edges.length))); // block occupancy
  setp(45, 0.02);                    // Next signal failure probability
  setp(46, 1.0);                     // TPWS/ATS active
  setp(47, clamp(200 / 200));        // Max permissible speed normalized
  setp(48, 0.5);                     // Emergency brake authority distance
  setp(49, 0.9);                     // Stop-location accuracy
  setp(50, 0.05);                    // Over-speed probability
  setp(51, 0.7);                     // Train control mode (auto/manual)
  setp(52, 0.9);                     // Radio link quality
  setp(53, 0.06);                    // Control center latency
  setp(54, 0.6);                     // Driver reaction time index
  setp(55, 0.0);                     // Risk override flag
  setp(56, 1.0);                     // Safety margin multiplier
  setp(57, 0.2);                     // Red-zone overlap distance
  setp(58, 0.8);                     // Crew alertness index
  setp(59, 0.2);                     // Driver fatigue level
  setp(60, 0.6);                     // Manual/auto intervention score

  return params;
}
