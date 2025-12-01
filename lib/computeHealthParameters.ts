// computeHealthParameters.ts
// Auto-fill Health & Mechanical Parameters p121 – p140

type Train = {
  speed?: number;
  priority?: number;
};

function clamp(v: number, a = 0, b = 1) {
  if (isNaN(v)) return a;
  return Math.max(a, Math.min(b, v));
}

export function computeHealthParameters(
  trains: Train[]
): Record<string, number> {
  const params: Record<string, number> = {};

  const trainCount = Math.max(1, trains.length);

  // Compute deterministic seed based on total speed
  const sumSpeed = trains.reduce((a, t) => a + (t.speed ?? 0), 0);
  let seed = Math.floor(sumSpeed + trains.length) % 9973;

  // Small deterministic RNG using sine (no external libs)
  const rnd = (n: number) => Math.abs(Math.sin(seed + n)) % 1;

  // Healthy base decreases when priority >3 trains exist
  const highPriorityCount = trains.filter((t) => (t.priority ?? 1) > 3).length;
  const healthyBase = clamp(
    0.9 - (highPriorityCount / trainCount) * 0.2
  );

  const setp = (i: number, v: number) => (params[`p${i}`] = clamp(v));

  // ================================================
  // 🛠 HEALTH & MECHANICAL PARAMETERS (p121–p140)
  // ================================================

  for (let i = 121; i <= 140; i++) {
    let val = 0;

    // Group 1: p121–p130 → Heavily health-based (0.7 weight backend)
    if (i >= 121 && i <= 130) {
      val = healthyBase - rnd(i) * 0.10;
    }

    // Group 2: p131–p139 → Moderate health (0.6 weight backend)
    else if (i >= 131 && i <= 139) {
      val = 0.8 - rnd(i) * 0.20;
    }

    // Group 3: p140 → direct health baseline
    else {
      val = healthyBase;
    }

    setp(i, val);
  }

  return params;
}
