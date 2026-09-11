const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'VPAI-MyGamingPC-2026-SecretKey-ChangeMePlease';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth Middleware
const authenticate = (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (key === API_KEY) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
};

app.post('/api/generate', authenticate, async (req, res) => {
    try {
        const { prompt, image, model = 'llava', task = 'text' } = req.body;
        
        console.log(`[${new Date().toISOString()}] Request received: ${prompt.substring(0, 50)}... Task: ${task}`);

        // If task is image generation, try Stable Diffusion
        if (task === 'image' || task === 'pose') {
            try {
                console.log("Attempting Stable Diffusion generation...");
                // Check if SD is running (Automatic1111 default port)
                const sdResponse = await axios.post('http://localhost:7860/sdapi/v1/txt2img', {
                    prompt: prompt,
                    negative_prompt: "deformed, distorted, disfigured, poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, blurry, low quality, long neck, frame, border, watermark, signature",
                    steps: 25,
                    cfg_scale: 7,
                    width: 768,
                    height: 1024,
                    sampler_name: "Euler a"
                }, { timeout: 30000 });

                if (sdResponse.data && sdResponse.data.images && sdResponse.data.images[0]) {
                    return res.json({
                        image: `data:image/png;base64,${sdResponse.data.images[0]}`,
                        text: "Image generated via Stable Diffusion"
                    });
                }
            } catch (sdError) {
                console.warn("Stable Diffusion not available or failed:", sdError.message);
                // Fallback to Ollama if it was a vision task, but for pure generation we need SD
                if (task === 'image') {
                    throw new Error("Stable Diffusion is required for local image generation. Make sure it's running on port 7860 with --api flag.");
                }
            }
        }

        // Forward to Ollama for text/vision tasks
        const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
            model: model,
            prompt: prompt,
            images: image ? [image.split(',')[1] || image] : [],
            stream: false
        });

        res.json({
            text: ollamaResponse.data.response,
        });
    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 VPAI Proxy Server is running!`);
    console.log(`----------------------------------`);
    console.log(`Local URL: http://localhost:${PORT}`);
    console.log(`API Key:   ${API_KEY}`);
    console.log(`----------------------------------\n`);
    console.log(`1. Make sure Ollama is running (http://localhost:11434)`);
    console.log(`2. If using image generation, make sure Stable Diffusion is running with --api (http://localhost:7860)`);
    console.log(`3. Start your tunnel: cloudflared tunnel --url http://localhost:${PORT}`);
    console.log(`4. Copy the tunnel URL into the VP-Ai web app settings.\n`);
});
