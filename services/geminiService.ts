
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Converts a browser File object to a Gemini-compatible inlineData part
const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

// Extracts MIME type and base64 data from a data URL string
const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

// Converts a data URL to a Gemini-compatible inlineData part
const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

// Processes the Gemini API response and extracts the generated image as a data URL
const handleApiResponse = (response: GenerateContentResponse): string => {
    // Check if the request was blocked by safety filters
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    // Traverse candidates and parts to find the generated image payload
    if (response.candidates && response.candidates.length > 0) {
        for (const candidate of response.candidates) {
            if (candidate.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData) {
                        const { mimeType, data } = part.inlineData;
                        return `data:${mimeType};base64,${data}`;
                    }
                }
            }
        }
    }

    // If generation stopped unexpectedly (e.g., safety filters triggered during generation)
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }

    // Fallback to error reporting if no image part was found
    const textFeedback = response.text;
    const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

// Initialize the Gemini client using the mandatory process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
// Use gemini-2.5-flash-image for all multimodal/image generation and editing tasks
const model = 'gemini-2.5-flash-image';

/**
 * Transforms a user photo into a professional full-body fashion model image.
 */
export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = "You are an expert fashion photographer AI. Transform the person in this image into a full-body fashion model photo suitable for an e-commerce website. The background must be a clean, neutral studio backdrop (light gray, #f0f0f0). The person should have a neutral, professional model expression. Preserve the person's identity, unique features, and body type, but place them in a standard, relaxed standing model pose. The final image must be photorealistic. Return ONLY the final image.";
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [userImagePart, { text: prompt }] },
    });
    return handleApiResponse(response);
};

/**
 * Merges a garment image onto a model image for a virtual try-on effect.
 */
export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    const prompt = `You are an expert virtual try-on AI. You will be given a 'model image' and a 'garment image'. Your task is to create a new photorealistic image where the person from the 'model image' is wearing the clothing from the 'garment image'.

**Crucial Rules:**
1.  **Complete Garment Replacement:** You MUST completely REMOVE and REPLACE the clothing item worn by the person in the 'model image' with the new garment. No part of the original clothing (e.g., collars, sleeves, patterns) should be visible in the final image.
2.  **Preserve the Model:** The person's face, hair, body shape, and pose from the 'model image' MUST remain unchanged.
3.  **Preserve the Background:** The entire background from the 'model image' MUST be preserved perfectly.
4.  **Apply the Garment:** Realistically fit the new garment onto the person. It should adapt to their pose with natural folds, shadows, and lighting consistent with the original scene.
5.  **Output:** Return ONLY the final, edited image. Do not include any text.`;
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [modelImagePart, garmentImagePart, { text: prompt }] },
    });
    return handleApiResponse(response);
};

/**
 * Generates an image showing the model and garment from a new specified perspective.
 */
export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `You are an expert fashion photographer AI. Take this image and regenerate it from a different perspective. The person, clothing, and background style must remain identical. The new perspective should be: "${poseInstruction}". Return ONLY the final image.`;
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
    });
    return handleApiResponse(response);
};

/**
 * Adds a graphic design or logo onto an existing garment in an image.
 */
export const applyDesignToClothing = async (baseImageUrl: string, designImageUrl: string, positionContext: string): Promise<string> => {
    const baseImagePart = dataUrlToPart(baseImageUrl);
    const designImagePart = dataUrlToPart(designImageUrl);
    const prompt = `You are an expert digital garment printer AI. 
    1. Take the 'design' provided and print it onto the person's current shirt or top in the 'base image'.
    2. Place the design at the ${positionContext} area of the garment.
    3. Crucially, ensure the design follows the natural folds, shadows, and fabric texture of the garment. It should look like it was screen-printed or embroidered, not like a flat digital overlay.
    4. Keep the person, pose, background, and garment identical to the original, only adding the design.
    5. Return ONLY the final photorealistic image.`;
    
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [baseImagePart, designImagePart, { text: prompt }] },
    });
    return handleApiResponse(response);
};
