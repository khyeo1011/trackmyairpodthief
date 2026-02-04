export interface PollLog {
  part_name: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  battery_status: string;
}

export interface ApiResponse {
  status: string;
  count: number;
  data: PollLog[];
}

export interface FetchLogsParams {
  start?: string;
  end?: string;
  part?: string; 
  limit?: number;
  offset?: number;
}