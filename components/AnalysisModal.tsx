import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, Check, Loader2, Sparkles, AlertCircle, Image as ImageIcon, Wand2, Upload, Download, Palette, PenLine } from 'lucide-react';
import { generateThumbnail, TitleComposition } from '../services/geminiService';
import { downloadSingleImage } from '../services/downloadService';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  result: string | null;
  error: string | null;
  initialTab?: 'analysis' | 'generate';
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, isLoading, result, error, initialTab = 'analysis' }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'generate'>('analysis');
  const [copied, setCopied] = useState(false);
  
  // Style Recipe State (Editable)
  const [editableRecipe, setEditableRecipe] = useState('');

  // Generation State
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null);
  const [baseImagePreview, setBaseImagePreview] = useState<string | null>(null);
  
  // New State for 4 distinct text segments
  const [titleConfig, setTitleConfig] = useState<TitleComposition>({
    top1: { text: '', color: '#FFFF00' },     // Default Yellow
    top2: { text: '', color: '#FFFFFF' },     // Default White
    bottom1: { text: '', color: '#FFFFFF' },  // Default White
    bottom2: { text: '', color: '#FF0000' }   // Default Red
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync props to state when modal opens
  useEffect(() => {
    if (isOpen) {
        setActiveTab(initialTab);
        setEditableRecipe(result || '');
        // Reset generation state if opening new session (unless we want persistence, but for now reset is safer)
        if (!result) { 
            // If direct mode (no result passed), keep defaults
        }
    }
  }, [isOpen, result, initialTab]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (editableRecipe) {
      navigator.clipboard.writeText(editableRecipe);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBaseImageFile(file);
      setBaseImagePreview(URL.createObjectURL(file));
      setGeneratedImage(null); // Reset previous result
    }
  };

  const handleConfigChange = (section: keyof TitleComposition, field: 'text' | 'color', value: string) => {
    setTitleConfig(prev => ({
        ...prev,
        [section]: {
            ...prev[section],
            [field]: value
        }
    }));
  };

  const checkAndSelectApiKey = async () => {
     // @ts-ignore - aistudio injected by environment
     if (window.aistudio && window.aistudio.hasSelectedApiKey && window.aistudio.openSelectKey) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            // @ts-ignore
            await window.aistudio.openSelectKey();
            // Assume success after dialog interaction per instructions
            return true; 
        }
        return true;
     }
     return true; 
  };

  const handleGenerate = async () => {
    if (!baseImageFile || !editableRecipe) return;
    
    // Check if at least one text field is filled
    const hasText = Object.values(titleConfig).some(seg => seg.text.trim().length > 0);
    if (!hasText) return;

    // 1. API Key Check for Paid Models
    try {
        await checkAndSelectApiKey();
    } catch (e) {
        console.warn("API Key selection dialog failed or cancelled", e);
    }

    setIsGenerating(true);
    setGenError(null);

    try {
        // Convert file to base64
        const reader = new FileReader();
        reader.readAsDataURL(baseImageFile);
        
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            try {
                // Use the editableRecipe instead of the prop result
                const imgData = await generateThumbnail(base64String, editableRecipe, titleConfig);
                setGeneratedImage(`data:image/jpeg;base64,${imgData}`);
            } catch (err: any) {
                console.error(err);
                if (err.message.includes('Requested entity was not found')) {
                    setGenError("API Key Error: キーを再選択してください。");
                } else {
                    setGenError(err.message || "画像の生成に失敗しました。");
                }
            } finally {
                setIsGenerating(false);
            }
        };
        
        reader.onerror = () => {
            setGenError("ファイルの読み込みに失敗しました。");
            setIsGenerating(false);
        };

    } catch (e: any) {
        setGenError(e.message);
        setIsGenerating(false);
    }
  };

  const triggerApiKeySelection = async () => {
     // @ts-ignore
     if (window.aistudio && window.aistudio.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
     }
  };

  // Helper component for a single input group
  const InputGroup = ({ 
    label, 
    id, 
    placeholder 
  }: { 
    label: string, 
    id: keyof TitleComposition, 
    placeholder: string 
  }) => (
    <div className="flex items-center gap-2">
        <div className="flex-1 relative">
            <input 
                type="text"
                value={titleConfig[id].text}
                onChange={(e) => handleConfigChange(id, 'text', e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 text-sm focus:ring-2 focus:ring-purple-500 outline-none placeholder:text-slate-600"
            />
        </div>
        <div className="relative group">
            <input 
                type="color"
                value={titleConfig[id].color}
                onChange={(e) => handleConfigChange(id, 'color', e.target.value)}
                className="w-9 h-9 p-0.5 rounded bg-slate-700 border border-slate-600 cursor-pointer"
            />
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2 text-blue-400">
            <Sparkles size={20} />
            <h3 className="font-semibold text-slate-100">サムネイルスタジオ</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        {/* We show tabs if we are not loading AND not in error. Even if 'result' prop is null, we might be in Direct Mode. */}
        {!isLoading && !error && (
            <div className="flex border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'analysis' ? 'bg-slate-700 text-white border-b-2 border-blue-500' : 'text-slate-400 hover:bg-slate-700/50'
                    }`}
                >
                    分析結果 / レシピ
                </button>
                <button
                    onClick={() => setActiveTab('generate')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        activeTab === 'generate' ? 'bg-slate-700 text-white border-b-2 border-purple-500' : 'text-slate-400 hover:bg-slate-700/50'
                    }`}
                >
                    <Wand2 size={14} />
                    サムネイル作成
                </button>
            </div>
        )}

        {/* Content */}
        <div className="p-0 overflow-y-auto flex-1 bg-slate-900/30">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-4">
              <Loader2 className="animate-spin text-blue-500" size={48} />
              <p className="animate-pulse">サムネイルの構成を分析中...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="p-3 bg-red-500/10 rounded-full mb-3">
                 <AlertCircle className="text-red-500" size={32} />
              </div>
              <h4 className="text-red-400 font-semibold mb-2">分析に失敗しました</h4>
              <p className="text-slate-400 text-sm max-w-sm mb-4">{error}</p>
            </div>
          ) : (
            <>
                {/* Analysis/Recipe Tab */}
                {activeTab === 'analysis' && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between text-slate-400 text-sm">
                            <span className="flex items-center gap-2"><PenLine size={14}/> スタイルレシピ（編集可能）</span>
                        </div>
                        <textarea
                            value={editableRecipe}
                            onChange={(e) => setEditableRecipe(e.target.value)}
                            className="w-full h-96 p-4 bg-slate-900 rounded-xl border border-slate-700 text-slate-300 text-sm leading-relaxed font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="ここにスタイルレシピを貼り付け..."
                        />
                        <div className="flex justify-end pt-2">
                             <button
                                onClick={handleCopy}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all flex items-center gap-2 text-sm font-semibold active:scale-95"
                                >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'コピー完了！' : 'レシピをコピー'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Generate Tab */}
                {activeTab === 'generate' && (
                    <div className="p-6 space-y-6">
                         {/* 1. Upload Base Image */}
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <ImageIcon size={16} /> 背景画像（ベース）
                            </label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-800/50"
                            >
                                {baseImagePreview ? (
                                    <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
                                        <img src={baseImagePreview} alt="Base" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-white text-sm font-medium">変更する</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-500">
                                        <Upload size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">クリックして画像をアップロード</p>
                                    </div>
                                )}
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleFileChange}
                                />
                            </div>
                         </div>

                         {/* 2. Title Composition Input */}
                         <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                             <div className="flex items-center gap-2 mb-2">
                                <Palette size={16} className="text-slate-400" />
                                <h4 className="text-sm font-medium text-slate-300">タイトルの構成</h4>
                             </div>
                             
                             {/* Upper Line */}
                             <div className="space-y-2">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">上段</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputGroup label="Part 1" id="top1" placeholder="例: 衝撃の" />
                                    <InputGroup label="Part 2" id="top2" placeholder="例: 結末！" />
                                </div>
                             </div>

                             {/* Divider */}
                             <div className="border-t border-slate-700/50"></div>

                             {/* Lower Line */}
                             <div className="space-y-2">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">下段</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputGroup label="Part 1" id="bottom1" placeholder="例: まさかの" />
                                    <InputGroup label="Part 2" id="bottom2" placeholder="例: 展開に" />
                                </div>
                             </div>
                         </div>
                         
                         {/* API Key Info */}
                         <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-3">
                             <p className="text-xs text-blue-300">
                                 注意: <strong>gemini-3-pro-image-preview</strong>を使用するため、有料のAPIキーが必要です。
                             </p>
                         </div>

                         {/* Error Display */}
                         {genError && (
                             <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-center gap-3">
                                 <AlertCircle className="text-red-400 shrink-0" size={18} />
                                 <div className="flex-1">
                                     <p className="text-sm text-red-300">{genError}</p>
                                     {genError.includes("API Key") && (
                                         <button 
                                            onClick={triggerApiKeySelection}
                                            className="text-xs text-white underline mt-1"
                                         >
                                             キーを再選択
                                         </button>
                                     )}
                                 </div>
                             </div>
                         )}

                         {/* Result */}
                         {generatedImage && (
                             <div className="space-y-2 animate-fade-in-up">
                                 <label className="text-sm font-medium text-green-400 flex items-center gap-2">
                                     <Sparkles size={16} /> 生成結果
                                 </label>
                                 <div className="rounded-xl overflow-hidden border border-slate-600 shadow-2xl">
                                     <img src={generatedImage} alt="Generated" className="w-full h-auto" />
                                 </div>
                                 <button
                                     onClick={() => downloadSingleImage(generatedImage!, `generated_thumb_${Date.now()}.jpg`)}
                                     className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-lg"
                                 >
                                     <Download size={16} /> 画像を保存
                                 </button>
                             </div>
                         )}

                         {/* Action Button */}
                         <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !baseImageFile || !editableRecipe}
                            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                                isGenerating || !baseImageFile || !editableRecipe
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95'
                            }`}
                         >
                             {isGenerating ? (
                                 <>
                                    <Loader2 className="animate-spin" size={20} />
                                    生成中...
                                 </>
                             ) : (
                                 <>
                                    <Wand2 size={20} />
                                    サムネイル生成
                                 </>
                             )}
                         </button>
                    </div>
                )}
            </>
          )}
        </div>

        {/* Footer (Close Only) */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              閉じる
            </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;