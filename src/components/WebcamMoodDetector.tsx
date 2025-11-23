import * as React from 'react';
import { Camera, RefreshCw, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

interface WebcamMoodDetectorProps {
  onMoodDetected?: () => void;
}

export const WebcamMoodDetector: React.FC<WebcamMoodDetectorProps> = ({ onMoodDetected }) => {
  const { addMoodEntry } = useApp();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  // State for UI rendering
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [isDetecting, setIsDetecting] = React.useState(false);
  const [detectedMood, setDetectedMood] = React.useState<string | null>(null);
  const [model, setModel] = React.useState<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const [isModelLoading, setIsModelLoading] = React.useState(true);
  const [statusMessage, setStatusMessage] = React.useState<string>('Initializing...');
  const [noFaceDetected, setNoFaceDetected] = React.useState(false);
  const [debugInfo, setDebugInfo] = React.useState<string>('');
  const [permissionDenied, setPermissionDenied] = React.useState(false);

  // Refs for the detection loop (to avoid stale closures)
  const isStreamingRef = React.useRef(false);
  const isDetectingRef = React.useRef(false);
  const modelRef = React.useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const requestRef = React.useRef<number>(0);
  const lastDetectionTimeRef = React.useRef<number>(0);
  const detectionStartTimeRef = React.useRef<number>(0);
  const videoReadyStartTimeRef = React.useRef<number>(0);

  // Sync Refs with State
  React.useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  React.useEffect(() => { isDetectingRef.current = isDetecting; }, [isDetecting]);
  React.useEffect(() => { modelRef.current = model; }, [model]);

  React.useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        setStatusMessage('Loading AI Model...');
        console.log('[Face Detection] Starting model load...');
        
        try {
            await tf.setBackend('webgl');
            await tf.ready();
            console.log('[Face Detection] TensorFlow Backend:', tf.getBackend());
        } catch (e) {
            console.warn('[Face Detection] WebGL backend failed, falling back to cpu', e);
            try {
                await tf.setBackend('cpu');
                await tf.ready();
                console.log('[Face Detection] Using CPU backend');
            } catch (cpuError) {
                console.error('[Face Detection] CPU backend also failed', cpuError);
            }
        }

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Model load timeout')), 30000)
        );
        
        await Promise.race([
            (async () => {
                console.log('[Face Detection] Creating MediaPipeFaceMesh detector...');
                const loadedModel = await faceLandmarksDetection.createDetector(
                  faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
                  { 
                    runtime: 'tfjs', 
                    refineLandmarks: true,
                    maxFaces: 1,
                    // More sensitive detection
                    detectorModelUrl: undefined,
                    landmarkModelUrl: undefined
                  }
                );
                console.log('[Face Detection] Model loaded successfully');
                setModel(loadedModel);
            })(),
            timeoutPromise
        ]);
        
        setIsModelLoading(false);
        setStatusMessage('AI Ready');
      } catch (err) {
        console.error('[Face Detection] Failed to load model', err);
        setIsModelLoading(false);
        setStatusMessage('Model Load Failed');
      }
    };
    loadModel();
  }, []);

  const drawMesh = (predictions: faceLandmarksDetection.Face[], ctx: CanvasRenderingContext2D) => {
    if (predictions.length > 0) {
      predictions.forEach((prediction) => {
        const keypoints = prediction.keypoints;
        
        ctx.fillStyle = '#32CD32'; 
        ctx.strokeStyle = '#32CD32';
        ctx.lineWidth = 1;

        // Lips
        const lips = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
        ctx.beginPath();
        lips.forEach((index, i) => {
          const p = keypoints[index];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Eyes
        const leftEye = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
        const rightEye = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
        
        [leftEye, rightEye].forEach(eye => {
            ctx.beginPath();
            eye.forEach((index, i) => {
                const p = keypoints[index];
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.stroke();
        });

        // Eyebrows
        const leftEyebrow = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
        const rightEyebrow = [336, 296, 334, 293, 300, 276, 283, 282, 295, 285];

        [leftEyebrow, rightEyebrow].forEach(brow => {
            ctx.beginPath();
            brow.forEach((index, i) => {
                const p = keypoints[index];
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        });
      });
    }
  };

  const detectFrame = async () => {
    // Use Refs to get the latest state inside the loop
    const currentModel = modelRef.current;
    const isStreamingNow = isStreamingRef.current;
    const isDetectingNow = isDetectingRef.current;

    console.log('[Face Detection] detectFrame called - isDetecting:', isDetectingNow, 'isStreaming:', isStreamingNow);

    if (!currentModel || !videoRef.current || !canvasRef.current) {
        console.log('[Face Detection] Missing required refs - model:', !!currentModel, 'video:', !!videoRef.current, 'canvas:', !!canvasRef.current);
        if (isStreamingNow) {
             requestRef.current = requestAnimationFrame(detectFrame);
        }
        return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('[Face Detection] Video not ready - readyState:', video.readyState, 'width:', video.videoWidth, 'height:', video.videoHeight);
      if (Date.now() - videoReadyStartTimeRef.current > 3000 && isDetectingNow) {
          console.log('[Face Detection] Waiting for camera stream... readyState:', video.readyState);
          setStatusMessage('Waiting for camera stream...');
      }
      if (isStreamingNow) {
        requestRef.current = requestAnimationFrame(detectFrame);
      }
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'; // Faint red border for debug
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    const now = Date.now();
    // Reduced frequency from 100ms to 300ms to give model more time per detection
    if (now - lastDetectionTimeRef.current > 300) {
        lastDetectionTimeRef.current = now;
        
        if (isDetectingNow) {
            setStatusMessage('Scanning face...');
            try {
              console.log('[Face Detection] Attempting to detect faces...');
              const facesPromise = currentModel.estimateFaces(video);
              const timeoutPromise = new Promise<faceLandmarksDetection.Face[]>((_, reject) => 
                  setTimeout(() => reject(new Error('Detection timeout')), 3000)
              );

              const faces = await Promise.race([facesPromise, timeoutPromise]);
              
              console.log('[Face Detection] Detected faces:', faces.length);
              setDebugInfo(`Backend: ${tf.getBackend()} | Faces: ${faces.length}`);

              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Redraw border
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
                
                drawMesh(faces, ctx);
              }

              if (faces.length > 0) {
                console.log('[Face Detection] Face found! Analyzing mood...');
                setStatusMessage('Analyzing expression...');
                analyzeMood(faces[0].keypoints);
                setNoFaceDetected(false);
                // Don't return here - let analyzeMood handle stopping
              } else {
                  // Increased timeout to 10 seconds for better performance in poor lighting
                  if (now - detectionStartTimeRef.current > 10000) {
                      console.log('[Face Detection] No face detected for 10+ seconds');
                      setNoFaceDetected(true);
                      setStatusMessage('No face detected - adjust lighting or position');
                  }
              }
            } catch (err) {
              console.error('[Face Detection] Detection error:', err);
              setDebugInfo(`Error: ${err instanceof Error ? err.message : String(err)}`);
            }
        } else {
            console.log('[Face Detection] isDetectingNow is false, skipping detection');
        }
    }

    if (isStreamingNow || isDetectingNow) {
        requestRef.current = requestAnimationFrame(detectFrame);
    } else {
        console.log('[Face Detection] Stopping detection loop - not streaming or detecting');
    }
  };

  const analyzeMood = (keypoints: faceLandmarksDetection.Keypoint[]) => {
    console.log('[Face Detection] Analyzing mood with', keypoints.length, 'keypoints');
    const getPoint = (index: number) => keypoints[index];
    const distance = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    const mouthLeft = getPoint(61);
    const mouthRight = getPoint(291);
    
    const mouthWidth = distance(mouthLeft, mouthRight);
    const faceWidth = distance(getPoint(234), getPoint(454));
    const smileRatio = mouthWidth / faceWidth;

    const l1 = distance(getPoint(160), getPoint(144));
    const l2 = distance(getPoint(158), getPoint(153));
    const lWidth = distance(getPoint(33), getPoint(133));
    const leftEAR = (l1 + l2) / (2 * lWidth);

    const r1 = distance(getPoint(385), getPoint(380));
    const r2 = distance(getPoint(387), getPoint(373));
    const rWidth = distance(getPoint(362), getPoint(263));
    const rightEAR = (r1 + r2) / (2 * rWidth);

    const avgEAR = (leftEAR + rightEAR) / 2;

    const browDistance = distance(getPoint(55), getPoint(285));
    const normalizedBrowDist = browDistance / faceWidth;

    console.log('[Face Detection] Metrics - SmileRatio:', smileRatio.toFixed(2), '| EAR:', avgEAR.toFixed(2), '| Brow:', normalizedBrowDist.toFixed(2));

    let mood = 'Focused';

    if (smileRatio > 0.45) { 
        mood = 'Happy';
    } else if (avgEAR < 0.25) { 
        mood = 'Tired';
    } else if (normalizedBrowDist < 0.45) { 
        // mood = 'Stressed'; 
    }

    console.log('[Face Detection] Detected mood:', mood);
    setDebugInfo(`Backend: ${tf.getBackend()} | Smile: ${smileRatio.toFixed(2)} | EAR: ${avgEAR.toFixed(2)}`);

    setDetectedMood(mood);
    setIsDetecting(false); 
    setNoFaceDetected(false);
    setStatusMessage('Mood Detected!');
    
    addMoodEntry({
        date: new Date().toISOString(),
        mood: mood as any,
        source: 'webcam'
    });

    console.log('[Face Detection] Mood entry added, stopping camera in 2s');
    setTimeout(() => {
        stopCamera();
        if (onMoodDetected) onMoodDetected();
    }, 2000);
  };

  const startCamera = async () => {
    console.log('[Face Detection] startCamera called');
    setPermissionDenied(false);
    videoReadyStartTimeRef.current = Date.now();
    try {
      console.log('[Face Detection] Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
        } 
      });
      console.log('[Face Detection] Camera access granted');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('[Face Detection] Video playing');
        setIsStreaming(true);
        // Start the loop
        if (!requestRef.current) {
             console.log('[Face Detection] Starting detection loop');
             requestRef.current = requestAnimationFrame(detectFrame);
        } else {
             console.log('[Face Detection] Detection loop already running');
        }
      }
    } catch (err: any) {
      console.error('[Face Detection] Error accessing webcam:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
      } else {
        alert('Could not access webcam. Please ensure you have granted permission.');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      setIsDetecting(false);
      setNoFaceDetected(false);
      setStatusMessage('');
      setDebugInfo('');
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = 0;
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const handleDetectClick = () => {
      console.log('[Face Detection] Detect button clicked');
      console.log('[Face Detection] Current state - isStreaming:', isStreaming, 'model:', !!model, 'requestRef:', requestRef.current);
      setIsDetecting(true);
      setNoFaceDetected(false);
      setStatusMessage('Initializing detection...');
      detectionStartTimeRef.current = Date.now();
      
      setTimeout(() => {
          if (isDetectingRef.current) { 
             console.log('[Face Detection] Detection timed out after 30s');
             setIsDetecting(false);
             setNoFaceDetected(false);
             setStatusMessage('Detection timed out');
          }
      }, 30000);

      if (!isStreaming) {
          console.log('[Face Detection] Camera not streaming, starting camera...');
          startCamera();
      } else {
          console.log('[Face Detection] Camera already streaming');
          // Ensure detection loop is running
          if (!requestRef.current && model) {
              console.log('[Face Detection] Detection loop not running, starting it now');
              requestRef.current = requestAnimationFrame(detectFrame);
          } else {
              console.log('[Face Detection] Detection loop already active or model not ready');
          }
      }
  };

  // We don't need the useEffect to start the loop anymore if startCamera does it.
  // But we need to restart it if model loads LATER than startCamera.
  React.useEffect(() => {
      if (isStreaming && model && !requestRef.current) {
          detectFrame();
      }
  }, [isStreaming, model]);

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <Sparkles className="text-primary" size={20} />
        AI Mood Detector
      </h3>
      
      <div style={{ 
        width: '100%', 
        maxWidth: '480px', 
        height: '360px', 
        backgroundColor: 'black', 
        margin: '0 auto 1.5rem auto',
        borderRadius: '1rem',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {!isStreaming && !detectedMood && !permissionDenied && (
          <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Camera size={48} />
            <p>Camera is off</p>
          </div>
        )}

        {permissionDenied && (
           <div style={{ color: 'var(--error)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
            <Camera size={48} />
            <p style={{ fontWeight: 600 }}>Camera Access Denied</p>
            <p style={{ fontSize: '0.9rem' }}>Please enable camera access in your browser settings and try again.</p>
          </div>
        )}
        
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            display: isStreaming ? 'block' : 'none',
            transform: 'scaleX(-1)' // Mirror effect
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
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Match video mirror
                pointerEvents: 'none'
            }}
        />
        
        {isDetecting && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '0.5rem 1rem',
            borderRadius: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'white',
            zIndex: 10
          }}>
            <RefreshCw className="spin" size={16} />
            <span style={{ fontSize: '0.9rem' }}>{statusMessage}</span>
          </div>
        )}

        {/* Debug Overlay */}
        {isDetecting && debugInfo && (
             <div style={{
                position: 'absolute',
                top: '3rem',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.5rem',
                color: '#00ff00',
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                zIndex: 10
            }}>
                {debugInfo}
            </div>
        )}

        {noFaceDetected && isDetecting && (
            <div style={{
                position: 'absolute',
                bottom: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(255, 0, 0, 0.8)',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'white',
                zIndex: 10,
                width: '90%'
            }}>
                <AlertCircle size={20} />
                <span style={{ fontSize: '0.85rem' }}>No face detected. Please ensure good lighting and face the camera directly.</span>
            </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
        {isModelLoading ? (
             <button className="btn btn-secondary" disabled>
                <Loader2 className="spin" size={18} style={{ marginRight: '0.5rem' }} />
                Loading AI Model...
             </button>
        ) : !isStreaming ? (
          <button className="btn btn-primary" onClick={startCamera}>
            Start Camera
          </button>
        ) : (
          <>
            <button className="btn btn-primary" onClick={handleDetectClick} disabled={isDetecting}>
              Detect Mood
            </button>
            <button className="btn btn-secondary" onClick={stopCamera}>
              Stop Camera
            </button>
          </>
        )}
      </div>

      {detectedMood && (
        <div className="animate-fade-in" style={{ 
          marginTop: '1rem', 
          padding: '1.5rem', 
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          borderRadius: '1rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>
            {detectedMood === 'Happy' && '😊'}
            {detectedMood === 'Stressed' && '😰'}
            {detectedMood === 'Tired' && '😴'}
            {detectedMood === 'Focused' && '⚡'}
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.25rem' }}>Detected Mood:</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>{detectedMood}</p>
          <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>
            ✓ Mood saved! Check the Coach tab for personalized suggestions.
          </p>
        </div>
      )}
      
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
