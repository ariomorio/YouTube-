export enum InputMode {
  VIDEO_URLS = 'VIDEO_URLS',
  CHANNEL_URL = 'CHANNEL_URL',
  DIRECT_GENERATOR = 'DIRECT_GENERATOR',
}

export interface VideoData {
  id: string;
  url: string;
  title?: string;
  thumbnailUrl: string;
  selected: boolean;
}

export interface ProcessingStatus {
  message: string;
  type: 'idle' | 'loading' | 'success' | 'error';
}