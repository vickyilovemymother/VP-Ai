import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Camera, 
  X, 
  RefreshCw, 
  Download, 
  Maximize2, 
  Minimize2, 
  Settings2,
  Zap,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Smartphone,
  Monitor
} from 'lucide-react';
import { PoseLandmarker, ImageSegmenter, FilesetResolver, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

interface VirtualTryOnProps {
  onBack: () => void;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ onBack }) => {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');
  const [isProcessing, setIsProcessing] = useState(false);
  const [segmentationProgress, setSegmentationProgress] = useState(0);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [imageSegmenter, setImageSegmenter] = useState<ImageSegmenter | null>(null);
  const [selectedSize, setSelectedSize] = useState('M');
  const [scale, setScale] = useState(1.0);
  const [offsetY, setOffsetY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [fitMode, setFitMode] = useState<'tight' | 'relaxed'>('relaxed');
  const [showControls, setShowControls] = useState(true);
  const [isIframe, setIsIframe] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const garmentRef = useRef<HTMLImageElement | null>(null);
  const smoothedLandmarks = useRef<any[]>([]);

  // Check if running in iframe
  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  // Initialize MediaPipe Tasks
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
        );
        
        // Init Pose Landmarker
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        setPoseLandmarker(landmarker);

        // Init Image Segmenter for background removal with robust fallbacks
        let segmenter: ImageSegmenter | null = null;
        const modelUrls = [
          "https://storage.googleapis.com/mediapipe-assets/selfie_segmenter.task",
          "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.task",
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm/selfie_segmenter.task"
        ];

        for (const url of modelUrls) {
          if (segmenter) break;
          
          // Try GPU first, then CPU
          for (const delegate of ["GPU", "CPU"] as const) {
            try {
              segmenter = await ImageSegmenter.createFromOptions(vision, {
                baseOptions: {
                  modelAssetPath: url,
                  delegate: delegate
                },
                runningMode: "IMAGE",
                outputCategoryMask: true,
                outputConfidenceMasks: false
              });
              if (segmenter) {
                console.log(`Successfully loaded Image Segmenter from ${url} using ${delegate}`);
                break;
              }
            } catch (e) {
              console.warn(`Failed to load model from ${url} using ${delegate}:`, e);
            }
          }
        }

        if (segmenter) {
          setImageSegmenter(segmenter);
        } else {
          console.error("All Image Segmenter model URLs failed.");
        }

      } catch (err) {
        console.error("Failed to init MediaPipe:", err);
      }
    };
    initMediaPipe();
  }, []);

  const removeBackground = async (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, 0, 0);

        // Try AI Segmentation first
        let processedImageData: ImageData | null = null;
        if (imageSegmenter) {
          try {
            const result = imageSegmenter.segment(img);
            const categoryMask = result.categoryMask;
            if (categoryMask) {
              const maskData = categoryMask.getAsUint8Array();
              const imageData = ctx.getImageData(0, 0, img.width, img.height);
              
              let foundForeground = false;
              for (let i = 0; i < maskData.length; i++) {
                if (maskData[i] > 0) {
                  foundForeground = true;
                  break;
                }
              }

              if (foundForeground) {
                for (let i = 0; i < maskData.length; i++) {
                  const isForeground = maskData[i] > 0;
                  if (!isForeground) {
                    imageData.data[i * 4 + 3] = 0; // Transparent background
                  }
                }
                processedImageData = imageData;
              }
            }
          } catch (err) {
            console.warn("AI Segmentation failed, falling back to color keying:", err);
          }
        }

        // Fallback: Simple color keying (remove white/near-white background)
        if (!processedImageData) {
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // If pixel is very bright (near white), make it transparent
            if (r > 240 && g > 240 && b > 240) {
              data[i + 3] = 0;
            }
          }
          processedImageData = imageData;
        }

        // Auto-Crop to non-transparent bounds
        if (processedImageData) {
          let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
          const data = processedImageData.data;
          
          for (let y = 0; y < img.height; y++) {
            for (let x = 0; x < img.width; x++) {
              const alpha = data[(y * img.width + x) * 4 + 3];
              if (alpha > 10) { // Not fully transparent
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          // Add a small padding
          const padding = 10;
          minX = Math.max(0, minX - padding);
          minY = Math.max(0, minY - padding);
          maxX = Math.min(img.width, maxX + padding);
          maxY = Math.min(img.height, maxY + padding);

          const cropWidth = maxX - minX;
          const cropHeight = maxY - minY;

          if (cropWidth > 0 && cropHeight > 0) {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cropWidth;
            cropCanvas.height = cropHeight;
            const cropCtx = cropCanvas.getContext('2d');
            if (cropCtx) {
              // Put the processed image data back to the original canvas first
              ctx.putImageData(processedImageData, 0, 0);
              // Draw the cropped portion to the new canvas
              cropCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
              resolve(cropCanvas.toDataURL('image/png'));
              return;
            }
          }
        }

        // Fallback if crop fails
        if (processedImageData) {
           ctx.putImageData(processedImageData, 0, 0);
        }
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSegmentationProgress(20);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setSegmentationProgress(50);
      
      try {
        const processedImage = await removeBackground(base64);
        setSegmentationProgress(100);
        
        if (type === 'front') {
          setFrontImage(processedImage);
          setActiveView('front');
        } else {
          setBackImage(processedImage);
        }
      } catch (err) {
        console.error("Background removal failed:", err);
        if (type === 'front') {
          setFrontImage(base64);
        } else {
          setBackImage(base64);
        }
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCameraError = (error: string | DOMException) => {
    console.error("Camera Error:", error);
    if (typeof error === 'string') {
      setCameraError(error);
    } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      setCameraError("Camera access denied. Please enable camera permissions in your browser settings to use Virtual Try-On.");
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      setCameraError("No camera detected. Please connect a webcam or use a device with a camera.");
    } else {
      setCameraError("An error occurred while accessing the camera. Please ensure no other app is using it.");
    }
  };

  const toggleCamera = () => {
    console.log("Toggling camera, current state:", isCameraEnabled);
    if (isCameraEnabled) {
      setIsCameraEnabled(false);
      setIsCameraReady(false);
      setCameraError(null);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    } else {
      setIsCameraEnabled(true);
      setCameraError(null);
    }
  };

  const detectPose = useCallback(() => {
    if (!isCameraEnabled || !poseLandmarker) return;

    if (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4 &&
      canvasRef.current
    ) {
      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const startTimeMs = performance.now();
      const results = poseLandmarker.detectForVideo(video, startTimeMs);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Only overlay if we have a front image
      const activeGarment = frontImage; 
      
      if (results.landmarks && results.landmarks.length > 0 && activeGarment && garmentRef.current) {
        const rawLandmarks = results.landmarks[0];
        
        // Apply smoothing (Exponential Moving Average) to reduce jitter
        const alpha = 0.35; // Slightly smoother
        if (smoothedLandmarks.current.length === 0) {
          smoothedLandmarks.current = [...rawLandmarks];
        } else {
          smoothedLandmarks.current = rawLandmarks.map((point, i) => ({
            x: point.x * alpha + smoothedLandmarks.current[i].x * (1 - alpha),
            y: point.y * alpha + smoothedLandmarks.current[i].y * (1 - alpha),
            z: point.z * alpha + smoothedLandmarks.current[i].z * (1 - alpha),
            visibility: point.visibility
          }));
        }

        const landmarks = smoothedLandmarks.current;
        
        // Key points for garment mapping
        // Since webcam is mirrored, we need to handle x coordinates carefully
        // MediaPipe landmarks are 0-1. If mirrored, x=0.1 is actually x=0.9 on screen.
        const getX = (val: number) => (1 - val) * canvas.width; // Mirror adjustment
        const getY = (val: number) => val * canvas.height;

        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        // Improved visibility check
        const isBodyVisible = leftShoulder.visibility > 0.5 && rightShoulder.visibility > 0.5;

        if (isBodyVisible) {
          const lsX = getX(leftShoulder.x);
          const lsY = getY(leftShoulder.y);
          const rsX = getX(rightShoulder.x);
          const rsY = getY(rightShoulder.y);

          // Calculate garment dimensions based on shoulders
          const shoulderWidth = Math.sqrt(Math.pow(rsX - lsX, 2) + Math.pow(rsY - lsY, 2));

          const centerX = (lsX + rsX) / 2;
          const centerY = (lsY + rsY) / 2;

          // Rotation based on shoulder angle
          const angle = Math.atan2(rsY - lsY, rsX - lsX);

          // Scaling factors
          const sizeMultiplier = SIZES.indexOf(selectedSize) * 0.05 + 1;
          const fitMultiplier = fitMode === 'tight' ? 0.85 : 1.1;
          const finalScale = scale * sizeMultiplier * fitMultiplier;

          const garmentWidth = shoulderWidth * 2.2 * finalScale; // Increased base width for better coverage
          const garmentHeight = garmentWidth * (garmentRef.current.height / garmentRef.current.width);

          ctx.save();
          
          // --- 1. Face/Neck Occlusion Mask ---
          // Prevent garment from drawing over the face/chin
          ctx.beginPath();
          // Create a path covering the entire canvas
          ctx.rect(0, 0, canvas.width, canvas.height);
          
          // Subtract the face area (using nose, eyes, ears, mouth landmarks to form a rough head shape)
          // Landmarks: 0(nose), 1-3(left eye), 4-6(right eye), 7(left ear), 8(right ear), 9-10(mouth)
          if (landmarks[0].visibility > 0.5 && landmarks[7].visibility > 0.5 && landmarks[8].visibility > 0.5) {
            const noseY = getY(landmarks[0].y);
            const leftEarX = getX(landmarks[7].x);
            const rightEarX = getX(landmarks[8].x);
            const headWidth = Math.abs(rightEarX - leftEarX) * 1.5;
            const headHeight = headWidth * 1.2;
            
            // Draw an ellipse around the head (counter-clockwise to subtract from the rect)
            ctx.ellipse(
              centerX, 
              noseY - headHeight * 0.1, // Center slightly above nose
              headWidth / 2, 
              headHeight / 2, 
              0, 
              0, 
              Math.PI * 2, 
              true // Counter-clockwise makes it a hole
            );
          }
          ctx.clip(); // Apply the clipping mask

          // Anchor point: Top-center of the garment should align near the neck/shoulders
          // Since we auto-cropped, the top of the image is the collar.
          // We want the top of the image (-garmentHeight / 2 in the drawImage call if centered) 
          // to be at the shoulder line.
          // Let's change the drawImage call to anchor at the top-center instead of center-center.
          
          let vAdjust = 0;
          // Fine-tune vertical position based on torso height if hips are visible
          if (leftHip.visibility > 0.5 && rightHip.visibility > 0.5) {
            const torsoHeight = Math.abs(getY(leftHip.y) - lsY);
            vAdjust = torsoHeight * 0.05; // Slight downward shift
          }

          ctx.translate(centerX + offsetX, centerY + offsetY + vAdjust);
          ctx.rotate(angle);
          
          // Mirror the garment image horizontally to match the mirrored webcam view
          ctx.scale(-1, 1);

          // Draw the garment with a slight shadow for depth
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetY = 10;

          // Draw image anchored at top-center (x: -width/2, y: 0)
          // We shift it up slightly (-garmentHeight * 0.1) so the collar goes around the back of the neck
          ctx.drawImage(
            garmentRef.current,
            -garmentWidth / 2,
            -garmentHeight * 0.1, 
            garmentWidth,
            garmentHeight
          );
          
          ctx.restore();
          
          // --- 2. Arm Occlusion (Draw arms over garment) ---
          // Create a clipping path for the arms and erase the garment in those areas
          // to reveal the video feed (user's actual arms) underneath.
          ctx.save();
          ctx.beginPath();
          const armWidth = shoulderWidth * 0.25; // Approximate arm width
          
          const addArmToPath = (p1: any, p2: any) => {
             if (p1.visibility > 0.5 && p2.visibility > 0.5) {
                ctx.moveTo(getX(p1.x), getY(p1.y));
                ctx.lineTo(getX(p2.x), getY(p2.y));
             }
          };
          
          // Left arm (shoulder to elbow, elbow to wrist)
          addArmToPath(landmarks[11], landmarks[13]);
          addArmToPath(landmarks[13], landmarks[15]);
          // Right arm
          addArmToPath(landmarks[12], landmarks[14]);
          addArmToPath(landmarks[14], landmarks[16]);
          
          ctx.lineWidth = armWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Erase the garment where the arms are
          ctx.globalCompositeOperation = 'destination-out';
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    requestRef.current = requestAnimationFrame(detectPose);
  }, [poseLandmarker, isCameraEnabled, frontImage, selectedSize, scale, offsetX, offsetY, fitMode]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(detectPose);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [detectPose]);

  const captureImage = () => {
    if (!webcamRef.current || !canvasRef.current) return;
    
    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    if (video) ctx.drawImage(video, 0, 0);
    // Draw overlay
    ctx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `try-on-${Date.now()}.png`;
    link.href = finalCanvas.toDataURL();
    link.click();
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel: Controls */}
      <div className={`w-full lg:w-[400px] border-r border-white/5 bg-zinc-950/50 backdrop-blur-xl flex flex-col transition-all duration-500 z-50 ${showControls ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${!showControls ? 'absolute inset-y-0 left-0 lg:relative' : 'relative'}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-accent/20 rounded-lg flex items-center justify-center text-brand-accent">
              <Zap size={18} />
            </div>
            <h2 className="font-display font-bold text-lg tracking-tight">Virtual Try-On</h2>
          </div>
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} className="text-white/40" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-32 lg:pb-6">
          {/* Step 1: Upload Front & Back */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">1. Garment Images</h3>
            </div>
            
            <div className="p-3 bg-brand-accent/10 border border-brand-accent/20 rounded-xl flex items-start gap-3">
              <AlertCircle size={14} className="text-brand-accent shrink-0 mt-0.5" />
              <p className="text-[10px] text-brand-accent/80 leading-relaxed">
                For best results, upload <strong>flat-lay</strong> garments on a solid white background. Hangers or models in the image may affect the fit.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Front Image Slot */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Front</span>
                  {frontImage && (
                    <button onClick={() => setFrontImage(null)} className="text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                {!frontImage ? (
                  <label className="relative group cursor-pointer block">
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'front')} accept="image/*" />
                    <div className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.02] group-hover:bg-white/[0.04] group-hover:border-brand-accent/20 transition-all flex flex-col items-center justify-center gap-2">
                      <Upload size={20} className="text-white/20 group-hover:text-brand-accent transition-all" />
                      <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Upload Front</span>
                    </div>
                  </label>
                ) : (
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                    <img 
                      src={frontImage} 
                      alt="Front Garment" 
                      className={`w-full h-full object-contain transition-all duration-1000 ${isProcessing && activeView === 'front' ? 'scale-90 blur-sm grayscale' : 'scale-100'}`}
                      onLoad={(e) => {
                        if (activeView === 'front') garmentRef.current = e.currentTarget;
                      }}
                    />
                    {isProcessing && activeView === 'front' && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
                        <RefreshCw size={20} className="text-brand-accent animate-spin" />
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-brand-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${segmentationProgress}%` }}
                          />
                        </div>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-brand-accent text-center">Removing Background...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Back Image Slot */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Back (Opt)</span>
                  {backImage && (
                    <button onClick={() => setBackImage(null)} className="text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                {!backImage ? (
                  <label className="relative group cursor-pointer block">
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'back')} accept="image/*" />
                    <div className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.02] group-hover:bg-white/[0.04] group-hover:border-brand-accent/20 transition-all flex flex-col items-center justify-center gap-2">
                      <Upload size={20} className="text-white/20 group-hover:text-brand-accent transition-all" />
                      <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Upload Back</span>
                    </div>
                  </label>
                ) : (
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                    <img 
                      src={backImage} 
                      alt="Back Garment" 
                      className={`w-full h-full object-contain transition-all duration-1000 ${isProcessing && activeView === 'back' ? 'scale-90 blur-sm grayscale' : 'scale-100'}`}
                    />
                    {isProcessing && activeView === 'back' && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
                        <RefreshCw size={20} className="text-brand-accent animate-spin" />
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-brand-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${segmentationProgress}%` }}
                          />
                        </div>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-brand-accent text-center">Removing Background...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* View Toggle */}
            {(frontImage || backImage) && (
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setActiveView('front')}
                  disabled={!frontImage}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeView === 'front' ? 'bg-brand-accent text-black' : 'text-white/20 hover:text-white/40 disabled:opacity-10'
                  }`}
                >
                  Front View
                </button>
                <button
                  onClick={() => setActiveView('back')}
                  disabled={!backImage}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeView === 'back' ? 'bg-brand-accent text-black' : 'text-white/20 hover:text-white/40 disabled:opacity-10'
                  }`}
                >
                  Back View
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Controls */}
          <div className={`space-y-8 transition-all duration-500 ${!frontImage ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
            {/* Size Selection */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">2. Select Size</h3>
              <div className="grid grid-cols-4 gap-2">
                {SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-2 rounded-xl text-[10px] font-bold transition-all border ${
                      selectedSize === size 
                        ? 'bg-brand-accent border-brand-accent text-black' 
                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Adjustment Sliders */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">3. Fine Tuning</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/20">
                  <span>Scale</span>
                  <span className="text-brand-accent">{Math.round(scale * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.01" 
                  value={scale} 
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-accent"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/20">
                  <span>Vertical Offset</span>
                  <span className="text-brand-accent">{offsetY}px</span>
                </div>
                <input 
                  type="range" 
                  min="-200" 
                  max="200" 
                  step="1" 
                  value={offsetY} 
                  onChange={(e) => setOffsetY(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-accent"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/20">
                  <span>Horizontal Offset</span>
                  <span className="text-brand-accent">{offsetX}px</span>
                </div>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  step="1" 
                  value={offsetX} 
                  onChange={(e) => setOffsetX(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-accent"
                />
              </div>
            </div>

            {/* Fit Mode */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">4. Fit Mode</h3>
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                <button
                  onClick={() => setFitMode('tight')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                    fitMode === 'tight' ? 'bg-white/10 text-white shadow-xl' : 'text-white/20 hover:text-white/40'
                  }`}
                >
                  Tight Fit
                </button>
                <button
                  onClick={() => setFitMode('relaxed')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                    fitMode === 'relaxed' ? 'bg-white/10 text-white shadow-xl' : 'text-white/20 hover:text-white/40'
                  }`}
                >
                  Relaxed
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-zinc-950/80 backdrop-blur-md sticky bottom-0">
          <button 
            onClick={captureImage}
            disabled={!frontImage || !isCameraReady || !!cameraError}
            className="w-full py-4 bg-brand-accent text-black rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale disabled:pointer-events-none"
          >
            <Camera size={18} />
            Capture Try-On
          </button>
        </div>
      </div>

      {/* Right Panel: Live Preview */}
      <div className="flex-1 relative bg-zinc-900 flex items-center justify-center overflow-hidden h-[60vh] lg:h-full">
        <div className="absolute inset-0 flex items-center justify-center">
          {!isCameraEnabled ? (
            <div className="z-20 flex flex-col items-center gap-6 p-8 text-center max-w-md">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                <Camera size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-display font-bold">Camera is Off</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  Turn on your camera to start the live virtual try-on experience.
                </p>
              </div>
              <button 
                onClick={toggleCamera}
                className="px-10 py-4 bg-brand-accent text-black rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,242,255,0.2)]"
              >
                Turn Camera On
              </button>
            </div>
          ) : cameraError ? (
            <div className="z-20 flex flex-col items-center gap-6 p-8 text-center max-w-md">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <AlertCircle size={40} />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Camera Access Denied</h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    {isIframe 
                      ? "Camera access is restricted when running inside a preview window. Please open the app in a new tab to continue."
                      : "We couldn't access your camera. This usually happens when permissions are blocked in your browser settings."}
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-2xl p-4 text-left space-y-3 border border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">How to fix:</p>
                  <ul className="text-[11px] text-white/60 space-y-2 list-disc pl-4">
                    <li><b>CRITICAL:</b> If you are in AI Studio, click <b>"Open in New Tab"</b> below. Camera access is <b>strictly blocked</b> inside the preview iframe.</li>
                    <li>Click the <b>Lock icon</b> 🔒 in your browser's address bar.</li>
                    <li>Ensure <b>Camera</b> is set to <b>"Allow"</b>.</li>
                    <li>If on mobile, check system settings for this browser.</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="w-full py-4 bg-brand-accent text-black rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
                >
                  Open in New Tab
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => window.location.reload()}
                    className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Reload Page
                  </button>
                  <button 
                    onClick={toggleCamera}
                    className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {!isCameraReady && (
                <div className="z-10 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/20 animate-pulse">
                    <Camera size={32} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Initializing Camera...</p>
                </div>
              )}
              
              <Webcam
                ref={webcamRef}
                audio={false}
                mirrored={true}
                onUserMedia={() => {
                  setIsCameraReady(true);
                  setCameraError(null);
                }}
                onUserMediaError={handleCameraError}
                className="w-full h-full object-cover"
                videoConstraints={{
                  facingMode: "user",
                  width: { ideal: 1280 },
                  height: { ideal: 720 }
                }}
              />
              
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            </>
          )}
        </div>

        {/* Overlay HUD */}
        <div className="absolute inset-0 pointer-events-none border-[20px] lg:border-[40px] border-black/20">
          <div className="absolute top-4 lg:top-8 left-4 lg:left-8 flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4">
            <div className="px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isCameraReady ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                {isCameraReady ? 'Live AR Feed' : 'Camera Offline'}
              </span>
            </div>
            {poseLandmarker && !cameraError && isCameraEnabled && (
              <div className="px-4 py-2 bg-brand-accent/20 backdrop-blur-xl border border-brand-accent/30 rounded-2xl flex items-center gap-3">
                <Zap size={14} className="text-brand-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Tracking Active</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-10 lg:bottom-16 right-6 lg:right-12 flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={toggleCamera}
              className={`p-4 lg:p-5 backdrop-blur-2xl border rounded-2xl transition-all flex items-center gap-3 shadow-2xl ${
                isCameraEnabled 
                  ? 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30' 
                  : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/30'
              }`}
            >
              <Camera size={24} />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
                {isCameraEnabled ? 'Turn Off' : 'Turn On'}
              </span>
            </button>
            <button 
              onClick={() => setShowControls(!showControls)}
              className="p-4 lg:p-5 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl text-white/40 hover:text-white hover:border-white/20 transition-all lg:hidden shadow-2xl"
            >
              <Settings2 size={20} />
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <AnimatePresence>
          {!frontImage && !cameraError && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-3 w-[90%] max-w-xs lg:max-w-none text-center justify-center"
            >
              <AlertCircle size={16} className="text-brand-accent shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Upload a garment to start</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
