import * as Location from "expo-location";
import { useEffect, useRef } from "react";
import { getCurrentZone, getDistance, useStore } from "../state/store";

const HARD_BRAKE_THRESHOLD = 2.5;
const DRIVING_SPEED_MS = 5; // ~18 km/h
const WALKING_SPEED_MS = 1; // ~3.6 km/h

export function useLocation() {
  const {
    setLocation,
    setSpeed,
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

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        log("SYSTEM", "Location permission denied");
        return;
      }

      log("SYSTEM", "Location tracking started");

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 0,
        },
        (loc) => {
          const { latitude: lat, longitude: lng, accuracy, speed } = loc.coords;
          const timestamp = loc.timestamp;

          // --- Indoor filtering ---
          if (accuracy && accuracy > 25) return;

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

          // --- Activity (GPS FIRST) ---
          if (speedMs > DRIVING_SPEED_MS) {
            drivingLockUntil.current = Date.now() + 5000;
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

          // --- Trip lifecycle ---
          if (activity === "driving" && !trip.active) {
            startTrip(lat, lng);
          }

          if (activity !== "driving" && trip.active) {
            endTrip(lat, lng);
          }

          if (trip.active) {
            updateTripSpeed(speedKph);
          }

          // --- Hard brake detection ---
          if (prevTime.current !== null && trip.active) {
            const dt = (timestamp - prevTime.current) / 1000;

            if (dt > 0) {
              const decel = (prevSpeed.current - speedMs) / dt;

              if (decel > HARD_BRAKE_THRESHOLD) {
                recordHardBrake(speedKph);
              }
            }
          }

          prevSpeed.current = speedMs;
          prevTime.current = timestamp;

          // --- Zones ---
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

    return () => sub?.remove();
  }, []);
}
