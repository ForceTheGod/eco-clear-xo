
import React, { useRef, useEffect, useState } from 'react';
import { wasteClassifier } from '../services/wasteClassifier';
import { ClassificationResult } from '../types';

interface CameraViewProps {
  onResult: (result: ClassificationResult) => void;
  isActive: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({ onResult, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  // Fix: Added null as initial value to satisfy TypeScript requirement for 1 argument in useRef
  const requestRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      setError("Camera access denied. Please enable camera permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    if (requestRef.current) {
      // Clear scheduled tasks to prevent memory leaks and unexpected UI updates
      cancelAnimationFrame(requestRef.current);
      clearTimeout(requestRef.current);
    }
  };

  const processFrame = async () => {
    if (videoRef.current && isActive && isStreaming) {
      try {
        const result = await wasteClassifier.classifyElement(videoRef.current);
        onResult(result);
      } catch (e) {
        // Silent fail for individual frames to maintain a smooth UI experience
      }
    }
    
    // Throttle to 3 seconds to optimize for Gemini API rate limits
    const scheduleNext = () => {
      if (isActive && isStreaming) {
        processFrame();
      }
    };
    
    // Using a scheduled task to loop the frame analysis
    requestRef.current = window.setTimeout(() => {
      requestRef.current = requestAnimationFrame(scheduleNext);
    }, 3000) as unknown as number;
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isActive]);

  useEffect(() => {
    if (isStreaming && isActive) {
      processFrame();
    }
  }, [isStreaming, isActive]);

  if (error) {
    return (
      <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 text-center">
        <p className="text-rose-600 font-bold mb-2">Camera Error</p>
        <p className="text-sm text-rose-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border border-slate-200 group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]"
      />
      
      {/* Scanning HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-10 border-2 border-emerald-500/30 rounded-3xl">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>
        </div>
        
        {/* Scanning Line Animation */}
        <div className="absolute left-0 right-0 h-0.5 bg-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.5)] animate-[scan_3s_linear_infinite]"></div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>

      {!isStreaming && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        </div>
      )}
      
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-center">
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Real-time Neural Scanner Active</span>
        </div>
      </div>
    </div>
  );
};

export default CameraView;
