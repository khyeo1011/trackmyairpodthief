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
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-800">System Poll Logs</h1>

                <div className="flex items-center gap-4">
                    <div className="flex gap-2 items-center">
                        <label className="text-xs font-bold text-slate-400 uppercase">From</label>
                        <input
                            type="datetime-local"
                            className="border p-2 rounded text-sm text-slate-700"
                            onChange={(e) => handleDateChange(e, 'start')}
                        />
                    </div>
                    <button
                        onClick={() => loadData()}
                        className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </header>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            {!loading && logs.length > 0 && <LogMap logs={logs} />}

            <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Timestamp</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Part Name</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Location</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Battery</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={4} className="p-12 text-center text-slate-400">Loading system data...</td></tr>
                        ) : logs.map((log, i) => (
                            <tr key={`${log.part_name}-${log.timestamp}`} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 text-sm text-slate-500 font-mono">{log.timestamp}</td>
                                <td className="p-4 text-sm font-semibold text-slate-700">{log.part_name}</td>
                                <td className="p-4 text-sm text-slate-600 font-mono">
                                    {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.battery_status.toLowerCase() === 'low'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                        {log.battery_status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <footer className="mt-6 flex items-center justify-between text-sm text-slate-500">
                <div>
                    Showing {filters.offset + 1} - {filters.offset + logs.length}
                </div>
                <div className="flex gap-2">
                    <button
                        disabled={filters.offset === 0 || loading}
                        onClick={() => setFilters(p => ({ ...p, offset: Math.max(0, p.offset - (p.limit || 100)) }))}
                        className="px-4 py-2 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50 transition-all"
                    >
                        Previous
                    </button>
                    <button
                        disabled={logs.length < (filters.limit || 100) || loading}
                        onClick={() => setFilters(p => ({ ...p, offset: p.offset + (p.limit || 100) }))}
                        className="px-4 py-2 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50 transition-all"
                    >
                        Next
                    </button>
                </div>
            </footer>
        </div>
    );
}