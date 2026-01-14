import React, { useRef, useState, useEffect } from 'react';
import { Camera, Sparkles, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as tf from '@tensorflow/tfjs';
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
  const isAnalyzingRef = useRef<boolean>(false);
  const detectedMoodRef = useRef<MoodType | null>(null);
  const detectionCountRef = useRef<number>(0);
  const moodHistoryRef = useRef<MoodType[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedMood, setDetectedMood] = useState<MoodType | null>(null);
  const [error, setError] = useState<string>('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [modelLoadProgress, setModelLoadProgress] = useState('Initializing...');
  const [isDetectorLoaded, setIsDetectorLoaded] = useState(false);
  const [isDetectorReady, setIsDetectorReady] = useState(false);

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
            setIsDetectorLoaded(true);
            setIsDetectorReady(true);
            setModelLoadProgress('Model loaded successfully!');
            console.log('[FaceDetection] Model loaded successfully with TensorFlow.js runtime');
          }
        } catch (tfjsErr: unknown) {
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
              setIsDetectorLoaded(true);
              setIsDetectorReady(true);
              setModelLoadProgress('Model loaded successfully!');
              console.log('[FaceDetection] Model loaded with MediaPipe runtime');
            }
          } catch (mediapipeErr: unknown) {
            const errorMessage = mediapipeErr instanceof Error ? mediapipeErr.message : 'Unknown error';
            console.error('[FaceDetection] Both runtimes failed:', mediapipeErr);
            if (mounted) {
              setError(`Failed to load AI model: ${errorMessage}. Please refresh the page.`);
              setIsLoading(false);
            }
          }
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[FaceDetection] Unexpected error loading model:', err);
        if (mounted) {
          setError(`Failed to load AI model: ${errorMessage}. Please refresh the page.`);
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
      detectedMoodRef.current = null;
      setFaceDetected(false);
      detectionCountRef.current = 0;
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
    } catch (err: unknown) {
      const error = err as DOMException;
      console.error('[FaceDetection] Camera error:', err);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please allow camera permissions in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else {
        setError(`Camera error: ${error.message || 'Unknown error'}`);
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
    isAnalyzingRef.current = false;
    setFaceDetected(false);
    detectedMoodRef.current = null;
    
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
      // Use a weighted scoring system that considers magnitude of expressions
      
      let happyScore = 0;
      let stressedScore = 0;
      let tiredScore = 0;
      let focusedScore = 0;
      
      // Tired scoring: Low eye aspect ratio (eyes closed/narrow)
      // More closed = higher score
      if (avgEAR < 0.18) {
        tiredScore += 5; // Very closed eyes
      } else if (avgEAR < 0.22) {
        tiredScore += 3; // Closed eyes
      } else if (avgEAR < 0.25) {
        tiredScore += 1; // Slightly closed
      }
      
      // Stressed scoring: Frowning (negative mouth curvature), lowered brows, narrow eyes
      // Use magnitude of negative curvature - more negative = more stressed
      if (mouthCurvature < -8) {
        stressedScore += 5; // Very strong frown
      } else if (mouthCurvature < -5) {
        stressedScore += 4; // Strong frown
      } else if (mouthCurvature < -3) {
        stressedScore += 3; // Clear frown
      } else if (mouthCurvature < -1.5) {
        stressedScore += 2; // Moderate frown
      } else if (mouthCurvature < -0.5) {
        stressedScore += 1; // Slight frown
      }
      
      // Lowered brows contribute to stress
      if (browRatio < 0.12) {
        stressedScore += 3; // Very lowered brows
      } else if (browRatio < 0.14) {
        stressedScore += 2; // Lowered brows
      } else if (browRatio < 0.16) {
        stressedScore += 1; // Slightly lowered
      }
      
      // Narrow eyes + lowered brows = stress
      if (avgEAR < 0.25 && browRatio < 0.15) {
        stressedScore += 2;
      }
      
      // Happy scoring: Wide smile (high smile ratio) AND raised mouth corners (positive curvature)
      // Both conditions must be met for a genuine smile
      // Use magnitude of positive curvature - more positive = happier
      if (mouthCurvature > 3.0 && smileRatio > 0.45) {
        happyScore += 5; // Very big smile
      } else if (mouthCurvature > 2.5 && smileRatio > 0.42) {
        happyScore += 4; // Big smile
      } else if (mouthCurvature > 2.0 && smileRatio > 0.40) {
        happyScore += 3; // Clear smile
      } else if (mouthCurvature > 1.5 && smileRatio > 0.38) {
        happyScore += 2; // Moderate smile
      } else if (mouthCurvature > 1.0 && smileRatio > 0.36) {
        happyScore += 1; // Slight smile
      }
      
      // Penalize happy if there's any frown (negative curvature)
      if (mouthCurvature < 0) {
        happyScore = Math.max(0, happyScore - 2); // Reduce happy score if frowning
      }
      
      // Focused scoring: Normal eye aspect ratio, neutral mouth, normal brows
      // Neutral expression with open eyes
      const isNeutralMouth = mouthCurvature >= -1.0 && mouthCurvature <= 1.5;
      const isNormalEyes = avgEAR >= 0.25 && avgEAR <= 0.32;
      const isNormalBrows = browRatio >= 0.16 && browRatio <= 0.22;
      
      if (isNeutralMouth && isNormalEyes && isNormalBrows) {
        focusedScore += 4; // Perfect neutral/focused
      } else if (isNeutralMouth && isNormalEyes) {
        focusedScore += 2; // Mostly neutral
      } else if (isNormalEyes && mouthCurvature >= -1.5 && mouthCurvature <= 2.0) {
        focusedScore += 1; // Reasonably neutral
      }
      
      // Determine mood based on highest score
      const scores = [
        { mood: 'Tired' as MoodType, score: tiredScore },
        { mood: 'Stressed' as MoodType, score: stressedScore },
        { mood: 'Happy' as MoodType, score: happyScore },
        { mood: 'Focused' as MoodType, score: focusedScore }
      ];
      
      // Sort by score (highest first)
      scores.sort((a, b) => b.score - a.score);
      
      // Log scores for debugging (only occasionally to avoid spam)
      if (detectionCountRef.current % 10 === 0) {
        console.log('[FaceDetection] Mood scores:', {
          Happy: happyScore,
          Stressed: stressedScore,
          Tired: tiredScore,
          Focused: focusedScore,
          Selected: scores[0].mood,
          TopScore: scores[0].score,
          SecondScore: scores[1].score
        });
      }
      
      // If top score is 0, default to Focused
      const topMood = scores[0];
      const secondMood = scores[1];
      
      if (topMood.score === 0) {
        return 'Focused';
      }
      
      // If top score is significantly higher (at least 2 points more), use it
      // Otherwise, if scores are close, prefer Focused for neutral expressions
      if (topMood.score >= 3 && topMood.score >= secondMood.score + 2) {
        return topMood.mood;
      } else if (topMood.score >= 2 && topMood.score >= secondMood.score + 1) {
        return topMood.mood;
      }
      
      // Default to Focused for ambiguous cases or low confidence
      return 'Focused';
    } catch (err) {
      console.error('[FaceDetection] Error in mood analysis:', err);
      return 'Focused';
    }
  };

  // Main detection loop
  const detectLoop = async () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current || !isAnalyzingRef.current || !streamRef.current) {
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
      } catch (playErr: unknown) {
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
      
      let faces: faceLandmarksDetection.Face[] = [];
      let detectionMethod = '';
      let lastError: Error | null = null;

      // Try multiple input formats for maximum compatibility
      // Only log first attempt to avoid console spam
      const shouldLog = detectionCount === 0 || detectionCount % 30 === 0;
      
      try {
        // Method 1: Try canvas directly (most reliable for face-landmarks-detection)
        if (shouldLog) {
          console.log('[FaceDetection] Attempting detection with canvas...');
        }
        faces = await detector.estimateFaces(canvas, { flipHorizontal: false });
        detectionMethod = 'canvas';
        if (shouldLog && faces) {
          console.log(`[FaceDetection] Canvas method returned ${faces.length} faces`);
        }
      } catch (canvasErr: unknown) {
        lastError = canvasErr as Error;
        const canvasError = canvasErr as Error;
        if (shouldLog) {
          console.warn('[FaceDetection] Canvas input failed:', canvasError.message);
        }
        
        try {
          // Method 2: Try video element directly
          if (shouldLog) {
            console.log('[FaceDetection] Attempting detection with video element...');
          }
          faces = await detector.estimateFaces(video, { flipHorizontal: false });
          detectionMethod = 'video';
          if (shouldLog && faces) {
            console.log(`[FaceDetection] Video method returned ${faces.length} faces`);
          }
        } catch (videoErr: unknown) {
          lastError = videoErr as Error;
          const videoError = videoErr as Error;
          if (shouldLog) {
            console.warn('[FaceDetection] Video input also failed:', videoError.message);
          }
          
          try {
            // Method 3: Convert video to tensor using TensorFlow.js
            if (shouldLog) {
              console.log('[FaceDetection] Attempting detection with tensor conversion...');
            }
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
            faces = await detector.estimateFaces(canvas, { flipHorizontal: false });
            detectionMethod = 'tensor';
            if (shouldLog && faces) {
              console.log(`[FaceDetection] Tensor method returned ${faces.length} faces`);
            }
          } catch (tensorErr: unknown) {
            lastError = tensorErr as Error;
            const tensorError = tensorErr as Error;
            if (shouldLog) {
              console.error('[FaceDetection] All detection methods failed:', tensorError);
              console.error('[FaceDetection] Last error details:', {
                message: tensorError.message,
                stack: tensorError.stack,
                name: tensorError.name
              });
            }
          }
        }
      }
      
      // Log detection results (only occasionally to avoid spam)
      if (detectionCountRef.current % 30 === 0) {
        if (faces && faces.length > 0 && detectionMethod) {
          console.log(`[FaceDetection] ✓ Face detected using ${detectionMethod} method (${faces.length} face(s))`);
        } else if (faces && faces.length === 0) {
          console.log(`[FaceDetection] No faces detected (method: ${detectionMethod || 'unknown'})`);
        } else if (lastError) {
          console.warn(`[FaceDetection] Detection failed: ${lastError.message}`);
        }
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
          detectionCountRef.current += 1;
          const currentCount = detectionCountRef.current;
          setDetectionCount(currentCount);
          
          // Log progress every 5 frames for debugging
          if (currentCount % 5 === 0) {
            console.log(`[FaceDetection] Detection count: ${currentCount}/20`);
          }
          
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

          // Analyze mood after collecting enough frames for stability
          // Start analyzing after 10 frames, finalize after 20 frames
          // Use ref value to avoid stale closure issues
          if (currentCount >= 10) {
            try {
              const mood = analyzeMood(keypoints);
              
              // Store mood in history for averaging across frames
              moodHistoryRef.current.push(mood);
              // Keep only last 10 moods for averaging
              if (moodHistoryRef.current.length > 10) {
                moodHistoryRef.current.shift();
              }
              
              // Log the progression
              console.log(`[FaceDetection] Frame ${currentCount}: ${mood}`);

              // Display live feedback on canvas before finalizing
              ctx.font = 'bold 24px Arial';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fillText(`Scanning... ${Math.min((currentCount / 20 * 100), 100).toFixed(0)}%`, 15, 40);

              // Finalize after 20 frames total (approx 0.7-1s at 30fps)
              if (currentCount >= 20) {
                 // Calculate final mood by finding most common mood in recent history
                 // This averages across multiple frames for more stable results
                 const moodCounts: Record<MoodType, number> = {
                   Happy: 0,
                   Stressed: 0,
                   Tired: 0,
                   Focused: 0
                 };
                 
                 moodHistoryRef.current.forEach(m => {
                   moodCounts[m]++;
                 });
                 
                 // Find the mood with highest count (most frequent)
                 const finalMood = (Object.entries(moodCounts) as [MoodType, number][])
                   .sort((a, b) => b[1] - a[1])[0][0];
                 
                 console.log(`[FaceDetection] Finalizing mood: ${finalMood} (from ${moodHistoryRef.current.length} frames)`);
                 console.log(`[FaceDetection] Mood distribution:`, moodCounts);
                 
                 // Display finalized mood
                 ctx.clearRect(0, 0, canvas.width, 60); // Clear header area
                 ctx.fillStyle = 'white';
                 ctx.strokeStyle = 'black';
                 ctx.lineWidth = 4;
                 ctx.strokeText(`Mood: ${finalMood}`, 15, 40);
                 ctx.fillText(`Mood: ${finalMood}`, 15, 40);
                 
                 setDetectedMood(finalMood);
                 detectedMoodRef.current = finalMood;
                 setIsAnalyzing(false);
                 isAnalyzingRef.current = false;
                 
                 // Clear mood history for next detection
                 moodHistoryRef.current = [];

                 // Save mood entry
                 addMoodEntry({
                   date: new Date().toISOString(),
                   mood: finalMood,
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
              }
            } catch (analysisErr) {
              console.error('[FaceDetection] Analysis error:', analysisErr);
            }
          } else if (currentCount > 0) {
             // Show scanning progress
             ctx.font = '16px Arial';
             ctx.fillStyle = 'white';
             ctx.fillText(`Aligning face... ${currentCount}/20`, 15, 40);
          }
        } else {
          console.warn('[FaceDetection] Face detected but no keypoints available');
        }
      } else {
        setFaceDetected(false);
        // Don't reset detection count immediately - allow brief gaps in detection
        // The count will only reset if we consistently fail to detect for many frames
        // This prevents resetting due to brief detection gaps (1-2 frames)
      }
    } catch (err: unknown) {
      const error = err as Error;
      // Only log errors occasionally to avoid spam
      if (detectionCountRef.current % 30 === 0) {
        console.error('[FaceDetection] Detection error:', err);
        console.error('[FaceDetection] Error details:', {
          message: error.message,
          videoReady: video.readyState,
          videoDimensions: `${video.videoWidth}x${video.videoHeight}`,
          canvasDimensions: `${canvas.width}x${canvas.height}`,
          detectorType: detectorRef.current ? 'loaded' : 'null'
        });
      }
      // Don't stop on single error, continue trying
    }

    // Continue the loop only if still analyzing and no mood has been detected
    // Always schedule next frame if still analyzing, even if detection failed
    if (isAnalyzingRef.current && !detectedMoodRef.current) {
      animationRef.current = requestAnimationFrame(() => detectLoop());
    } else if (!isAnalyzingRef.current) {
      // Clean up if we stopped analyzing
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
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
    isAnalyzingRef.current = true;
    setDetectedMood(null);
    detectedMoodRef.current = null;
    setFaceDetected(false);
    detectionCountRef.current = 0;
    setDetectionCount(0);
    moodHistoryRef.current = []; // Reset mood history
    setError('');
    
    // Cancel any existing animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Start the detection loop
    detectLoop();

    // Timeout after 30 seconds
    setTimeout(() => {
      if (isAnalyzingRef.current && !detectedMoodRef.current) {
        setIsAnalyzing(false);
        isAnalyzingRef.current = false;
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
          <div>Model: {isDetectorLoaded ? '✓ Loaded' : 'Loading...'}</div>
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
              disabled={isAnalyzing || !isDetectorReady}
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
