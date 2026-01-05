import { VideoData } from '../types';

export const extractVideoId = (url: string): string | null => {
  // Regex to capture video ID from various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const getThumbnailUrl = (videoId: string): string => {
  // Max resolution
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

export const getSdThumbnailUrl = (videoId: string): string => {
  // Standard definition (640x480), better fallback than hqdefault if maxres fails
  return `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
};

export const getFallbackThumbnailUrl = (videoId: string): string => {
  // High quality (480x360), always available
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

export const parseVideoInput = (text: string): VideoData[] => {
  const lines = text.split(/[\n\s,]+/);
  const uniqueIds = new Set<string>();
  const results: VideoData[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    const id = extractVideoId(trimmed);
    if (id && !uniqueIds.has(id)) {
      uniqueIds.add(id);
      results.push({
        id,
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnailUrl: getThumbnailUrl(id),
        selected: true,
        title: `Video ${id}` // Placeholder title
      });
    }
  });

  return results;
};