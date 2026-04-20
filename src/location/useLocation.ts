import * as Location from "expo-location";
import { useEffect, useRef } from "react";
import { getCurrentZone, getDistance, useStore } from "../state/store";

const HARD_BRAKE_THRESHOLD = 2.5; // m/s² deceleration
const HARD_BRAKE_DEBOUNCE_MS = 4000; // 4s between recorded brakes
const DRIVING_SPEED_MS = 5; // ~18 km/h = driving
const WALKING_SPEED_MS = 1; // ~3.6 km/h = walking
const TRIP_END_GRACE_MS = 45000; // 45s grace before ending trip

export function useLocation() {
  const {
    setLocation,
    setSpeed,
    setGpsAccuracy,
    setActivity,
    log,
    startTrip,
    endTrip,
    updateTripSpeed,
    recordHardBrake,
  } = useStore.getState();

  const lastZoneId = useRef<string | null>(null);
  const prevSpeed = useRef(0);
  const prevTime = useRef<number | null>(null);
  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);
  const drivingLockUntil = useRef(0);
  const tripEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHardBrakeAt = useRef<number>(0);
  const pendingEndLat = useRef(0);
  const pendingEndLng = useRef(0);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        log("SYSTEM", "Location permission denied");
        return;
      }

      log("SYSTEM", "GPS tracking started");

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 0,
        },
        (loc) => {
          const { latitude: lat, longitude: lng, accuracy, speed } = loc.coords;
          const timestamp = loc.timestamp;

          // Always update accuracy for UI display
          setGpsAccuracy(accuracy);

          // --- Indoor filter: poor accuracy = ignore position updates ---
          if (accuracy && accuracy > 25) return;

          // --- Distance filter: skip jitter under 3m ---
          if (lastCoords.current) {
            const dist = getDistance(
              lastCoords.current.lat,
              lastCoords.current.lng,
              lat,
              lng,
            );
            if (dist < 3) return;
          }
          lastCoords.current = { lat, lng };

          setLocation(lat, lng);
          const speedMs = Math.max(speed ?? 0, 0);
          const speedKph = speedMs * 3.6;
          setSpeed(speedKph);

          // --- Activity: GPS is primary classifier ---
          if (speedMs > DRIVING_SPEED_MS) {
            // Driving confirmed — cancel any pending trip end
            if (tripEndTimer.current !== null) {
              clearTimeout(tripEndTimer.current);
              tripEndTimer.current = null;
              log("TRIP", "Driving resumed — trip end cancelled");
            }
            drivingLockUntil.current = Date.now() + 10000;
            setActivity("driving");
          } else if (
            speedMs > WALKING_SPEED_MS &&
            Date.now() > drivingLockUntil.current
          ) {
            setActivity("walking");
          } else if (Date.now() > drivingLockUntil.current) {
            setActivity("stationary");
          }

          const { activity, trip } = useStore.getState();

          // --- Trip start ---
          if (activity === "driving" && !trip.active) {
            startTrip(lat, lng);
          }

          // --- Trip end with grace period ---
          // Don't end immediately — allow for U-turns, traffic lights, brief stops
          if (
            activity !== "driving" &&
            trip.active &&
            tripEndTimer.current === null
          ) {
            pendingEndLat.current = lat;
            pendingEndLng.current = lng;
            log(
              "TRIP",
              "Not driving — ending trip in 45s if driving doesn't resume",
            );
            tripEndTimer.current = setTimeout(() => {
              tripEndTimer.current = null;
              const { trip: currentTrip } = useStore.getState();
              if (currentTrip.active) {
                endTrip(pendingEndLat.current, pendingEndLng.current);
              }
            }, TRIP_END_GRACE_MS);
          }

          // Keep updating the pending end coords while in grace period
          if (
            trip.active &&
            activity !== "driving" &&
            tripEndTimer.current !== null
          ) {
            pendingEndLat.current = lat;
            pendingEndLng.current = lng;
          }

          // --- Trip speed update ---
          if (trip.active) updateTripSpeed(speedKph);

          // --- Hard brake detection ---
          if (
            prevTime.current !== null &&
            trip.active &&
            speedMs < prevSpeed.current // only on deceleration
          ) {
            const dt = (timestamp - prevTime.current) / 1000;
            if (dt > 0 && dt < 5) {
              // ignore stale readings
              const decel = (prevSpeed.current - speedMs) / dt;
              const timeSinceLastBrake = Date.now() - lastHardBrakeAt.current;
              if (
                decel > HARD_BRAKE_THRESHOLD &&
                timeSinceLastBrake > HARD_BRAKE_DEBOUNCE_MS
              ) {
                lastHardBrakeAt.current = Date.now();
                recordHardBrake(speedKph);
              }
            }
          }

          prevSpeed.current = speedMs;
          prevTime.current = timestamp;

          // --- Zone detection ---
          const zone = getCurrentZone(lat, lng);
          const zoneId = zone?.id ?? null;
          if (zoneId !== lastZoneId.current) {
            if (zone) log("ZONE", `Entered ${zone.label}`);
            else log("ZONE", "Outside zones");
            lastZoneId.current = zoneId;
          }

          log(
            "GPS",
            `${speedKph.toFixed(1)} km/h · acc ${accuracy?.toFixed(0)}m`,
          );
        },
      );
    })();

    return () => {
      sub?.remove();
      if (tripEndTimer.current) clearTimeout(tripEndTimer.current);
    };
  }, []);
}
