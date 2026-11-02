// src/lib/aiWatercolor.functions.ts
import { createServerFn } from "@tanstack/react-start";

export interface GenerateWatercolorInput {
  city: string;
  userPrompt: string;
  weatherDesc?: string | undefined;
}

export interface GenerateWatercolorResult {
  imageUrl: string;
  prompt: string;
}

export const generateWatercolorFn = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateWatercolorInput) => input)
  .handler(async ({ data }): Promise<GenerateWatercolorResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("Missing LOVABLE_API_KEY on the server.");
    }

    const { city, userPrompt, weatherDesc } = data;

    if (!city || !userPrompt) {
      throw new Error("City name and prompt description are required.");
    }

    const enhancedPrompt = [
      `Vibrant artistic watercolor painting of landmark scenery in ${city}.`,
      weatherDesc ? `Weather mood: ${weatherDesc}.` : "",
      `Scene details: ${userPrompt}.`,
      "Style: fluid wet-in-wet watercolor wash, visible paper texture, luminous atmospheric lighting, rich pigment blooms, loose painterly brushwork, cinematic panoramic composition, no text, no watermarks.",
    ]
      .filter(Boolean)
      .join(" ");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-image-2.5-sunburst",
        prompt: enhancedPrompt,
        size: "1024x1024",
        n: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway Image Generation error:", errorText);
      throw new Error("AI image generation failed. Please try again.");
    }

    const resJson = await response.json();
    const b64 = resJson.data?.[0]?.b64_json;
    const directUrl = resJson.data?.[0]?.url;

    const imageUrl = b64
      ? `data:image/png;base64,${b64}`
      : directUrl || "";

    if (!imageUrl) {
      throw new Error("No image was returned from the model.");
    }

    return { imageUrl, prompt: enhancedPrompt };
  });
