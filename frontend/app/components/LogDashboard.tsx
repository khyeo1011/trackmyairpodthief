"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { PollLog, FetchLogsParams } from "@/lib/types";
import { fetchPollLogs } from "@/lib/api";


// 1. Dynamic Map Import (Prevents SSR Errors)
const LogMap = dynamic(() => import("./LogMap"), {
    ssr: false,
    loading: () => (
        <div className="h-[450px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center border border-slate-200">
            <span className="text-slate-400 font-medium">Initializing Map Engine...</span>
        </div>
    )
});

// 2. FindMy Bitmask Parser
// Bit 0-2: Level (0-7), Bit 3: Charging (1 = Yes)
const parseBatteryBitmask = (status: string | number) => {
    const raw = typeof status === "string"
        ? (status.startsWith("0b") ? parseInt(status.slice(2), 2) : parseInt(status, 10))
        : status;

    if (isNaN(raw)) return { label: "Unknown", color: "bg-slate-100 text-slate-500" };

    const isCharging = (raw >> 7) & 0x01;
    const percentage = raw & 0x7F; // Isolates bits 0-6

    // Categorize percentage into levels
    let levelKey = 0;
    if (percentage >= 100) levelKey = 7;
    else if (percentage > 85) levelKey = 6;
    else if (percentage > 70) levelKey = 5;
    else if (percentage > 50) levelKey = 4;
    else if (percentage > 25) levelKey = 3;
    else if (percentage > 10) levelKey = 2;
    else if (percentage > 0) levelKey = 1;
    else levelKey = 0;

    const levels: Record<number, { label: string; color: string }> = {
        0: { label: "Empty", color: "bg-red-200 text-red-900" },
        1: { label: "Critical", color: "bg-red-100 text-red-700" },
        2: { label: "Low", color: "bg-orange-100 text-orange-700" },
        3: { label: "Mid-Low", color: "bg-yellow-100 text-yellow-700" },
        4: { label: "Medium", color: "bg-blue-100 text-blue-700" },
        5: { label: "Mid-High", color: "bg-emerald-50 text-emerald-600" },
        6: { label: "High", color: "bg-emerald-100 text-emerald-700" },
        7: { label: "Full", color: "bg-green-100 text-green-800" },
    };

    const info = levels[levelKey];
    return {
        ...info,
        percentage,
        label: isCharging ? `${info.label} (${percentage}%) ⚡` : `${info.label} (${percentage}%)`
    };
};

export default function LogDashboard() {
    const [logs, setLogs] = useState<PollLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // State for search and windowing
    const [filters, setFilters] = useState<FetchLogsParams & { offset: number }>({
        part: "",
        limit: 100,
        offset: 0
    });

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchPollLogs(filters);
            setLogs(result.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Connection failed");
        } finally {
            setLoading(false);
        }
    };

    // Trigger load on filter/pagination change
    useEffect(() => {
        const timer = setTimeout(loadData, 300); // Debounce typing
        return () => clearTimeout(timer);
    }, [filters.part, filters.offset]);

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header & Controls */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">FindMy Asset Tracker</h1>
                        <p className="text-slate-500 text-sm">Real-time telemetry and battery bitmask analysis</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <input
                            type="text"
                            placeholder="Search Part Name (e.g. AirTag)..."
                            className="px-4 py-2 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[280px]"
                            onChange={(e) => setFilters(prev => ({ ...prev, part: e.target.value, offset: 0 }))}
                        />
                        <button
                            onClick={loadData}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm"
                        >
                            Refresh
                        </button>
                    </div>
                </header>

                {/* Map Section */}
                <section className="h-[450px] w-full relative rounded-xl border border-slate-200 shadow-sm overflow-hidden z-0">
                    <LogMap logs={logs} />
                </section>

                {/* Data Table Section */}
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {error && (
                        <div className="p-4 bg-red-50 border-b border-red-100 text-red-600 text-sm font-medium">
                            Error: {error}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Device ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Battery Health</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Coordinates</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                            Fetching system logs...
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                            No logs found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log, i) => {
                                        const battery = parseBatteryBitmask(log.battery_status);
                                        return (
                                            <tr key={`${log.part_name}-${i}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-slate-700">{log.part_name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm ${battery.color}`}>
                                                        {battery.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                                    {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                                                    {log.timestamp}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Showing {logs.length} results (Offset: {filters.offset})
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={filters.offset === 0}
                                onClick={() => setFilters(p => ({ ...p, offset: Math.max(0, p.offset - 100) }))}
                                className="px-4 py-1.5 border border-slate-300 rounded bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
                            >
                                Prev
                            </button>
                            <button
                                disabled={logs.length < 100}
                                onClick={() => setFilters(p => ({ ...p, offset: p.offset + 100 }))}
                                className="px-4 py-1.5 border border-slate-300 rounded bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </footer>
                </section>
            </div>
        </div>
    );
}