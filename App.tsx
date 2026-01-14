
import React, { useState, useEffect, useCallback } from 'react';
import { wasteClassifier } from './services/wasteClassifier';
import { ClassificationResult, WasteCategory } from './types';
import Dropzone from './components/Dropzone';
import CameraView from './components/CameraView';

type Mode = 'upload' | 'live';

const App: React.FC = () => {
  const [modelReady, setModelReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('upload');

  useEffect(() => {
    const initModel = async () => {
      try {
        await wasteClassifier.loadModel();
        setModelReady(true);
      } catch (err) {
        setLoadingError("AI System Offline. Check your connection.");
      }
    };
    initModel();
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!modelReady) return;
    setResult(null);
    setPreviewUrl(null);
    setIsProcessing(true);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const classification = await wasteClassifier.classify(file);
      setResult(classification);
    } catch (err) {
      setLoadingError("Analysis failed.");
    } finally {
      setIsProcessing(false);
    }
  }, [modelReady]);

  const handleLiveResult = (newResult: ClassificationResult) => {
    // Only update if confidence is high enough to reduce jitter in UI
    if (newResult.confidence > 0.3) {
      setResult(newResult);
    }
  };

  const getCategoryStyles = (category: WasteCategory) => {
    switch (category) {
      case WasteCategory.ORGANIC: return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50', border: 'border-green-200' };
      case WasteCategory.PLASTIC: return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200' };
      case WasteCategory.PAPER: return { bg: 'bg-sky-500', text: 'text-sky-600', light: 'bg-sky-50', border: 'border-sky-200' };
      case WasteCategory.METAL: return { bg: 'bg-zinc-500', text: 'text-zinc-600', light: 'bg-zinc-50', border: 'border-zinc-200' };
      case WasteCategory.GLASS: return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200' };
      case WasteCategory.E_WASTE: return { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200' };
      default: return { bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50', border: 'border-rose-200' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
      <header className="mb-12 text-center">
        <div className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full shadow-sm border border-slate-100 mb-8">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-emerald-200 shadow-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0V12m3.024-4.5a1.5 1.5 0 013 0v6a1.5 1.5 0 01-3 0v-6zM6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <span className="text-sm font-bold tracking-widest text-emerald-600 uppercase">Version 2.5</span>
        </div>
        <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-4">
          Eco<span className="text-emerald-500 italic">Clear</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-lg mx-auto">
          Intelligent waste sorting with real-time neural vision.
        </p>

        {/* Mode Toggler */}
        <div className="mt-10 flex justify-center">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center shadow-inner">
            <button 
              onClick={() => { setMode('upload'); setResult(null); setPreviewUrl(null); }}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${mode === 'upload' ? 'bg-white text-emerald-600 shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              Photo Upload
            </button>
            <button 
              onClick={() => { setMode('live'); setResult(null); setPreviewUrl(null); }}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${mode === 'live' ? 'bg-white text-emerald-600 shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              Live Scanner
            </button>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-10 items-start">
        {/* Interaction Column */}
        <section className="space-y-6">
          <div className="bg-white/80 glass-effect p-8 rounded-[2rem] shadow-xl border border-white/50">
            {!modelReady && !loadingError ? (
              <div className="py-12 text-center animate-pulse">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-xl font-bold text-slate-800">Booting AI Engine</h3>
              </div>
            ) : mode === 'upload' ? (
              <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
                <Dropzone onFileSelect={handleFileSelect} disabled={isProcessing} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Ready
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mode</p>
                    <p className="text-xs font-semibold text-slate-700">Async Photo</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-left-4 duration-500">
                <CameraView onResult={handleLiveResult} isActive={mode === 'live'} />
              </div>
            )}
          </div>
          
          <div className="px-4">
            <h4 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Supported Streams</h4>
            <div className="flex flex-wrap gap-2">
              {['Plastic', 'Organic', 'Metal', 'Glass', 'Paper', 'E-Waste'].map(t => (
                <span key={t} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600">{t}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Results Column */}
        <section className="sticky top-8">
          {previewUrl || (mode === 'live' && result) ? (
            <div className="space-y-6 animate-in fade-in duration-700">
              {mode === 'upload' && previewUrl && (
                <div className="bg-white p-3 rounded-[2.5rem] shadow-2xl border border-slate-100 relative overflow-hidden group">
                  <img src={previewUrl} className={`w-full aspect-square object-cover rounded-[2rem] transition-all duration-500 ${isProcessing ? 'blur-md opacity-50 scale-110' : ''}`} alt="Analyzing" />
                  {isProcessing && <div className="absolute inset-0 flex items-center justify-center font-black text-slate-800 text-2xl uppercase tracking-tighter">Analyzing...</div>}
                </div>
              )}

              {result && (
                <div className="bg-white/90 glass-effect p-8 rounded-[2.5rem] shadow-2xl border border-white/50 animate-in zoom-in-95 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">
                        {result.category}
                      </h2>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getCategoryStyles(result.category).bg} animate-pulse`}></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confidence {Math.round(result.confidence * 100)}%</span>
                      </div>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getCategoryStyles(result.category).light} ${getCategoryStyles(result.category).text}`}>
                       <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                  </div>

                  <div className={`p-6 rounded-3xl border ${getCategoryStyles(result.category).border} ${getCategoryStyles(result.category).light} mb-6`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${getCategoryStyles(result.category).text}`}>Action Required</h4>
                    <p className="text-slate-800 font-medium leading-relaxed text-sm">
                      {result.disposalInstructions}
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 text-[11px] text-slate-400 px-2 leading-relaxed">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="font-bold uppercase tracking-widest">Neural Label</span>
                      <span className="font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{result.label}</span>
                    </div>
                    <p className="italic">
                      <span className="font-bold not-italic text-slate-900">Vision Insight:</span> {result.reasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[500px] border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 opacity-50 grayscale">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 text-slate-200">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-400 mb-2 uppercase tracking-widest">Vision Standby</h3>
              <p className="text-sm text-slate-300 max-w-[240px] leading-relaxed">System ready for input. Stream video or upload a frame to begin neural analysis.</p>
            </div>
          )}
        </section>
      </div>

      <footer className="mt-20 pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 text-slate-400">
        <div className="flex items-center gap-3">
           <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse-slow"></div>
           <span className="text-xs font-bold tracking-[0.2em] text-slate-900 uppercase">EcoClear Core v2.5</span>
        </div>
        <p className="text-[10px] text-center md:text-right max-w-sm font-medium uppercase tracking-wider leading-loose">
          Privacy First Architecture • 100% Client-Side Inference • Environment Optimized
        </p>
      </footer>
    </div>
  );
};

export default App;
