import { GoogleGenAI, Type, Modality } from "@google/genai";

const PROMPT_ANALYZE_AND_STRUCTURE = `
You are an expert AI front-end developer. Your task is to analyze a UI sketch and create a high-quality, aesthetically pleasing React component based on it.

**Core Task:**
Analyze the provided image and generate a structured JSON response containing a TSX component template and image prompts.

**Component Generation Rules:**
1.  **Component Structure:** Create a single, complete React component in TSX format.
    *   The component MUST be named 'GeneratedComponent'.
    *   It MUST NOT use 'import' or 'export' statements. React and ReactDOM will be available as global variables.
2.  **Rendering:** After the component definition, you MUST include the code to render it to the DOM. The final lines of your TSX code must be exactly:
    \`\`\`
    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);
    root.render(<GeneratedComponent />);
    \`\`\`
3.  **Image Placeholders:** Identify all elements that should be images. In the TSX code, replace their 'src' attributes with unique placeholders (e.g., "##PLACEHOLDER_1##", "##PLACEHOLDER_2##").
4.  **Image Prompts:** Create a list of descriptive text prompts for an image generation model. Each prompt should correspond to a placeholder and be based on the context and any handwritten text in the sketch.

**Interactivity Rules (VERY IMPORTANT):**
*   **Stateful Inputs:** All input fields (like text boxes, emails, etc.) MUST be fully functional using React \`useState\` to manage their state.
*   **Form Submissions:** For any button that submits a form (e.g., "Sign Up," "Join," "Submit"), its \`onClick\` handler MUST first show a confirmation alert with the text "data is submitted" (e.g., \`alert('data is submitted');\`) and then immediately reload the page (\`window.location.reload();\`).
*   **Navigation Links:** Elements in a header or navbar that act as links (e.g., "Login," "Explore," icons for cart or profile) MUST be rendered as \`<a>\` tags with \`href="#"\`. Their \`onClick\` handler MUST call \`event.preventDefault()\` and then show an alert indicating the action (e.g., \`alert('Navigating to the Profile page.');\`).

**Design & CSS Guidelines (VERY IMPORTANT):**
*   **Aesthetic Quality:** The generated component must look like a modern, professionally designed website. Prioritize clean aesthetics, ample spacing, and an excellent user experience. The design should be inspired by the sketch but elevated to a professional level.
*   **Styling Method:** All styling MUST be done using a single \`<style>\` tag within the TSX component. Do not use inline styles.
*   **Layout:** Use modern CSS layout techniques like Flexbox or Grid for arrangement and alignment. Ensure the component's root element fills the entire viewport (\`min-height: 100vh\`).
*   **Navigation Bars:** To separate navbars or headers from content, use subtle shadows (\`box-shadow\`) or distinct background colors. AVOID using harsh \`border-bottom\` lines to create a more seamless, modern look.
*   **Colors & Typography:** Use a tasteful and cohesive color palette. Use a clean, common web font (like system UI fonts) and ensure font sizes and weights are hierarchical and legible.
*   **Hover Effects:** Add subtle hover effects (e.g., \`transition\`, \`transform: scale(1.02)\`, changing background color or opacity) to all interactive elements like buttons and links to make the UI feel responsive and alive.

**Output Format:**
Your entire output must be a single, valid JSON object. Do not wrap it in markdown backticks or any other text. The JSON object must conform to this exact structure:
{
  "tsxTemplate": "<The complete TSX code, including the style tag and render call, as a single string>",
  "imagePrompts": [
    {
      "placeholderId": "<The placeholder ID, e.g., ##PLACEHOLDER_1##>",
      "prompt": "<The descriptive prompt for the image>"
    }
  ]
}
`;


export const generateCodeFromImage = async (base64Image: string, mimeType: string): Promise<{ tsx: string; }> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imagePart = { inlineData: { data: base64Image, mimeType } };

  // --- Step 1: Analyze sketch to get TSX template and image prompts ---
  const analysisResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [{ text: PROMPT_ANALYZE_AND_STRUCTURE }, imagePart] },
  });

  // The model might wrap the JSON in markdown, so we need to extract it.
  let jsonText = analysisResponse.text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.substring(7, jsonText.length - 3).trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.substring(3, jsonText.length - 3).trim();
  }
  
  const analysisResult = JSON.parse(jsonText);
  const tsxTemplate: string = analysisResult.tsxTemplate;
  const imagePrompts: { placeholderId: string; prompt: string; }[] = analysisResult.imagePrompts;

  if (!tsxTemplate || !imagePrompts) {
    throw new Error("The AI failed to analyze the sketch structure. Please try again.");
  }

  // --- Step 2: Generate an image for each prompt in parallel ---
  const imageGenerationPromises = imagePrompts.map(async (p) => {
      const imageResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: p.prompt }] },
          config: {
              responseModalities: [Modality.IMAGE],
          }
      });
      
      const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      
      if (!imagePart || !imagePart.inlineData) {
          // Fallback: return a placeholder or throw an error
          console.warn(`Image generation failed for prompt: ${p.prompt}`);
          return {
            placeholderId: p.placeholderId,
            imageDataUrl: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzk5OSI+RXJyb3I8L3RleHQ+PC9zdmc+`,
          }
      }
      
      const base64ImageData = imagePart.inlineData.data;
      const imageMimeType = imagePart.inlineData.mimeType || 'image/png';
      
      return {
          placeholderId: p.placeholderId,
          imageDataUrl: `data:${imageMimeType};base64,${base64ImageData}`,
      };
  });

  const generatedImages = await Promise.all(imageGenerationPromises);

  // --- Step 3: Replace placeholders in the TSX template with generated images ---
  let finalTsx = tsxTemplate;
  for (const image of generatedImages) {
      finalTsx = finalTsx.replace(new RegExp(image.placeholderId, 'g'), image.imageDataUrl);
  }
  
  return { tsx: finalTsx };
};