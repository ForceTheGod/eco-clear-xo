
import { GoogleGenAI, Type } from "@google/genai";
import { WasteCategory, ClassificationResult } from '../types';
import { WASTE_MAPPINGS, UNKNOWN_INSTRUCTIONS } from '../constants';

class WasteClassifier {
  // We transition from local MobileNet to Gemini API for better reasoning and category mapping.
  // The API-based approach provides superior vision-to-text understanding.
  public async loadModel(): Promise<void> {
    // Gemini API does not require local model loading.
    return Promise.resolve();
  }

  /**
   * Classifies an image-like element (Image, Video, or Canvas) using Gemini Vision
   */
  public async classifyElement(element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<ClassificationResult> {
    const canvas = document.createElement('canvas');
    let width = 0;
    let height = 0;

    if (element instanceof HTMLVideoElement) {
      width = element.videoWidth;
      height = element.videoHeight;
    } else if (element instanceof HTMLImageElement) {
      width = element.naturalWidth;
      height = element.naturalHeight;
    } else {
      width = element.width;
      height = element.height;
    }

    // Default dimensions if source is not yet ready or metadata is missing
    canvas.width = width || 640;
    canvas.height = height || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
    
    // Extract base64 from canvas for the Gemini API
    const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    return this.queryGemini(base64Data);
  }

  /**
   * Classifies an uploaded file by converting it to base64
   */
  public async classify(file: File): Promise<ClassificationResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const base64Data = reader.result.split(',')[1];
          try {
            const result = await this.queryGemini(base64Data);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Sends multimodal request to Gemini 3 for waste analysis
   */
  private async queryGemini(base64Data: string): Promise<ClassificationResult> {
    // Initializing Gemini client with environment API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
              }
            },
            {
              text: `Identify the primary item in this image and classify it into one of these categories: Organic, Plastic, Paper, Metal, Glass, E-waste. If it is none of these or unclear, use 'Unknown'.
              
              Provide a detailed JSON response including:
              - category: The waste category (string).
              - confidence: A numeric score from 0 to 1.
              - label: The common name of the object.
              - reasoning: Why you chose this category.
              - disposalInstructions: Concise steps on how to properly dispose of this item.`
            }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              label: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              disposalInstructions: { type: Type.STRING }
            },
            required: ['category', 'confidence', 'label', 'reasoning', 'disposalInstructions']
          }
        }
      });

      const text = response.text || '{}';
      const data = JSON.parse(text);

      // Map string response back to WasteCategory enum
      const catInput = (data.category || '').toUpperCase().replace('-', '_');
      let category = WasteCategory.UNKNOWN;
      
      if (catInput.includes('ORGANIC')) category = WasteCategory.ORGANIC;
      else if (catInput.includes('PLASTIC')) category = WasteCategory.PLASTIC;
      else if (catInput.includes('PAPER')) category = WasteCategory.PAPER;
      else if (catInput.includes('METAL')) category = WasteCategory.METAL;
      else if (catInput.includes('GLASS')) category = WasteCategory.GLASS;
      else if (catInput.includes('E_WASTE')) category = WasteCategory.E_WASTE;

      return {
        category,
        confidence: data.confidence || 0,
        label: data.label || 'Unknown Item',
        reasoning: data.reasoning || 'Visual analysis complete.',
        disposalInstructions: data.disposalInstructions || UNKNOWN_INSTRUCTIONS
      };
    } catch (error) {
      console.error('Gemini Classification Error:', error);
      throw new Error('Analysis failed. Please check your connection.');
    }
  }
}

export const wasteClassifier = new WasteClassifier();
