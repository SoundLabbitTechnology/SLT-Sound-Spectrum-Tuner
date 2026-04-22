import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      // 端末の背面カメラ（外側）を優先
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for the video to start playing before marking as ready
        videoRef.current.oncanplay = () => {
            setIsCameraReady(true);
        };
      }
      streamRef.current = stream;
      setCameraError(null);
    } catch (err: any) {
      console.error('Failed to access camera:', err);
      setCameraError('カメラを使用できません。');
      setIsCameraReady(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    isCameraReady,
    cameraError,
    startCamera,
    stopCamera
  };
}
