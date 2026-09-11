import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Garment } from "../types";

async function getAI() {
  const apiKey = (window as any).aistudio?.hasSelectedApiKey ? process.env.API_KEY : import.meta.env.VITE_GEMINI_API_KEY;
  return new GoogleGenAI({ apiKey: apiKey || '' });
}

let currentMode = localStorage.getItem('VPAI_GEN_MODE') || import.meta.env.VITE_MODE || 'gemini';

export function setGenerationMode(mode: 'gemini' | 'local') {
  currentMode = mode;
  localStorage.setItem('VPAI_GEN_MODE', mode);
}

export function getGenerationMode() {
  return currentMode;
}

const LOCAL_PROXY_URL = localStorage.getItem('VPAI_LOCAL_PROXY_URL') || import.meta.env.VITE_LOCAL_PROXY_URL;
const LOCAL_PROXY_KEY = localStorage.getItem('VPAI_LOCAL_PROXY_KEY') || import.meta.env.VITE_LOCAL_PROXY_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function callLocalProxy(prompt: string, image?: string, task: 'text' | 'image' | 'pose' = 'text') {
  if (!LOCAL_PROXY_URL) {
    throw new Error("Local Proxy URL not configured. Open API Settings in the header to set your Cloudflare Tunnel URL.");
  }
  
  // Sanitize URL: Remove trailing slash and ensure protocol
  let baseUrl = LOCAL_PROXY_URL.trim();
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`; // Default to https for tunnels
  }

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LOCAL_PROXY_KEY || ''
      },
      body: JSON.stringify({ prompt, image, task })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(err.error || 'Local Proxy Error');
    }
    
    return await response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error(`Connection Failed: Could not reach your local proxy at ${baseUrl}. \n\nPossible causes:\n1. Your local server is not running.\n2. Your Cloudflare tunnel is down.\n3. The URL in API Settings is incorrect.\n4. Your browser is blocking the request (Mixed Content).`);
    }
    throw error;
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorStr = JSON.stringify(error);
      const isQuotaError = error.message?.includes('429') || 
                          error.message?.includes('RESOURCE_EXHAUSTED') ||
                          errorStr.includes('429') ||
                          errorStr.includes('RESOURCE_EXHAUSTED') ||
                          error.status === 429;
      
      const isTransientError = error.message?.includes('500') || 
                              errorStr.includes('500') ||
                              error.message?.includes('Rpc failed') ||
                              errorStr.includes('Rpc failed') ||
                              error.message?.includes('xhr error') ||
                              errorStr.includes('xhr error');

      if ((isQuotaError || isTransientError) && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        const reason = isQuotaError ? "Quota exceeded" : "Transient server error";
        console.warn(`AI Service: ${reason}. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (isQuotaError) {
        throw new Error("API Quota Exceeded: You've reached the limit for the shared API key. To continue generating high-quality images without limits, please select your own API key in the top bar.");
      }

      if (isTransientError) {
        throw new Error("Server Error: The AI service is currently experiencing high load or a temporary connection issue. Please try again in a few moments.");
      }
      
      throw error;
    }
  }
  throw lastError;
}

export async function generateModelImage(params: {
  gender: string;
  age: string;
  ethnicity: string;
  skinColor: string;
  bodyType: string;
  hairStyle: string;
  faceDetails: string;
  faceExpression: string;
  clothing: string;
  lighting: string;
  mood: string;
  cameraAngle: string;
  background: string;
  customPrompt?: string;
}) {
  const ai = await getAI();
  const basePrompt = `Ultra realistic fashion photography, ${params.gender || 'Female'}, ${params.age || '25'} years old, ${params.ethnicity || 'Caucasian'}, ${params.skinColor || 'Fair'} skin, ${params.bodyType || 'Slim'} body, ${params.hairStyle || 'Long wavy'} hair, ${params.faceDetails || 'Symmetrical'} face, ${params.faceExpression || 'Neutral'} expression, wearing ${params.clothing || 'Casual streetwear'}, ${params.lighting || 'Studio softbox'} lighting, ${params.mood || 'Confident'} mood, ${params.cameraAngle || 'Full body shot'}, ${params.background || 'Studio white background'}, natural skin texture, masterpiece, award-winning photography, extremely detailed, sharp focus, 8k resolution.`;
  
  const finalPrompt = params.customPrompt ? `${basePrompt} ${params.customPrompt}` : basePrompt;
  const mode = currentMode;

  if (mode === 'local') {
    return withRetry(async () => {
      const result = await callLocalProxy(finalPrompt, undefined, 'image');
      // If the local proxy returns an image (e.g. from SD), use it.
      if (result.image) return result.image;
      if (result.text) {
        throw new Error("Local AI (Ollama) returned text instead of an image. For image generation, Stable Diffusion is required on your PC (port 7860).");
      }
      throw new Error("Local Proxy returned no data. Ensure your local server and Stable Diffusion are running.");
    });
  }

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ parts: [{ text: finalPrompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: "1K" // Request higher resolution if supported
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from API");
  });
}

export async function generatePose(baseImageBase64: string, poseDescription: string, background: string, gender: string = 'Female', category: string = 'Full Body') {
  const ai = await getAI();
  // Extract base64 data
  const base64Data = baseImageBase64.split(',')[1];
  
  const backgroundPrompt = background === 'Keep the Same Background' 
    ? 'The background should remain exactly the same as the provided image.'
    : `The background should be: ${background}.`;

  let categoryInstruction = "";
  switch(category) {
    case 'Top Wear':
      categoryInstruction = "Focus on the upper body (waist up). Medium shot. Ensure the top garment is clearly visible and well-framed.";
      break;
    case 'Bottom Wear':
      categoryInstruction = "Focus on the lower body (waist down). Medium shot. Ensure the pants/skirt/bottom garment is clearly visible and well-framed.";
      break;
    case 'Dress':
      categoryInstruction = "Full body shot. Focus on the entire dress, its drape and flow.";
      break;
    case 'Outerwear':
      categoryInstruction = "Full body or three-quarter shot. Focus on the jacket/coat, its texture and layering.";
      break;
    case 'Bra':
    case 'Panty':
    case 'Swimsuit':
      categoryInstruction = "Close-up or medium shot focusing on the intimate wear/swimwear. Ensure realistic skin texture and perfect fit.";
      break;
    case 'Accessories':
      categoryInstruction = "Close-up shot focusing on the accessories (bags, jewelry, etc.).";
      break;
    case 'Headshot':
      categoryInstruction = "Close-up shot of the face and shoulders. Focus on facial features and expression.";
      break;
    default:
      categoryInstruction = "Full body shot. Show the entire person from head to toe.";
  }

  const prompt = `Generate the EXACT SAME ${gender.toUpperCase()} PERSON from the provided image but in a different pose: ${poseDescription}. 

CRITICAL INSTRUCTIONS:
1. You MUST preserve the exact same garment colors, shapes, patterns, and logos as the original image.
2. The clothing must look identical to the reference image. Do not change the outfit.
3. Maintain identical facial features and body proportions.
4. ${backgroundPrompt}
5. ${categoryInstruction}

High-end fashion catalog style, ultra-photorealistic, 8k resolution.`;

  const mode = currentMode;
 
  if (mode === 'local') {
    return withRetry(async () => {
      const result = await callLocalProxy(prompt, baseImageBase64, 'pose');
      if (result.image) return result.image;
      throw new Error("Local AI (Ollama) cannot generate images yet. For pose generation, Stable Diffusion is required on your PC (port 7860).");
    });
  }

  const modelName = "gemini-2.5-flash-image";

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      }],
      config: {
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: modelName.includes("3.1") ? "1K" : undefined
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from API");
  });
}

export async function enhanceImage(imageBase64: string, resolution: 'hq' | '4k', compress: boolean = true): Promise<string> {
  const ai = await getAI();
  
  const qualityInstruction = compress 
    ? "Optimize for high quality while maintaining a reasonable file size."
    : "MAXIMUM QUALITY: Do not compress. Preserve every single pixel of detail, micro-texture, and sharp edge. This is for a high-end production photoshoot.";

  const prompt = resolution === '4k' 
    ? `Upscale and enhance this image to 4K resolution. ${qualityInstruction} Make it ultra-photorealistic, highly detailed, sharp focus, masterpiece quality. Preserve the exact identity, face, pose, clothing, and background perfectly. Only improve the texture, lighting, and resolution quality.`
    : `Enhance this image to high quality. ${qualityInstruction} Make it photorealistic, detailed, and sharp. Preserve the exact identity, face, pose, clothing, and background perfectly. Improve the lighting and texture.`;

  const mode = currentMode;
  if (mode === 'local') {
    return withRetry(async () => {
      const result = await callLocalProxy(prompt, imageBase64, 'image');
      if (result.image) return result.image;
      throw new Error("Local AI cannot enhance images yet. For image enhancement, Stable Diffusion is required on your PC (port 7860).");
    });
  }

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBase64.split(',')[1],
            },
          },
          { text: prompt },
        ],
      }],
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from API");
  });
}

export async function generateDesignerPhotoshoot(
  modelImageBase64: string,
  layers: any[]
) {
  const ai = await getAI();
  
  // If using the system key, we might need to fallback to a model that doesn't require a paid key
  const modelName = (window as any).aistudio?.hasSelectedApiKey ? "gemini-3.1-flash-image-preview" : "gemini-2.5-flash-image";
  
  const parts: any[] = [];
  
  // Add model image as the primary reference
  parts.push({
    inlineData: {
      mimeType: "image/png",
      data: modelImageBase64.split(',')[1],
    }
  });

  let instructions = `You are an expert AI fashion designer and high-end photo retoucher. Your task is to modify the garments on the model in the FIRST image while maintaining absolute photorealism.

CRITICAL CONSTRAINTS:
1. IDENTITY & POSE LOCK: You MUST preserve the exact face, identity, body proportions, skin tone, pose, and camera perspective of the person in the FIRST image.
2. NO CROPPING: The output image MUST have the exact same framing, position, and dimensions as the input image. Do not zoom in or out.
3. BACKGROUND PRESERVATION: Keep the background exactly as it is in the FIRST image.
4. FABRIC DETAIL PRESERVATION: When changing colors or patterns, you MUST preserve all original fabric details: shadows, highlights, folds, wrinkles, and texture. The garment should look "re-dyed" or "re-printed", not replaced by a flat color.

DESIGNER MODE SPECIFICATIONS:
Apply the following modifications to specific garment regions using precise segmentation:
`;

  let imageIndex = 2;

  for (const layer of layers) {
    if (!layer.visible) continue;

    instructions += `\n[REGION: ${layer.category.toUpperCase()}]\n`;
    
    // Type specific instructions
    if (layer.type === 'footwear') {
      instructions += `- FOOTWEAR: Replace the existing shoes with high-end ${layer.name}. Ensure perfect perspective and integration with the floor.\n`;
    } else if (layer.type === 'headwear') {
      instructions += `- HEADWEAR: Add/Replace the headwear with a ${layer.name}. Ensure it sits realistically on the head, casting appropriate shadows on the face/forehead.\n`;
    } else if (layer.type === 'accessory') {
      instructions += `- ACCESSORY: Add a ${layer.name} to the appropriate body part (e.g., wrist for watch, neck for chain). Ensure realistic metallic/material reflections.\n`;
    }

    // Material / Color
    if (layer.material.fabricImage) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: layer.material.fabricImage.split(',')[1],
        }
      });
      instructions += `- FABRIC: Apply the texture from image ${imageIndex} to this region. 
        - Scale: ${layer.material.textureScale || 1}
        - Rotation: ${layer.material.rotation || 0} degrees
        - Requirement: Ensure it wraps realistically around the body, following all 3D contours.\n`;
      imageIndex++;
    } else if (layer.material.colorHex) {
      instructions += `- COLOR: Re-dye this region to the EXACT Hex Code ${layer.material.colorHex}. 
        - Requirement: This is for production, so color accuracy is paramount. 
        - Requirement: Maintain all original shadows, highlights, and micro-folds for a realistic look. The fabric should look identical to the original, just in the new color.\n`;
    }

    // All-over Print Pattern
    if (layer.pattern && layer.pattern.image) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: layer.pattern.image.split(',')[1],
        }
      });
      instructions += `- PATTERN: Apply a SEAMLESS all-over print using image ${imageIndex}. 
        - Scale: ${layer.pattern.scale}
        - Rotation: ${layer.pattern.rotation || 0} degrees
        - Requirement: The pattern MUST follow the garment's 3D contours and folds perfectly.\n`;
      imageIndex++;
    }

    // Graphics / Logos
    for (const graphic of layer.graphics) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: graphic.image.split(',')[1],
        }
      });
      instructions += `- GRAPHIC/LOGO: Replace any existing logos in this region with the graphic from image ${imageIndex}. 
        - Placement: ${graphic.placement}
        - Manual Adjustments: X=${graphic.x}, Y=${graphic.y}, Scale=${graphic.scale}, Rotation=${graphic.rotation || 0} degrees
        - Requirement: The logo detailing is critical for e-commerce. It must be printed onto the fabric, following its curves and wrinkles perfectly. If the input is a PNG with transparency, preserve the transparency.\n`;
      imageIndex++;
    }

    // Prompt-based editing
    if (layer.prompt) {
      instructions += `- ADDITIONAL EDITS: ${layer.prompt}\n`;
    }
  }

  instructions += `\nFINAL QUALITY CHECK:
- The output must be indistinguishable from a real photograph.
- No blurry edges or "pasted-on" looks.
- High-end commercial fashion editorial quality.`;

  parts.push({ text: instructions });

  const mode = currentMode;
  if (mode === 'local') {
    return withRetry(async () => {
      const result = await callLocalProxy(instructions, modelImageBase64, 'image');
      if (result.image) return result.image;
      throw new Error("Local AI cannot generate images yet. For designer photoshoot generation, Stable Diffusion is required on your PC (port 7860).");
    });
  }

  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts }],
        config: {
          imageConfig: {
            aspectRatio: "3:4",
            imageSize: modelName.includes("3.1") ? "1K" : undefined
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image data returned from API");
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      // If we get a 403 on the preview model, try falling back to the stable model
      if (modelName.includes("3.1") && (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED"))) {
        console.warn("Permission denied for 3.1 model, falling back to 2.5-flash-image");
        const fallbackAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || "" });
        const fallbackResponse = await fallbackAi.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: [{ parts }],
          config: {
            imageConfig: {
              aspectRatio: "3:4"
            }
          }
        });
        for (const part of fallbackResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      console.error("Gemini Designer Photoshoot Error:", error);
      throw error;
    }
  });
}

export async function getOutfitRecommendations(selectedGarments: Garment[], allGarments: Garment[]): Promise<Garment[]> {
  const ai = await getAI();
  const prompt = `
    You are a professional fashion stylist. 
    The user has selected the following garments: ${selectedGarments.map(g => g.name).join(', ')}.
    Based on these, suggest 3 more garments from the following catalog that would complete the outfit or look great together:
    ${allGarments.map(g => `ID: ${g.id}, Name: ${g.name}, Category: ${g.category}`).join('\n')}
    
    Return ONLY a JSON array of the IDs of the suggested garments.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const suggestedIds = JSON.parse(response.text || '[]');
    return allGarments.filter(g => suggestedIds.includes(g.id));
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
}

export async function processTryOnJob(
  userImageBase64: string,
  garments: any[],
  prompt: string = "High-end fashion editorial, studio lighting."
) {
  const ai = await getAI();
  
  // High-quality model for production
  const modelName = (window as any).aistudio?.hasSelectedApiKey ? "gemini-3.1-flash-image-preview" : "gemini-2.5-flash-image";
  
  const parts: any[] = [];
  
  // 1. Preprocessing: Add user image
  parts.push({
    inlineData: {
      mimeType: "image/png",
      data: userImageBase64.split(',')[1],
    }
  });

  let instructions = `You are a production-scale Virtual Try-On AI Engine. 
Your goal is to perform a photorealistic garment transfer from the provided garment images onto the person in the FIRST image.

CRITICAL PRODUCTION CONSTRAINTS:
1. IDENTITY LOCK: Preserve the exact face, skin tone, and body proportions of the person in the FIRST image.
2. POSE LOCK: Maintain the exact pose and camera angle.
3. SEAMLESS BLENDING: The garments must look like they were physically worn during the photoshoot. Pay extreme attention to shadows, folds, and skin-garment intersections (necklines, cuffs, waistlines).
4. FABRIC REALISM: Preserve the texture and material properties of the garments.

GARMENT MAPPING:
`;

  let imageIndex = 2;
  for (const garment of garments) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: garment.imageUrl.split(',')[1],
      }
    });
    instructions += `- Map the garment in image ${imageIndex} (${garment.category}) onto the corresponding body region. 
      - Category: ${garment.category}
      - Brand: ${garment.brand || 'Premium'}
      - Requirement: Ensure perfect alignment with the body's 3D form.\n`;
    imageIndex++;
  }

  instructions += `\nENVIRONMENT & MOOD: ${prompt}
\nFINAL OUTPUT: 4K resolution, photorealistic, commercial fashion quality.`;

  parts.push({ text: instructions });

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts }],
      config: {
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: modelName.includes("3.1") ? "1K" : undefined
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI Pipeline failed to generate result");
  });
}

export async function generatePhotoshoot(
  modelImageBase64: string,
  topWearImageBase64: string | null,
  bottomWearImageBase64: string | null,
  dressImageBase64: string | null,
  prompt: string
) {
  const ai = await getAI();
  
  // Use professional preview model if API key is present
  const modelName = (window as any).aistudio?.hasSelectedApiKey ? "gemini-3.1-flash-image-preview" : "gemini-2.5-flash-image";
  
  const parts: any[] = [];
  
  // Add model image
  parts.push({
    inlineData: {
      mimeType: "image/png",
      data: modelImageBase64.split(',')[1],
    }
  });

  let instructions = `You are an expert AI fashion photographer and retoucher. Your task is to perform a virtual photoshoot using high-fidelity garment transfer.

CRITICAL IDENTITY & PERSPECTIVE LOCK:
- You MUST preserve the exact face, identity, body proportions, and skin tone of the person in the FIRST image.
- You MUST lock and preserve the exact pose and camera perspective of the FIRST image.
- You MUST lock and preserve the background and lighting style of the FIRST image.

MATERIAL & TEXTURE FIDELITY:
- LACE & SHEER: If the garment is lace or contains sheer panels, you MUST maintain the realistic translucency and intricate patterns. Skin should be subtly visible through sheer areas.
- SHINY & SATIN: For silk, satin, or shiny fabrics, preserve the high-specular highlights and realistic sheen.
- VELVET: For velvet, capture the deep, light-absorbing soft texture and rich color depth.
- TRANSPARENT BACKGROUNDS: If a garment image has a transparent background, ignore the transparent area and only transfer the garment itself.

GARMENT REPLACEMENT INSTRUCTIONS:
`;

  let imageIndex = 2;

  if (topWearImageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: topWearImageBase64.split(',')[1],
      }
    });
    instructions += `- TOP WEAR: Replace the existing top wear with the garment shown in image ${imageIndex}. Ensure realistic draping, lighting, and perfect edge blending around the skin. If it's lace/sheer, ensure skin shows through realistically.\n`;
    imageIndex++;
  }
  
  if (bottomWearImageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: bottomWearImageBase64.split(',')[1],
      }
    });
    instructions += `- BOTTOM WEAR: Replace the existing bottom wear with the garment shown in image ${imageIndex}. Ensure realistic fit, folds, and shadows. Maintain material properties like velvet softness or satin sheen.\n`;
    imageIndex++;
  }

  if (dressImageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: dressImageBase64.split(',')[1],
      }
    });
    instructions += `- FULL DRESS: Replace the entire outfit with the dress shown in image ${imageIndex}. Ensure realistic fit, draping across the body contours, and accurate shadows.\n`;
    imageIndex++;
  }

  if (!topWearImageBase64 && !bottomWearImageBase64 && !dressImageBase64) {
    instructions += `- Keep the original clothing, but apply the lighting and environment changes requested.\n`;
  }

  instructions += `\nUSER PROMPT (Lighting, Environment, Fashion Mood):\n${prompt || 'High-end fashion editorial, studio lighting.'}\n\nCRITICAL QUALITY REQUIREMENTS:\n- The output MUST be photorealistic, ultra-high definition, 4K/8K resolution quality.\n- Ensure sharp focus, intricate details, realistic skin texture, and professional studio lighting.\n- The final image must look like a high-end commercial fashion editorial, masterpiece. Do not allow any blurring, distortion, or artificial artifacts at garment edges.`;

  parts.push({ text: instructions });

  const mode = currentMode;
  if (mode === 'local') {
    return withRetry(async () => {
      const result = await callLocalProxy(instructions, modelImageBase64, 'image');
      if (result.image) return result.image;
      throw new Error("Local AI cannot generate images yet. For photoshoot generation, Stable Diffusion is required on your PC (port 7860).");
    });
  }

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts }],
      config: {
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: modelName.includes("3.1") ? "1K" : undefined
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from API");
  });
}
