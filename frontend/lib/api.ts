// lib/api.ts
import { FetchLogsParams,ApiResponse } from "./types";


const API_BASE = process.env.BACKEND_HOST;

export async function fetchPollLogs({
  start,
  end,
  limit = 100,
  offset = 0,
}: FetchLogsParams): Promise<ApiResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (start) params.append("start", start);
  if (end) params.append("end", end);

  const response = await fetch(`${API_BASE}/poll-logs?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}