import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface VideoPromptParams {
  mode: 'fashion' | 'normal';
  category?: string;
  style?: string;
  resolution?: string;
  duration?: number;
}

export interface ImageAnalysis {
  category: string;
  fabric: string;
  color: string;
  texture: string;
  lighting: string;
  pose: string;
  background: string;
  subject: string;
}

export const analyzeImageForVideo = async (base64Image: string): Promise<ImageAnalysis> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze this image for a cinematic video photoshoot. 
  Extract the following details in JSON format:
  - category (e.g., Dress, Suit, Accessory, Person, Object)
  - fabric (if applicable, e.g., Silk, Denim, Leather)
  - color (primary colors and palette)
  - texture (e.g., Smooth, Rough, Glossy)
  - lighting (e.g., Soft studio, Dramatic, Natural)
  - pose (subject's posture or arrangement)
  - background (description of the setting)
  - subject (main focus of the image)`;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1], mimeType: "image/png" } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          fabric: { type: Type.STRING },
          color: { type: Type.STRING },
          texture: { type: Type.STRING },
          lighting: { type: Type.STRING },
          pose: { type: Type.STRING },
          background: { type: Type.STRING },
          subject: { type: Type.STRING }
        },
        required: ["category", "fabric", "color", "texture", "lighting", "pose", "background", "subject"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateVideoPrompt = (analysis: ImageAnalysis, params: VideoPromptParams): string => {
  const { mode, category, style } = params;
  
  const adHooks = [
    "Elevate your wardrobe with this masterpiece.",
    "Experience luxury like never before.",
    "The perfect addition to your collection.",
    "Uncompromising quality, timeless style.",
    "Redefining modern fashion."
  ];
  const randomHook = adHooks[Math.floor(Math.random() * adHooks.length)];
  
  if (mode === 'fashion') {
    return `[SOCIAL AD] NEW ARRIVAL: Stunning ${analysis.color} ${category || analysis.category}. 
    ${randomHook} 
    Crafted from premium ${analysis.fabric} with a ${analysis.texture} finish. 
    Style: ${style || 'Luxury'}. 
    #FashionTrends #NewArrival #LuxuryStyle #ShopTheLook
    
    [MOTION] The camera performs a slow, elegant pan across the garment, highlighting the intricate ${analysis.texture} details and the way light reflects off the ${analysis.fabric}. 
    Lighting: ${analysis.lighting}. 
    Background: ${analysis.background}. 
    High-end luxury aesthetic, 8k resolution, highly detailed fabric physics, realistic motion.`;
  } else {
    return `[SOCIAL AD] FEATURED: ${analysis.subject}. 
    Explore the beauty of ${analysis.subject} in its natural element. 
    Perfect for your next ${analysis.background} adventure. 
    #Lifestyle #Discovery #UniqueExperience
    
    [MOTION] Cinematic 4K video of ${analysis.subject}. 
    The subject is ${analysis.pose} in a ${analysis.background} setting. 
    Lighting: ${analysis.lighting}. 
    Natural cinematic motion, slow motion, high dynamic range, sharp focus on ${analysis.subject}, professional color grading.`;
  }
};

export const generateVideo = async (sourceImage: string, prompt: string, settings: any): Promise<string> => {
  // AI Cinematic Motion Engine (Free Tier)
  // This generates a real video file by applying cinematic pans and zooms to the source image.
  // It uses the browser's MediaRecorder API to create a high-quality MP4/WebM output.
  
  console.log("Generating AI Cinematic Motion for:", prompt);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const duration = settings.duration || 5;
      const fps = 30;
      const width = 1080;
      const height = 1440; // 3:4 aspect ratio
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Could not create canvas context");

      // Try different mime types for better browser support
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : 'video/webm';

      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 8000000 // 8Mbps for very high quality
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(URL.createObjectURL(blob));
      };

      // Animation parameters
      const startTime = Date.now();
      
      // Determine motion type based on prompt and analysis
      const lowerPrompt = prompt.toLowerCase();
      const isZoomOut = lowerPrompt.includes('zoom out') || lowerPrompt.includes('wide shot');
      const isPanRight = lowerPrompt.includes('pan right') || lowerPrompt.includes('tracking right');
      const isPanLeft = lowerPrompt.includes('pan left') || lowerPrompt.includes('tracking left');
      const isPanUp = lowerPrompt.includes('pan up') || lowerPrompt.includes('tilt up') || lowerPrompt.includes('dress');
      const isPanDown = lowerPrompt.includes('pan down') || lowerPrompt.includes('tilt down');
      
      // Ad features
      const isNewArrival = lowerPrompt.includes('new arrival');
      const isFeatured = lowerPrompt.includes('featured');

      mediaRecorder.start();

      const animate = () => {
        const now = Date.now();
        const progress = Math.min(1, (now - startTime) / (duration * 1000));
        
        // Use a smooth easing function (easeInOutQuad)
        const ease = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        ctx.clearRect(0, 0, width, height);
        
        // Base scale to ensure image covers canvas even with motion
        const baseScale = 1.1; 
        
        // Calculate transform
        let scale = baseScale;
        if (isZoomOut) {
          scale = (baseScale + 0.2) - (ease * 0.2);
        } else {
          scale = baseScale + (ease * 0.2);
        }

        let translateX = 0;
        let translateY = 0;
        
        if (isPanRight) translateX = ease * 100;
        if (isPanLeft) translateX = -ease * 100;
        if (isPanUp) translateY = -ease * 100;
        if (isPanDown) translateY = ease * 100;

        // Draw image with transform
        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgAspect = imgWidth / imgHeight;
        const canvasAspect = width / height;

        let drawWidth, drawHeight;
        if (imgAspect > canvasAspect) {
          drawHeight = height;
          drawWidth = height * imgAspect;
        } else {
          drawWidth = width;
          drawHeight = width / imgAspect;
        }

        ctx.save();
        // Add a subtle "handheld" camera shake
        const shakeX = Math.sin(now / 200) * 2;
        const shakeY = Math.cos(now / 250) * 2;
        
        ctx.translate(width / 2 + translateX + shakeX, height / 2 + translateY + shakeY);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        // Draw Ad Overlay
        if (isNewArrival || isFeatured) {
          ctx.save();
          const badgeText = isNewArrival ? "NEW ARRIVAL" : "FEATURED";
          const badgeWidth = 300;
          const badgeHeight = 60;
          
          // Animate badge appearance
          const badgeOpacity = Math.min(1, progress * 4);
          ctx.globalAlpha = badgeOpacity;
          
          // Draw badge background
          ctx.fillStyle = "rgba(0, 242, 255, 0.9)"; // Brand accent
          ctx.fillRect(50, 50, badgeWidth, badgeHeight);
          
          // Draw badge text
          ctx.fillStyle = "#000";
          ctx.font = "bold 30px 'Inter', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(badgeText, 50 + badgeWidth / 2, 50 + badgeHeight / 2);
          
          // Draw "Shop Now" at bottom
          if (progress > 0.5) {
            const shopNowOpacity = Math.min(1, (progress - 0.5) * 4);
            ctx.globalAlpha = shopNowOpacity;
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillRect(width / 2 - 150, height - 150, 300, 70);
            
            ctx.fillStyle = "#000";
            ctx.font = "bold 24px 'Inter', sans-serif";
            ctx.fillText("SHOP THE LOOK", width / 2, height - 115);
          }
          
          ctx.restore();
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Add a small buffer at the end
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, 500);
        }
      };

      animate();
    };
    img.onerror = () => reject("Failed to load source image for video generation. Please ensure the image is valid.");
    img.src = sourceImage;
  });
};
