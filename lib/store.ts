// lib/store.ts
import { create } from 'zustand';

interface Station { name: string; lat: number; lon: number; }
interface Edge { source: string; target: string; }
interface Train { id: string; name: string; source: string; destination: string; progress: number; speed: number; path?: string[]; startTime?: number; status?: string; lat: number; lon: number; }

interface RailwayState {
  stations: Station[]; // The Nodes
  edges: Edge[];       // The Edges
  trains: Train[];

  // DSA Operations
  addNode: (name: string, lat: number, lon: number) => void;
  addEdge: (sourceName: string, targetName: string) => void;
  updateTrainProgress: (id: string, progress: number) => void;
  updateTrainStatus: (id: string, status: string) => void;
  getPath: (source: string, dest: string) => string[] | null;
  addTrain: (name: string, source: string, dest: string, speed: number) => void;
}

export const useRailwayStore = create<RailwayState>((set, get) => ({
  // 1. Stations (Coordinates for India)
  stations: [
    { name: "Delhi", lat: 28.61, lon: 77.20 },
    { name: "Agra", lat: 27.17, lon: 78.00 },
    { name: "Bhopal", lat: 23.25, lon: 77.41 },
    { name: "Mumbai", lat: 19.07, lon: 72.87 },
  ],
  // 2. Tracks connecting them
  edges: [
    { source: "Delhi", target: "Agra" },
    { source: "Agra", target: "Bhopal" },
    { source: "Bhopal", target: "Mumbai" },
  ],
  // 3. The Train Object
  trains: [
    {
      id: "t1",
      name: "Rajdhani Express",
      source: "Delhi",
      destination: "Mumbai",
      progress: 0,
      speed: 100, // Speed of animation
      path: ["Delhi", "Agra", "Bhopal", "Mumbai"], // The route it follows
      status: "MOVING",
      lat: 0,
      lon: 0
    }
  ],

  // O(1) Operation: Add Node to the array
  addNode: (name, lat, lon) => set((state) => ({
    stations: [...state.stations, { name, lat, lon }]
  })),

  // O(N) Check + O(1) Add: Prevent duplicate edges and self-loops
  addEdge: (source, target) => set((state) => {
    if (source === target) return state; // No self-loops
    const exists = state.edges.find(e =>
      (e.source === source && e.target === target) ||
      (e.source === target && e.target === source) // Undirected Graph logic
    );
    if (exists) return state;

    return { edges: [...state.edges, { source, target }] };
  }),

  // Update train progress for animation
  updateTrainProgress: (id, progress) => set((state) => ({
    trains: state.trains.map(train =>
      train.id === id ? { ...train, progress } : train
    ),
  })),

  // Update train status
  updateTrainStatus: (id, status) => set((state) => ({
    trains: state.trains.map(train =>
      train.id === id ? { ...train, status } : train
    ),
  })),

  // BFS to find shortest path
  getPath: (source, dest) => {
    const adj: Record<string, string[]> = {};
    get().stations.forEach(s => adj[s.name] = []);
    get().edges.forEach(e => {
      adj[e.source].push(e.target);
      adj[e.target].push(e.source); // Undirected
    });

    const queue: string[] = [source];
    const visited = new Set<string>();
    const parent: Record<string, string> = {};
    visited.add(source);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === dest) break;

      for (const neighbor of adj[current]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent[neighbor] = current;
          queue.push(neighbor);
        }
      }
    }

    if (!parent[dest]) return null; // No path

    const path: string[] = [];
    let current = dest;
    while (current !== source) {
      path.unshift(current);
      current = parent[current];
    }
    path.unshift(source);
    return path;
  },

  // Add train with computed path
  addTrain: (name, source, dest, speed) => set((state) => {
    const path = state.getPath(source, dest);
    if (!path) return state; // No path, don't add

    const id = `t${Date.now()}`;
    const newTrain: Train = {
      id,
      name,
      source,
      destination: dest,
      progress: 0,
      speed,
      path,
      startTime: Date.now(),
      status: "MOVING",
      lat: 0,
      lon: 0
    };
    return { trains: [...state.trains, newTrain] };
  }),
}));
