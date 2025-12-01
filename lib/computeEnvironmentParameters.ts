// computeEnvironmentParameters.ts

export function computeEnvironmentParameters(stations: any[], trackParams: any) {
  if (stations.length === 1) {
    const st = stations[0];
    const params: Record<string, number> = {};
    const lat = st.lat;
    const vibration = trackParams?.p40 ?? 0;

    const setp = (i: number, v: number) =>
      (params[`p${i}`] = Math.max(0, Math.min(1, v)));

    // p81 – p100 (Environment) for single station
    setp(81, 5 / 30); // wind speed
    setp(82, 0.5); // wind direction
    setp(83, 0.05); // rainfall
    setp(84, 0.9); // visibility
    setp(85, 0.05); // fog
    setp(86, Math.abs(lat - 20) / 90); // temperature deviation
    setp(87, 0.6); // humidity
    setp(88, 0.5); // sun angle
    setp(89, 1.0); // day
    setp(90, 30 / 50); // ambient temp
    setp(91, 0.2); // noise
    setp(92, vibration); // vibration env influence
    setp(93, 0.02); // storm
    setp(94, 0.01); // flood risk
    setp(95, 0.0); // waterlogging
    setp(96, 0.02); // landslide
    setp(97, (trackParams?.p35 ?? 0) * 0.4); // heat wave
    setp(98, (1 - (trackParams?.p35 ?? 0)) * 0.4); // cold wave
    setp(99, 0.0); // tidal
    setp(100, 0.02); // EMI

    return { [st.id]: params };
  } else {
    const params: Record<string, number> = {};

    const lats = stations.map((s) => s.lat);
    const avgLat =
      lats.length > 0 ? lats.reduce((a, b) => a + b, 0) / lats.length : 20;

    const vibration = trackParams?.p40 ?? 0;

    const setp = (i: number, v: number) =>
      (params[`p${i}`] = Math.max(0, Math.min(1, v)));

    // p81 – p100 (Environment)
    setp(81, 5 / 30); // wind speed
    setp(82, 0.5); // wind direction
    setp(83, 0.05); // rainfall
    setp(84, 0.9); // visibility
    setp(85, 0.05); // fog
    setp(86, Math.abs(avgLat - 20) / 90); // temperature deviation
    setp(87, 0.6); // humidity
    setp(88, 0.5); // sun angle
    setp(89, 1.0); // day
    setp(90, 30 / 50); // ambient temp
    setp(91, 0.2); // noise
    setp(92, vibration); // vibration env influence
    setp(93, 0.02); // storm
    setp(94, 0.01); // flood risk
    setp(95, 0.0); // waterlogging
    setp(96, 0.02); // landslide
    setp(97, (trackParams?.p35 ?? 0) * 0.4); // heat wave
    setp(98, (1 - (trackParams?.p35 ?? 0)) * 0.4); // cold wave
    setp(99, 0.0); // tidal
    setp(100, 0.02); // EMI

    return params;
  }
}

export function generateStationEnvironment(stationId: string): Record<string, number> {
    // Deterministic generator based on stationId
    const seed = stationId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const rnd = () => (Math.sin(seed) * 10000) % 1; // Simple pseudo-random

    return {
        p81: rnd() * 0.5,
        p82: rnd() * 0.3,
        p83: rnd() * 0.9,
        p84: rnd() * 0.7,
        p85: rnd() * 0.4,
        p86: rnd() * 0.6,
        p87: rnd() * 0.5,
        p88: rnd() * 0.8,
        p89: rnd() * 0.2,
        p90: rnd() * 0.1,
        p91: rnd() * 0.5,
        p92: rnd() * 0.33,
        p93: rnd() * 0.22,
        p94: rnd() * 0.44,
        p95: rnd() * 0.55,
        p96: rnd() * 0.15,
        p97: rnd() * 0.45,
        p98: rnd() * 0.65,
        p99: rnd() * 0.75,
        p100: rnd() * 0.25,
    };
}
