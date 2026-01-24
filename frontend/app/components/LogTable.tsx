"use client";

import { PollLog } from "@/lib/types";
import BatteryStatus from "./BatteryStatus";

interface LogTableProps {
    logs: PollLog[];
    loading: boolean;
}

export default function LogTable({ logs, loading }: LogTableProps) {
    return (
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
                        logs.map((log, i) => (
                            <tr key={`${log.part_name}-${i}`} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-slate-700">{log.part_name}</td>
                                <td className="px-6 py-4">
                                    <BatteryStatus status={log.battery_status} />
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                    {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                                    {log.timestamp}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
