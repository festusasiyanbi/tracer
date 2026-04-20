import { create } from "zustand";

type Activity = "stationary" | "walking" | "driving";
type MockLocation = "real" | "home" | "school" | "work" | "unknown";

export interface Trip {
  active: boolean;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  startTime: string | null;
  endTime: string | null;
  topSpeedKph: number;
  currentSpeedKph: number;
  hardBrakeCount: number;
  hardBrakeEvents: { time: string; speedKph: number }[];
}

interface TracerState {
  // Real location
  lat: number | null;
  lng: number | null;
  setLocation: (lat: number, lng: number) => void;

  // Speed (from GPS)
  speedKph: number;
  setSpeed: (kph: number) => void;

  // Activity
  activity: Activity;
  setActivity: (a: Activity) => void;

  // Mock controls
  mockLocation: MockLocation;
  setMockLocation: (m: MockLocation) => void;
  mockActivity: Activity | null;
  setMockActivity: (a: Activity | null) => void;

  // Pause
  paused: boolean;
  setPaused: (p: boolean) => void;

  // Check-in
  checkinActive: boolean;
  setCheckinActive: (c: boolean) => void;
  overrideActive: boolean;
  setOverrideActive: (o: boolean) => void;

  // Trip
  trip: Trip;
  startTrip: (lat: number, lng: number) => void;
  endTrip: (lat: number, lng: number) => void;
  updateTripSpeed: (kph: number) => void;
  recordHardBrake: (speedKph: number) => void;

  // Event log
  events: { time: string; type: string; msg: string }[];
  log: (type: string, msg: string) => void;
  clearLog: () => void;
}

const MOCK_COORDS: Record<MockLocation, { lat: number; lng: number } | null> = {
  real: null,
  home: { lat: 51.5074, lng: -0.1278 },
  school: { lat: 51.5155, lng: -0.0922 },
  work: { lat: 51.52, lng: -0.08 },
  unknown: { lat: 51.49, lng: -0.15 },
};

export const ZONES = [
  { id: "home", label: "Home", lat: 51.5074, lng: -0.1278, radius: 300 },
  { id: "school", label: "School", lat: 51.5155, lng: -0.0922, radius: 300 },
  { id: "work", label: "Work", lat: 51.52, lng: -0.08, radius: 300 },
];

const defaultTrip: Trip = {
  active: false,
  startLat: null,
  startLng: null,
  endLat: null,
  endLng: null,
  startTime: null,
  endTime: null,
  topSpeedKph: 0,
  currentSpeedKph: 0,
  hardBrakeCount: 0,
  hardBrakeEvents: [],
};

export function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCurrentZone(lat: number, lng: number) {
  return (
    ZONES.find((z) => getDistance(lat, lng, z.lat, z.lng) <= z.radius) ?? null
  );
}

export function getEffectiveCoords(state: TracerState) {
  if (state.mockLocation !== "real") return MOCK_COORDS[state.mockLocation];
  if (state.lat !== null && state.lng !== null)
    return { lat: state.lat, lng: state.lng };
  return null;
}

export const useStore = create<TracerState>((set, get) => ({
  lat: null,
  lng: null,
  setLocation: (lat, lng) => set({ lat, lng }),

  speedKph: 0,
  setSpeed: (kph) => set({ speedKph: kph }),

  activity: "stationary",
  setActivity: (activity) => set({ activity }),

  mockLocation: "real",
  setMockLocation: (mockLocation) => set({ mockLocation }),
  mockActivity: null,
  setMockActivity: (mockActivity) => set({ mockActivity }),

  paused: false,
  setPaused: (paused) => set({ paused }),

  checkinActive: false,
  setCheckinActive: (checkinActive) => set({ checkinActive }),
  overrideActive: false,
  setOverrideActive: (overrideActive) => set({ overrideActive }),

  trip: { ...defaultTrip },

  startTrip: (lat, lng) => {
    const time = new Date().toTimeString().slice(0, 8);
    set({
      trip: {
        ...defaultTrip,
        active: true,
        startLat: lat,
        startLng: lng,
        startTime: new Date().toISOString(),
      },
    });
    get().log("TRIP", `Trip started at ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  },

  endTrip: (lat?: number, lng?: number) => {
    const { trip, log } = get();

    const endTime = new Date().toISOString();

    set({
      trip: {
        ...trip,
        active: false,
        endTime,
        endLat: lat ?? trip.endLat,
        endLng: lng ?? trip.endLng,
      },
    });

    log("TRIP", `Trip ended at ${lat?.toFixed(5)}, ${lng?.toFixed(5)}`);
  },

  updateTripSpeed: (kph) => {
    set((s) => ({
      trip: {
        ...s.trip,
        currentSpeedKph: kph,
        topSpeedKph: Math.max(s.trip.topSpeedKph, kph),
      },
    }));
  },

  recordHardBrake: (speedKph) => {
    const time = new Date().toTimeString().slice(0, 8);
    set((s) => ({
      trip: {
        ...s.trip,
        hardBrakeCount: s.trip.hardBrakeCount + 1,
        hardBrakeEvents: [...s.trip.hardBrakeEvents, { time, speedKph }],
      },
    }));
    get().log("SAFETY", `Hard brake detected at ${speedKph.toFixed(1)} km/h`);
  },

  events: [],
  log: (type, msg) => {
    const time = new Date().toTimeString().slice(0, 8);
    set((s) => ({ events: [...s.events, { time, type, msg }] }));
  },
  clearLog: () => set({ events: [] }),
}));
