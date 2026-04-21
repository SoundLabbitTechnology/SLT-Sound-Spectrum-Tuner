import React, { useState, useEffect } from 'react';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { Visualizer } from './components/Visualizer';
import { TunerDisplay } from './components/TunerDisplay';
import { Mic, MicOff, Camera, Activity, BarChart2, Volume2, TreePine } from 'lucide-react';

export default function App() {
  const [noiseThreshold, setNoiseThreshold] = useState(0.01);
  const [micGain, setMicGain] = useState(1.5);
  const { isReady, error, startAudio, stopAudio, analyser, pitchData } = useAudioAnalyzer(noiseThreshold, micGain);
  
  const [mode, setMode] = useState<'spectrum' | 'wave'>('spectrum');
  const [snapshotData, setSnapshotData] = useState<Uint8Array | null>(null);

  const handleToggleAudio = () => {
    if (isReady) {
      stopAudio();
    } else {
      startAudio();
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
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-amber-200">
      {/* Header */}
      <header className="bg-white border-b-4 border-amber-800/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-amber-600 p-2 rounded-xl text-white shadow-md">
            <TreePine size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-800 tracking-tight">音の見える化チューナー</h1>
            <p className="text-xs text-amber-700 font-medium tracking-wide">木と音であそぼう！</p>
          </div>
        </div>
        
        <button
          onClick={handleToggleAudio}
          className={`flex items-center px-4 py-2 rounded-full font-bold transition-all shadow-sm active:scale-95 ${
            isReady 
              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-2 border-amber-300' 
              : 'bg-amber-500 text-white hover:bg-amber-600 border-2 border-amber-600'
          }`}
        >
          {isReady ? <Mic className="w-5 h-5 mr-2" /> : <MicOff className="w-5 h-5 mr-2" />}
          {isReady ? 'マイク・オン' : 'マイクをつなぐ'}
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Settings and Tuner */}
        <div className="lg:col-span-4 space-y-6">
          <TunerDisplay pitchData={pitchData} />
          
          {/* Controls Panel */}
          <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-amber-50/50">
            <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center">
              <span className="bg-amber-100 p-1.5 rounded-lg mr-2 text-amber-700"><Volume2 size={18}/></span>
              コントロール
            </h3>
            
            {/* Visualizer Mode Toggle */}
            <div className="mb-6">
              <label className="text-sm font-bold text-stone-500 mb-3 block">見えかた</label>
              <div className="flex bg-stone-100 p-1.5 rounded-xl">
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
              <label className="text-sm font-bold text-stone-500 mb-3 flex justify-between">
                <span>マイクの音の大きさ（感度）</span>
                <span className="text-amber-600">x{micGain.toFixed(1)}</span>
              </label>
              <input 
                type="range" 
                min="0.5" 
                max="5.0" 
                step="0.1"
                value={micGain}
                onChange={(e) => setMicGain(parseFloat(e.target.value))}
                className="w-full h-3 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-xs text-stone-400 mt-2">
                音が小さくて反応しないときは、数字を大きくしてください。
              </p>
            </div>

            {/* Noise Gate Slider */}
            <div>
              <label className="text-sm font-bold text-stone-500 mb-3 flex justify-between">
                <span>まわりの雑音をかきけす</span>
                <span className="text-amber-600">{Math.round(noiseThreshold * 1000)}</span>
              </label>
              <input 
                type="range" 
                min="0.001" 
                max="0.05" 
                step="0.001"
                value={noiseThreshold}
                onChange={(e) => setNoiseThreshold(parseFloat(e.target.value))}
                className="w-full h-3 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-xs text-stone-400 mt-2">
                数字を大きくすると、周りのざわめきをひろわなくなります。
              </p>
            </div>
            
            {/* Snapshot Actions */}
            <div className="mt-8 pt-6 border-t-2 border-stone-100">
              <label className="text-sm font-bold text-stone-500 mb-3 block">音をくらべる</label>
              <div className="flex gap-2">
                <button
                  onClick={handleSnapshot}
                  disabled={!isReady}
                  className="flex-1 bg-stone-800 hover:bg-stone-900 text-white font-bold py-3 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-md shadow-stone-800/20"
                >
                  <Camera size={18} className="mr-2" />
                  のこす
                </button>
                {snapshotData && (
                  <button
                    onClick={clearSnapshot}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl flex items-center justify-center transition-all active:scale-95"
                  >
                    けす
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-100 text-red-800 rounded-xl text-sm font-bold border-2 border-red-200 flex items-start">
              <span className="text-xl mr-2">⚠️</span>
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Visualizer Canvas */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white p-4 md:p-6 rounded-3xl shadow-xl border-2 border-amber-50/50 flex-1 min-h-[400px] flex flex-col relative h-[600px]">
            {!isReady && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-3xl">
                <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6 shadow-iner border-4 border-white">
                  <Mic className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-2xl font-black text-stone-800 mb-2">マイクをつないでね</h2>
                <p className="text-stone-500 font-medium">上のボタンからマイクをオンにしてみよう！</p>
              </div>
            )}
            
            <Visualizer 
              analyser={analyser} 
              mode={mode} 
              snapshotData={snapshotData} 
            />
          </div>
        </div>

      </main>
    </div>
  );
}
