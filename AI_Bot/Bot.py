from flask import Flask, request, jsonify
from flask_cors import CORS
from clarifai_grpc.channel.clarifai_channel import ClarifaiChannel
from clarifai_grpc.grpc.api import resources_pb2, service_pb2, service_pb2_grpc
from clarifai_grpc.grpc.api.status import status_code_pb2
from openai import OpenAI
import base64
import time
import uuid
import os
import json
from dotenv import load_dotenv

from flasgger import Swagger
load_dotenv()

app = Flask(__name__)
CORS(app)

swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/api-docs/apispec.json',
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api-docs/"  
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "AI Nutrition Agent API",
        "description": """
## 🤖 Intelligent Nutrition Advisory API

### Key Features:
* 📸 **Food Analysis from Images** - Recognition and nutritional assessment
* 🔍 **Multi-dish Comparison** - Ranking by healthiness
* 📊 **Calorie Tracking** - Daily calorie monitoring
* 🍽️ **Meal Suggestions** - AI-generated personalized menus
* 🤖 **Automated AI Agent** - Intent analysis and execution

### AI Agent Mode:
Use `/api/agent` for AI to automatically analyze intent, select functions, and execute.
        """,
        "version": "2.0.0",
        "contact": {
            "name": "API Support",
            "email": "support@nutrition-ai.vn"
        }
    },
    "host": "localhost:5001",
    "basePath": "/",
    "schemes": ["http", "https"],
    "tags": [
        {"name": "AI Agent", "description": "🤖 Automated AI Agent"},
        {"name": "Food Analysis", "description": "📸 Food Analysis"},
        {"name": "Calorie Tracking", "description": "📊 Calorie Tracking"},
        {"name": "Meal Planning", "description": "🍽️ Meal Planning"},
        {"name": "AI Chat", "description": "💬 AI Chat"},
        {"name": "User Management", "description": "👤 User Management"}
    ]
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

CLARIFAI_PAT = os.getenv("CLARIFAI_PAT")
CLARIFAI_USER_ID = os.getenv("CLARIFAI_USER_ID")
CLARIFAI_APP_ID = os.getenv("CLARIFAI_APP_ID")
CLARIFAI_WORKFLOW_ID = os.getenv("CLARIFAI_WORKFLOW_ID")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

channel = ClarifaiChannel.get_grpc_channel()
stub = service_pb2_grpc.V2Stub(channel)
metadata = (("authorization", "Key " + CLARIFAI_PAT),)

conversations = {}
user_profiles = {}

AGENT_SYSTEM_PROMPT = """You are Vietnam's intelligent nutrition AI Agent with the following capabilities:

🤖 MAIN TASKS:
- Analyze user intent from questions/requests
- Automatically suggest the most suitable functions
- Execute multiple tasks sequentially if needed
- Learn from conversation context

🎯 AVAILABLE FUNCTIONS:
1. analyze_food - Analyze food from images
2. compare_foods - Compare multiple dishes
3. track_calories - Track daily calories
4. quick_scan - Quick scan for food recognition
5. meal_suggestion - Suggest meals for one serving
6. weekly_menu - Create weekly menu plan
7. detailed_recipes - Detailed cooking recipes
8. chat - Free consultation

📋 INTENT ANALYSIS RULES:
- If image provided → prioritize analyze_food or quick_scan
- If multiple images → compare_foods or track_calories
- If asking about menu → meal_suggestion or weekly_menu
- If asking about recipes → detailed_recipes
- If general chat → chat

🔄 AUTOMATION CAPABILITIES:
- Detect missing information and ask again
- Suggest next steps after each task
- Combine multiple functions if appropriate
- Learn user preferences

💡 STYLE:
- Friendly, proactive suggestions
- Explain reasons for function selection
- Provide multiple options for users
- Prioritize Vietnamese dishes"""

AVAILABLE_FUNCTIONS = [
    {
        "name": "analyze_food",
        "description": "Analyze one dish in detail from an image. Use when user sends a food image and wants nutritional information and suitability assessment.",
        "parameters": {
            "type": "object",
            "properties": {
                "image": {"type": "string", "description": "Base64 of food image"},
                "health_condition": {"type": "string", "description": "Health condition", "default": "healthy"},
                "dietary_goals": {"type": "string", "description": "Dietary goals", "default": "maintain weight"}
            },
            "required": ["image"]
        }
    },
    {
        "name": "compare_foods",
        "description": "Compare multiple dishes (2-4 dishes). Use when user sends multiple images and wants to know which dish is better.",
        "parameters": {
            "type": "object",
            "properties": {
                "images": {"type": "array", "items": {"type": "string"}, "description": "Array of base64 images"},
                "health_condition": {"type": "string", "description": "Health condition", "default": "healthy"}
            },
            "required": ["images"]
        }
    },
    {
        "name": "track_calories",
        "description": "Track total daily calories from multiple meals. Use when user wants to check calories consumed.",
        "parameters": {
            "type": "object",
            "properties": {
                "images": {"type": "array", "items": {"type": "string"}, "description": "Images of meals throughout the day"},
                "target_calories": {"type": "integer", "description": "Daily calorie target", "default": 2000},
                "health_condition": {"type": "string", "description": "Health condition", "default": "healthy"}
            },
            "required": ["images"]
        }
    },
    {
        "name": "quick_scan",
        "description": "Quick scan for food recognition. Use when user only wants to know the dish name without detailed analysis.",
        "parameters": {
            "type": "object",
            "properties": {
                "image": {"type": "string", "description": "Base64 of food image"}
            },
            "required": ["image"]
        }
    },
    {
        "name": "meal_suggestion",
        "description": "Suggest menu for one meal. Use when user asks 'what should I eat', 'suggest a dish for lunch'.",
        "parameters": {
            "type": "object",
            "properties": {
                "meal_time": {"type": "string", "description": "Which meal (breakfast/lunch/dinner)", "default": "lunch"},
                "health_condition": {"type": "string", "description": "Health condition", "default": "healthy"},
                "dietary_preferences": {"type": "string", "description": "Dietary preferences", "default": "none"},
                "budget_range": {"type": "string", "description": "Budget", "default": "100k"},
                "cooking_time": {"type": "string", "description": "Cooking time", "default": "30 minutes"}
            }
        }
    },
    {
        "name": "weekly_menu",
        "description": "Create a full week menu (7 days). Use when user wants to plan meals for multiple days.",
        "parameters": {
            "type": "object",
            "properties": {
                "health_condition": {"type": "string", "description": "Health condition", "default": "healthy"},
                "dietary_preferences": {"type": "string", "description": "Dietary preferences", "default": "none"},
                "budget_range": {"type": "string", "description": "Daily budget", "default": "500k"},
                "cooking_time": {"type": "string", "description": "Cooking time", "default": "45 minutes"}
            }
        }
    },
    {
        "name": "detailed_recipes",
        "description": "Create detailed cooking recipes with ingredients and steps. Use when user asks 'how to make dish X'.",
        "parameters": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "Number of days to create recipes for", "default": 3},
                "health_condition": {"type": "string", "description": "Health condition", "default": "healthy"},
                "dietary_preferences": {"type": "string", "description": "Dietary preferences", "default": "none"},
                "budget_range": {"type": "string", "description": "Budget", "default": "500k"}
            }
        }
    }
]

def recognize_food_with_clarifai(image_base64):
    try:
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        image_bytes = base64.b64decode(image_base64)
        
        userDataObject = resources_pb2.UserAppIDSet(
            user_id=CLARIFAI_USER_ID,
            app_id=CLARIFAI_APP_ID
        )
        
        post_workflow_response = stub.PostWorkflowResults(
            service_pb2.PostWorkflowResultsRequest(
                user_app_id=userDataObject,
                workflow_id=CLARIFAI_WORKFLOW_ID,
                inputs=[
                    resources_pb2.Input(
                        data=resources_pb2.Data(
                            image=resources_pb2.Image(base64=image_bytes)
                        )
                    )
                ]
            ),
            metadata=metadata
        )
        
        if post_workflow_response.status.code != status_code_pb2.SUCCESS:
            raise Exception(f"Clarifai Error: {post_workflow_response.status.description}")
        
        results = post_workflow_response.results[0]
        detected_foods = []
        
        for output in results.outputs:
            if output.data.concepts:
                for concept in output.data.concepts:
                    if concept.value > 0.5:
                        detected_foods.append({
                            "name": concept.name,
                            "confidence": round(concept.value * 100, 2)
                        })
        
        seen = set()
        unique_foods = []
        for f in detected_foods:
            if f["name"] not in seen:
                unique_foods.append(f)
                seen.add(f["name"])
        
        return unique_foods
        
    except Exception as e:
        print(f"❌ Clarifai Error: {str(e)}")
        return []


def call_openai_vision(prompt, images, max_tokens=1500):
    try:
        content = [{"type": "text", "text": prompt}]
        
        for img in images:
            if ',' in img:
                img = img.split(',')[1]
            if not img.startswith('data:image'):
                img = f"data:image/jpeg;base64,{img}"
            
            content.append({
                "type": "image_url",
                "image_url": {"url": img, "detail": "high"}
            })
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": content}],
            max_tokens=max_tokens,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        raise Exception(f"OpenAI Vision Error: {str(e)}")


def call_openai_text(prompt, model="gpt-4o", max_tokens=1500):
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}")


def analyze_user_intent(message, images=None, conversation_history=None):
    try:
        context = f"""
Analyze the user's request and suggest the most suitable function.

**User message:** {message}
**Attached images:** {"Yes, " + str(len(images)) + " image(s)" if images else "No"}
**Conversation history:** {conversation_history[-3:] if conversation_history else "None"}

**Available functions:**
{json.dumps([{"name": f["name"], "description": f["description"]} for f in AVAILABLE_FUNCTIONS], ensure_ascii=False, indent=2)}

Return JSON with the following structure:
{{
    "intent": "suitable_function_name",
    "confidence": 0.0-1.0,
    "suggested_params": {{...}},
    "explanation": "Brief explanation of why this function was chosen",
    "alternative_actions": ["alternative_function_1", "alternative_function_2"],
    "missing_info": ["additional_information_needed"],
    "next_suggestions": ["suggested_next_actions"]
}}

Examples:
- User: "How many calories is this dish?" + with image → intent: "analyze_food"
- User: "What should I eat for lunch?" → intent: "meal_suggestion"
- User: "Compare these 2 dishes" + multiple images → intent: "compare_foods"
"""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                {"role": "user", "content": context}
            ],
            max_tokens=800,
            temperature=0.3
        )
        
        result_text = response.choices[0].message.content.strip()
        
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        intent_result = json.loads(result_text)
        return intent_result
        
    except Exception as e:
        print(f"❌ Intent Analysis Error: {str(e)}")
        return {
            "intent": "chat",
            "confidence": 0.5,
            "suggested_params": {},
            "explanation": "Unable to analyze intent, switching to general chat",
            "alternative_actions": [],
            "missing_info": [],
            "next_suggestions": []
        }


def execute_function(function_name, params):
    try:
        if function_name == "analyze_food":
            return internal_analyze_food(
                params.get("image"),
                params.get("health_condition", "healthy"),
                params.get("dietary_goals", "maintain weight")
            )
        elif function_name == "compare_foods":
            return internal_compare_foods(params.get("images"), params.get("health_condition", "healthy"))
        elif function_name == "track_calories":
            return internal_track_calories(
                params.get("images"),
                params.get("target_calories", 2000),
                params.get("health_condition", "healthy")
            )
        elif function_name == "quick_scan":
            return internal_quick_scan(params.get("image"))
        elif function_name == "meal_suggestion":
            return internal_meal_suggestion(
                params.get("meal_time", "lunch"),
                params.get("health_condition", "healthy"),
                params.get("dietary_preferences", "none"),
                params.get("budget_range", "100k"),
                params.get("cooking_time", "30 minutes")
            )
        elif function_name == "weekly_menu":
            return internal_weekly_menu(
                params.get("health_condition", "healthy"),
                params.get("dietary_preferences", "none"),
                params.get("budget_range", "500k"),
                params.get("cooking_time", "45 minutes")
            )
        elif function_name == "detailed_recipes":
            return internal_detailed_recipes(
                params.get("days", 3),
                params.get("health_condition", "healthy"),
                params.get("dietary_preferences", "none"),
                params.get("budget_range", "500k")
            )
        else:
            return {"error": f"Function {function_name} does not exist"}
    except Exception as e:
        return {"error": str(e)}


def internal_analyze_food(image, health_condition, dietary_goals):
    """
    Analyze food and return new data structure suitable for UI
    """
    import time
    start_time = time.time()
    
    # Step 1: Recognize food using Clarifai
    detected_foods = recognize_food_with_clarifai(image)
    if not detected_foods:
        return {"error": "Unable to recognize food"}
    
    # Step 2: Create prompt for detailed analysis
    food_list = ", ".join([f"{f['name']} ({f['confidence']}%)" for f in detected_foods])
    
    prompt = f"""You are a nutrition expert. Analyze the following food for someone with {health_condition} condition, goal: {dietary_goals}.

Detected dishes: {food_list}

Return JSON with the following structure (NO markdown, NO text outside JSON):
{{
    "recognized_foods": [
        {{
            "name": "dish name in English or Vietnamese",
            "category": "type (e.g., Carbohydrates, Proteins, Vegetables, Fruits, Healthy Fats, Sweetener)",
            "weight": "estimated weight (e.g., 150g, 200ml)",
            "confidence": 95
        }}
    ],
    "nutrition_analysis": {{
        "calories": {{"value": 450, "unit": "kcal"}},
        "protein": {{"value": 8, "unit": "g"}},
        "carbs": {{"value": 78, "unit": "g"}},
        "fat": {{"value": 12, "unit": "g"}},
        "fiber": {{"value": 5, "unit": "g"}},
        "sugar": {{"value": 35, "unit": "g"}},
        "sodium": {{"value": 520, "unit": "mg"}},
        "cholesterol": {{"value": 45, "unit": "mg"}}
    }},
    "ai_insights": [
        "Insight 1 about the dish",
        "Insight 2 about nutrition",
        "Insight 3 - recommendations"
    ]
}}

Notes:
- recognized_foods: List of actual foods in the image, not from Clarifai
- category: Classification by main nutrition group
- weight: Reasonable weight estimate
- nutrition_analysis: Calculate TOTAL nutrition of ALL dishes in the image
- ai_insights: 3-4 brief, concise sentences with appropriate emojis"""
    
    # Step 3: Call OpenAI Vision for analysis
    try:
        response_text = call_openai_vision(prompt, [image], max_tokens=1500)
        
        # Process response to extract JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        # Parse JSON
        analysis_data = json.loads(response_text)
        
        # Calculate processing time
        processing_time = round(time.time() - start_time, 1)
        
        # Return result in new format
        return {
            "message": "Food analysis completed successfully",
            "data": {
                "session_id": str(uuid.uuid4()),
                "status": "complete",
                "processing_time": f"{processing_time}s",
                "recognized_foods": analysis_data.get("recognized_foods", []),
                "nutrition_analysis": analysis_data.get("nutrition_analysis", {}),
                "health_condition": health_condition,
                "dietary_goals": dietary_goals,
                "recommendations": analysis_data.get("ai_insights", [])
            }
        }
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON Parse Error: {str(e)}")
        print(f"Response text: {response_text}")
        
        # Fallback: Return sample data if parse fails
        return {
            "message": "Food analysis completed successfully (fallback mode)",
            "data": {
                "session_id": str(uuid.uuid4()),
                "status": "complete",
                "processing_time": "1.5s",
                "recognized_foods": [
                    {
                        "name": detected_foods[0]["name"],
                        "category": "Unknown",
                        "weight": "200g",
                        "confidence": detected_foods[0]["confidence"]
                    }
                ],
                "nutrition_analysis": {
                    "calories": {"value": 0, "unit": "kcal"},
                    "protein": {"value": 0, "unit": "g"},
                    "carbs": {"value": 0, "unit": "g"},
                    "fat": {"value": 0, "unit": "g"},
                    "fiber": {"value": 0, "unit": "g"},
                    "sugar": {"value": 0, "unit": "g"},
                    "sodium": {"value": 0, "unit": "mg"},
                    "cholesterol": {"value": 0, "unit": "mg"}
                },
                "health_condition": health_condition,
                "dietary_goals": dietary_goals,
                "recommendations": [
                    "⚠️ Error occurred during detailed analysis, please try again"
                ]
            }
        }
    except Exception as e:
        print(f"❌ Analysis Error: {str(e)}")
        return {"error": f"Analysis error: {str(e)}"}


def internal_compare_foods(images, health_condition):
    all_detected = []
    for idx, img in enumerate(images):
        foods = recognize_food_with_clarifai(img)
        all_detected.append({"dish_number": idx + 1, "foods": foods})
    
    dishes_summary = "\n".join([
        f"- Dish {d['dish_number']}: {', '.join([f['name'] for f in d['foods']])}"
        for d in all_detected
    ])
    
    prompt = f"""Compare {len(images)} dishes for someone with {health_condition} condition.
Dishes: {dishes_summary}

Return:
1. Comparison table of calories, protein, carbs
2. Ranking from best → worst
3. Recommendation on which dish to choose"""
    
    comparison = call_openai_vision(prompt, images, max_tokens=2000)
    
    return {
        "detected_foods": all_detected,
        "comparison": comparison,
        "total_foods": len(images)
    }


def internal_track_calories(images, target_calories, health_condition):
    daily_meals = []
    meal_names = ["Breakfast", "Lunch", "Dinner", "Snack"]
    
    for idx, img in enumerate(images):
        meal_name = meal_names[idx] if idx < len(meal_names) else f"Meal {idx + 1}"
        foods = recognize_food_with_clarifai(img)
        daily_meals.append({"meal_name": meal_name, "foods": foods})
    
    meals_summary = "\n".join([
        f"- {m['meal_name']}: {', '.join([f['name'] for f in m['foods']])}"
        for m in daily_meals
    ])
    
    prompt = f"""Track calories for someone with {health_condition} condition.
Target: {target_calories} kcal
Meals: {meals_summary}

Return:
1. Total calories consumed
2. Comparison with target (deficit/surplus amount)
3. Nutrition distribution
4. Adjustment suggestions"""
    
    tracking = call_openai_vision(prompt, images, max_tokens=2000)
    
    return {
        "daily_meals": daily_meals,
        "tracking": tracking,
        "target_calories": target_calories
    }


def internal_quick_scan(image):
    detected_foods = recognize_food_with_clarifai(image)
    if not detected_foods:
        return {"error": "Unable to recognize food"}
    
    return {"detected_foods": detected_foods, "total": len(detected_foods)}


def internal_meal_suggestion(meal_time, health_condition, dietary_preferences, budget_range, cooking_time):
    prompt = f"""Suggest a meal for {meal_time} for someone with {health_condition} condition.

Requirements:
- Dietary preferences: {dietary_preferences}
- Budget: {budget_range}
- Cooking time: {cooking_time}

Return:
1. Suggested dishes (3-5 options)
2. Nutritional information for each
3. Brief recipe/preparation guide
4. Estimated cost and time"""
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a nutrition expert specializing in Vietnamese cuisine."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1500,
        temperature=0.7
    )
    
    suggestion = response.choices[0].message.content
    
    return {
        "meal_time": meal_time,
        "health_condition": health_condition,
        "suggestions": suggestion,
        "budget_range": budget_range,
        "cooking_time": cooking_time
    }


def internal_weekly_menu(health_condition, dietary_preferences, budget_range, cooking_time):
    prompt = f"""Create a 7-day weekly menu for someone with {health_condition} condition.

Requirements:
- Dietary preferences: {dietary_preferences}
- Daily budget: {budget_range}
- Cooking time per meal: {cooking_time}

Return a complete weekly plan with:
1. Breakfast, lunch, dinner for each day
2. Nutritional balance for the week
3. Shopping list
4. Meal prep tips"""
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a nutrition expert specializing in meal planning."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=3000,
        temperature=0.7
    )
    
    menu = response.choices[0].message.content
    
    return {
        "duration": "7 days",
        "health_condition": health_condition,
        "weekly_menu": menu,
        "budget_range": budget_range
    }


def internal_detailed_recipes(days, health_condition, dietary_preferences, budget_range):
    prompt = f"""Create detailed recipes for {days} days for someone with {health_condition} condition.

Requirements:
- Dietary preferences: {dietary_preferences}
- Budget: {budget_range}

For each recipe, provide:
1. Ingredients with exact measurements
2. Step-by-step cooking instructions
3. Nutritional breakdown
4. Cooking tips and variations
5. Estimated cost"""
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a professional chef and nutrition expert."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=3000,
        temperature=0.7
    )
    
    recipes = response.choices[0].message.content
    
    return {
        "days": days,
        "health_condition": health_condition,
        "detailed_recipes": recipes,
        "budget_range": budget_range
    }


def internal_meal_suggestion(meal_time, health_condition, dietary_preferences, budget_range, cooking_time, user_query=None):
    """
    Suggest meals based on user description
    Returns a list of meals with nutrition facts, ingredients, instructions
    """
    
    # Create prompt for AI
    if user_query:
        # If there's a query from user (e.g., "High protein lunch")
        prompt = f"""You are a nutrition expert. The user wants: "{user_query}"

Please suggest 1-3 most suitable meals. Return JSON with the following structure (NO markdown):

{{
    "suggested_meals": [
        {{
            "name": "Dish name (English or Vietnamese)",
            "description": "Brief description of the dish and why it's suitable",
            "difficulty": "EASY/MEDIUM/HARD",
            "match_percentage": 98,
            "prep_time": "15 minutes",
            "servings": 2,
            "tags": ["HIGH-PROTEIN", "LOW-CARB", "GLUTEN-FREE OPTION"],
            "nutrition_facts": {{
                "calories": {{"value": 420, "unit": "cal"}},
                "protein": {{"value": 38, "unit": "g"}},
                "carbs": {{"value": 18, "unit": "g"}},
                "fat": {{"value": 22, "unit": "g"}},
                "fiber": {{"value": 4, "unit": "g"}},
                "sugar": {{"value": 3, "unit": "g"}},
                "sodium": {{"value": 680, "unit": "mg"}},
                "cholesterol": {{"value": 85, "unit": "mg"}}
            }},
            "ingredients": [
                "2 chicken breasts",
                "4 cups romaine lettuce",
                "1/2 cup Caesar dressing",
                "1/4 cup parmesan cheese",
                "1 cup croutons",
                "Lemon wedges",
                "Olive oil for grilling",
                "Salt and pepper"
            ],
            "instructions": [
                "Season chicken breasts with salt, pepper, and olive oil.",
                "Grill chicken for 6-7 minutes per side until fully cooked.",
                "Let chicken rest for 5 minutes, then slice.",
                "Wash and chop romaine lettuce.",
                "In a large bowl, toss lettuce with Caesar dressing.",
                "Add croutons and parmesan cheese.",
                "Top with grilled chicken slices.",
                "Serve with lemon wedges."
            ]
        }}
    ]
}}

Notes:
- match_percentage: Suitability with requirements (0-100%)
- tags: Key characteristics (HIGH-PROTEIN, LOW-CARB, VEGETARIAN, GLUTEN-FREE, QUICK, etc.)
- nutrition_facts: Detailed nutrition per serving
- ingredients: List of ingredients with specific quantities
- instructions: Clear, easy-to-understand steps
- Prioritize popular dishes, easy to make, with ingredients available in Vietnam"""
    else:
        # Fallback: Use old information
        prompt = f"""Suggest meals for {meal_time}:
- Health: {health_condition}
- Preferences: {dietary_preferences}
- Budget: {budget_range}
- Time: {cooking_time}

Return JSON format as above with 2-3 suitable Vietnamese dishes."""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a nutrition expert and professional chef."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2500,
            temperature=0.7
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Parse JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        suggestion_data = json.loads(response_text)
        
        return {
            "message": "Meal suggestions completed successfully",
            "data": {
                "query": user_query or f"{meal_time} meal",
                "total_suggestions": len(suggestion_data.get("suggested_meals", [])),
                "meals": suggestion_data.get("suggested_meals", []),
                "filters": {
                    "meal_time": meal_time,
                    "health_condition": health_condition,
                    "dietary_preferences": dietary_preferences,
                    "budget_range": budget_range,
                    "cooking_time": cooking_time
                }
            }
        }
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON Parse Error: {str(e)}")
        print(f"Response: {response_text}")
        
        # Fallback
        return {
            "message": "Meal suggestions completed successfully (text mode)",
            "data": {
                "query": user_query or f"{meal_time} meal",
                "total_suggestions": 0,
                "meals": [],
                "text_suggestion": response_text,
                "filters": {
                    "meal_time": meal_time,
                    "health_condition": health_condition,
                    "dietary_preferences": dietary_preferences
                }
            }
        }
        
    except Exception as e:
        print(f"❌ Meal Suggestion Error: {str(e)}")
        return {"error": f"Meal suggestion error: {str(e)}"}

@app.route('/api/v1/meal-suggestion', methods=['POST'])
def meal_suggestion():
    """
    Suggest meals based on user description
    ---
    tags:
      - Meal Planning
    summary: AI suggests meals from description
    description: >
      User inputs description (e.g., "High protein lunch", "Quick vegan dinner"),
      AI will suggest suitable dishes with nutrition facts, ingredients, instructions.
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              query:
                type: string
                description: Description of desired meal
                example: "High protein lunch"
              meal_time:
                type: string
                description: Meal time (breakfast/lunch/dinner/snack)
                default: "lunch"
              health_condition:
                type: string
                default: "healthy"
              dietary_preferences:
                type: string
                default: "none"
              budget_range:
                type: string
                default: "100k"
              cooking_time:
                type: string
                default: "30 minutes"
    responses:
      200:
        description: Suggestion successful
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                message:
                  type: string
                data:
                  type: object
                  properties:
                    query:
                      type: string
                    total_suggestions:
                      type: integer
                    meals:
                      type: array
                      items:
                        type: object
                        properties:
                          name:
                            type: string
                          description:
                            type: string
                          difficulty:
                            type: string
                          match_percentage:
                            type: integer
                          prep_time:
                            type: string
                          servings:
                            type: integer
                          tags:
                            type: array
                            items:
                              type: string
                          nutrition_facts:
                            type: object
                          ingredients:
                            type: array
                            items:
                              type: string
                          instructions:
                            type: array
                            items:
                              type: string
            example:
              success: true
              message: "Meal suggestions completed successfully"
              data:
                query: "High protein lunch"
                total_suggestions: 1
                meals:
                  - name: "Grilled Chicken Caesar Salad"
                    description: "Outstanding protein content (38g) with balanced macros. Perfect for muscle building and satiety."
                    difficulty: "MEDIUM"
                    match_percentage: 98
                    prep_time: "25 minutes"
                    servings: 2
                    tags: ["HIGH-PROTEIN", "LOW-CARB", "GLUTEN-FREE OPTION"]
                    nutrition_facts:
                      calories: {"value": 420, "unit": "cal"}
                      protein: {"value": 38, "unit": "g"}
                      carbs: {"value": 18, "unit": "g"}
                      fat: {"value": 22, "unit": "g"}
                      fiber: {"value": 4, "unit": "g"}
                      sugar: {"value": 3, "unit": "g"}
                      sodium: {"value": 680, "unit": "mg"}
                      cholesterol: {"value": 85, "unit": "mg"}
                    ingredients:
                      - "2 chicken breasts"
                      - "4 cups romaine lettuce"
                      - "1/2 cup Caesar dressing"
                      - "1/4 cup parmesan cheese"
                      - "1 cup croutons"
                      - "Lemon wedges"
                      - "Olive oil for grilling"
                      - "Salt and pepper"
                    instructions:
                      - "Season chicken breasts with salt, pepper, and olive oil."
                      - "Grill chicken for 6-7 minutes per side until fully cooked."
                      - "Let chicken rest for 5 minutes, then slice."
                      - "Wash and chop romaine lettuce."
                      - "In a large bowl, toss lettuce with Caesar dressing."
                      - "Add croutons and parmesan cheese."
                      - "Top with grilled chicken slices."
                      - "Serve with lemon wedges."
      400:
        description: Missing information
      500:
        description: Server error
    """
    try:
        data = request.json
        
        # Get query from user (e.g., "High protein lunch")
        user_query = data.get("query", "").strip()
        
        if not user_query:
            return jsonify({
                "success": False,
                "error": "Query cannot be empty"
            }), 400
        
        result = internal_meal_suggestion(
            data.get("meal_time", "lunch"),
            data.get("health_condition", "healthy"),
            data.get("dietary_preferences", "none"),
            data.get("budget_range", "100k"),
            data.get("cooking_time", "30 minutes"),  # ✅ Added this line
            user_query=user_query
        )
        
        if "error" in result:
            return jsonify({"success": False, **result}), 500
        
        return jsonify({"success": True, **result}), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


def internal_weekly_menu(health_condition, dietary_preferences, budget_range, cooking_time):
    prompt = f"""Create a 7-day menu:
- Health: {health_condition}
- Preferences: {dietary_preferences}
- Budget: {budget_range}/day
- Time: {cooking_time}

Format: Monday-Sunday with 3 meals/day + calories"""
    
    result = call_openai_text(prompt, model="gpt-4o", max_tokens=2500)
    return {"menu": result, "duration": "7 days"}


def internal_detailed_recipes(days, health_condition, dietary_preferences, budget_range):
    prompt = f"""Create detailed recipes for {days} days:
- Health: {health_condition}
- Preferences: {dietary_preferences}
- Budget: {budget_range}

Each dish: ingredients, steps, calories, cost"""
    
    result = call_openai_text(prompt, model="gpt-4o", max_tokens=3000)
    return {"recipes": result, "days": days}


@app.route('/api/v1/agent', methods=['POST'])
def ai_agent():
    """
    AI Agent - Food Image Recognition & Analysis
    ---
    tags:
      - AI Agent
    summary: Analyze food images and provide nutritional information
    description: >
      AI Agent automatically recognizes food from images, analyzes nutrition, and provides appropriate health recommendations.
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              message:
                type: string
                example: "Is this dish good for people with diabetes?"
              images:
                type: array
                items:
                  type: string
                example:
                  - "data:image/jpeg;base64,..."
              auto_execute:
                type: boolean
                default: true
              user_id:
                type: string
                example: "user_123"
    responses:
      200:
        description: Analysis successful
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                message:
                  type: string
                data:
                  type: object
                  properties:
                    recognized_foods:
                      type: array
                      items:
                        type: object
                        properties:
                          name:
                            type: string
                          category:
                            type: string
                          weight:
                            type: string
                          confidence:
                            type: number
                    nutrition_analysis:
                      type: object
                      properties:
                        calories:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        protein:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        carbs:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        fat:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        fiber:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        sugar:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        sodium:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        cholesterol:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                    ai_insights:
                      type: array
                      items:
                        type: string
                    processing_time:
                      type: string
            example:
              success: true
              message: "Food analysis completed successfully"
              data:
                recognized_foods:
                  - name: "Fresh Garden Salad"
                    category: "Vegetables"
                    weight: "200g"
                    confidence: 96
                  - name: "Avocado"
                    category: "Healthy Fats"
                    weight: "80g"
                    confidence: 93
                  - name: "Mixed Nuts"
                    category: "Protein & Fats"
                    weight: "30g"
                    confidence: 88
                nutrition_analysis:
                  calories:
                    value: 380
                    unit: "kcal"
                  protein:
                    value: 12
                    unit: "g"
                  carbs:
                    value: 18
                    unit: "g"
                  fat:
                    value: 32
                    unit: "g"
                  fiber:
                    value: 12
                    unit: "g"
                  sugar:
                    value: 4
                    unit: "g"
                  sodium:
                    value: 95
                    unit: "mg"
                  cholesterol:
                    value: 0
                    unit: "mg"
                ai_insights:
                  - "Excellent source of healthy fats from avocado and nuts!"
                  - "High fiber content will keep you full for longer."
                  - "Consider adding a protein source like grilled chicken or tofu."
                processing_time: "1.5s"

      400:
        description: Invalid input data
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                message:
                  type: string
                error:
                  type: object
                  properties:
                    code:
                      type: string
                    details:
                      type: string
            example:
              success: false
              message: "Invalid request"
              error:
                code: "INVALID_INPUT"
                details: "Image cannot be empty or format is not supported"

      500:
        description: Server error
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                message:
                  type: string
                error:
                  type: object
                  properties:
                    code:
                      type: string
                    details:
                      type: string
            example:
              success: false
              message: "Image processing error"
              error:
                code: "PROCESSING_ERROR"
                details: "Unable to analyze image, please try again"
    """
    try:
        data = request.json
        message = data.get("message", "").strip()
        images = data.get("images", [])
        session_id = data.get("session_id", str(uuid.uuid4()))
        user_id = data.get("user_id")
        auto_execute = data.get("auto_execute", True)
        
        if not message:
            return jsonify({"error": "Message cannot be empty"}), 400
        
        if session_id not in conversations:
            conversations[session_id] = []
        conversation_history = conversations[session_id]
        
        user_profile = user_profiles.get(user_id) if user_id else None
        
        intent_analysis = analyze_user_intent(message, images, conversation_history)
        
        suggested_params = intent_analysis.get("suggested_params", {})
        
        if user_profile:
            if "health_condition" not in suggested_params:
                suggested_params["health_condition"] = user_profile.get("health_condition", "healthy")
            if "target_calories" not in suggested_params:
                suggested_params["target_calories"] = user_profile.get("target_calories", 2000)
        
        if images:
            if intent_analysis["intent"] in ["analyze_food", "quick_scan"]:
                suggested_params["image"] = images[0]
            elif intent_analysis["intent"] in ["compare_foods", "track_calories"]:
                suggested_params["images"] = images
        
        result = None
        
        if auto_execute:
            missing_info = intent_analysis.get("missing_info", [])
            
            if not missing_info:
                result = execute_function(intent_analysis["intent"], suggested_params)
            else:
                result = {
                    "status": "need_more_info",
                    "message": f"I need more information: {', '.join(missing_info)}"
                }
        
        suggestions = []
        
        if result and "error" not in result:
            if intent_analysis["intent"] == "analyze_food":
                suggestions = [
                    "💡 Would you like to compare with another dish?",
                    "📊 Or I can create a weekly menu based on this dish?",
                    "🍽️ Want to know how to make this dish healthier?"
                ]
            elif intent_analysis["intent"] == "meal_suggestion":
                suggestions = [
                    "📅 Would you like me to create a weekly menu?",
                    "📖 Or I can provide detailed recipes?",
                    "🎯 Want to adjust to specific goals?"
                ]
        else:
            suggestions = intent_analysis.get("next_suggestions", [
                "🤔 Can you provide more details?",
                "📸 Or send an image for more detailed analysis?"
            ])
        
        conversation_history.append({
            "role": "user",
            "content": message,
            "has_images": len(images) > 0
        })
        conversation_history.append({
            "role": "assistant",
            "intent": intent_analysis["intent"],
            "result": result
        })
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "intent_analysis": {
                "intent": intent_analysis["intent"],
                "confidence": intent_analysis["confidence"],
                "explanation": intent_analysis["explanation"],
                "alternative_actions": intent_analysis.get("alternative_actions", []),
                "missing_info": intent_analysis.get("missing_info", [])
            },
            "result": result,
            "suggestions": suggestions,
            "executed": auto_execute and result is not None
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "OK",
        "message": "AI Agent Nutrition API is running!",
        "version": "2.0 - AI Agent",
        "endpoints": {
            "ai_agent": [
                "/api/agent",
                "/api/agent/suggest",
                "/api/agent/multi-step"
            ],
            "standard": [
                "/api/chat",
                "/api/analyze-food",
                "/api/compare-foods",
                "/api/track-calories",
                "/api/quick-scan",
                "/api/meal-suggestion",
                "/api/weekly-menu",
                "/api/detailed-recipes",
                "/api/user/profile"
            ]
        }
    }), 200

@app.route('/api/v1/analyze-food', methods=['POST'])
def analyze_food():
    """
    Analyze food from image
    ---
    tags:
      - Food Analysis
    summary: Analyze food nutrition from image
    description: >
      Analyze food based on image, evaluate nutrition, and provide recommendations 
      appropriate to the user's health condition and dietary goals.
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - image
            properties:
              image:
                type: string
                description: Food image in base64 format
                example: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
              health_condition:
                type: string
                description: Health condition
                default: "healthy"
                example: "diabetes"
              dietary_goals:
                type: string
                description: Dietary goals
                default: "maintain weight"
                example: "lose weight"
              session_id:
                type: string
                description: Session ID
                example: "uuid-v4"
              user_id:
                type: string
                description: User ID
                example: "user_123"
    responses:
      200:
        description: Analysis successful
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                message:
                  type: string
                data:
                  type: object
                  properties:
                    session_id:
                      type: string
                    status:
                      type: string
                      description: Analysis status
                      example: "complete"
                    processing_time:
                      type: string
                      description: Processing time
                      example: "1.0s"
                    recognized_foods:
                      type: array
                      description: List of recognized foods
                      items:
                        type: object
                        properties:
                          name:
                            type: string
                            description: Food name
                          category:
                            type: string
                            description: Food type
                          weight:
                            type: string
                            description: Estimated weight
                          confidence:
                            type: number
                            description: Confidence level (%)
                            minimum: 0
                            maximum: 100
                    nutrition_analysis:
                      type: object
                      description: Detailed nutrition analysis
                      properties:
                        calories:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        protein:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        carbs:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        fat:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        fiber:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        sugar:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        sodium:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                        cholesterol:
                          type: object
                          properties:
                            value:
                              type: number
                            unit:
                              type: string
                    health_condition:
                      type: string
                    dietary_goals:
                      type: string
                    recommendations:
                      type: array
                      items:
                        type: string
            example:
              success: true
              message: "Food analysis completed successfully"
              data:
                session_id: "550e8400-e29b-41d4-a716-446655440000"
                status: "complete"
                processing_time: "1.0s"
                recognized_foods:
                  - name: "Pancakes"
                    category: "Carbohydrates"
                    weight: "150g"
                    confidence: 97
                  - name: "Fresh Berries"
                    category: "Fruits"
                    weight: "100g"
                    confidence: 95
                  - name: "Maple Syrup"
                    category: "Sweetener"
                    weight: "30ml"
                    confidence: 91
                nutrition_analysis:
                  calories:
                    value: 450
                    unit: "kcal"
                  protein:
                    value: 8
                    unit: "g"
                  carbs:
                    value: 78
                    unit: "g"
                  fat:
                    value: 12
                    unit: "g"
                  fiber:
                    value: 5
                    unit: "g"
                  sugar:
                    value: 35
                    unit: "g"
                  sodium:
                    value: 520
                    unit: "mg"
                  cholesterol:
                    value: 45
                    unit: "mg"
                health_condition: "healthy"
                dietary_goals: "maintain weight"
                recommendations:
                  - "💡 Balanced breakfast with good energy from carbohydrates"
                  - "🥗 Consider adding protein for longer satiety"
                  - "⚠️ Note: Sugar content is quite high, limit if trying to lose weight"

      400:
        description: Invalid input data
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                message:
                  type: string
                error:
                  type: object
                  properties:
                    code:
                      type: string
                    details:
                      type: string
            example:
              success: false
              message: "Invalid request"
              error:
                code: "INVALID_INPUT"
                details: "Food image not found or invalid format"

      500:
        description: Server error
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                message:
                  type: string
                error:
                  type: object
                  properties:
                    code:
                      type: string
                    details:
                      type: string
            example:
              success: false
              message: "Image processing error"
              error:
                code: "PROCESSING_ERROR"
                details: "OpenAI API rate limit exceeded"
    """
    try:
        data = request.json
        result = internal_analyze_food(
            data.get("image"),
            data.get("health_condition", "healthy"),
            data.get("dietary_goals", "maintain weight")
        )
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify({"success": True, **result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint does not exist"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Server error"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)


