export interface ListenerCounts {
  total: number;
  unique?: number;
  current?: number;
}

export interface NowPlayingResponse {
  title: string;
  artist: string;
  listeners?: number | ListenerCounts;
}

export interface HistoryItem {
  title: string;
  artist: string;
  time: string;
  videoId?: string;
}
