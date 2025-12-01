// computeTrainParameters.ts
export function computeTrainParameters(trains: any[]): Record<string, number> {
  const params: Record<string, number> = {};

  const speeds = trains.map((t) => t.speed ?? 0);
  const avg = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const max = speeds.length ? Math.max(...speeds) : 0;
  const min = speeds.length ? Math.min(...speeds) : 0;

  const freightCount = trains.filter(
    (t) =>
      (t.name || "").toLowerCase().includes("freight") ||
      ((t.priority ?? 1) >= 3 && (t.speed ?? 0) < 90)
  ).length;

  const trainCount = Math.max(1, trains.length);
  const std =
    speeds.length > 1
      ? Math.sqrt(
          speeds.map((s) => (s - avg) ** 2).reduce((a, b) => a + b, 0) / speeds.length
        )
      : 0;

  const avgMass =
    1 + (freightCount / trainCount) * 2;

  const setp = (i: number, v: number) => {
    params[`p${i}`] = Number(Math.max(0, Math.min(1, v)));
  };

  // p1–p20 calculations
  setp(1, avg / 200);
  setp(2, speeds.sort((a, b) => a - b)[Math.floor(speeds.length / 2)] / 200 || 0);
  setp(3, max / 200);
  setp(4, std / 50);
  setp(5, std / 50);
  setp(6, freightCount / trainCount);
  setp(7, max / 200 * 0.6); // simplified humidity factor
  setp(8, 1 - params["p7"]);
  setp(9, freightCount / trainCount);
  setp(10, (avg * avg) / 40000);
  setp(11, 0); // track gradient not used in train-level
  setp(12, 0); // curvature not used here
  setp(13, (avg * trainCount) / 20000);
  setp(14, avg / 200);
  setp(15, 0.02 + trains.length / 200);
  setp(16, (avg * avgMass) / 200);
  setp(17, (0.5 * avgMass * avg * avg) / 1e6);
  setp(18, 8 / 24);
  setp(19, 8 / 24);
  setp(20, avgMass / 4);

  return params;
}
