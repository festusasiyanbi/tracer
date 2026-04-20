import {
  getCurrentZone,
  getEffectiveCoords,
  useStore,
} from "@/src/state/store";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toTimeString().slice(0, 8);
}

function formatDuration(start: string | null, end: string | null) {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const mins = Math.floor((e - s) / 60000);
  const secs = Math.floor(((e - s) % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

const MODES = [
  {
    id: "stationary",
    label: "Stationary",
    icon: "●",
    color: "#94A3B8",
    dim: "#94A3B811",
  },
  {
    id: "walking",
    label: "Walking",
    icon: "▲",
    color: "#4ECDC4",
    dim: "#4ECDC411",
  },
  {
    id: "driving",
    label: "Driving",
    icon: "◆",
    color: "#FFB347",
    dim: "#FFB34711",
  },
] as const;

export default function ObserverScreen() {
  const store = useStore();
  const coords = getEffectiveCoords(store);
  const zone = coords ? getCurrentZone(coords.lat, coords.lng) : null;
  const effectiveActivity = store.mockActivity ?? store.activity;
  const { trip } = store;

  const accuracyColor = !store.gpsAccuracy
    ? "#333"
    : store.gpsAccuracy <= 15
      ? "#4ECDC4"
      : store.gpsAccuracy <= 25
        ? "#FFB347"
        : "#FF6B6B";

  const accuracyLabel = !store.gpsAccuracy
    ? "—"
    : store.gpsAccuracy <= 15
      ? "good"
      : store.gpsAccuracy <= 25
        ? "fair"
        : "poor — updates paused";

  return (
    <View style={s.container}>
      <Text style={s.header}>
        bondtrail <Text style={s.sub}>observer</Text>
      </Text>

      {/* Status Card */}
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.label}>STATUS</Text>
          <View
            style={[
              s.tag,
              { borderColor: store.paused ? "#FF6B6B44" : "#4ECDC444" },
            ]}
          >
            <Text
              style={{
                color: store.paused ? "#FF6B6B" : "#4ECDC4",
                fontSize: 11,
                fontFamily: "monospace",
              }}
            >
              {store.paused ? "PAUSED" : "VISIBLE"}
            </Text>
          </View>
        </View>

        <View style={s.row}>
          <Text style={s.label}>LOCATION</Text>
          <Text style={s.value}>
            {store.paused
              ? "⊘ Hidden"
              : coords
                ? zone
                  ? `✓ ${zone.label}`
                  : "⚠ Unknown zone"
                : "Acquiring…"}
          </Text>
        </View>

        {coords && !store.paused && (
          <Text style={s.coords}>
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </Text>
        )}

        <View style={s.row}>
          <Text style={s.label}>GPS ACCURACY</Text>
          <Text
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: accuracyColor,
            }}
          >
            {store.gpsAccuracy ? `±${store.gpsAccuracy.toFixed(0)}m` : "—"}
            {"  "}
            {accuracyLabel}
          </Text>
        </View>
      </View>

      {/* Activity Mode Indicators */}
      <View style={s.modeRow}>
        {MODES.map((mode) => {
          const active = effectiveActivity === mode.id;
          return (
            <View
              key={mode.id}
              style={[
                s.modeCard,
                {
                  backgroundColor: active ? mode.dim : "transparent",
                  borderColor: active ? mode.color + "55" : "#1a1a1a",
                  opacity: active ? 1 : 0.3,
                },
              ]}
            >
              {active && (
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: mode.color,
                  }}
                />
              )}

              <Text
                style={{
                  color: active ? mode.color : "#555",
                  fontSize: 18,
                  marginBottom: 6,
                }}
              >
                {mode.icon}
              </Text>
              <Text
                style={{
                  color: active ? mode.color : "#444",
                  fontFamily: "monospace",
                  fontSize: 10,
                  letterSpacing: 0.5,
                }}
              >
                {mode.label.toUpperCase()}
              </Text>
              {active && (
                <Text
                  style={{
                    color: mode.color,
                    fontFamily: "monospace",
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {mode.id === "driving"
                    ? `${store.speedKph.toFixed(1)} km/h`
                    : mode.id === "walking"
                      ? "on foot"
                      : "still"}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Trip Card */}
      {(trip.active || trip.endTime) && (
        <View
          style={[
            s.card,
            { borderColor: trip.active ? "#FFB34733" : "#33333355" },
          ]}
        >
          <View style={s.row}>
            <Text style={s.label}>
              {trip.active ? "TRIP IN PROGRESS" : "LAST TRIP"}
            </Text>
            {trip.active && (
              <View style={[s.tag, { borderColor: "#FFB34744" }]}>
                <Text
                  style={{
                    color: "#FFB347",
                    fontFamily: "monospace",
                    fontSize: 10,
                  }}
                >
                  LIVE
                </Text>
              </View>
            )}
          </View>

          <View style={s.tripRow}>
            <Text style={s.tripKey}>Started at</Text>
            <Text style={s.tripVal}>
              {trip.startLat?.toFixed(5)}, {trip.startLng?.toFixed(5)}
            </Text>
          </View>

          <View style={s.tripRow}>
            <Text style={s.tripKey}>Start time</Text>
            <Text style={s.tripVal}>{formatTime(trip.startTime)}</Text>
          </View>

          {!trip.active && trip.endLat && (
            <View style={s.tripRow}>
              <Text style={s.tripKey}>Ended at</Text>
              <Text style={s.tripVal}>
                {trip.endLat.toFixed(5)}, {trip.endLng?.toFixed(5)}
              </Text>
            </View>
          )}

          {!trip.active && trip.endTime && (
            <View style={s.tripRow}>
              <Text style={s.tripKey}>End time</Text>
              <Text style={s.tripVal}>{formatTime(trip.endTime)}</Text>
            </View>
          )}

          <View style={s.tripRow}>
            <Text style={s.tripKey}>Duration</Text>
            <Text style={s.tripVal}>
              {formatDuration(trip.startTime, trip.endTime)}
            </Text>
          </View>

          {trip.active && (
            <View style={s.tripRow}>
              <Text style={s.tripKey}>Current speed</Text>
              <Text style={[s.tripVal, { color: "#FFB347" }]}>
                {trip.currentSpeedKph.toFixed(1)} km/h
              </Text>
            </View>
          )}

          <View style={s.tripRow}>
            <Text style={s.tripKey}>Top speed</Text>
            <Text style={[s.tripVal, { color: "#FFB347" }]}>
              {trip.topSpeedKph.toFixed(1)} km/h
            </Text>
          </View>

          <View style={s.tripRow}>
            <Text style={s.tripKey}>Hard brakes</Text>
            <Text
              style={[
                s.tripVal,
                { color: trip.hardBrakeCount > 0 ? "#FF6B6B" : "#eee" },
              ]}
            >
              {trip.hardBrakeCount}
            </Text>
          </View>

          {trip.hardBrakeEvents.length > 0 && (
            <View style={{ marginTop: 6, gap: 3 }}>
              {trip.hardBrakeEvents.map((b, i) => (
                <Text
                  key={i}
                  style={{
                    color: "#FF6B6B88",
                    fontFamily: "monospace",
                    fontSize: 10,
                  }}
                >
                  {b.time} — {b.speedKph.toFixed(1)} km/h
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Check-in banners */}
      {store.checkinActive && (
        <View style={s.banner}>
          <Text style={s.bannerText}>
            Check-in nudge sent — awaiting response
          </Text>
        </View>
      )}
      {store.overrideActive && (
        <View
          style={[
            s.banner,
            { borderColor: "#FF6B6B44", backgroundColor: "#FF6B6B11" },
          ]}
        >
          <Text style={[s.bannerText, { color: "#FF6B6B" }]}>
            Override active — location forced visible
          </Text>
        </View>
      )}

      {/* Event Log */}
      <Text style={[s.label, { marginTop: 16, marginBottom: 8 }]}>
        EVENT LOG
      </Text>
      <ScrollView style={s.log}>
        {store.events.length === 0 && (
          <Text
            style={{
              color: "#333",
              fontFamily: "monospace",
              fontSize: 11,
              textAlign: "center",
              marginTop: 20,
            }}
          >
            — no events yet —
          </Text>
        )}
        {[...store.events].reverse().map((e, i) => {
          const typeColor: Record<string, string> = {
            ZONE: "#4ECDC4",
            CHECKIN: "#FFB347",
            OVERRIDE: "#FF6B6B",
            ACTIVITY: "#A78BFA",
            PAUSE: "#94A3B8",
            VISIBILITY: "#60A5FA",
            TRIP: "#FFB347",
            SAFETY: "#FF6B6B",
            GPS: "#2a2a2a",
            SYSTEM: "#333",
          };
          return (
            <View key={i} style={s.logRow}>
              <Text style={s.logTime}>{e.time}</Text>
              <Text style={[s.logType, { color: typeColor[e.type] || "#555" }]}>
                [{e.type}]
              </Text>
              <Text style={s.logMsg}>{e.msg}</Text>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity onPress={store.clearLog} style={s.clearBtn}>
        <Text style={{ color: "#333", fontFamily: "monospace", fontSize: 11 }}>
          Clear Log
        </Text>
      </TouchableOpacity>
    </View>
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
  card: {
    backgroundColor: "#0f0f0f",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    color: "#444",
    fontSize: 10,
    fontFamily: "monospace",
    letterSpacing: 1,
  },
  value: { color: "#eee", fontSize: 13, fontFamily: "monospace" },
  coords: {
    color: "#333",
    fontSize: 10,
    fontFamily: "monospace",
    marginBottom: 8,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  modeRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  modeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    position: "relative",
  },
  tripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  tripKey: { color: "#444", fontFamily: "monospace", fontSize: 11 },
  tripVal: {
    color: "#eee",
    fontFamily: "monospace",
    fontSize: 11,
    flex: 1,
    textAlign: "right",
  },
  banner: {
    borderWidth: 1,
    borderColor: "#FFB34744",
    backgroundColor: "#FFB34711",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { color: "#FFB347", fontFamily: "monospace", fontSize: 12 },
  log: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 10,
  },
  logRow: { flexDirection: "row", gap: 6, marginBottom: 5 },
  logTime: { color: "#333", fontFamily: "monospace", fontSize: 10, width: 65 },
  logType: { fontFamily: "monospace", fontSize: 10, width: 82 },
  logMsg: { color: "#888", fontFamily: "monospace", fontSize: 10, flex: 1 },
  clearBtn: { marginTop: 8, alignItems: "center", padding: 8 },
});
