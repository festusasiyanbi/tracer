import { Trip, useStore } from "@/src/state/store";
import { ScrollView, StyleSheet, Text, View } from "react-native";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toTimeString().slice(0, 8);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function TripCard({ trip, num }: { trip: Trip; num: number }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.tripNum}>Trip #{num}</Text>
        <Text style={s.tripDate}>{formatDate(trip.startTime)}</Text>
      </View>

      {/* Coords */}
      <View style={s.coordRow}>
        <View style={s.coordBlock}>
          <Text style={s.coordLabel}>FROM</Text>
          <Text style={s.coordVal}>{trip.startLat?.toFixed(5)}</Text>
          <Text style={s.coordVal}>{trip.startLng?.toFixed(5)}</Text>
        </View>
        <Text
          style={{
            color: "#2a2a2a",
            fontFamily: "monospace",
            fontSize: 16,
            alignSelf: "center",
          }}
        >
          →
        </Text>
        <View style={[s.coordBlock, { alignItems: "flex-end" }]}>
          <Text style={s.coordLabel}>TO</Text>
          <Text style={s.coordVal}>{trip.endLat?.toFixed(5)}</Text>
          <Text style={s.coordVal}>{trip.endLng?.toFixed(5)}</Text>
        </View>
      </View>

      <View style={s.divider} />

      {/* Stats grid */}
      <View style={s.statsGrid}>
        <View style={s.statBox}>
          <Text style={s.statLabel}>START</Text>
          <Text style={s.statVal}>{formatTime(trip.startTime)}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>END</Text>
          <Text style={s.statVal}>{formatTime(trip.endTime)}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>DURATION</Text>
          <Text style={s.statVal}>
            {formatDuration(trip.startTime, trip.endTime)}
          </Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>TOP SPEED</Text>
          <Text style={[s.statVal, { color: "#FFB347" }]}>
            {trip.topSpeedKph.toFixed(1)} km/h
          </Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>HARD BRAKES</Text>
          <Text
            style={[
              s.statVal,
              { color: trip.hardBrakeCount > 0 ? "#FF6B6B" : "#eee" },
            ]}
          >
            {trip.hardBrakeCount}
          </Text>
        </View>
      </View>

      {/* Brake events */}
      {trip.hardBrakeEvents.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={[s.statLabel, { marginBottom: 6 }]}>BRAKE EVENTS</Text>
          {trip.hardBrakeEvents.map((b, i) => (
            <View key={i} style={s.brakeRow}>
              <Text style={s.brakeTime}>{b.time}</Text>
              <Text style={s.brakeSpeed}>{b.speedKph.toFixed(1)} km/h</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const { tripHistory } = useStore();

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.header}>
          bondtrail <Text style={s.sub}>history</Text>
        </Text>
        <Text style={s.count}>
          {tripHistory.length} trip{tripHistory.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {tripHistory.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No trips yet</Text>
          <Text style={s.emptyHint}>Start driving to log your first trip.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {tripHistory.map((trip, i) => (
            <TripCard key={trip.id} trip={trip} num={tripHistory.length - i} />
          ))}
        </ScrollView>
      )}
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 20,
  },
  header: {
    color: "#eee",
    fontSize: 20,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  sub: { color: "#333", fontWeight: "400" },
  count: { color: "#444", fontFamily: "monospace", fontSize: 11 },

  card: {
    backgroundColor: "#0f0f0f",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  tripNum: {
    color: "#4ECDC4",
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "700",
  },
  tripDate: { color: "#444", fontFamily: "monospace", fontSize: 11 },

  coordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  coordBlock: { gap: 2 },
  coordLabel: {
    color: "#333",
    fontFamily: "monospace",
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 2,
  },
  coordVal: { color: "#555", fontFamily: "monospace", fontSize: 11 },

  divider: { height: 1, backgroundColor: "#1a1a1a", marginVertical: 12 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: {
    backgroundColor: "#111",
    borderRadius: 6,
    padding: 10,
    minWidth: "30%",
    flex: 1,
  },
  statLabel: {
    color: "#333",
    fontFamily: "monospace",
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statVal: { color: "#eee", fontFamily: "monospace", fontSize: 12 },

  brakeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  brakeTime: { color: "#FF6B6B66", fontFamily: "monospace", fontSize: 10 },
  brakeSpeed: { color: "#FF6B6B", fontFamily: "monospace", fontSize: 10 },

  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyTitle: {
    color: "#333",
    fontFamily: "monospace",
    fontSize: 14,
    marginBottom: 8,
  },
  emptyHint: { color: "#222", fontFamily: "monospace", fontSize: 11 },
});
