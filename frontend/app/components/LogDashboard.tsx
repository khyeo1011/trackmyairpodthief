"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePollLogs } from "@/hooks/usePollLogs";
import DashboardHeader from "./DashboardHeader";
import LogTable from "./LogTable";
import Pagination from "./Pagination";


// 1. Dynamic Map Import (Prevents SSR Errors)
const LogMap = dynamic(() => import("./LogMap"), {
    ssr: false,
    loading: () => (
        <div className="h-[600px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center border border-slate-200">
            <span className="text-slate-400 font-medium">Initializing Map Engine...</span>
        </div>
    )
});

export default function LogDashboard() {
    const { 
        logs, 
        loading, 
        error, 
        filters, 
        loadData, 
        handleSearch, 
        handlePageChange 
    } = usePollLogs();

    const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
    const [showRoute, setShowRoute] = useState<boolean>(false);

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header & Controls */}
                <DashboardHeader 
                    onSearch={handleSearch} 
                    onRefresh={loadData} 
                    showHeatmap={showHeatmap}
                    onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
                    showRoute={showRoute}
                    onToggleRoute={() => setShowRoute(!showRoute)}
                />

                {/* Map Section */}
                <section className="h-[600px] w-full relative rounded-xl border border-slate-200 shadow-sm overflow-hidden z-0">
                    <LogMap logs={logs} showHeatmap={showHeatmap} showRoute={showRoute} />
                </section>

                {/* Data Table Section */}
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {error && (
                        <div className="p-4 bg-red-50 border-b border-red-100 text-red-600 text-sm font-medium">
                            Error: {error}
                        </div>
                    )}

                    <LogTable logs={logs} loading={loading} />

                    <Pagination 
                        offset={filters.offset} 
                        limit={filters.limit? filters.limit : 100} 
                        resultCount={logs.length} 
                        onPageChange={handlePageChange} 
                    />
                </section>
            </div>
        </div>
    );
}