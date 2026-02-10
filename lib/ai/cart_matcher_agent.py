import os
import json
import sys
from google import genai
from google.genai import types

# Initialize Client
# Assumes GOOGLE_API_KEY is in environment variables
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

MODEL_ID = "gemini-3-flash-preview"

def match_cart_items(shopping_list_json: str, catalog_path: str) -> dict:
    """
    Uses Gemini 3 Flash to match shopping list items to a product catalog.
    """
    
    # Load catalog
    try:
        if not os.path.exists(catalog_path):
            return {"error": f"Catalog file not found at {catalog_path}"}
        with open(catalog_path, 'r') as f:
            catalog = json.load(f)
    except Exception as e:
        return {"error": f"Failed to load catalog: {str(e)}"}

    # Parse shopping list
    try:
        shopping_list = json.loads(shopping_list_json)
    except Exception as e:
        return {"error": f"Failed to parse shopping list: {str(e)}"}

    prompt = f"""
    You are an expert grocery shopping assistant. Your task is to match a list of ingredients from a weekly meal plan to a specific catalog of products from Ocado.

    ### INPUTS:
    1. **Shopping List**: {json.dumps(shopping_list)}
    2. **Product Catalog**: {json.dumps(catalog)}

    ### OBJECTIVES:
    For each item in the Shopping List:
    - Find the **best matching product** from the Catalog.
    - An ingredient like "carrots" should match "Ocado British Carrots".
    - Ignore branding words like "Ocado", "M&S", "British", "Organic" when determining the core ingredient match, but use them to differentiate if multiple options exist.
    - **Determine Confidence**: 
        - "high": Perfect or very strong match (e.g., "whole milk" -> "Ocado British Whole Milk").
        - "medium": A reasonable substitute or slightly ambiguous match (e.g., "linguine" -> "Garofalo Linguine Pasta").
        - "none": No reasonable match exists in the catalog (e.g., "avocados" if not in catalog).
    - **Calculate Cart Quantity**: 
        - Look at the required quantity (e.g., 500g) and the product name/description to estimate how many units to add to the cart.
        - If unsure, default to 1 unit.
        - If match confidence is "none", cart_quantity should be 0.
    - **Reasoning**: Provide a brief one-sentence explanation of why you made this match.

    ### OUTPUT FORMAT:
    You must return a valid JSON object with a single key "matches" containing an array of objects:
    {{
      "matches": [
        {{
          "ingredient": "carrots",
          "quantity_needed": "300g",
          "matched_product_id": "63026011",
          "matched_product_name": "Ocado British Carrots",
          "confidence": "high",
          "cart_quantity": 1,
          "reasoning": "Direct match for carrots in the catalog."
        }},
        ...
      ]
    }}

    Rules:
    - Output ONLY valid JSON.
    - Do not include any text outside the JSON object.
    """

    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[types.Content(parts=[types.Part.from_text(text=prompt)])],
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
    if len(sys.argv) > 1:
        # Use first arg as shopping list JSON and second as catalog path
        shopping_list_input = sys.argv[1]
        
        # If the input looks like a file path, read it
        if os.path.exists(shopping_list_input):
            with open(shopping_list_input, 'r') as f:
                shopping_list_input = f.read()
        
        catalog_file = sys.argv[2] if len(sys.argv) > 2 else "lib/data/ocado-catalog.json"
        
        print(json.dumps(match_cart_items(shopping_list_input, catalog_file), indent=2))
    else:
        print("Usage: python cart_matcher_agent.py <shopping_list_json_or_path> [catalog_path]")
