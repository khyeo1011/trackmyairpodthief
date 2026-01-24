// components/LogMap.tsx
"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { PollLog } from "@/lib/types";

// Fix for default Leaflet marker icons in Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LogMapProps {
  logs: PollLog[];
}

function HeatmapLayer({ logs }: { logs: PollLog[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || logs.length === 0) return;

    // Prepare data for heatmap: [[lat, lng, intensity], ...]
    const points = logs.map((log) => [log.latitude, log.longitude, 0.5] as [number, number, number]);

    // @ts-ignore - leaflet.heat is a plugin and doesn't have native TS definitions
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, logs]);

  return null;
}

export default function LogMap({ logs }: LogMapProps) {
  const defaultCenter: [number, number] = logs.length > 0 
    ? [logs[0].latitude, logs[0].longitude] 
    : [0, 0];

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border border-slate-200 shadow-sm mb-8">
      <MapContainer center={defaultCenter} zoom={3} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatmapLayer logs={logs} />
        {logs.slice(0, 50).map((log, i) => ( // Limit markers for performance
          <Marker key={`marker-${i}`} position={[log.latitude, log.longitude]} icon={icon}>
            <Popup>
              <div className="text-sm">
                <strong>{log.part_name}</strong><br />
                {log.timestamp}<br />
                Batt: {log.battery_status}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}