import { GoogleGenAI } from "@google/genai";
import { VideoData } from '../types';

// Safely access process.env.API_KEY
const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// Helper to resize image and get base64 string
const processImage = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      // Resize to max 800px width/height
      const maxSize = 800;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxSize) {
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }
      
      // Draw and compress to JPEG 85% quality
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      // Extract base64 data
      resolve(dataUrl.split(',')[1]);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for processing"));
    };
    
    img.src = url;
  });
};

export const analyzeThumbnail = async (thumbnailUrl: string): Promise<string> => {
    if (!ai) {
        throw new Error("Gemini API Key is missing. Please check your environment variables.");
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        let imageRes: Response;
        try {
            imageRes = await fetch(thumbnailUrl, {
                signal: controller.signal,
                credentials: 'omit', 
                mode: 'cors'
            });
        } catch (fetchError: any) {
            if (fetchError.name === 'AbortError') {
                throw new Error("Image download timed out.");
            }
            throw new Error(`Network error fetching image: ${fetchError.message}`);
        } finally {
            clearTimeout(timeoutId);
        }

        if (!imageRes.ok) {
             throw new Error(`Failed to fetch thumbnail (Status: ${imageRes.status})`);
        }
        
        const imageBlob = await imageRes.blob();
        const base64Data = await processImage(imageBlob);
        const model = "gemini-3-flash-preview"; 
        
        const prompt = `
        You are an expert Typography and Graphic Designer.

        Your task is to analyze the **Text/Title Overlay** of the provided YouTube thumbnail to create a "Design Replication Recipe".
        The user wants to recreate this exact typography style (layout, font, colors, effects) using their own text and background.

        **Analyze deeply and be extremely specific (use percentages, specific adjectives like 'Ultra-Condensed', 'Negative Tracking').**

        Output the analysis in this EXACT format:

        ### Text Overlay Recipe: [Descriptive Style Name]
        [Brief description of the style's purpose and vibe]

        ---

        ### 1. 📍 Position & Layout Rules
        *   **Coordinates**: Vertical position (e.g., "Occupies bottom 35-40%"). Margin details (e.g., "Zero margin, touching bottom edge").
        *   **Alignment**: Horizontal alignment. Does it span the full width?
        *   **Rotation**: Exact angle (e.g., "0 degrees").
        *   **Size**: Relative scale (e.g., "Enormous", "1/3 of total height"). Line spacing/stacking density.

        ### 2. 🎨 Color & Hierarchy Strategy
        *   **Primary Fill**: List the color palette (with Hex codes).
        *   **Emphasis Logic**: Explain *why* certain words have certain colors, citing the **actual text visible in the image** as examples.
            *   **[Color Name]**: Applied to... (e.g., "The quote 'TEXT'").
            *   **[Color Name]**: Applied to... (e.g., "The connecting words").
            *   **[Color Name]**: Applied to... (e.g., "The climax word 'TEXT'").
        *   **Pattern**: Narrative flow of colors (e.g. "Left-to-right shift").

        ### 3. 🔠 Font & Styling DNA
        *   **Font Style**: Specific classification (e.g., "Ultra-Condensed Sans-Serif/Gothic").
        *   **Weight**: Thickness (e.g., "Ultra Black / Heavy").
        *   **Spacing (Kerning/Tracking)**: **CRITICAL**. Describe the tracking. (e.g., "Negative tracking, characters touching or overlapping").
        *   **Casing**: Character width/style.

        ### 4. ✨ Effects & Readability (Crucial)
        *   **Stroke/Outline**: Describe thickness and behavior. (e.g., "Super-heavy solid black stroke (~25% width) that merges characters into a single block").
        *   **Shadow**: Drop shadow details.
        *   **Backdrop**: Background containers (if any).

        ---

        ### 5. 🛠 Implementation Summary
        [A concise paragraph on how to rebuild this style: "To match this style: Place... Use... Color... Apply..."]
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: base64Data } },
                    { text: prompt }
                ]
            }
        });

        return response.text || "No analysis generated.";

    } catch (error: any) {
        console.error("Error analyzing thumbnail:", error);
        let msg = error.message || "Failed to analyze thumbnail.";
        if (msg.includes('404') || msg.includes('Not Found')) {
             msg = "The Model 'gemini-3-flash-preview' was not found (404). Please ensure your API Key supports this model.";
        }
        throw new Error(msg);
    }
};

export interface TextSegment {
    text: string;
    color: string;
}

export interface TitleComposition {
    top1: TextSegment;
    top2: TextSegment;
    bottom1: TextSegment;
    bottom2: TextSegment;
}

export const generateThumbnail = async (baseImageBase64: string, styleAnalysis: string, config: TitleComposition): Promise<string> => {
    // Re-initialize to ensure we use the latest API key (from potential manual selection)
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
    if (!apiKey) {
        throw new Error("API Key is missing. Please select a valid API Key.");
    }
    const localAi = new GoogleGenAI({ apiKey });

    // Construct a specific prompt that enforces the user's split text and colors
    const prompt = `
    You are an expert Thumbnail Artist.
    
    TASK: Edit the provided background image to add a High-Impact Text Overlay.
    
    1. **Base Image**: Use the provided image as the background. Do not distort the main subject.
    
    2. **Text Content & Color Mapping**: 
       You MUST write the text in TWO stacked lines, strictly following these content and color rules:
       
       *   **LINE 1 (Top)**:
           *   First part: "${config.top1.text}" -> Color: ${config.top1.color}
           *   Second part: "${config.top2.text}" -> Color: ${config.top2.color}
       
       *   **LINE 2 (Bottom)**:
           *   First part: "${config.bottom1.text}" -> Color: ${config.bottom1.color}
           *   Second part: "${config.bottom2.text}" -> Color: ${config.bottom2.color}

    3. **Style & Layout**: 
       Apply the layout, font weight, strokes, and effects defined in the "Text Overlay Recipe" below, BUT **override the colors** with the specific colors requested above.
       
       ${styleAnalysis}
    
    Output a single high-quality image with the text applied.
    `;

    try {
        // Using gemini-3-pro-image-preview for high quality image generation/editing
        const response = await localAi.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                    // The base image to edit
                    { inlineData: { mimeType: 'image/jpeg', data: baseImageBase64 } },
                    // The instruction prompt
                    { text: prompt }
                ]
            },
            config: {
                // gemini-3-pro-image-preview handles image output automatically when prompted
            }
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from the model.");
        }

        // Search for the image part in the response
        let textResponse = "";
        for (const part of candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
            }
            // Capture text just in case we don't get an image (often refusal reason)
            if (part.text) {
                textResponse += part.text;
            }
        }
        
        // If we got here, no image was found.
        if (textResponse) {
             throw new Error(`Model returned text instead of image (Safety/Refusal): ${textResponse.slice(0, 200)}...`);
        }
        
        throw new Error("The model returned a response, but no image data was found.");

    } catch (error: any) {
        console.error("Generate Thumbnail Error:", error);
        let msg = error.message || "Failed to generate thumbnail.";
        if (msg.includes('404')) {
             msg = "Model 'gemini-3-pro-image-preview' not found. This model requires a specific API key permission.";
        }
        throw new Error(msg);
    }
};

// Placeholder
export const fetchVideosFromChannel = async (channelUrl: string): Promise<VideoData[]> => {
    return []; 
};