// computeTrackParameters.ts
import { haversine } from "./haversine";

export function computeTrackParameters(stations: any[], edges: any[]) {
  const params: Record<string, number> = {};

  const lats = stations.map(s => s.lat);
  const latVar =
    lats.length > 1
      ? Math.abs(Math.max(...lats) - Math.min(...lats))
      : 0;

  const edgeLens = edges.map(e => {
    const a = stations.find(s => s.name === e.source);
    const b = stations.find(s => s.name === e.target);
    if (!a || !b) return 1;
    return haversine(a.lat, a.lon, b.lat, b.lon);
  });

  const avgEdge = edgeLens.length
    ? edgeLens.reduce((a, b) => a + b, 0) / edgeLens.length
    : 1;

  const minEdge = edgeLens.length ? Math.min(...edgeLens) : 1;

  const setp = (i: number, v: number) => (params[`p${i}`] = v);

  // p21 - p40 TRACK PARAMETERS
  setp(21, 1 - avgEdge / 300000);
  setp(22, 1 - minEdge / 200000);
  setp(23, latVar / 20);
  setp(24, latVar / 20);
  setp(25, 0.5);
  setp(26, 1.0);
  setp(27, (edges.length / Math.max(1, stations.length)) * 0.5);
  setp(28, 0.2);
  setp(29, 0.2);
  setp(30, 0.95);
  setp(31, 1.0);
  setp(32, stations.length / 100);
  setp(33, 0.7);
  setp(34, 0.8);
  setp(35, (30 + (20 * (20 - Math.abs(latVar - 20))) / 40) / 80);
  setp(36, params["p35"] * 0.9);
  setp(37, 1.0);
  setp(38, 0.5);
  setp(39, params["p32"] * 0.8 + 0.1);
  setp(40, params["p39"] * 0.9);

  return params;
}
