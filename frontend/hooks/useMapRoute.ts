import { useState, useEffect, useRef } from "react";
import { PollLog } from "@/lib/types";
import { getDistanceFromLatLonInM } from "@/lib/utils";

export function useMapRoute(map: google.maps.Map | null, logs: PollLog[]) {
    const [routeSegments, setRouteSegments] = useState<{ path: google.maps.LatLngLiteral[], color: string }[]>([]);
    const [fullPath, setFullPath] = useState<google.maps.LatLngLiteral[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationIndex, setAnimationIndex] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const animationRef = useRef<number>(0);

    // Calculate Route Segments
    useEffect(() => {
        if (!map || typeof google === 'undefined' || logs.length < 2) {
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

    // Animation Loop
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

    return {
        routeSegments,
        fullPath,
        isAnimating,
        setIsAnimating,
        animationIndex,
        setAnimationIndex,
        playbackSpeed,
        setPlaybackSpeed
    };
}
