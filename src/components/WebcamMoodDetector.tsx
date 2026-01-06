import React, { useRef, useState, useEffect } from 'react';
import { Camera, Sparkles, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

interface WebcamMoodDetectorProps {
  onMoodDetected?: () => void;
}

type MoodType = 'Happy' | 'Stressed' | 'Tired' | 'Focused';

interface Keypoint {
  x: number;
  y: number;
  z?: number;
  name?: string;
}

export const WebcamMoodDetector: React.FC<WebcamMoodDetectorProps> = ({ onMoodDetected }) => {
  const { addMoodEntry } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedMood, setDetectedMood] = useState<MoodType | null>(null);
  const [error, setError] = useState<string>('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [modelLoadProgress, setModelLoadProgress] = useState('Initializing...');

  // Load TensorFlow model on mount
  useEffect(() => {
    let mounted = true;

    const loadModel = async () => {
      try {
        setModelLoadProgress('Initializing TensorFlow...');
        console.log('[FaceDetection] Initializing TensorFlow...');
        
        // Try to set backend, fallback to cpu if webgl fails
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          console.log('[FaceDetection] TensorFlow ready with backend:', tf.getBackend());
        } catch (backendError) {
          console.warn('[FaceDetection] WebGL backend failed, trying CPU...', backendError);
          await tf.setBackend('cpu');
          await tf.ready();
          console.log('[FaceDetection] TensorFlow ready with backend:', tf.getBackend());
        }

        setModelLoadProgress('Loading face detection model...');
        console.log('[FaceDetection] Loading MediaPipe FaceMesh with TensorFlow.js runtime...');
        
        // Try TensorFlow.js runtime first (more reliable for web)
        try {
          const tfjsConfig: faceLandmarksDetection.MediaPipeFaceMeshTfjsModelConfig = {
            runtime: 'tfjs',
            maxFaces: 1,
            refineLandmarks: false, // Set to false for better performance and compatibility
          };
          
          const detector = await faceLandmarksDetection.createDetector(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            tfjsConfig
          );

          if (mounted) {
            detectorRef.current = detector;
            setIsLoading(false);
            setModelLoadProgress('Model loaded successfully!');
            console.log('[FaceDetection] Model loaded successfully with TensorFlow.js runtime');
          }
        } catch (tfjsErr: any) {
          console.warn('[FaceDetection] TensorFlow.js runtime failed, trying MediaPipe runtime...', tfjsErr);
          
          // Fallback to MediaPipe runtime
          try {
            setModelLoadProgress('Trying MediaPipe runtime...');
            const mediapipeConfig: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig = {
              runtime: 'mediapipe',
              solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
              maxFaces: 1,
              refineLandmarks: false, // Set to false for better performance
            };
            
            const detector = await faceLandmarksDetection.createDetector(
              faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
              mediapipeConfig
            );
            
            if (mounted) {
              detectorRef.current = detector;
              setIsLoading(false);
              setModelLoadProgress('Model loaded successfully!');
              console.log('[FaceDetection] Model loaded with MediaPipe runtime');
            }
          } catch (mediapipeErr: any) {
            console.error('[FaceDetection] Both runtimes failed:', mediapipeErr);
            if (mounted) {
              setError(`Failed to load AI model: ${mediapipeErr.message || 'Unknown error'}. Please refresh the page.`);
              setIsLoading(false);
            }
          }
        }
      } catch (err: any) {
        console.error('[FaceDetection] Unexpected error loading model:', err);
        if (mounted) {
          setError(`Failed to load AI model: ${err.message || 'Unknown error'}. Please refresh the page.`);
          setIsLoading(false);
        }
      }
    };

    loadModel();

    return () => {
      mounted = false;
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      setError('');
      setDetectedMood(null);
      setFaceDetected(false);
      setDetectionCount(0);
      console.log('[FaceDetection] Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user',
          frameRate: { ideal: 30, min: 15 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        streamRef.current = stream;
        setIsCameraActive(true);
        console.log('[FaceDetection] Camera started successfully');
        console.log('[FaceDetection] Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
        
        // Wait a bit for video to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err: any) {
      console.error('[FaceDetection] Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please allow camera permissions in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else {
        setError(`Camera error: ${err.message || 'Unknown error'}`);
      }
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

  // Get keypoint by index with safe fallback
  const getKeypoint = (keypoints: Keypoint[], index: number): Keypoint | null => {
    if (index >= 0 && index < keypoints.length) {
      return keypoints[index];
    }
    return null;
  };

  // Calculate distance between two points
  const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  // Analyze mood from face landmarks using MediaPipe FaceMesh keypoints
  const analyzeMood = (keypoints: Keypoint[]): MoodType => {
    if (!keypoints || keypoints.length < 468) {
      console.warn('[FaceDetection] Insufficient keypoints for mood analysis');
      return 'Focused';
    }

    try {
      // MediaPipe FaceMesh has 468 keypoints
      // Key facial feature indices for MediaPipe FaceMesh
      const LEFT_EYE_TOP = 159;
      const LEFT_EYE_BOTTOM = 145;
      const LEFT_EYE_LEFT = 33;
      const LEFT_EYE_RIGHT = 133;
      
      const RIGHT_EYE_TOP = 386;
      const RIGHT_EYE_BOTTOM = 374;
      const RIGHT_EYE_LEFT = 362;
      const RIGHT_EYE_RIGHT = 263;
      
      const MOUTH_LEFT = 61;
      const MOUTH_RIGHT = 291;
      const MOUTH_TOP = 13;
      const MOUTH_BOTTOM = 14;
      
      const FACE_LEFT = 234;
      const FACE_RIGHT = 454;
      
      const LEFT_BROW = 70;
      const RIGHT_BROW = 300;

      // Get keypoints safely
      const leftEyeTop = getKeypoint(keypoints, LEFT_EYE_TOP);
      const leftEyeBottom = getKeypoint(keypoints, LEFT_EYE_BOTTOM);
      const leftEyeLeft = getKeypoint(keypoints, LEFT_EYE_LEFT);
      const leftEyeRight = getKeypoint(keypoints, LEFT_EYE_RIGHT);
      
      const rightEyeTop = getKeypoint(keypoints, RIGHT_EYE_TOP);
      const rightEyeBottom = getKeypoint(keypoints, RIGHT_EYE_BOTTOM);
      const rightEyeLeft = getKeypoint(keypoints, RIGHT_EYE_LEFT);
      const rightEyeRight = getKeypoint(keypoints, RIGHT_EYE_RIGHT);
      
      const mouthLeft = getKeypoint(keypoints, MOUTH_LEFT);
      const mouthRight = getKeypoint(keypoints, MOUTH_RIGHT);
      const mouthTop = getKeypoint(keypoints, MOUTH_TOP);
      const mouthBottom = getKeypoint(keypoints, MOUTH_BOTTOM);
      
      const faceLeft = getKeypoint(keypoints, FACE_LEFT);
      const faceRight = getKeypoint(keypoints, FACE_RIGHT);
      
      const leftBrow = getKeypoint(keypoints, LEFT_BROW);
      const rightBrow = getKeypoint(keypoints, RIGHT_BROW);

      // Validate all required keypoints exist
      if (!leftEyeTop || !leftEyeBottom || !leftEyeLeft || !leftEyeRight ||
          !rightEyeTop || !rightEyeBottom || !rightEyeLeft || !rightEyeRight ||
          !mouthLeft || !mouthRight || !mouthTop || !mouthBottom ||
          !faceLeft || !faceRight || !leftBrow || !rightBrow) {
        console.warn('[FaceDetection] Missing required keypoints');
        return 'Focused';
      }

      // Calculate facial metrics
      const mouthWidth = distance(mouthLeft, mouthRight);
      const mouthHeight = distance(mouthTop, mouthBottom);
      const faceWidth = distance(faceLeft, faceRight);
      
      const smileRatio = mouthWidth / faceWidth;
      const mouthOpenRatio = mouthHeight / mouthWidth;

      // Eye Aspect Ratio (EAR) - for detecting tiredness/blinking
      const leftEyeWidth = distance(leftEyeLeft, leftEyeRight);
      const leftEyeHeight = distance(leftEyeTop, leftEyeBottom);
      const leftEAR = leftEyeHeight / leftEyeWidth;

      const rightEyeWidth = distance(rightEyeLeft, rightEyeRight);
      const rightEyeHeight = distance(rightEyeTop, rightEyeBottom);
      const rightEAR = rightEyeHeight / rightEyeWidth;

      const avgEAR = (leftEAR + rightEAR) / 2;

      // Eyebrow position (for stress/frowning)
      const leftEyeCenter = {
        x: (leftEyeLeft.x + leftEyeRight.x) / 2,
        y: (leftEyeLeft.y + leftEyeRight.y) / 2
      };
      const browDist = distance(leftBrow, leftEyeCenter);
      const browRatio = browDist / faceWidth;

      // Mouth corner position (for smile detection)
      const mouthCenterY = (mouthTop.y + mouthBottom.y) / 2;
      const leftMouthCorner = mouthLeft;
      const rightMouthCorner = mouthRight;
      const mouthCornerAvgY = (leftMouthCorner.y + rightMouthCorner.y) / 2;
      const mouthCurvature = mouthCornerAvgY - mouthCenterY; // Positive = smile

      console.log('[FaceDetection] Metrics:', {
        smileRatio: smileRatio.toFixed(3),
        mouthOpen: mouthOpenRatio.toFixed(3),
        mouthCurvature: mouthCurvature.toFixed(3),
        eyeAspect: avgEAR.toFixed(3),
        browRatio: browRatio.toFixed(3)
      });

      // Determine mood based on metrics with improved thresholds
      // Happy: Smile detected (mouth corners raised, wide mouth)
      if (smileRatio > 0.40 && mouthCurvature > 0) {
        return 'Happy';
      }
      
      // Tired: Eyes are closed or very narrow (low EAR)
      if (avgEAR < 0.20) {
        return 'Tired';
      }
      
      // Stressed: Eyebrows lowered (frowning), narrow eyes
      if (browRatio < 0.10 || (browRatio < 0.12 && avgEAR < 0.25)) {
        return 'Stressed';
      }
      
      // Focused: Neutral expression, eyes open, normal features
      return 'Focused';
    } catch (err) {
      console.error('[FaceDetection] Error in mood analysis:', err);
      return 'Focused';
    }
  };

  // Main detection loop
  const detectLoop = async () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current || !isAnalyzing || !streamRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const detector = detectorRef.current;

    // Ensure video is ready with actual frame data
    if (video.readyState < video.HAVE_ENOUGH_DATA) {
      if (detectionCount === 0) {
        console.log('[FaceDetection] Waiting for video data (readyState:', video.readyState, ')');
      }
      animationRef.current = requestAnimationFrame(() => detectLoop());
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      if (detectionCount === 0) {
        console.log('[FaceDetection] Waiting for video dimensions...');
      }
      animationRef.current = requestAnimationFrame(() => detectLoop());
      return;
    }

    // Ensure video is actually playing
    if (video.paused || video.ended) {
      console.warn('[FaceDetection] Video is paused or ended, attempting to play...');
      try {
        await video.play();
      } catch (playErr) {
        console.error('[FaceDetection] Failed to play video:', playErr);
      }
      animationRef.current = requestAnimationFrame(() => detectLoop());
      return;
    }

    // Sync canvas dimensions with video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationRef.current = requestAnimationFrame(() => detectLoop());
      return;
    }

    try {
      // Capture current video frame to canvas first
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      let faces: any[] = [];
      let detectionMethod = '';
      let lastError: any = null;

      // Try multiple input formats for maximum compatibility
      try {
        // Method 1: Try canvas directly (most reliable for face-landmarks-detection)
        console.log('[FaceDetection] Attempting detection with canvas...');
        faces = await detector.estimateFaces(canvas);
        detectionMethod = 'canvas';
        console.log(`[FaceDetection] Canvas method returned ${faces?.length || 0} faces`);
      } catch (canvasErr: any) {
        lastError = canvasErr;
        console.warn('[FaceDetection] Canvas input failed:', canvasErr.message);
        
        try {
          // Method 2: Try video element directly
          console.log('[FaceDetection] Attempting detection with video element...');
          faces = await detector.estimateFaces(video);
          detectionMethod = 'video';
          console.log(`[FaceDetection] Video method returned ${faces?.length || 0} faces`);
        } catch (videoErr: any) {
          lastError = videoErr;
          console.warn('[FaceDetection] Video input also failed:', videoErr.message);
          
          try {
            // Method 3: Convert video to tensor using TensorFlow.js
            console.log('[FaceDetection] Attempting detection with tensor conversion...');
            const imageTensor = tf.browser.fromPixels(video);
            const imageData = await tf.browser.toPixels(imageTensor);
            imageTensor.dispose();
            
            // Create ImageData and put it on canvas
            const imgData = new ImageData(
              new Uint8ClampedArray(imageData),
              video.videoWidth,
              video.videoHeight
            );
            ctx.putImageData(imgData, 0, 0);
            
            // Try canvas again after tensor conversion
            faces = await detector.estimateFaces(canvas);
            detectionMethod = 'tensor';
            console.log(`[FaceDetection] Tensor method returned ${faces?.length || 0} faces`);
          } catch (tensorErr: any) {
            lastError = tensorErr;
            console.error('[FaceDetection] All detection methods failed:', tensorErr);
            console.error('[FaceDetection] Last error details:', {
              message: tensorErr.message,
              stack: tensorErr.stack,
              name: tensorErr.name
            });
          }
        }
      }
      
      // Log detection results
      if (faces && faces.length > 0 && detectionMethod) {
        console.log(`[FaceDetection] ✓ Face detected using ${detectionMethod} method (${faces.length} face(s))`);
      } else if (faces && faces.length === 0) {
        // Log when no faces detected (but API call succeeded)
        if (detectionCount % 30 === 0) { // Log every 30 frames to avoid spam
          console.log(`[FaceDetection] No faces detected (method: ${detectionMethod || 'unknown'})`);
        }
      } else if (lastError && detectionCount % 30 === 0) {
        console.warn(`[FaceDetection] Detection failed: ${lastError.message}`);
      }

      // Clear canvas before drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Redraw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (faces && faces.length > 0) {
        setFaceDetected(true);
        const face = faces[0];
        const keypoints = face.keypoints || [];

        console.log(`[FaceDetection] Processing face with ${keypoints.length} keypoints`);

        if (keypoints.length > 0) {
          setDetectionCount(prev => prev + 1);
          
          // Draw face landmarks for visualization
          ctx.fillStyle = '#6366f1';
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;

          // Draw key facial features
          keypoints.forEach((point: Keypoint, index: number) => {
            // Only draw important keypoints to improve performance
            if (index % 10 === 0 || 
                [33, 133, 159, 145, 362, 263, 386, 374, 61, 291, 13, 14, 234, 454, 70, 300].includes(index)) {
              ctx.beginPath();
              ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
              ctx.fill();
            }
          });

          // Draw face bounding box
          if (face.box) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.strokeRect(
              face.box.xMin,
              face.box.yMin,
              face.box.width,
              face.box.height
            );
          }

          // Analyze mood after collecting a few frames for stability
          if (detectionCount >= 3) {
            try {
              const mood = analyzeMood(keypoints);
              
              console.log(`[FaceDetection] Mood detected: ${mood} (after ${detectionCount} frames)`);
              
              // Display mood on canvas
              ctx.font = 'bold 24px Arial';
              ctx.fillStyle = 'white';
              ctx.strokeStyle = 'black';
              ctx.lineWidth = 4;
              ctx.strokeText(`Mood: ${mood}`, 15, 40);
              ctx.fillText(`Mood: ${mood}`, 15, 40);
              
              setDetectedMood(mood);
              setIsAnalyzing(false);

              // Save mood entry
              addMoodEntry({
                date: new Date().toISOString(),
                mood: mood,
                source: 'webcam'
              });

              // Stop detection after 2 seconds
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
          }
        } else {
          console.warn('[FaceDetection] Face detected but no keypoints available');
        }
      } else {
        setFaceDetected(false);
        // Only reset detection count if we haven't detected a face for a while
        if (detectionCount > 0) {
          setDetectionCount(0);
        }
        // Log periodically when no faces are detected
        if (detectionCount === 0 && Math.random() < 0.01) { // ~1% chance to log
          console.log('[FaceDetection] No faces in frame. Ensure good lighting and face is clearly visible.');
        }
      }
    } catch (err: any) {
      console.error('[FaceDetection] Detection error:', err);
      console.error('[FaceDetection] Error details:', {
        message: err.message,
        videoReady: video.readyState,
        videoDimensions: `${video.videoWidth}x${video.videoHeight}`,
        canvasDimensions: `${canvas.width}x${canvas.height}`,
        detectorType: detectorRef.current ? 'loaded' : 'null'
      });
      // Don't stop on single error, continue trying
    }

    // Continue the loop only if still analyzing and no mood has been detected
    if (isAnalyzing && !detectedMood) {
      animationRef.current = requestAnimationFrame(() => detectLoop());
    }
  };

  // Start mood detection
  const startDetection = () => {
    if (!detectorRef.current) {
      setError('AI model not loaded yet. Please wait...');
      return;
    }

    if (!isCameraActive) {
      setError('Please start the camera first.');
      return;
    }

    if (!videoRef.current) {
      setError('Video element not available.');
      return;
    }

    console.log('[FaceDetection] Starting detection...');
    console.log('[FaceDetection] Detector available:', !!detectorRef.current);
    console.log('[FaceDetection] Video state:', {
      readyState: videoRef.current.readyState,
      paused: videoRef.current.paused,
      ended: videoRef.current.ended,
      width: videoRef.current.videoWidth,
      height: videoRef.current.videoHeight
    });

    setIsAnalyzing(true);
    setDetectedMood(null);
    setFaceDetected(false);
    setDetectionCount(0);
    setError('');
    detectLoop();

    // Timeout after 30 seconds
    setTimeout(() => {
      if (isAnalyzing && !detectedMood) {
        setIsAnalyzing(false);
        setError('Detection timeout. Please ensure your face is clearly visible, well-lit, and try again.');
        console.warn('[FaceDetection] Detection timeout after 30 seconds');
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

        {/* Status Info Overlay */}
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)',
          padding: '0.5rem 0.75rem',
          borderRadius: '8px',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.9)',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <div>Model: {detectorRef.current ? '✓ Loaded' : 'Loading...'}</div>
          <div>Backend: {tf.getBackend()}</div>
          {isAnalyzing && faceDetected && (
            <div style={{ color: '#10b981' }}>
              Face: ✓ Detected ({detectionCount} frames)
            </div>
          )}
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        {isLoading ? (
          <button className="btn btn-secondary" disabled>
            <Loader2 className="animate-spin" size={18} />
            {modelLoadProgress}
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
              disabled={isAnalyzing || !detectorRef.current}
              style={{ minWidth: '180px' }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {faceDetected ? 'Analyzing...' : 'Detecting face...'}
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
              disabled={isAnalyzing}
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
            boxShadow: 'var(--shadow-glow)',
            marginTop: '1rem'
          }}
        >
          <div style={{ 
            fontSize: '5rem', 
            marginBottom: '1rem', 
            animation: 'scaleIn 0.5s ease-out',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
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
