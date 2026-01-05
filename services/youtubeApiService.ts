import { VideoData } from '../types';

const API_KEY = 'AIzaSyB9As2v-rU17XyDExfeSi8ox5FtTOm1H4A'; // Provided by user
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const fetchVideosFromChannel = async (channelInput: string): Promise<VideoData[]> => {
  let channelId = '';
  const input = channelInput.trim();

  // 1. Resolve Channel ID
  // Check if input is already a Channel ID (UC...)
  const ucMatch = input.match(/(?:channel\/)?(UC[\w-]{22})/);
  
  if (ucMatch) {
     channelId = ucMatch[1];
  } else {
      // It's a handle, username, or custom URL. We use the Search API to resolve it.
      let query = input;
      
      // Clean up URL to get the search term (handle or name)
      if (query.includes('youtube.com/') || query.includes('youtu.be/')) {
          const parts = query.split('/').filter(p => p.length > 0);
          query = parts[parts.length - 1]; // Last part is usually the handle/name
      }

      // If it's a handle, ensure it's passed correctly
      if (!query) throw new Error('Invalid channel URL');

      const searchUrl = `${BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${API_KEY}`;
      const searchRes = await fetch(searchUrl);
      
      if (!searchRes.ok) {
          const err = await searchRes.json();
          throw new Error(err.error?.message || `YouTube Search API Error: ${searchRes.status}`);
      }
      
      const searchData = await searchRes.json();
      
      if (!searchData.items || searchData.items.length === 0) {
          throw new Error('Channel not found on YouTube. Please check the URL.');
      }
      
      channelId = searchData.items[0].snippet.channelId;
  }

  // 2. Get Channel Details (to find Uploads Playlist ID)
  const channelDetailsUrl = `${BASE_URL}/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`;
  const cdRes = await fetch(channelDetailsUrl);
  
  if (!cdRes.ok) {
      throw new Error('Failed to retrieve channel details.');
  }
  
  const cdData = await cdRes.json();
  
  if (!cdData.items || cdData.items.length === 0) {
      throw new Error('Channel details not found.');
  }
  
  const uploadsPlaylistId = cdData.items[0].contentDetails.relatedPlaylists.uploads;

  // 3. Get Videos from Uploads Playlist
  const playlistUrl = `${BASE_URL}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${API_KEY}`;
  const plRes = await fetch(playlistUrl);
  
  if (!plRes.ok) {
      throw new Error('Failed to retrieve video list.');
  }
  
  const plData = await plRes.json();
  
  if (!plData.items) return [];

  return plData.items.map((item: any) => {
      const snippet = item.snippet;
      const thumbnails = snippet.thumbnails || {};
      
      // Select best available thumbnail
      const thumbUrl = thumbnails.maxres?.url || 
                       thumbnails.standard?.url || 
                       thumbnails.high?.url || 
                       thumbnails.medium?.url || 
                       thumbnails.default?.url || 
                       "";

      return {
          id: snippet.resourceId.videoId,
          url: `https://www.youtube.com/watch?v=${snippet.resourceId.videoId}`,
          title: snippet.title,
          thumbnailUrl: thumbUrl,
          selected: true
      };
  });
};