import { useState, useEffect, useCallback } from "react";
import { PollLog, FetchLogsParams } from "@/lib/types";
import { fetchPollLogs } from "@/lib/api";

export function usePollLogs() {
    const [logs, setLogs] = useState<PollLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<FetchLogsParams & { offset: number }>({
        part: "",
        limit: 100,
        offset: 0
    });

    const loadData = useCallback(async () => {
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
    }, [filters]);

    // Trigger load on filter/pagination change
    useEffect(() => {
        const timer = setTimeout(loadData, 300); // Debounce typing
        return () => clearTimeout(timer);
    }, [loadData]);

    const handleSearch = (term: string) => {
        setFilters(prev => ({ ...prev, part: term, offset: 0 }));
    };

    const handlePageChange = (newOffset: number) => {
        setFilters(prev => ({ ...prev, offset: newOffset }));
    };

    return {
        logs,
        loading,
        error,
        filters,
        loadData,
        handleSearch,
        handlePageChange
    };
}
