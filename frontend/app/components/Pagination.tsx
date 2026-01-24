"use client";

interface PaginationProps {
    offset: number;
    limit: number;
    resultCount: number;
    onPageChange: (newOffset: number) => void;
}

export default function Pagination({ offset, limit, resultCount, onPageChange }: PaginationProps) {
    return (
        <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">
                Showing {resultCount} results (Offset: {offset})
            </p>
            <div className="flex gap-2">
                <button
                    disabled={offset === 0}
                    onClick={() => onPageChange(Math.max(0, offset - limit))}
                    className="px-4 py-1.5 border border-slate-300 rounded bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
                >
                    Prev
                </button>
                <button
                    disabled={resultCount < limit}
                    onClick={() => onPageChange(offset + limit)}
                    className="px-4 py-1.5 border border-slate-300 rounded bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </footer>
    );
}
