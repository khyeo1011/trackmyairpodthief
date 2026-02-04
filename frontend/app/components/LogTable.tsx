"use client";

import { useState } from "react";
import { PollLog } from "@/lib/types";
import BatteryStatus from "./BatteryStatus";

interface LogTableProps {
    logs: PollLog[];
    loading: boolean;
    selectedLog: PollLog | null;
    onLogClick: (log: PollLog) => void;
}

export default function LogTable({ logs, loading, selectedLog, onLogClick }: LogTableProps) {
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const sortedLogs = [...logs].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Device ID</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Battery Health</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Coordinates</th>
                        <th 
                            className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        >
                            <div className="flex items-center gap-1">
                                Timestamp
                                <span className={`text-slate-400 text-[10px] transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                            </div>
                        </th>
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
                        sortedLogs.map((log, i) => (
                            <tr 
                                key={`${log.part_name}-${i}`} 
                                className={`transition-colors cursor-pointer ${
                                    selectedLog === log 
                                        ? "bg-indigo-50 hover:bg-indigo-100" 
                                        : "hover:bg-slate-50"
                                }`}
                                onClick={() => onLogClick(log)}
                            >
                                <td className="px-6 py-4 font-semibold text-slate-700">{log.part_name}</td>
                                <td className="px-6 py-4">
                                    <BatteryStatus status={log.battery_status} />
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                    {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                                    {new Date(log.timestamp).toLocaleString(undefined, {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
