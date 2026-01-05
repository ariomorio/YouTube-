import React, { useState, useCallback } from 'react';
import { InputMode, ProcessingStatus, VideoData } from './types';
import { parseVideoInput } from './services/youtubeUtils';
import { fetchVideosFromChannel } from './services/youtubeApiService';
import { analyzeThumbnail } from './services/geminiService';
import { downloadAllAsZip } from './services/downloadService';
import ThumbnailCard from './components/ThumbnailCard';
import AnalysisModal from './components/AnalysisModal';
import { 
  Youtube, 
  Link as LinkIcon, 
  Search, 
  Download, 
  Loader2, 
  Trash2, 
  CheckSquare, 
  Square,
  Wand2
} from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<InputMode>(InputMode.VIDEO_URLS);
  const [textInput, setTextInput] = useState('');
  const [channelInput, setChannelInput] = useState('');
  // New state for Direct Generator prompt
  const [directPromptInput, setDirectPromptInput] = useState('');
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({ message: '', type: 'idle' });

  // Analysis State
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // Add initial tab state control
  const [modalInitialTab, setModalInitialTab] = useState<'analysis' | 'generate'>('analysis');

  // Mode Switching
  const handleModeSwitch = (newMode: InputMode) => {
    setMode(newMode);
    setStatus({ message: '', type: 'idle' });
  };

  // Process Inputs
  const handleProcess = async () => {
    setVideos([]);
    setStatus({ message: '処理中...', type: 'loading' });

    try {
      if (mode === InputMode.VIDEO_URLS) {
        if (!textInput.trim()) {
          setStatus({ message: 'URLを1つ以上入力してください。', type: 'error' });
          return;
        }
        const results = parseVideoInput(textInput);
        if (results.length === 0) {
           setStatus({ message: '有効なYouTube IDが見つかりませんでした。', type: 'error' });
        } else {
           setVideos(results);
           setStatus({ message: `${results.length} 件のサムネイルが見つかりました。`, type: 'success' });
        }
      } else if (mode === InputMode.CHANNEL_URL) {
        // Channel Mode
        if (!channelInput.trim()) {
           setStatus({ message: '有効なチャンネルURLを入力してください。', type: 'error' });
           return;
        }
        setStatus({ message: 'YouTubeから動画情報を取得中...', type: 'loading' });
        
        try {
            const results = await fetchVideosFromChannel(channelInput);
            if (results.length === 0) {
                setStatus({ message: 'このチャンネルには動画が見つかりませんでした。', type: 'error' });
            } else {
                setVideos(results);
                setStatus({ message: `最新の動画 ${results.length} 件を取得しました。`, type: 'success' });
            }
        } catch (err: any) {
            console.error(err);
            setStatus({ message: err.message || 'チャンネル情報の取得に失敗しました。', type: 'error' });
        }
      }
    } catch (e) {
      console.error(e);
      setStatus({ message: '予期せぬエラーが発生しました。', type: 'error' });
    }
  };

  // Open Direct Generator
  const handleOpenDirectGenerator = () => {
      setAnalysisResult(directPromptInput);
      setAnalysisError(null);
      setIsAnalyzing(false);
      setModalInitialTab('generate');
      setIsAnalysisOpen(true);
  };

  // Analysis Handler
  const handleAnalyze = async (thumbnailUrl: string) => {
    setModalInitialTab('analysis'); // Default for analysis flow
    setIsAnalysisOpen(true);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);

    try {
      const result = await analyzeThumbnail(thumbnailUrl);
      setAnalysisResult(result);
    } catch (error: any) {
      console.error(error);
      setAnalysisError(error.message || "サムネイルの分析中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Selection Logic
  const handleToggleSelect = useCallback((id: string) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, selected: !v.selected } : v));
  }, []);

  const handleSelectAll = () => {
    const allSelected = videos.every(v => v.selected);
    setVideos(prev => prev.map(v => ({ ...v, selected: !allSelected })));
  };

  const handleClear = () => {
    setVideos([]);
    setTextInput('');
    setChannelInput('');
    setDirectPromptInput('');
    setStatus({ message: '', type: 'idle' });
  };

  const handleDownloadZip = async () => {
    const selectedCount = videos.filter(v => v.selected).length;
    if (selectedCount === 0) return;
    
    setStatus({ message: '圧縮してダウンロード中...', type: 'loading' });
    await downloadAllAsZip(videos);
    setStatus({ message: 'ダウンロードを開始しました！', type: 'success' });
  };

  const selectedCount = videos.filter(v => v.selected).length;

  return (
    <div className="min-h-screen pb-32 bg-slate-900 text-slate-100 flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full bg-slate-800/50 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-50">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-500/20 shrink-0">
              <Youtube className="text-white" size={24} />
            </div>
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent truncate">
              YouTubeサムネイルメーカー
            </h1>
          </div>
          <div className="text-xs text-slate-500 font-mono hidden sm:block shrink-0 ml-4">
            Powered by Tanopapap
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1600px] mx-auto px-4 md:px-8 mt-8 flex-1">
        
        {/* Input Section - Expanded to full width of the container */}
        <div className="w-full bg-slate-800 rounded-2xl p-4 md:p-6 shadow-xl border border-slate-700 mb-8">
          
          {/* Tabs */}
          <div className="flex p-1 bg-slate-900/50 rounded-xl mb-6">
            <button
              onClick={() => handleModeSwitch(InputMode.VIDEO_URLS)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === InputMode.VIDEO_URLS 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="動画リンク"
            >
              <LinkIcon size={20} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">動画リンク</span>
            </button>
            <button
              onClick={() => handleModeSwitch(InputMode.CHANNEL_URL)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === InputMode.CHANNEL_URL 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="チャンネル検索"
            >
              <Search size={20} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">チャンネル検索</span>
            </button>
             <button
              onClick={() => handleModeSwitch(InputMode.DIRECT_GENERATOR)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === InputMode.DIRECT_GENERATOR 
                  ? 'bg-slate-700 text-white shadow-sm ring-1 ring-purple-500/50' 
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800'
              }`}
              title="画像生成"
            >
              <Wand2 size={20} className={`sm:w-4 sm:h-4 ${mode === InputMode.DIRECT_GENERATOR ? 'text-purple-400' : ''}`} />
              <span className="hidden sm:inline">画像生成</span>
            </button>
          </div>

          {/* Inputs */}
          <div className="mb-6">
            {mode === InputMode.VIDEO_URLS && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">動画リンクを貼り付け（1行に1つ）</label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=...\nhttps://youtu.be/..."
                  className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-slate-600"
                />
              </div>
            )}
            
            {mode === InputMode.CHANNEL_URL && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">チャンネルのリンク</label>
                <input
                  type="text"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  placeholder="https://www.youtube.com/@ChannelName"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                />
                <p className="text-xs text-slate-500 mt-2">
                  * 公式APIを使用して、チャンネルの最新動画50件を取得します。
                </p>
              </div>
            )}

            {mode === InputMode.DIRECT_GENERATOR && (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-purple-400 ml-1 flex items-center gap-2">
                        スタイルレシピ（プロンプト）
                    </label>
                    <textarea
                        value={directPromptInput}
                        onChange={(e) => setDirectPromptInput(e.target.value)}
                        placeholder="以前コピーしたスタイルレシピをここに貼り付けると、分析をスキップできます..."
                        className="w-full h-48 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-slate-600 font-mono"
                    />
                     <p className="text-xs text-slate-500 mt-2">
                        * 分析結果からコピーしたレシピを貼り付けて使用してください。
                    </p>
                </div>
            )}
          </div>

          {/* Action Area */}
          <div className="flex flex-col gap-4">
             {/* Progress Bar */}
             {status.type === 'loading' && (
                <div className="w-full h-1 bg-slate-900/50 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 animate-indeterminate rounded-full"></div>
                </div>
             )}

             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className={`text-sm flex items-center gap-2 ${
                    status.type === 'error' ? 'text-red-400' : 
                    status.type === 'success' ? 'text-green-400' : 
                    'text-slate-400'
                }`}>
                  {status.type === 'loading' && <Loader2 className="animate-spin" size={16} />}
                  {status.message}
                </div>
                
                <div className="flex gap-3 w-full sm:w-auto justify-end">
                  {(videos.length > 0 || textInput || channelInput || directPromptInput) && (
                    <button 
                      onClick={handleClear}
                      className="px-4 py-2.5 rounded-xl text-slate-400 hover:bg-slate-700/50 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <Trash2 size={16} />
                      クリア
                    </button>
                  )}
                  
                  {mode === InputMode.DIRECT_GENERATOR ? (
                     <button
                        onClick={handleOpenDirectGenerator}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-purple-500/25 transition-all flex items-center gap-2 font-semibold text-sm transform active:scale-95"
                    >
                        <Wand2 size={16} />
                        スタジオを開く
                    </button>
                  ) : (
                    <button
                        onClick={handleProcess}
                        disabled={status.type === 'loading'}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 font-semibold text-sm transform active:scale-95"
                    >
                        {status.type === 'loading' ? '処理中...' : 'サムネイル取得'}
                    </button>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* Results Grid - Responsive Columns up to 5 */}
        {videos.length > 0 && mode !== InputMode.DIRECT_GENERATOR && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-lg font-semibold text-slate-200">検索結果 ({videos.length}件)</h2>
              <button 
                onClick={handleSelectAll}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5 font-medium"
              >
                {videos.every(v => v.selected) ? <CheckSquare size={16} /> : <Square size={16} />}
                {videos.every(v => v.selected) ? '選択解除' : 'すべて選択'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {videos.map((video) => (
                <ThumbnailCard 
                  key={video.id} 
                  video={video} 
                  onToggleSelect={handleToggleSelect} 
                  onAnalyze={handleAnalyze}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      {selectedCount > 0 && mode !== InputMode.DIRECT_GENERATOR && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-slate-800/90 backdrop-blur-xl border border-slate-600 rounded-2xl p-4 shadow-2xl flex items-center justify-between z-40 animate-slide-up">
          <div className="pl-2">
             <div className="text-sm font-semibold text-white">{selectedCount} 件 選択中</div>
             <div className="text-xs text-slate-400">ダウンロード準備完了</div>
          </div>
          <button
            onClick={handleDownloadZip}
            className="px-6 py-3 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-colors transform active:scale-95"
          >
            <Download size={18} />
            ZIPでダウンロード
          </button>
        </div>
      )}

      {/* Analysis Modal */}
      <AnalysisModal 
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        isLoading={isAnalyzing}
        result={analysisResult}
        error={analysisError}
        initialTab={modalInitialTab}
      />

    </div>
  );
};

export default App;