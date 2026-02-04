// components/LogMap.tsx
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { PollLog } from "@/lib/types";
import { getIconUrl } from "@/lib/utils";
import { useMapRoute } from "@/hooks/useMapRoute";
import BatteryStatus from "./BatteryStatus";

// Libraries must be a static constant to prevent re-loads
const LIBRARIES: ("visualization")[] = ["visualization"];
const MAP_OPTIONS = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

const defaultIconUrl = getIconUrl(0.6);
const selectedIconUrl = getIconUrl(1.0);

interface LogMapProps {
  logs: PollLog[];
  showHeatmap?: boolean;
  showRoute?: boolean;
  selectedLog: PollLog | null;
  onLogSelect: (log: PollLog | null) => void;
}

export default function LogMap({ 
  logs, 
  showHeatmap = true, 
  showRoute = false,
  selectedLog,
  onLogSelect 
}: LogMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Use custom hook for Route & Animation State
  const {
      routeSegments,
      fullPath,
      isAnimating,
      setIsAnimating,
      animationIndex,
      setAnimationIndex,
      playbackSpeed,
      setPlaybackSpeed
  } = useMapRoute(map, logs);

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

  const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  // Heatmap Data
  const heatmapData = useMemo(() => {
    if (typeof google === 'undefined' || !isLoaded) return [];
    return logs.map(log => ({
      location: new google.maps.LatLng(log.latitude, log.longitude),
      weight: 1
    }));
  }, [logs, isLoaded]);

  // Manage Heatmap Lifecycle Manually
  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    // Cleanup function to remove existing layer
    const cleanupHeatmap = () => {
      if (heatmapLayerRef.current) {
        heatmapLayerRef.current.setMap(null);
        heatmapLayerRef.current = null;
      }
    };

    if (showHeatmap && heatmapData.length > 0) {
      // Clean up any potential stale layer first
      cleanupHeatmap();

      const heatmap = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        radius: 30,
        opacity: 0.6,
      });

      heatmap.setMap(map);
      heatmapLayerRef.current = heatmap;
    } else {
      cleanupHeatmap();
    }

    return cleanupHeatmap;
  }, [map, showHeatmap, heatmapData]);
  
  const routeLinesRef = useRef<google.maps.Polyline[]>([]);

  // Manage Route Lifecycle Manually
  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const cleanupRoutes = () => {
      routeLinesRef.current.forEach(line => line.setMap(null));
      routeLinesRef.current = [];
    };

    if (showRoute && routeSegments.length > 0) {
      cleanupRoutes();

      routeSegments.forEach(seg => {
        const line = new google.maps.Polyline({
          path: seg.path,
          strokeColor: seg.color,
          strokeOpacity: 0.8,
          strokeWeight: 5,
        });
        line.setMap(map);
        routeLinesRef.current.push(line);
      });
    } else {
      cleanupRoutes();
    }

    return cleanupRoutes;
  }, [map, showRoute, routeSegments]);

  const animatedPosition = useMemo(() => {
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
  }, [fullPath, animationIndex]);

  // Auto-follow the pin when animating
  useEffect(() => {
    if (isAnimating && animatedPosition && map) {
      map.setCenter(animatedPosition);
    }
  }, [isAnimating, animatedPosition, map]);

  const mapCenter = useMemo(() => {
    return logs.length > 0 ? { lat: logs[0].latitude, lng: logs[0].longitude } : { lat: 0, lng: 0 };
  }, [logs]);

  if (loadError) return <div className="p-4 text-red-500">Error loading Google Maps</div>;
  if (!isLoaded) return (
    <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center">
      <span className="text-slate-400 font-medium">Loading Google Maps...</span>
    </div>
  );

  return (
    <div className="h-full w-full relative">
      <GoogleMap
        mapContainerClassName="h-full w-full rounded-xl"
        center={mapCenter}
        zoom={3}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={MAP_OPTIONS}
      >




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
            onClick={() => onLogSelect(log)}
          />
        ))}

        {selectedLog && (
          <InfoWindow
            position={{ lat: selectedLog.latitude, lng: selectedLog.longitude }}
            onCloseClick={() => onLogSelect(null)}
            options={{ 
              pixelOffset: new google.maps.Size(0, -40),
              headerDisabled: true 
            }}
          >
            <div className="text-sm p-1">
              <div className="flex items-center justify-between border border-slate-300 rounded bg-slate-50 px-2 py-1 mb-2">
                <strong className="text-center flex-grow">{selectedLog.part_name}</strong>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLogSelect(null);
                  }}
                  className="ml-2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
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