// components/LogDashboard.tsx
"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { fetchPollLogs } from "@/lib/api";
import { PollLog, FetchLogsParams } from "@/lib/types";
import dynamic from "next/dynamic";
// ... other imports


export default function LogDashboard() {
    const [logs, setLogs] = useState<PollLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize filters with explicit typing
    const [filters, setFilters] = useState<FetchLogsParams & { offset: number }>({
        start: new Date(Date.now() - 86400000).toISOString().slice(0, 19).replace('T', ' '),
        end: new Date().toISOString().slice(0, 19).replace('T', ' '),
        limit: 100,
        offset: 0
    });

    // Load Map component without SSR
    const LogMap = dynamic(() => import("./LogMap"), {
        ssr: false,
        loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">Loading Map...</div>
    });

    const loadData = async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchPollLogs(filters);
            setLogs(result.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const getBatteryLabel = (status: string) => {
        const mapping: Record<string, { label: string; color: string }> = {
            "ok": { label: "Healthy", color: "bg-emerald-100 text-emerald-800" },
            "low": { label: "Warning", color: "bg-amber-100 text-amber-800" },
            "crit": { label: "Critical", color: "bg-red-100 text-red-800" },
            "charging": { label: "Charging", color: "bg-blue-100 text-blue-800" },
        };
        return mapping[status.toLowerCase()] || { label: status, color: "bg-slate-100 text-slate-800" };
    };

    useEffect(() => {
        loadData();
    }, [filters.offset]);

    const handleDateChange = (e: ChangeEvent<HTMLInputElement>, field: 'start' | 'end'): void => {
        setFilters(prev => ({
            ...prev,
            [field]: e.target.value.replace('T', ' '),
            offset: 0 // Reset pagination on filter change
        }));
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="flex flex-wrap gap-4 justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Logs</h1>
                    <p className="text-slate-500 text-sm">Monitoring device health and geolocation</p>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    {/* Part Filter Input */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Search Part</label>
                        <input
                            type="text"
                            placeholder="e.g. SENSOR_01"
                            className="border p-2 rounded text-sm min-w-[200px]"
                            onChange={(e) => setFilters(p => ({ ...p, part: e.target.value, offset: 0 }))}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Time Range</label>
                        <div className="flex gap-2">
                            <input
                                type="datetime-local"
                                className="border p-2 rounded text-sm"
                                onChange={(e) => handleDateChange(e, 'start')}
                            />
                            <button onClick={() => loadData()} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold">
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Map and Table Logic */}
            <table className="w-full text-left">
                {/* ... thead ... */}
                <tbody>
                    {logs.map((log) => {
                        const battery = getBatteryLabel(log.battery_status);
                        return (
                            <tr key={`${log.part_name}-${log.timestamp}`} className="border-b">
                                <td className="p-4 font-mono text-xs">{log.timestamp}</td>
                                <td className="p-4 font-semibold">{log.part_name}</td>
                                <td className="p-4 text-sm">{log.latitude}, {log.longitude}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${battery.color}`}>
                                        {battery.label}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}