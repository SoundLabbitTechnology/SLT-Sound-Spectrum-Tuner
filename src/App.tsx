import React, { useState, useEffect } from 'react';
import { useAudioAnalyzer, PitchData } from './hooks/useAudioAnalyzer';
import { useCamera } from './hooks/useCamera';
import { Visualizer } from './components/Visualizer';
import { TunerDisplay } from './components/TunerDisplay';
import { Mic, MicOff, Camera, Activity, BarChart2, Volume2, TreePine, Eye, Sparkles } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { noteJapaneseStrings } from './lib/audioPitch';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'tuner' | 'ar'>('tuner');
  
  const [noiseThreshold, setNoiseThreshold] = useState(0.01);
  const [micGain, setMicGain] = useState(1.5);
  const { isReady, error: audioError, startAudio, stopAudio, analyser, pitchData } = useAudioAnalyzer(noiseThreshold, micGain);
  const { isCameraReady, cameraError, startCamera, stopCamera, videoRef } = useCamera();
  
  const [mode, setMode] = useState<'spectrum' | 'wave'>('spectrum');
  const [snapshotData, setSnapshotData] = useState<Uint8Array | null>(null);

  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastPitch, setLastPitch] = useState<PitchData | null>(null);

  useEffect(() => {
    if (pitchData) {
      setLastPitch(pitchData);
    }
  }, [pitchData]);

  useEffect(() => {
    if (currentTab === 'ar') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [currentTab, startCamera, stopCamera]);

  const handleToggleAudio = () => {
    if (isReady) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  const askAI = async () => {
    if (!isCameraReady || !videoRef.current) return;
    
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];

      // 直近で鳴った音を使う（ボタンを押す瞬間に音が消えてしまうのを防ぐため）
      const dataToUse = pitchData || lastPitch;
      const noteName = dataToUse ? noteJapaneseStrings[dataToUse.note % 12] : '';
      const currentNote = dataToUse ? `「${noteName}」の音（${dataToUse.pitch.toFixed(1)}Hz / ズレ: ${dataToUse.cents > 0 ? '+' : ''}${dataToUse.cents}セント)` : 'まだ音が鳴っていません';

      const prompt = `いま検知されている音程は ${currentNote} です。画像の被写体（木材や楽器など）を見て、子供向けに優しくアドバイスをしてください。たとえば「これはスギみたいだね！もう少し真ん中を削ると音が下がるよ」など、木育と楽器作りの視点で教えてください。`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
            ]
          }
        ]
      });

      setAiAdvice(response.text || 'アドバイスができなかったよ。もう一度ためしてみてね！');
    } catch (err) {
      console.error(err);
      setAiAdvice('AIせんせいに繋がらなかったみたい…。時間をあけてもう一度ためしてね。');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSnapshot = () => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    if (mode === 'spectrum') {
      analyser.getByteFrequencyData(data);
    } else {
      analyser.getByteTimeDomainData(data);
    }
    setSnapshotData(data);
  };

  const clearSnapshot = () => {
    setSnapshotData(null);
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-amber-200 relative ${currentTab === 'ar' ? 'bg-transparent text-white' : 'bg-stone-50'}`}>
      
      {/* Camera Background */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`fixed inset-0 w-full h-full object-cover -z-10 ${currentTab === 'ar' && isCameraReady ? 'opacity-100' : 'opacity-0 hidden'}`} 
      />
      {currentTab === 'ar' && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10" />}

      {/* Header */}
      <header className={`${currentTab === 'ar' ? 'bg-black/60 backdrop-blur-md border-b border-white/10' : 'bg-white border-b-4 border-amber-800/10 shadow-sm'} px-6 py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 transition-colors gap-4`}>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className={`${currentTab === 'ar' ? 'bg-white/20' : 'bg-amber-600'} p-2 rounded-xl text-white shadow-md transition-colors`}>
            <TreePine size={24} />
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${currentTab === 'ar' ? 'text-white' : 'text-stone-800'}`}>音の見える化チューナー</h1>
            <p className={`text-xs font-medium tracking-wide ${currentTab === 'ar' ? 'text-white/60' : 'text-amber-700'}`}>木と音であそぼう！</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className={`flex p-1 rounded-full ${currentTab === 'ar' ? 'bg-white/10' : 'bg-stone-100'} w-full md:w-auto`}>
          <button
            onClick={() => setCurrentTab('tuner')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-full text-sm font-bold transition-all ${
              currentTab === 'tuner' 
                ? 'bg-amber-500 text-white shadow-md' 
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
            }`}
          >
            チューナー画面
          </button>
          <button
            onClick={() => setCurrentTab('ar')}
            className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2 rounded-full text-sm font-bold transition-all ${
              currentTab === 'ar' 
                ? 'bg-purple-500 text-white shadow-md' 
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
            }`}
          >
            <Sparkles size={14} className="mr-1.5" />
            楽器・AR画面
          </button>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleToggleAudio}
            className={`flex items-center px-4 py-2 rounded-full font-bold transition-all shadow-sm active:scale-95 ${
              isReady 
                ? (currentTab === 'ar' ? 'bg-white/20 text-white border-2 border-white/30 hover:bg-white/30' : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-2 border-amber-300')
                : (currentTab === 'ar' ? 'bg-purple-500 text-white hover:bg-purple-600 border-2 border-purple-500' : 'bg-amber-500 text-white hover:bg-amber-600 border-2 border-amber-600')
            }`}
          >
            {isReady ? <Mic className="w-5 h-5 mr-2" /> : <MicOff className="w-5 h-5 mr-2" />}
            {isReady ? 'マイク・オン' : 'マイクをつなぐ'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        
        {currentTab === 'tuner' ? (
          /* ================= TUNER TAB ================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <TunerDisplay pitchData={pitchData} />
              
              {/* Controls Panel */}
              <div className="bg-white border-amber-50/50 p-6 rounded-3xl shadow-lg border-2">
                <h3 className="text-lg font-bold mb-6 flex items-center text-stone-800">
                  <span className="bg-amber-100 p-1.5 rounded-lg mr-2 text-amber-700"><Volume2 size={18}/></span>
                  コントロール
                </h3>
                
                {/* Visualizer Mode Toggle */}
                <div className="mb-6">
                  <label className="text-sm font-bold block mb-3 text-stone-500">見えかた</label>
                  <div className="flex p-1.5 rounded-xl bg-stone-100">
                    <button
                      onClick={() => setMode('spectrum')}
                      className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${
                        mode === 'spectrum' 
                          ? 'bg-white text-amber-700 shadow-sm'
                          : 'text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      <BarChart2 size={16} className="mr-2" />
                      山のかたち
                    </button>
                    <button
                      onClick={() => setMode('wave')}
                      className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${
                        mode === 'wave' 
                          ? 'bg-white text-amber-700 shadow-sm'
                          : 'text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      <Activity size={16} className="mr-2" />
                      波の形
                    </button>
                  </div>
                </div>

                {/* Mic Gain Slider */}
                <div className="mb-6">
                  <label className="text-sm font-bold flex justify-between mb-3 text-stone-500">
                    <span>マイクの音の大きさ（感度）</span>
                    <span className="text-amber-500">x{micGain.toFixed(1)}</span>
                  </label>
                  <input 
                    type="range" min="0.5" max="5.0" step="0.1"
                    value={micGain} onChange={(e) => setMicGain(parseFloat(e.target.value))}
                    className="w-full h-3 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Noise Gate Slider */}
                <div>
                  <label className="text-sm font-bold flex justify-between mb-3 text-stone-500">
                    <span>まわりの雑音をかきけす</span>
                    <span className="text-amber-500">{Math.round(noiseThreshold * 1000)}</span>
                  </label>
                  <input 
                    type="range" min="0.001" max="0.05" step="0.001"
                    value={noiseThreshold} onChange={(e) => setNoiseThreshold(parseFloat(e.target.value))}
                    className="w-full h-3 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
                
                {/* Snapshot Actions */}
                <div className="mt-8 pt-6 border-t-2 border-stone-100">
                  <label className="text-sm font-bold block mb-3 text-stone-500">音をくらべる</label>
                  <div className="flex gap-2">
                    <button onClick={handleSnapshot} disabled={!isReady} className="flex-1 font-bold py-3 rounded-xl flex items-center justify-center transition-all bg-stone-800 hover:bg-stone-900 text-white disabled:opacity-50 active:scale-95">
                      <Camera size={18} className="mr-2" />のこす
                    </button>
                    {snapshotData && <button onClick={clearSnapshot} className="flex-1 font-bold py-3 rounded-xl flex items-center justify-center transition-all bg-red-50 hover:bg-red-100 text-red-600 active:scale-95">けす</button>}
                  </div>
                </div>
              </div>
              
              {audioError && (
                <div className="p-4 bg-red-100 text-red-800 rounded-xl text-sm font-bold border-2 border-red-200 flex items-start">
                  <span className="text-xl mr-2">⚠️</span>{audioError}
                </div>
              )}
            </div>

            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white border-amber-50/50 shadow-xl p-4 md:p-6 rounded-3xl border-2 flex-1 min-h-[400px] flex flex-col relative h-[600px]">
                {!isReady && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-3xl">
                    <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6 shadow-iner border-4 border-white">
                      <Mic className="w-10 h-10 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-black text-stone-800 mb-2">マイクをつないでね</h2>
                    <p className="text-stone-500 font-medium">上のボタンからマイクをオンにしてみよう！</p>
                  </div>
                )}
                <Visualizer analyser={analyser} mode={mode} snapshotData={snapshotData} transparentMode={false} />
              </div>
            </div>
          </div>
        ) : (
          /* ================= AR TAB ================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              {/* AR Tab: Tuner Display */}
              <div className="scale-90 origin-top">
                <TunerDisplay pitchData={pitchData} />
              </div>

              {/* AR Tab: AI Advisor Panel */}
              <div className="bg-black/60 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl"></div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 text-purple-400 mr-2" />
                  AIせんせいのアドバイス
                </h3>
                
                <div className="mb-6 text-purple-50">
                  {isAiLoading ? (
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-6 h-6 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                      <p>AIせんせいが、カメラの映像と音をみて考えています...</p>
                    </div>
                  ) : aiAdvice ? (
                    <div className="bg-white/10 p-5 rounded-2xl text-sm leading-relaxed border border-white/10 shadow-inner">
                      <p className="text-white text-base">{aiAdvice}</p>
                    </div>
                  ) : (
                    <p className="text-sm opacity-80">カメラに楽器をうつして、「AIにきく」ボタンを押してみてね！いまの音程と形からアドバイスするよ。</p>
                  )}
                </div>

                <button
                  onClick={askAI}
                  disabled={isAiLoading || !isReady || !isCameraReady}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold py-4 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg active:scale-95 text-lg"
                >
                  <Camera size={20} className="mr-2" />
                  AIにアドバイスをもらう！
                </button>
                {(!isReady || !isCameraReady) && (
                  <p className="text-xs text-red-300 mt-3 text-center">※マイクとカメラをオンにしてください</p>
                )}
              </div>
              
              {cameraError && (
                <div className="p-4 bg-red-500/80 text-white rounded-xl text-sm font-bold flex items-start backdrop-blur">
                  <span className="text-xl mr-2">⚠️</span>{cameraError}
                </div>
              )}
            </div>

            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Optional smaller visualizer for AR, or we can just leave it overlaid */}
              {isReady && (
                <div className="h-[200px] lg:h-full max-h-[400px] w-full rounded-3xl overflow-hidden border border-white/20 bg-black/20 backdrop-blur-sm self-end lg:mt-auto">
                    <Visualizer analyser={analyser} mode="spectrum" snapshotData={null} transparentMode={true} />
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
