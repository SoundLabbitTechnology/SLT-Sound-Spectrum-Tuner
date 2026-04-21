import { useState, useEffect, useRef, useCallback } from 'react';
import { autoCorrelate, getNoteFromPitch, getCentsOffFromPitch } from '../lib/audioPitch';

export interface PitchData {
  pitch: number;
  note: number;
  cents: number;
}

export function useAudioAnalyzer(noiseThreshold: number = 0.01, micGain: number = 1.0) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [pitchData, setPitchData] = useState<PitchData | null>(null);

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        } 
      });
      
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextCtor();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.8;
      
      // We set the initial gain here
      gainNode.gain.value = micGain;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(gainNode);
      gainNode.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      gainNodeRef.current = gainNode;
      sourceRef.current = source;
      streamRef.current = stream;

      setIsReady(true);
      setError(null);
    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      setError('マイクへのアクセスが拒否されたか、エラーが発生しました。');
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsReady(false);
    setPitchData(null);
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // Update gain when micGain changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = micGain;
    }
  }, [micGain]);

  // Pitch detection loop
  useEffect(() => {
    if (!isReady || !analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const sampleRate = audioContextRef.current.sampleRate;
    const buf = new Float32Array(analyser.fftSize);
    let animationFrameId: number;

    const updatePitch = () => {
      analyser.getFloatTimeDomainData(buf);
      
      // Calculate RMS for noise gate
      let rms = 0;
      for (let i = 0; i < buf.length; i++) {
        rms += buf[i] * buf[i];
      }
      rms = Math.sqrt(rms / buf.length);

      if (rms >= noiseThreshold) {
        const pitch = autoCorrelate(buf, sampleRate);
        if (pitch !== -1 && pitch > 50 && pitch < 4000) {
          const note = getNoteFromPitch(pitch);
          const cents = getCentsOffFromPitch(pitch, note);
          setPitchData({ pitch, note, cents });
        } else {
          setPitchData(null);
        }
      } else {
        setPitchData(null);
      }

      animationFrameId = requestAnimationFrame(updatePitch);
    };

    updatePitch();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isReady, noiseThreshold]);

  return {
    isReady,
    error,
    startAudio,
    stopAudio,
    analyser: analyserRef.current,
    pitchData,
  };
}
