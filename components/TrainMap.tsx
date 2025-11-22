"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRailwayStore } from "../lib/store";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// --- STYLES REMAIN THE SAME (Condensed for brevity) ---
const ANIMATION_STYLES = `
  .train-marker-container { width: 20px; height: 20px; cursor: pointer; }
  .train-core { width: 20px; height: 20px; background: #ff0000; border-radius: 50%; box-shadow: 0 0 15px #ff0000; }
  .station-marker { width: 12px; height: 12px; background: #fff; border: 2px solid #000; border-radius: 50%; cursor: pointer; transition: 0.2s; }
  .station-marker:hover { transform: scale(1.5); background: #00ffcc; }
  .station-selected { background: #ff00aa !important; transform: scale(1.5); box-shadow: 0 0 15px #ff00aa; }
`;

// --- HELPER FUNCTIONS ---
function getStation(name: string, stations: any[]) {
  return stations.find((s) => s.name === name);
}

// Convert lon/lat to pixel coordinates on the MapLibre map
function getPixelPos(map: any, lat: number, lon: number) {
  if (!map) return { x: 0, y: 0 };
  const p = map.project([lon, lat]);
  return { x: p.x, y: p.y };
}

// Detect collision between trains within a PIXEL threshold
function detectCollisionPixel(trainA: any, trainB: any, map: any, thresholdPx = 5) {
  const A = getPixelPos(map, trainA.lat, trainA.lon);
  const B = getPixelPos(map, trainB.lat, trainB.lon);

  const dx = A.x - B.x;
  const dy = A.y - B.y;

  const dist = Math.sqrt(dx * dx + dy * dy);

  return dist <= thresholdPx;
}

// Function to send train positions to AI server
async function sendToAI(trains: any[], updateTrainStatus: any) {
  const trainPayload = {
    trains: trains.map(t => ({
      name: t.name,
      lat: t.lat,
      lon: t.lon
    }))
  };

  try {
    const res = await fetch("http://127.0.0.1:8000/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trainPayload)
    });

    const decision = await res.json();
    console.log("AI decision:", decision);

    // Apply STOP logic
    decision.forEach((d: any) => {
      if (d.action === "STOP") {
        d.affected_trains.forEach((trainName: string) => {
          updateTrainStatus(trainName, "STOPPED");
        });
      }
    });

  } catch (err) {
    console.error("AI ERROR:", err);
  }
}

export default function TrainMap() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trainMarkers = useRef<Record<string, maplibregl.Marker>>({});
  const animationFrameRef = useRef<number>(0);
  // --- NEW REF FOR THROTTLING ---
  const lastAiCallRef = useRef<number>(0);

  const { stations, edges, trains, addNode, addEdge, addTrain, getPath, updateTrainStatus } = useRailwayStore(); // DSA Actions

  // UI State for "Builder Mode"
  const [mode, setMode] = useState<"VIEW" | "ADD_NODE" | "ADD_EDGE" | "ADD_TRAIN">("VIEW");
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [newTrain, setNewTrain] = useState({ name: "", source: "", destination: "", speed: 100 });
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [77.4, 23.2],
      zoom: 4,
    });
    mapRef.current = map;

    map.on("load", () => {
      const styleSheet = document.createElement("style");
      styleSheet.innerText = ANIMATION_STYLES;
      document.head.appendChild(styleSheet);

      // Add source for current train segment
      map.addSource("current-segment", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "current-segment-line",
        type: "line",
        source: "current-segment",
        paint: { "line-color": "#ff0000", "line-width": 6, "line-opacity": 0.8 }
      });

      setMapLoaded(true);
      refreshMapLayers(map, stations, edges);
    });

    // --- DSA: GRAPH NODE CREATION ---
    map.on("click", (e) => {
      if (modeRef.current === "ADD_NODE") {
        const name = prompt("Enter Station Name:");
        if (name) {
          addNode(name, e.lngLat.lat, e.lngLat.lng);
        }
      }
    });

  }, []);

  // --- REACTIVE UPDATES ---
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    refreshMapLayers(mapRef.current, stations, edges);
  }, [stations, edges, selectedStation, mapLoaded]); // Re-render when graph changes or selection changes

  // --- UPDATED ANIMATION LOOP ---
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const animateTrains = () => {
      const now = Date.now();

      // -------------------------------------------
      // 🔗 THE MISSING LINK: AI THROTTLE CHECK
      // -------------------------------------------
      // Calls Python every 1000ms (1 second)
      if (now - lastAiCallRef.current > 1000) {
        lastAiCallRef.current = now;
        if (trains.length > 0) {
           // We pass the *whole* trains array so we can resume stopped ones too
           sendToAI(trains, updateTrainStatus);
        }
      }

      trains.forEach(train => {
        const path = train.path;
        if (!path || path.length < 2) return;

        // Only advance progress if NOT stopped
        if (train.status !== "STOPPED") {
          const startTime = train.startTime || Date.now();
          const elapsed = Date.now() - startTime;
          const totalDuration = 10000 / ((train.speed as number) / 100);
          train.progress = Math.min(elapsed / totalDuration, 1.0);
        }

        // ... (Rest of visual rendering logic is unchanged) ...
        const segmentIndex = Math.floor(train.progress * (path.length - 1));
        const segmentProgress = (train.progress * (path.length - 1)) % 1;
        const startName = path[segmentIndex];
        const endName = path[segmentIndex + 1] || startName;
        const start = getStation(startName, stations);
        const end = getStation(endName, stations);

        if (start && end) {
          const lat = start.lat + (end.lat - start.lat) * segmentProgress;
          const lon = start.lon + (end.lon - start.lon) * segmentProgress;

          // Update internal reference for the AI to read next loop
          train.lat = lat;
          train.lon = lon;

          // Update Marker Visuals
          if (!trainMarkers.current[train.id]) {
             const el = document.createElement("div");
             el.className = "train-marker-container";
             el.innerHTML = `<div class="train-core" style="background:${train.status === 'STOPPED' ? 'yellow' : 'red'}"></div>`; // Visual change if stopped
             trainMarkers.current[train.id] = new maplibregl.Marker({ element: el })
               .setLngLat([lon, lat])
               .addTo(mapRef.current!);
          } else {
             trainMarkers.current[train.id].setLngLat([lon, lat]);
             // Optional: Change color if stopped
             const core = trainMarkers.current[train.id].getElement().querySelector(".train-core") as HTMLElement;
             if(core) core.style.background = train.status === 'STOPPED' ? 'yellow' : 'red';
          }
        }
      });

      animationFrameRef.current = requestAnimationFrame(animateTrains);
    };

    animateTrains();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mapLoaded, trains]); // Dependency array ensures this re-binds when trains change


  // --- MAIN LOGIC: REFRESH GRAPH ---
  function refreshMapLayers(map: maplibregl.Map, stations: any[], edges: any[]) {
    // 1. Draw Edges (The Graph Connections)
    const sourceId = "tracks";
    const features = edges.map(e => {
        const A = getStation(e.source, stations);
        const B = getStation(e.target, stations);
        if(!A || !B) return null;
        return { type: "Feature", geometry: { type: "LineString", coordinates: [[A.lon, A.lat], [B.lon, B.lat]] } };
    }).filter(Boolean);

    if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as any).setData({ type: "FeatureCollection", features });
    } else {
        map.addSource(sourceId, { type: "geojson", data: { type: "FeatureCollection", features: features as any } });
        map.addLayer({
            id: "tracks-line", type: "line", source: sourceId,
            paint: { "line-color": "#00ffcc", "line-width": 4, "line-opacity": 0.6 }
        });
    }

    // 2. Draw Nodes (Interactive DOM Markers)
    // Clear old markers (naive approach for demo)
    document.querySelectorAll('.station-marker').forEach(e => e.remove());

    stations.forEach(s => {
        const el = document.createElement("div");
        el.className = `station-marker ${selectedStation === s.name ? "station-selected" : ""}`;

        // --- DSA: CLICK HANDLER ---
        el.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent map click
            handleStationClick(s.name);
        });

        new maplibregl.Marker({ element: el })
            .setLngLat([s.lon, s.lat])
            .setPopup(new maplibregl.Popup({ offset: 10 }).setText(s.name))
            .addTo(map);
    });
  }

  // --- HANDLERS ---

  // 1. Adding Edges (Connecting Nodes)
  const handleStationClick = (name: string) => {
    if (modeRef.current !== "ADD_EDGE") return;

    if (selectedStation === null) {
        // Step 1: Select Source
        setSelectedStation(name);
    } else {
        // Step 2: Select Target & Create Edge
        addEdge(selectedStation, name);
        setSelectedStation(null); // Reset
    }
  };

  // 2. Adding Nodes (Creating Vertices)
  // Now handled in map click event above

  // 3. Adding Trains
  const handleAddTrain = () => {
    if (!newTrain.name || !newTrain.source || !newTrain.destination) return;

    const path = getPath(newTrain.source, newTrain.destination);
    if (!path) {
      alert(`No route available from ${newTrain.source} to ${newTrain.destination}`);
      return;
    }

    alert(`Route found: ${path.join(" -> ")}`);
    addTrain(newTrain.name, newTrain.source, newTrain.destination, newTrain.speed);
    setNewTrain({ name: "", source: "", destination: "", speed: 100 });
    setMode("VIEW");
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: "#111" }}>

      {/* --- UI CONTROL PANEL --- */}
      <div style={{
        position: "absolute", top: 20, left: 20, zIndex: 10,
        background: "rgba(0,0,0,0.8)", padding: 20, borderRadius: 8, color: "white",
        border: "1px solid #333"
      }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#00ffcc" }}>Graph Builder</h3>
        <div style={{ display: "flex", gap: 10 }}>
            <button
                onClick={() => { setMode("VIEW"); setSelectedStation(null); }}
                style={{ background: mode === "VIEW" ? "#666" : "#333", color: "white", padding: "8px", border: "none", cursor: "pointer" }}>
                👁 View
            </button>
            <button
                onClick={() => setMode("ADD_NODE")}
                style={{ background: mode === "ADD_NODE" ? "#00ffcc" : "#333", color: mode === "ADD_NODE" ? "black" : "white", padding: "8px", border: "none", cursor: "pointer" }}>
                + Add Node
            </button>
            <button
                onClick={() => setMode("ADD_EDGE")}
                style={{ background: mode === "ADD_EDGE" ? "#ff00aa" : "#333", color: "white", padding: "8px", border: "none", cursor: "pointer" }}>
                🔗 Connect Edges
            </button>
            <button
                onClick={() => setMode("ADD_TRAIN")}
                style={{ background: mode === "ADD_TRAIN" ? "#ffff00" : "#333", color: mode === "ADD_TRAIN" ? "black" : "white", padding: "8px", border: "none", cursor: "pointer" }}>
                🚂 Add Train
            </button>
        </div>
        {mode === "ADD_TRAIN" && (
          <div style={{ marginTop: 10 }}>
            <input
              type="text"
              placeholder="Train Name"
              value={newTrain.name}
              onChange={(e) => setNewTrain({ ...newTrain, name: e.target.value })}
              style={{ marginRight: 5, padding: 5, background: "#333", color: "white", border: "1px solid #555" }}
            />
            <select
              value={newTrain.source}
              onChange={(e) => setNewTrain({ ...newTrain, source: e.target.value })}
              style={{ marginRight: 5, padding: 5, background: "#333", color: "white", border: "1px solid #555" }}
            >
              <option value="">Source</option>
              {stations.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <select
              value={newTrain.destination}
              onChange={(e) => setNewTrain({ ...newTrain, destination: e.target.value })}
              style={{ marginRight: 5, padding: 5, background: "#333", color: "white", border: "1px solid #555" }}
            >
              <option value="">Destination</option>
              {stations.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <input
              type="number"
              placeholder="Speed"
              value={newTrain.speed}
              onChange={(e) => setNewTrain({ ...newTrain, speed: parseInt(e.target.value) || 100 })}
              style={{ marginRight: 5, padding: 5, background: "#333", color: "white", border: "1px solid #555", width: 60 }}
            />
            <button onClick={handleAddTrain} style={{ padding: 5, background: "#00ffcc", color: "black", border: "none", cursor: "pointer" }}>
              Add
            </button>
          </div>
        )}
        <p style={{ fontSize: "12px", color: "#aaa", marginTop: 10 }}>
            {mode === "ADD_NODE" && "Click on the map to place a new station."}
            {mode === "ADD_EDGE" && (selectedStation ? `Select target for ${selectedStation}` : "Click a Start Station")}
            {mode === "ADD_TRAIN" && "Fill in the train details and click Add."}
        </p>
      </div>

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
