"use client";

interface DashboardHeaderProps {
    onSearch: (term: string) => void;
    onRefresh: () => void;
    showHeatmap: boolean;
    onToggleHeatmap: () => void;
    showRoute: boolean;
    onToggleRoute: () => void;
}

export default function DashboardHeader({ onSearch, onRefresh, showHeatmap, onToggleHeatmap, showRoute, onToggleRoute }: DashboardHeaderProps) {
    return (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Thief Tracker</h1>
                <p className="text-slate-500 text-sm">I'm tracking the thief</p>
            </div>

            <div className="flex flex-wrap gap-3">
                <select
                    className="px-4 py-2 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px] bg-white text-slate-700 cursor-pointer"
                    onChange={(e) => onSearch(e.target.value)}
                    defaultValue=""
                >
                    <option value="">All Devices</option>
                    <option value="CASE">Case</option>
                    <option value="LEFT">Left AirPod</option>
                    <option value="RIGHT">Right AirPod</option>
                </select>
                <button
                    onClick={onToggleHeatmap}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm border ${showHeatmap ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                >
                    {showHeatmap ? "Heatmap On" : "Heatmap Off"}
                </button>
                <button
                    onClick={onToggleRoute}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm border ${showRoute ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                >
                    {showRoute ? "Route On" : "Route Off"}
                </button>
                <button
                    onClick={onRefresh}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                    Refresh
                </button>
            </div>
        </header>
    );
}
