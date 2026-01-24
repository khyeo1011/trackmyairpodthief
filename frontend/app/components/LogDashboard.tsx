"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { PollLog, FetchLogsParams } from "@/lib/types";
import { fetchPollLogs } from "@/lib/api";
import DashboardHeader from "./DashboardHeader";
import LogTable from "./LogTable";
import Pagination from "./Pagination";


// 1. Dynamic Map Import (Prevents SSR Errors)
const LogMap = dynamic(() => import("./LogMap"), {
    ssr: false,
    loading: () => (
        <div className="h-[450px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center border border-slate-200">
            <span className="text-slate-400 font-medium">Initializing Map Engine...</span>
        </div>
    )
});

export default function LogDashboard() {
    const [logs, setLogs] = useState<PollLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

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

    const handleSearch = (term: string) => {
        setFilters(prev => ({ ...prev, part: term, offset: 0 }));
    };

    const handlePageChange = (newOffset: number) => {
        setFilters(prev => ({ ...prev, offset: newOffset }));
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header & Controls */}
                <DashboardHeader onSearch={handleSearch} onRefresh={loadData} />

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