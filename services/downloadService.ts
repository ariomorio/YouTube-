import JSZip from 'jszip';
import { VideoData } from '../types';

// Helper to download a blob without external dependencies
const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadSingleImage = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    saveBlob(blob, filename);
  } catch (error) {
    console.error('Download failed', error);
    // Fallback: Open in new tab if fetch fails due to CORS
    window.open(url, '_blank');
  }
};

export const downloadAllAsZip = async (videos: VideoData[]) => {
  const zip = new JSZip();
  const folder = zip.folder("thumbnails");
  
  if (!folder) return;

  const promises = videos.filter(v => v.selected).map(async (video) => {
    try {
      // Try fetching the maxresdefault
      let response = await fetch(video.thumbnailUrl);
      
      // If maxres fails (404), try hqdefault
      if (!response.ok) {
         const fallbackUrl = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
         response = await fetch(fallbackUrl);
      }

      if (response.ok) {
        const blob = await response.blob();
        folder.file(`${video.id}.jpg`, blob);
      }
    } catch (err) {
      console.error(`Failed to download thumbnail for ${video.id}`, err);
    }
  });

  await Promise.all(promises);
  
  const content = await zip.generateAsync({ type: "blob" });
  saveBlob(content, "youtube_thumbnails.zip");
};