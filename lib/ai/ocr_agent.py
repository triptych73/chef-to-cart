import os
import io
import json
from google import genai
from google.genai import types
from PIL import Image

# Initialize Client
# Assumes GOOGLE_API_KEY is in environment variables
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

MODEL_ID = "gemini-3-flash-preview"

def extract_recipe_from_image(image_path: str) -> dict:
    """
    Extracts structured recipe data from an image using Gemini 3 Flash.
    """
    
    # Load and process image
    try:
        image = Image.open(image_path)
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format=image.format)
        image_bytes = img_byte_arr.getvalue()
    except Exception as e:
        return {"error": f"Failed to load image: {str(e)}"}

    prompt = """
    Analyze this recipe image and extract the following structured data in strict JSON format.
    
    Structure:
    {
        "title": "Recipe Title",
        "servings": 4 (integer, estimate if missing),
        "ingredients": [
            {
                "raw": "1 cup flour",
                "quantity": "1",
                "unit": "cup",
                "name": "flour"
            }
        ],
        "instructions": ["Step 1", "Step 2"],
        "prep_time_minutes": 15 (integer or null),
        "cook_time_minutes": 30 (integer or null)
    }

    Rules:
    1. Normalize amounts (e.g., "a punnet" -> estimate weight if possible, otherwise keep as unit).
    2. Split ingredients into quantity/unit/name intelligently.
    3. Remove fluff text.
    4. Output ONLY valid JSON.
    5. Ensure "ingredients" and "instructions" are ALWAYS present as arrays, even if empty.
    """

    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(
                            data=image_bytes,
                            mime_type="image/jpeg" # Adjust based on actual format if needed
                        ),
                        types.Part.from_text(text=prompt)
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json" 
            )
        )
        
        # Parse JSON
        return json.loads(response.text)

    except Exception as e:
        return {"error": f"Gemini Processing Failed: {str(e)}"}

if __name__ == "__main__":
    # Test execution
    import sys
    if len(sys.argv) > 1:
        print(json.dumps(extract_recipe_from_image(sys.argv[1]), indent=2))
    else:
        print("Usage: python ocr_agent.py <image_path>")
