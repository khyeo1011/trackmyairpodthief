"use client";

interface DashboardHeaderProps {
    onSearch: (term: string) => void;
    onRefresh: () => void;
}

export default function DashboardHeader({ onSearch, onRefresh }: DashboardHeaderProps) {
    return (
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
                    onChange={(e) => onSearch(e.target.value)}
                />
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
