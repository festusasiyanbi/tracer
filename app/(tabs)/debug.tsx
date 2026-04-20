import { useStore } from "@/src/state/store";
import { useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MOCK_LOCATIONS = ["real", "home", "school", "work", "unknown"] as const;
const MOCK_ACTIVITIES = [null, "stationary", "walking", "driving"] as const;

export default function DebugScreen() {
  const store = useStore();
  const checkinTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePause = () => {
    store.setPaused(true);
    store.log("PAUSE", "Pause activated — 30s simulated");
    store.log("VISIBILITY", "Location hidden from circle");
    pauseTimer.current = setTimeout(() => {
      store.setPaused(false);
      store.log("PAUSE", "Pause expired — location visible");
    }, 30000);
  };

  const handleEndPause = () => {
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    store.setPaused(false);
    store.log("PAUSE", "Pause ended early");
  };

  const handleCheckin = () => {
    store.setCheckinActive(true);
    store.log("CHECKIN", "Admin nudge sent — 15s window");
    let secs = 15;
    checkinTimer.current = setInterval(() => {
      secs--;
      if (secs <= 0) {
        clearInterval(checkinTimer.current!);
        store.setCheckinActive(false);
        store.setOverrideActive(true);
        store.setPaused(false);
        store.log("OVERRIDE", "No response — location forced visible");
        store.log("OVERRIDE", "Immutable audit entry created");
      }
    }, 1000);
  };

  const handleRespond = () => {
    if (checkinTimer.current) clearInterval(checkinTimer.current);
    store.setCheckinActive(false);
    store.log("CHECKIN", "Member responded ✓ — override cancelled");
  };

  const handleClearOverride = () => {
    store.setOverrideActive(false);
    store.log("SYSTEM", "Override cleared (debug only)");
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={s.header}>
        bondtrail <Text style={s.sub}>debug</Text>
      </Text>

      {/* Mock Location */}
      <Text style={s.sectionLabel}>MOCK LOCATION</Text>
      <View style={s.row}>
        {MOCK_LOCATIONS.map((l) => (
          <TouchableOpacity
            key={l}
            onPress={() => {
              store.setMockLocation(l);
              store.log("ZONE", `Mock location → ${l}`);
            }}
            style={[s.pill, store.mockLocation === l && s.pillActive]}
          >
            <Text
              style={[s.pillText, store.mockLocation === l && s.pillTextActive]}
            >
              {l}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mock Activity */}
      <Text style={s.sectionLabel}>MOCK ACTIVITY</Text>
      <View style={s.row}>
        {MOCK_ACTIVITIES.map((a) => (
          <TouchableOpacity
            key={a ?? "real"}
            onPress={() => {
              store.setMockActivity(a);
              store.log("ACTIVITY", `Mock activity → ${a ?? "real sensor"}`);
            }}
            style={[s.pill, store.mockActivity === a && s.pillActive]}
          >
            <Text
              style={[s.pillText, store.mockActivity === a && s.pillTextActive]}
            >
              {a ?? "real"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pause */}
      <Text style={s.sectionLabel}>PAUSE CONTROLS</Text>
      <View style={s.row}>
        {!store.paused ? (
          <TouchableOpacity
            onPress={handlePause}
            style={[s.pill, s.pillActive]}
          >
            <Text style={s.pillTextActive}>Trigger Pause (30s)</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleEndPause}
            style={[s.pill, { borderColor: "#FF6B6B44" }]}
          >
            <Text
              style={{
                color: "#FF6B6B",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              End Pause
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Check-in */}
      <Text style={s.sectionLabel}>CHECK-IN NUDGE</Text>
      <View style={s.row}>
        {!store.checkinActive ? (
          <TouchableOpacity
            onPress={handleCheckin}
            style={[s.pill, { borderColor: "#FFB34744" }]}
          >
            <Text
              style={{
                color: "#FFB347",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              Send Nudge (Admin)
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleRespond}
            style={[s.pill, s.pillActive]}
          >
            <Text style={s.pillTextActive}>✓ Member Responds</Text>
          </TouchableOpacity>
        )}
        {store.overrideActive && (
          <TouchableOpacity
            onPress={handleClearOverride}
            style={[s.pill, { borderColor: "#FF6B6B44" }]}
          >
            <Text
              style={{
                color: "#FF6B6B",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              Clear Override
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Current State */}
      <Text style={s.sectionLabel}>CURRENT STATE</Text>
      <View style={s.stateCard}>
        {[
          ["Mock Location", store.mockLocation],
          ["Mock Activity", store.mockActivity ?? "real sensor"],
          ["Paused", store.paused ? "yes" : "no"],
          ["Checkin Active", store.checkinActive ? "yes" : "no"],
          ["Override Active", store.overrideActive ? "yes" : "no"],
          ["Real Lat", store.lat?.toFixed(5) ?? "—"],
          ["Real Lng", store.lng?.toFixed(5) ?? "—"],
        ].map(([k, v]) => (
          <View key={k} style={s.stateRow}>
            <Text style={s.stateKey}>{k}</Text>
            <Text style={s.stateVal}>{v}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080808",
    padding: 20,
    paddingTop: 60,
  },
  header: {
    color: "#eee",
    fontSize: 20,
    fontFamily: "monospace",
    marginBottom: 20,
    fontWeight: "700",
  },
  sub: { color: "#333", fontWeight: "400" },
  sectionLabel: {
    color: "#444",
    fontSize: 10,
    fontFamily: "monospace",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillActive: { borderColor: "#4ECDC444", backgroundColor: "#4ECDC411" },
  pillText: { color: "#555", fontSize: 12, fontFamily: "monospace" },
  pillTextActive: { color: "#4ECDC4", fontSize: 12, fontFamily: "monospace" },
  stateCard: {
    backgroundColor: "#0f0f0f",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 14,
    marginTop: 8,
  },
  stateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  stateKey: { color: "#444", fontFamily: "monospace", fontSize: 11 },
  stateVal: { color: "#eee", fontFamily: "monospace", fontSize: 11 },
});
