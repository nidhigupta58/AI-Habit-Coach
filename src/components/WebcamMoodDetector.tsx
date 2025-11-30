import React, { useRef, useState, useEffect } from 'react';
import { Camera, Sparkles, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import type { Point } from '../types/Point';

interface WebcamMoodDetectorProps {
  onMoodDetected?: () => void;
}

type MoodType = 'Happy' | 'Stressed' | 'Tired' | 'Focused';

export const WebcamMoodDetector: React.FC<WebcamMoodDetectorProps> = ({ onMoodDetected }) => {
  const { addMoodEntry } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [model, setModel] = useState<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedMood, setDetectedMood] = useState<MoodType | null>(null);
  const [error, setError] = useState<string>('');
  const [faceDetected, setFaceDetected] = useState(false);

  // Load TensorFlow model on mount
  useEffect(() => {
    let mounted = true;

    const loadModel = async () => {
      try {
        console.log('[FaceDetection] Initializing TensorFlow...');
        
        // Set backend
        await tf.setBackend('webgl');
        await tf.ready();
        console.log('[FaceDetection] TensorFlow ready with backend:', tf.getBackend());

        // Load the face detection model (v1 API)
        console.log('[FaceDetection] Loading MediaPipe FaceMesh (v1)...');
        console.log('[FaceDetection] Available exports:', Object.keys(faceLandmarksDetection));
        
        // Try different initialization patterns for v1.0.6
        let model;
        // @ts-expect-error - load doesn't exist in types but may exist at runtime
        if (typeof faceLandmarksDetection.load === 'function') {
          // @ts-expect-error - v1 API
          model = await faceLandmarksDetection.load('mediapipe-facemesh', { maxFaces: 1 });
        // @ts-expect-error - exploring runtime API
        } else if (faceLandmarksDetection.FaceMesh) {
          // Instantiate FaceMesh class directly
          // @ts-expect-error - v1 API
          model = new faceLandmarksDetection.FaceMesh({ maxFaces: 1 });
          await model.initialize?.();
        } else {
          // Try default export or createDetector
          // @ts-expect-error - trying different API
          const createFn = faceLandmarksDetection.createDetector || faceLandmarksDetection.default;
          if (createFn) {
            model = await createFn(
              faceLandmarksDetection.SupportedModels?.MediaPipeFaceMesh || 'MediaPipeFaceMesh',
              {
                runtime: 'tfjs' as never,
                maxFaces: 1,
                refineLandmarks: false
              }
            );
          } else {
            throw new Error('Could not find initialization method in faceLandmarksDetection package');
          }
        }

        if (mounted) {
          setModel(model);
          setIsLoading(false);
          console.log('[FaceDetection] Model loaded successfully');
        }
      } catch (err) {
        console.error('[FaceDetection] Error loading model:', err);
        if (mounted) {
          setError('Failed to load AI model. Please refresh the page.');
          setIsLoading(false);
        }
      }
    };

    loadModel();

    return () => {
      mounted = false;
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      setError('');
      console.log('[FaceDetection] Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        streamRef.current = stream;
        setIsCameraActive(true);
        console.log('[FaceDetection] Camera started successfully');
      }
    } catch (err) {
      console.error('[FaceDetection] Camera error:', err);
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsCameraActive(false);
    setIsAnalyzing(false);
    setFaceDetected(false);
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // Analyze mood from face landmarks
  const analyzeMood = (keypoints: (Point | number[])[]): MoodType => {
    const getPoint = (index: number): Point => {
      const p = keypoints[index];
      if (Array.isArray(p)) return { x: p[0], y: p[1], z: p[2] };
      return p as Point;
    };

    const distance = (p1: Point, p2: Point) => 
      Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    // Calculate facial metrics
    const mouthLeft = getPoint(61);
    const mouthRight = getPoint(291);
    const mouthTop = getPoint(13);
    const mouthBottom = getPoint(14);
    
    const mouthWidth = distance(mouthLeft, mouthRight);
    const mouthHeight = distance(mouthTop, mouthBottom);
    const faceWidth = distance(getPoint(234), getPoint(454));
    
    const smileRatio = mouthWidth / faceWidth;
    const mouthOpenRatio = mouthHeight / mouthWidth;

    // Eye aspect ratio (for tiredness)
    const leftEyeTop = getPoint(159);
    const leftEyeBottom = getPoint(145);
    const leftEyeWidth = distance(getPoint(33), getPoint(133));
    const leftEAR = distance(leftEyeTop, leftEyeBottom) / leftEyeWidth;

    const rightEyeTop = getPoint(386);
    const rightEyeBottom = getPoint(374);
    const rightEyeWidth = distance(getPoint(362), getPoint(263));
    const rightEAR = distance(rightEyeTop, rightEyeBottom) / rightEyeWidth;

    const avgEAR = (leftEAR + rightEAR) / 2;

    // Eyebrow position (for stress)
    const leftBrow = getPoint(70);
    const eyeLeft = getPoint(33);
    const eyeRight = getPoint(133);
    const leftEyeCenter = {
      x: (eyeLeft.x + eyeRight.x) / 2,
      y: (eyeLeft.y + eyeRight.y) / 2
    };

    const browDist = distance(leftBrow, leftEyeCenter);
    const browRatio = browDist / faceWidth;

    console.log('[FaceDetection] Metrics:', {
      smileRatio: smileRatio.toFixed(3),
      mouthOpen: mouthOpenRatio.toFixed(3),
      eyeAspect: avgEAR.toFixed(3),
      browRatio: browRatio.toFixed(3)
    });

    // Determine mood based on metrics
    if (smileRatio > 0.46 || mouthOpenRatio > 0.3) {
      return 'Happy';
    } else if (avgEAR < 0.18) {
      return 'Tired';
    } else if (browRatio < 0.12) {
      return 'Stressed';
    }
    return 'Focused';
  };

  // Main detection loop
  const detectLoop = async () => {
    if (!model || !videoRef.current || !canvasRef.current || !isAnalyzing) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2) {
      animationRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const faces = await (model as never as { estimateFaces: (options: { input: HTMLVideoElement; returnTensors: boolean; flipHorizontal: boolean; predictIrises: boolean }) => Promise<unknown[]> }).estimateFaces({
        input: video,
        returnTensors: false,
        flipHorizontal: false,
        predictIrises: false
      });
      
      if (faces.length === 0) {
        if (Math.random() < 0.05) console.log('[FaceDetection] No faces detected.');
      } else {
        console.log('[FaceDetection] Faces detected:', faces.length);
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (faces.length > 0) {
          setFaceDetected(true);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const face = faces[0] as Record<string, unknown>;
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const keypoints = (face.scaledMesh || face.mesh || face.keypoints) as (Point | number[])[];

          if (!keypoints) {
            console.warn('[FaceDetection] No keypoints found in face object:', face);
            animationRef.current = requestAnimationFrame(detectLoop);
            return;
          }

          // Draw face mesh
          ctx.fillStyle = '#6366f1';
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 1;

          keypoints.forEach((point: Point | number[]) => {
            const x = Array.isArray(point) ? point[0] : point.x;
            const y = Array.isArray(point) ? point[1] : point.y;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, 2 * Math.PI);
            ctx.fill();
          });

          console.log('[FaceDetection] Face detected! Analyzing mood...');
          
          try {
            const mood = analyzeMood(keypoints);
            setDetectedMood(mood);
            setIsAnalyzing(false);

            addMoodEntry({
              date: new Date().toISOString(),
              mood: mood,
              source: 'webcam'
            });

            console.log('[FaceDetection] Mood detected:', mood);

            setTimeout(() => {
              stopCamera();
              if (onMoodDetected) {
                onMoodDetected();
              }
            }, 2000);

            return;
          } catch (analysisErr) {
            console.error('[FaceDetection] Analysis error:', analysisErr);
          }
        } else {
          setFaceDetected(false);
        }
      }
    } catch (err) {
      console.error('[FaceDetection] Detection error:', err);
    }

    animationRef.current = requestAnimationFrame(detectLoop);
  };

  // Start mood detection
  const startDetection = () => {
    if (!model) {
      setError('AI model not loaded yet. Please wait...');
      return;
    }

    setIsAnalyzing(true);
    setDetectedMood(null);
    setFaceDetected(false);
    setError('');
    detectLoop();

    setTimeout(() => {
      if (isAnalyzing) {
        setIsAnalyzing(false);
        setError('Detection timeout. Please try again.');
      }
    }, 30000);
  };

  // Get mood emoji
  const getMoodEmoji = (mood: MoodType) => {
    switch (mood) {
      case 'Happy': return '😊';
      case 'Stressed': return '😰';
      case 'Tired': return '😴';
      case 'Focused': return '⚡';
    }
  };

  return (
    <div className="glass-card">
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        <Sparkles size={24} style={{ color: 'var(--primary)' }} />
        AI Mood Detector
      </h3>

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '500px',
        height: '375px',
        margin: '0 auto 1.5rem',
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {!isCameraActive && !detectedMood && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            gap: '1rem'
          }}>
            <Camera size={64} style={{ opacity: 0.5 }} />
            <p>Camera is off</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: isCameraActive ? 'block' : 'none'
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'scaleX(-1)',
            pointerEvents: 'none'
          }}
        />

        {isAnalyzing && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--radius-full)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <Loader2 className="animate-spin" size={18} />
            {faceDetected ? 'Analyzing expression...' : 'Looking for face...'}
          </div>
        )}

        {isAnalyzing && !faceDetected && (
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(245, 158, 11, 0.9)',
            backdropFilter: 'blur(10px)',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-lg)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            maxWidth: '90%',
            fontSize: '0.875rem'
          }}>
            <AlertCircle size={18} />
            Position your face in the frame
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        marginBottom: '1.5rem'
      }}>
        {isLoading ? (
          <button className="btn btn-secondary" disabled>
            <Loader2 className="animate-spin" size={18} />
            Loading AI Model...
          </button>
        ) : !isCameraActive ? (
          <button
            className="btn btn-primary"
            onClick={startCamera}
            style={{ minWidth: '180px' }}
          >
            <Camera size={20} />
            Start Camera
          </button>
        ) : (
          <>
            <button
              className="btn btn-primary"
              onClick={startDetection}
              disabled={isAnalyzing}
              style={{ minWidth: '180px' }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Detecting...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Detect Mood
                </>
              )}
            </button>
            <button
              className="btn btn-secondary"
              onClick={stopCamera}
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--error)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {detectedMood && (
        <div
          className="animate-scale-in"
          style={{
            padding: '2rem',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            color: 'white',
            boxShadow: 'var(--shadow-glow)'
          }}
        >
          <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'scaleIn 0.5s ease-out' }}>
            {getMoodEmoji(detectedMood)}
          </div>
          <p style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Detected Mood
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
            {detectedMood}
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            opacity: 0.95
          }}>
            <CheckCircle size={18} />
            <span>Mood saved! Check the AI Coach for insights.</span>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};
