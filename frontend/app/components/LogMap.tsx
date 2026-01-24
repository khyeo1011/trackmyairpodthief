// components/LogMap.tsx
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline, HeatmapLayer } from "@react-google-maps/api";
import { PollLog } from "@/lib/types";
import BatteryStatus from "./BatteryStatus";

// Libraries must be a static constant to prevent re-loads
const LIBRARIES: ("visualization")[] = ["visualization"];

// Helper to generate SVG Data URI for Google Maps Markers
const getIconUrl = (opacity: number) => {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4f46e5" width="40" height="40" style="opacity: ${opacity}; filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.2));">
    <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const defaultIconUrl = getIconUrl(0.6);
const selectedIconUrl = getIconUrl(1.0);

interface LogMapProps {
  logs: PollLog[];
  showHeatmap?: boolean;
  showRoute?: boolean;
}

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function LogMap({ logs, showHeatmap = true, showRoute = false }: LogMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedLog, setSelectedLog] = useState<PollLog | null>(null);

  // Route & Animation State
  const [routeSegments, setRouteSegments] = useState<{ path: google.maps.LatLngLiteral[], color: string }[]>([]);
  const [fullPath, setFullPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animationRef = useRef<number>(0);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Fit bounds when logs change
  useEffect(() => {
    if (map && logs.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      logs.forEach(log => bounds.extend({ lat: log.latitude, lng: log.longitude }));
      map.fitBounds(bounds, 50); // 50px padding
    }
  }, [map, logs]);

  // Calculate Route Segments
  useEffect(() => {
    if (!map || !window.google || logs.length < 2) {
      setRouteSegments([]);
      setFullPath([]);
      return;
    }

    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Filter logs that are too close (50m threshold)
    const filteredLogs = [sortedLogs[0]];
    for (let i = 1; i < sortedLogs.length; i++) {
      const prev = filteredLogs[filteredLogs.length - 1];
      const curr = sortedLogs[i];
      if (getDistanceFromLatLonInM(prev.latitude, prev.longitude, curr.latitude, curr.longitude) > 50) {
        filteredLogs.push(curr);
      }
    }

    if (filteredLogs.length < 2) {
      setRouteSegments([]);
      setFullPath([]);
      return;
    }

    const abortController = new AbortController();
    const ds = new google.maps.DirectionsService();

    const fetchRoutes = async () => {
      setRouteSegments([]);
      const accumulatedPath: google.maps.LatLngLiteral[] = [{ lat: filteredLogs[0].latitude, lng: filteredLogs[0].longitude }];

      for (let i = 0; i < filteredLogs.length - 1; i++) {
        if (abortController.signal.aborted) return;

        const start = { lat: filteredLogs[i].latitude, lng: filteredLogs[i].longitude };
        const end = { lat: filteredLogs[i + 1].latitude, lng: filteredLogs[i + 1].longitude };

        const totalSegments = filteredLogs.length - 1;
        const progress = i / Math.max(1, totalSegments - 1);
        const hue = 240 * (1 - progress);
        const color = `hsl(${hue}, 80%, 50%)`;

        try {
          const [driving, walking] = await Promise.allSettled([
            ds.route({ origin: start, destination: end, travelMode: google.maps.TravelMode.DRIVING }),
            ds.route({ origin: start, destination: end, travelMode: google.maps.TravelMode.WALKING })
          ]);

          let bestPath: google.maps.LatLngLiteral[] = [start, end];
          const dRes = driving.status === 'fulfilled' ? driving.value : null;
          const wRes = walking.status === 'fulfilled' ? walking.value : null;

          if (dRes && wRes) {
            const dDist = dRes.routes[0]?.legs[0]?.distance?.value || Infinity;
            const wDist = wRes.routes[0]?.legs[0]?.distance?.value || Infinity;
            bestPath = (dDist <= wDist ? dRes : wRes).routes[0].overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
          } else if (dRes) bestPath = dRes.routes[0].overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
          else if (wRes) bestPath = wRes.routes[0].overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));

          setRouteSegments(prev => [...prev, { path: bestPath, color }]);

          if (bestPath.length > 0) {
            const last = accumulatedPath[accumulatedPath.length - 1];
            const first = bestPath[0];
            const skipFirst = last && Math.abs(last.lat - first.lat) < 0.0001 && Math.abs(last.lng - first.lng) < 0.0001;
            accumulatedPath.push(...(skipFirst ? bestPath.slice(1) : bestPath));
          }

          await new Promise(r => setTimeout(r, 300)); // Rate limit
        } catch (e) {
          setRouteSegments(prev => [...prev, { path: [start, end], color }]);
          accumulatedPath.push(end);
        }
      }
      setFullPath(accumulatedPath);
    };

    fetchRoutes();
    return () => abortController.abort();
  }, [map, logs]);

  // Reset animation when route changes
  useEffect(() => {
    setIsAnimating(false);
    setAnimationIndex(0);
  }, [fullPath]);


  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  useEffect(() => {
    if (!showHeatmap && heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }
  }, [showHeatmap]); useEffect(() => {
    if (!showHeatmap && heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }
  }, [showHeatmap]);

  useEffect(() => {
    if (isAnimating && fullPath.length > 0) {
      let lastTime = performance.now();
      const animate = (time: number) => {
        const delta = time - lastTime;
        lastTime = time;
        const increment = (delta / 1000) * 10 * playbackSpeed; // Base: 10 points/sec

        setAnimationIndex(prev => {
          const next = prev + increment;
          if (next >= fullPath.length - 1) {
            setIsAnimating(false);
            return fullPath.length - 1;
          }
          return next;
        });
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAnimating, fullPath.length, playbackSpeed]);

  // Heatmap Data
  const heatmapData = useMemo(() => {
    if (typeof google === 'undefined' || !isLoaded) return [];
    return logs.map(log => ({
      location: new google.maps.LatLng(log.latitude, log.longitude),
      weight: 1
    }));
  }, [logs, isLoaded]);

  if (loadError) return <div className="p-4 text-red-500">Error loading Google Maps</div>;
  if (!isLoaded) return (
    <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center">
      <span className="text-slate-400 font-medium">Loading Google Maps...</span>
    </div>
  );

  const animatedPosition = (() => {
    if (fullPath.length === 0) return null;
    const idx = Math.floor(animationIndex);
    const nextIdx = Math.min(idx + 1, fullPath.length - 1);
    const fraction = animationIndex - idx;

    const p1 = fullPath[idx];
    const p2 = fullPath[nextIdx];

    if (!p1 || !p2) return p1 || null;

    return {
      lat: p1.lat + (p2.lat - p1.lat) * fraction,
      lng: p1.lng + (p2.lng - p1.lng) * fraction
    };
  })();

  return (
    <div className="h-full w-full relative">
      <GoogleMap
        mapContainerClassName="h-full w-full rounded-xl"
        center={logs.length > 0 ? { lat: logs[0].latitude, lng: logs[0].longitude } : { lat: 0, lng: 0 }}
        zoom={3}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {showHeatmap && heatmapData.length > 0 && (
          <HeatmapLayer
            data={heatmapData}
            options={{ radius: 30, opacity: 0.6 }}
            onLoad={(heatmap) => {
              heatmapRef.current = heatmap;
            }}
            onUnmount={() => {
              if (heatmapRef.current) {
                heatmapRef.current.setMap(null);
                heatmapRef.current = null;
              }
            }}
          />
        )}

        {showRoute && routeSegments.map((seg, i) => (
          <Polyline
            key={i}
            path={seg.path}
            options={{
              strokeColor: seg.color,
              strokeOpacity: 0.8,
              strokeWeight: 5,
            }}
          />
        ))}

        {isAnimating && animatedPosition && (
          <Marker
            position={animatedPosition}
            icon={{
              url: selectedIconUrl,
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 40)
            }}
            zIndex={1000}
          />
        )}

        {logs.slice(0, 50).map((log, i) => (
          <Marker
            key={`marker-${i}`}
            position={{ lat: log.latitude, lng: log.longitude }}
            icon={{
              url: selectedLog === log ? selectedIconUrl : defaultIconUrl,
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 40)
            }}
            onClick={() => setSelectedLog(log)}
          />
        ))}

        {selectedLog && (
          <InfoWindow
            position={{ lat: selectedLog.latitude, lng: selectedLog.longitude }}
            onCloseClick={() => setSelectedLog(null)}
            options={{ pixelOffset: new google.maps.Size(0, -40) }}
          >
            <div className="text-sm p-1">
              <strong className="block text-center border border-slate-300 rounded bg-slate-50 px-2 py-1 mb-2">{selectedLog.part_name}</strong>
              <div className="mb-2">
                {new Date(selectedLog.timestamp).toLocaleString(undefined, {
                  year: "numeric", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </div>
              <BatteryStatus status={selectedLog.battery_status} />
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {showRoute && fullPath.length > 0 && (
        <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 flex flex-col gap-4 w-48">
          <div>
            <div className="text-xs font-bold text-slate-700 mb-1">Route Timeline</div>
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-[hsl(240,80%,50%)] to-[hsl(0,80%,50%)] mb-1"></div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Start</span>
              <span>End</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!isAnimating && animationIndex >= fullPath.length - 1) {
                setAnimationIndex(0);
              }
              setIsAnimating(!isAnimating);
            }}
            className={`flex items-center justify-center gap-2 text-sm font-bold py-2 px-4 rounded-lg transition-all shadow-sm ${isAnimating
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
              : "bg-indigo-600 text-white hover:bg-indigo-700 border border-transparent"
              }`}
          >
            {isAnimating ? (
              <>
                <span className="w-2 h-2 bg-amber-700 rounded-sm"></span> Pause
              </>
            ) : (
              <>
                <span className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-current border-b-[5px] border-b-transparent ml-1"></span>
                {animationIndex > 0 && animationIndex < fullPath.length - 1 ? "Resume" : "Play Route"}
              </>
            )}
          </button>

          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Speed</span>
              <span>{playbackSpeed}x</span>
            </div>
            <input
              type="range" min="0.1" max="3" step="0.1"
              value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-medium pt-1">
              <span>Mode</span>
              <span className="capitalize font-bold text-indigo-600">Straight</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
