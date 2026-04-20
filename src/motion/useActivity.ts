import { useStore } from "@/src/state/store";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef } from "react";

const WINDOW_SIZE = 10;
const DEBOUNCE = 6;

// Accelerometer no longer classifies driving — GPS handles that.
// This hook only refines between stationary and walking
// when GPS speed is too low to be conclusive.

export function useActivity() {
  const setActivity = useStore((s) => s.setActivity);
  const log = useStore((s) => s.log);

  const readings = useRef<number[]>([]);
  const candidate = useRef<string | null>(null);
  const count = useRef(0);

  useEffect(() => {
    Accelerometer.setUpdateInterval(300);

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const { activity, speedKph, mockActivity } = useStore.getState();

      // Mock override takes full priority
      if (mockActivity !== null) return;

      // Never interfere when GPS has confirmed driving
      if (activity === "driving" || speedKph > 15) return;

      const mag = Math.sqrt(x * x + y * y + z * z);
      readings.current.push(mag);
      if (readings.current.length > WINDOW_SIZE) readings.current.shift();
      if (readings.current.length < WINDOW_SIZE) return;

      const avg = readings.current.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
      const next = avg < 1.02 ? "stationary" : "walking";

      if (next === candidate.current) {
        count.current++;
      } else {
        candidate.current = next;
        count.current = 1;
      }

      if (count.current >= DEBOUNCE && next !== activity) {
        setActivity(next as any);
        log("ACTIVITY", `Refined → ${next} (avg: ${avg.toFixed(3)})`);
      }
    });

    return () => sub.remove();
  }, []);
}
