import React, { useState } from 'react';
import { VideoData } from '../types';
import { Check, Download, ExternalLink, Wand2 } from 'lucide-react';
import { downloadSingleImage } from '../services/downloadService';
import { getFallbackThumbnailUrl, getSdThumbnailUrl } from '../services/youtubeUtils';

interface Props {
  video: VideoData;
  onToggleSelect: (id: string) => void;
  onAnalyze?: (url: string) => void; // Optional prop for analysis
}

const ThumbnailCard: React.FC<Props> = ({ video, onToggleSelect, onAnalyze }) => {
  const [imgSrc, setImgSrc] = useState(video.thumbnailUrl);
  // errorStage: 0 = initial (maxres), 1 = sd, 2 = hq, 3 = failed
  const [errorStage, setErrorStage] = useState(0);

  const handleError = () => {
    if (errorStage === 0) {
        // Fallback to SD
        setErrorStage(1);
        setImgSrc(getSdThumbnailUrl(video.id));
    } else if (errorStage === 1) {
        // Fallback to HQ (Last resort)
        setErrorStage(2);
        setImgSrc(getFallbackThumbnailUrl(video.id));
    } else {
        // Give up? Usually HQ works.
        setErrorStage(3);
    }
  };

  return (
    <div 
      className={`relative group bg-slate-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 border ${video.selected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-700 hover:border-slate-500'}`}
    >
      {/* Image Container */}
      <div className="aspect-video w-full relative overflow-hidden bg-slate-900">
        <img 
          src={imgSrc} 
          alt={video.title || video.id}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={handleError}
        />
        
        {/* Selection Overlay */}
        <div 
          onClick={() => onToggleSelect(video.id)}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center z-10"
        >
          <div className={`rounded-full p-2 ${video.selected ? 'bg-blue-500 text-white' : 'bg-white/20 text-white backdrop-blur-sm'}`}>
             <Check size={24} />
          </div>
        </div>

        {/* Action Badges (Top Right) */}
        <div className="absolute top-2 right-2 flex gap-2 z-20">
            {/* Analysis Button */}
            {onAnalyze && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAnalyze(imgSrc);
                    }}
                    className="p-1.5 bg-indigo-600/80 hover:bg-indigo-600 rounded-lg text-white backdrop-blur-md transition-colors shadow-sm"
                    title="Geminiで分析"
                >
                    <Wand2 size={14} />
                </button>
            )}

            <a 
                href={video.url} 
                target="_blank" 
                rel="noreferrer"
                className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white backdrop-blur-md transition-colors"
                title="YouTubeで見る"
                onClick={(e) => e.stopPropagation()}
            >
                <ExternalLink size={14} />
            </a>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
            <div>
                <p className="text-xs font-mono text-blue-400 mb-0.5">ID: {video.id}</p>
                <p className="text-sm text-slate-300 font-medium truncate w-full" title={video.title}>
                  {video.title || 'タイトル不明'}
                </p>
            </div>
        </div>

        <button
            onClick={() => downloadSingleImage(imgSrc, `${video.id}.jpg`)}
            className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
        >
            <Download size={14} />
            ダウンロード
        </button>
      </div>
    </div>
  );
};

export default ThumbnailCard;