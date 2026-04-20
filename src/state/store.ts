import { create } from "zustand";

type Activity = "stationary" | "walking" | "driving";
type MockLocation = "real" | "home" | "school" | "work" | "unknown";

export interface Trip {
  id: string;
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
  lat: number | null;
  lng: number | null;
  setLocation: (lat: number, lng: number) => void;

  speedKph: number;
  setSpeed: (kph: number) => void;

  gpsAccuracy: number | null;
  setGpsAccuracy: (a: number | null) => void;

  activity: Activity;
  setActivity: (a: Activity) => void;

  mockLocation: MockLocation;
  setMockLocation: (m: MockLocation) => void;
  mockActivity: Activity | null;
  setMockActivity: (a: Activity | null) => void;

  paused: boolean;
  setPaused: (p: boolean) => void;

  checkinActive: boolean;
  setCheckinActive: (c: boolean) => void;
  overrideActive: boolean;
  setOverrideActive: (o: boolean) => void;

  trip: Trip;
  tripHistory: Trip[];
  startTrip: (lat: number, lng: number) => void;
  endTrip: (lat: number, lng: number) => void;
  updateTripSpeed: (kph: number) => void;
  recordHardBrake: (speedKph: number) => void;

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
  id: "",
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

  gpsAccuracy: null,
  setGpsAccuracy: (gpsAccuracy) => set({ gpsAccuracy }),

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
  tripHistory: [],

  startTrip: (lat, lng) => {
    const id = Date.now().toString();
    set({
      trip: {
        ...defaultTrip,
        id,
        active: true,
        startLat: lat,
        startLng: lng,
        startTime: new Date().toISOString(),
      },
    });
    get().log("TRIP", `Trip started — ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  },

  endTrip: (lat, lng) => {
    const { trip, log } = get();
    if (!trip.active) return;
    const endTime = new Date().toISOString();
    const durationMin = trip.startTime
      ? Math.round(
          (new Date(endTime).getTime() - new Date(trip.startTime).getTime()) /
            60000,
        )
      : 0;
    const completed: Trip = {
      ...trip,
      active: false,
      endTime,
      endLat: lat,
      endLng: lng,
    };
    set((s) => ({
      trip: completed,
      tripHistory: [completed, ...s.tripHistory],
    }));
    log(
      "TRIP",
      `Trip ended — ${durationMin} min · top ${trip.topSpeedKph.toFixed(1)} km/h · ${trip.hardBrakeCount} hard brake(s)`,
    );
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
    get().log("SAFETY", `Hard brake at ${speedKph.toFixed(1)} km/h`);
  },

  events: [],
  log: (type, msg) => {
    const time = new Date().toTimeString().slice(0, 8);
    set((s) => ({ events: [...s.events, { time, type, msg }] }));
  },
  clearLog: () => set({ events: [] }),
}));
