from flask import Flask, request, jsonify
from flask_cors import CORS
from clarifai_grpc.channel.clarifai_channel import ClarifaiChannel
from clarifai_grpc.grpc.api import resources_pb2, service_pb2, service_pb2_grpc
from clarifai_grpc.grpc.api.status import status_code_pb2
from openai import OpenAI
import base64
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
## 🤖 API Tư Vấn Dinh Dưỡng Thông Minh

### Tính năng chính:
* 📸 **Phân tích món ăn từ ảnh** - Nhận diện và đánh giá dinh dưỡng
* 🔍 **So sánh nhiều món** - Xếp hạng theo độ lành mạnh
* 📊 **Theo dõi calo** - Tracking calo hàng ngày
* 🍽️ **Gợi ý thực đơn** - AI tạo menu phù hợp
* 🤖 **AI Agent tự động** - Phân tích ý định và thực thi

### AI Agent Mode:
Sử dụng `/api/agent` để AI tự động phân tích ý định, chọn function và thực thi.
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
        {"name": "AI Agent", "description": "🤖 AI Agent tự động"},
        {"name": "Food Analysis", "description": "📸 Phân tích món ăn"},
        {"name": "Calorie Tracking", "description": "📊 Theo dõi calo"},
        {"name": "Meal Planning", "description": "🍽️ Lập thực đơn"},
        {"name": "AI Chat", "description": "💬 Chat AI"},
        {"name": "User Management", "description": "👤 Quản lý user"}
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

AGENT_SYSTEM_PROMPT = """Bạn là AI Agent dinh dưỡng thông minh của Việt Nam với khả năng:

🤖 NHIỆM VỤ CHÍNH:
- Phân tích ý định người dùng từ câu hỏi/yêu cầu
- Tự động gợi ý chức năng phù hợp nhất
- Thực hiện nhiều tác vụ liên tiếp nếu cần
- Học từ ngữ cảnh hội thoại

🎯 CÁC CHỨC NĂNG KHẢ DỤNG:
1. analyze_food - Phân tích món ăn từ ảnh
2. compare_foods - So sánh nhiều món ăn
3. track_calories - Theo dõi calo trong ngày
4. quick_scan - Quét nhanh nhận diện món
5. meal_suggestion - Gợi ý món cho 1 bữa
6. weekly_menu - Lập thực đơn tuần
7. detailed_recipes - Công thức nấu chi tiết
8. chat - Tư vấn tự do

📋 QUY TẮC PHÂN TÍCH Ý ĐỊNH:
- Nếu có ảnh → ưu tiên analyze_food hoặc quick_scan
- Nếu nhiều ảnh → compare_foods hoặc track_calories
- Nếu hỏi về thực đơn → meal_suggestion hoặc weekly_menu
- Nếu hỏi công thức → detailed_recipes
- Nếu chat thông thường → chat

🔄 KHẢ NĂNG TỰ ĐỘNG:
- Phát hiện thiếu thông tin và hỏi lại
- Gợi ý bước tiếp theo sau mỗi tác vụ
- Kết hợp nhiều chức năng nếu phù hợp
- Học preferences người dùng

💡 PHONG CÁCH:
- Thân thiện, chủ động gợi ý
- Giải thích lý do chọn chức năng
- Đưa ra nhiều lựa chọn cho user
- Ưu tiên món ăn Việt Nam"""

AVAILABLE_FUNCTIONS = [
    {
        "name": "analyze_food",
        "description": "Phân tích chi tiết 1 món ăn từ ảnh. Dùng khi user gửi ảnh món ăn và muốn biết thông tin dinh dưỡng, đánh giá phù hợp.",
        "parameters": {
            "type": "object",
            "properties": {
                "image": {"type": "string", "description": "Base64 của ảnh món ăn"},
                "health_condition": {"type": "string", "description": "Tình trạng sức khỏe", "default": "khỏe mạnh"},
                "dietary_goals": {"type": "string", "description": "Mục tiêu dinh dưỡng", "default": "duy trì cân nặng"}
            },
            "required": ["image"]
        }
    },
    {
        "name": "compare_foods",
        "description": "So sánh nhiều món ăn (2-4 món). Dùng khi user gửi nhiều ảnh và muốn biết món nào tốt hơn.",
        "parameters": {
            "type": "object",
            "properties": {
                "images": {"type": "array", "items": {"type": "string"}, "description": "Mảng base64 của các ảnh"},
                "health_condition": {"type": "string", "description": "Tình trạng sức khỏe", "default": "khỏe mạnh"}
            },
            "required": ["images"]
        }
    },
    {
        "name": "track_calories",
        "description": "Theo dõi tổng calo trong ngày từ nhiều bữa ăn. Dùng khi user muốn kiểm tra calo đã ăn.",
        "parameters": {
            "type": "object",
            "properties": {
                "images": {"type": "array", "items": {"type": "string"}, "description": "Ảnh các bữa ăn trong ngày"},
                "target_calories": {"type": "integer", "description": "Mục tiêu calo/ngày", "default": 2000},
                "health_condition": {"type": "string", "description": "Tình trạng sức khỏe", "default": "khỏe mạnh"}
            },
            "required": ["images"]
        }
    },
    {
        "name": "quick_scan",
        "description": "Quét nhanh nhận diện món ăn. Dùng khi user chỉ muốn biết tên món, không cần phân tích chi tiết.",
        "parameters": {
            "type": "object",
            "properties": {
                "image": {"type": "string", "description": "Base64 của ảnh món ăn"}
            },
            "required": ["image"]
        }
    },
    {
        "name": "meal_suggestion",
        "description": "Gợi ý thực đơn cho 1 bữa ăn. Dùng khi user hỏi 'nên ăn gì', 'gợi ý món cho bữa trưa'.",
        "parameters": {
            "type": "object",
            "properties": {
                "meal_time": {"type": "string", "description": "Bữa nào (sáng/trưa/tối)", "default": "trưa"},
                "health_condition": {"type": "string", "description": "Tình trạng sức khỏe", "default": "khỏe mạnh"},
                "dietary_preferences": {"type": "string", "description": "Sở thích ăn uống", "default": "không"},
                "budget_range": {"type": "string", "description": "Ngân sách", "default": "100k"},
                "cooking_time": {"type": "string", "description": "Thời gian nấu", "default": "30 phút"}
            }
        }
    },
    {
        "name": "weekly_menu",
        "description": "Lập thực đơn cả tuần (7 ngày). Dùng khi user muốn plan ăn uống cho nhiều ngày.",
        "parameters": {
            "type": "object",
            "properties": {
                "health_condition": {"type": "string", "description": "Tình trạng sức khỏe", "default": "khỏe mạnh"},
                "dietary_preferences": {"type": "string", "description": "Sở thích ăn uống", "default": "không"},
                "budget_range": {"type": "string", "description": "Ngân sách/ngày", "default": "500k"},
                "cooking_time": {"type": "string", "description": "Thời gian nấu", "default": "45 phút"}
            }
        }
    },
    {
        "name": "detailed_recipes",
        "description": "Tạo công thức nấu chi tiết với nguyên liệu, bước làm. Dùng khi user hỏi 'làm món X như thế nào'.",
        "parameters": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "Số ngày muốn tạo công thức", "default": 3},
                "health_condition": {"type": "string", "description": "Tình trạng sức khỏe", "default": "khỏe mạnh"},
                "dietary_preferences": {"type": "string", "description": "Sở thích ăn uống", "default": "không"},
                "budget_range": {"type": "string", "description": "Ngân sách", "default": "500k"}
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
Phân tích yêu cầu của người dùng và đề xuất chức năng phù hợp.

**Tin nhắn người dùng:** {message}
**Có ảnh đính kèm:** {"Có " + str(len(images)) + " ảnh" if images else "Không"}
**Lịch sử hội thoại:** {conversation_history[-3:] if conversation_history else "Chưa có"}

**Các chức năng khả dụng:**
{json.dumps([{"name": f["name"], "description": f["description"]} for f in AVAILABLE_FUNCTIONS], ensure_ascii=False, indent=2)}

Hãy trả về JSON với cấu trúc:
{{
    "intent": "tên_function_phù_hợp",
    "confidence": 0.0-1.0,
    "suggested_params": {{...}},
    "explanation": "Giải thích ngắn gọn tại sao chọn function này",
    "alternative_actions": ["function_khác_1", "function_khác_2"],
    "missing_info": ["thông_tin_cần_hỏi_thêm"],
    "next_suggestions": ["gợi_ý_hành_động_tiếp_theo"]
}}

Ví dụ:
- User: "Món này bao nhiêu calo?" + có ảnh → intent: "analyze_food"
- User: "Tôi nên ăn gì cho bữa trưa?" → intent: "meal_suggestion"
- User: "So sánh 2 món này" + nhiều ảnh → intent: "compare_foods"
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
            "explanation": "Không thể phân tích ý định, chuyển sang chat thông thường",
            "alternative_actions": [],
            "missing_info": [],
            "next_suggestions": []
        }


def execute_function(function_name, params):
    try:
        if function_name == "analyze_food":
            return internal_analyze_food(
                params.get("image"),
                params.get("health_condition", "khỏe mạnh"),
                params.get("dietary_goals", "duy trì cân nặng")
            )
        elif function_name == "compare_foods":
            return internal_compare_foods(params.get("images"), params.get("health_condition", "khỏe mạnh"))
        elif function_name == "track_calories":
            return internal_track_calories(
                params.get("images"),
                params.get("target_calories", 2000),
                params.get("health_condition", "khỏe mạnh")
            )
        elif function_name == "quick_scan":
            return internal_quick_scan(params.get("image"))
        elif function_name == "meal_suggestion":
            return internal_meal_suggestion(
                params.get("meal_time", "trưa"),
                params.get("health_condition", "khỏe mạnh"),
                params.get("dietary_preferences", "không"),
                params.get("budget_range", "100k"),
                params.get("cooking_time", "30 phút")
            )
        elif function_name == "weekly_menu":
            return internal_weekly_menu(
                params.get("health_condition", "khỏe mạnh"),
                params.get("dietary_preferences", "không"),
                params.get("budget_range", "500k"),
                params.get("cooking_time", "45 phút")
            )
        elif function_name == "detailed_recipes":
            return internal_detailed_recipes(
                params.get("days", 3),
                params.get("health_condition", "khỏe mạnh"),
                params.get("dietary_preferences", "không"),
                params.get("budget_range", "500k")
            )
        else:
            return {"error": f"Function {function_name} không tồn tại"}
    except Exception as e:
        return {"error": str(e)}


def internal_analyze_food(image, health_condition, dietary_goals):
    detected_foods = recognize_food_with_clarifai(image)
    if not detected_foods:
        return {"error": "Không nhận diện được món ăn"}
    
    food_list = ", ".join([f"{f['name']} ({f['confidence']}%)" for f in detected_foods])
    
    prompt = f"""Phân tích món ăn cho người {health_condition}, mục tiêu {dietary_goals}.
Món đã nhận diện: {food_list}

Trả lời ngắn gọn:
1. Xác nhận món ăn
2. Calo và dinh dưỡng chính
3. Đánh giá phù hợp (⭐ 1-5)
4. Ưu/nhược điểm
5. Gợi ý cải thiện"""
    
    analysis = call_openai_vision(prompt, [image], max_tokens=1500)
    
    return {
        "detected_foods": detected_foods,
        "analysis": analysis,
        "health_condition": health_condition,
        "dietary_goals": dietary_goals
    }


def internal_compare_foods(images, health_condition):
    all_detected = []
    for idx, img in enumerate(images):
        foods = recognize_food_with_clarifai(img)
        all_detected.append({"dish_number": idx + 1, "foods": foods})
    
    dishes_summary = "\n".join([
        f"- Món {d['dish_number']}: {', '.join([f['name'] for f in d['foods']])}"
        for d in all_detected
    ])
    
    prompt = f"""So sánh {len(images)} món ăn cho người {health_condition}.
Các món: {dishes_summary}

Trả về:
1. Bảng so sánh calo, protein, carb
2. Xếp hạng từ tốt → kém
3. Khuyến nghị nên chọn món nào"""
    
    comparison = call_openai_vision(prompt, images, max_tokens=2000)
    
    return {
        "detected_foods": all_detected,
        "comparison": comparison,
        "total_foods": len(images)
    }


def internal_track_calories(images, target_calories, health_condition):
    daily_meals = []
    meal_names = ["Sáng", "Trưa", "Tối", "Phụ"]
    
    for idx, img in enumerate(images):
        meal_name = meal_names[idx] if idx < len(meal_names) else f"Bữa {idx + 1}"
        foods = recognize_food_with_clarifai(img)
        daily_meals.append({"meal_name": f"Bữa {meal_name}", "foods": foods})
    
    meals_summary = "\n".join([
        f"- {m['meal_name']}: {', '.join([f['name'] for f in m['foods']])}"
        for m in daily_meals
    ])
    
    prompt = f"""Theo dõi calo cho người {health_condition}.
Mục tiêu: {target_calories} kcal
Các bữa ăn: {meals_summary}

Trả về:
1. Tổng calo đã ăn
2. So với mục tiêu (thiếu/thừa bao nhiêu)
3. Phân bố dinh dưỡng
4. Gợi ý điều chỉnh"""
    
    tracking = call_openai_vision(prompt, images, max_tokens=2000)
    
    return {
        "daily_meals": daily_meals,
        "tracking": tracking,
        "target_calories": target_calories
    }


def internal_quick_scan(image):
    detected_foods = recognize_food_with_clarifai(image)
    if not detected_foods:
        return {"error": "Không nhận diện được món ăn"}
    
    return {"detected_foods": detected_foods, "total": len(detected_foods)}


def internal_meal_suggestion(meal_time, health_condition, dietary_preferences, budget_range, cooking_time):
    prompt = f"""Gợi ý thực đơn bữa {meal_time}:
- Sức khỏe: {health_condition}
- Sở thích: {dietary_preferences}
- Ngân sách: {budget_range}
- Thời gian: {cooking_time}

Trả về: 2-3 món Việt phù hợp, lý do chọn, cách làm đơn giản, ước tính calo"""
    
    result = call_openai_text(prompt, max_tokens=1200)
    return {"suggestion": result, "meal_time": meal_time}


def internal_weekly_menu(health_condition, dietary_preferences, budget_range, cooking_time):
    prompt = f"""Lập thực đơn 7 ngày:
- Sức khỏe: {health_condition}
- Sở thích: {dietary_preferences}
- Ngân sách: {budget_range}/ngày
- Thời gian: {cooking_time}

Format: Thứ 2-CN với 3 bữa/ngày + calo"""
    
    result = call_openai_text(prompt, model="gpt-4o", max_tokens=2500)
    return {"menu": result, "duration": "7 ngày"}


def internal_detailed_recipes(days, health_condition, dietary_preferences, budget_range):
    prompt = f"""Tạo công thức chi tiết {days} ngày:
- Sức khỏe: {health_condition}
- Sở thích: {dietary_preferences}
- Ngân sách: {budget_range}

Mỗi món: nguyên liệu, bước làm, calo, chi phí"""
    
    result = call_openai_text(prompt, model="gpt-4o", max_tokens=3000)
    return {"recipes": result, "days": days}


@app.route('/api/v1/agent', methods=['POST'])
def ai_agent():
    """
    AI Agent - Food Image Recognition & Analysis
    ---
    tags:
      - AI Agent
    summary: Phân tích ảnh món ăn và cung cấp thông tin dinh dưỡng
    description: >
      AI Agent tự động nhận diện món ăn từ ảnh, phân tích dinh dưỡng và đưa ra gợi ý sức khỏe phù hợp.
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              message:
                type: string
                example: "Món này có tốt cho người tiểu đường không?"
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
        description: Phân tích thành công
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
              message: "Phân tích món ăn thành công"
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
        description: Dữ liệu đầu vào không hợp lệ
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
              message: "Yêu cầu không hợp lệ"
              error:
                code: "INVALID_INPUT"
                details: "Ảnh không được để trống hoặc định dạng không được hỗ trợ"

      500:
        description: Lỗi server
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
              message: "Lỗi xử lý ảnh"
              error:
                code: "PROCESSING_ERROR"
                details: "Không thể phân tích ảnh, vui lòng thử lại"
    """
    try:
        data = request.json
        message = data.get("message", "").strip()
        images = data.get("images", [])
        session_id = data.get("session_id", str(uuid.uuid4()))
        user_id = data.get("user_id")
        auto_execute = data.get("auto_execute", True)
        
        if not message:
            return jsonify({"error": "Tin nhắn không được để trống"}), 400
        
        if session_id not in conversations:
            conversations[session_id] = []
        conversation_history = conversations[session_id]
        
        user_profile = user_profiles.get(user_id) if user_id else None
        
        intent_analysis = analyze_user_intent(message, images, conversation_history)
        
        suggested_params = intent_analysis.get("suggested_params", {})
        
        if user_profile:
            if "health_condition" not in suggested_params:
                suggested_params["health_condition"] = user_profile.get("health_condition", "khỏe mạnh")
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
                    "message": f"Tôi cần thêm thông tin: {', '.join(missing_info)}"
                }
        
        suggestions = []
        
        if result and "error" not in result:
            if intent_analysis["intent"] == "analyze_food":
                suggestions = [
                    "💡 Bạn có muốn so sánh với món khác không?",
                    "📊 Hoặc tôi có thể tạo thực đơn tuần dựa trên món này?",
                    "🍽️ Muốn biết cách làm món này tốt hơn cho sức khỏe?"
                ]
            elif intent_analysis["intent"] == "meal_suggestion":
                suggestions = [
                    "📅 Bạn có muốn tôi lập thực đơn cả tuần không?",
                    "📖 Hoặc tôi có thể đưa công thức chi tiết?",
                    "🎯 Muốn điều chỉnh theo mục tiêu cụ thể?"
                ]
        else:
            suggestions = intent_analysis.get("next_suggestions", [
                "🤔 Bạn có thể cho tôi biết thêm chi tiết không?",
                "📸 Hoặc gửi ảnh để tôi phân tích chi tiết hơn?"
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


@app.route('/api/v1/agent/suggest', methods=['POST'])
def agent_suggest_only():
    """
    AI Agent - Chỉ gợi ý chức năng (không thực thi)
    ---
    tags:
      - AI Agent
    summary: Phân tích ý định và gợi ý chức năng
    description: >
      Giống `/api/agent` nhưng CHỈ phân tích intent và gợi ý function, KHÔNG thực thi.
      Endpoint này phân tích tin nhắn của người dùng, xác định ý định, và đề xuất
      chức năng phù hợp cùng với các tham số cần thiết. Hữu ích khi muốn preview
      trước khi thực thi hoặc khi cần xác nhận từ người dùng.
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - message
            properties:
              message:
                type: string
                description: Tin nhắn từ người dùng
                example: "Tôi muốn ăn gì cho bữa trưa vừa rẻ vừa nhanh?"
              images:
                type: array
                description: Danh sách ảnh dạng base64 (nếu có)
                items:
                  type: string
                example: []
              user_id:
                type: string
                description: ID người dùng
                example: "user_123"
    responses:
      200:
        description: Phân tích và gợi ý thành công
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  description: Trạng thái thành công
                message:
                  type: string
                  description: Tin nhắn tóm tắt gợi ý cho người dùng
                data:
                  type: object
                  description: Dữ liệu phân tích và gợi ý
                  properties:
                    intent_analysis:
                      type: object
                      description: Kết quả phân tích ý định
                      properties:
                        intent:
                          type: string
                          description: Tên chức năng được đề xuất
                        confidence:
                          type: number
                          format: float
                          description: Độ tin cậy của phân tích (0-1)
                        explanation:
                          type: string
                          description: Giải thích ý định của người dùng
                        alternative_actions:
                          type: array
                          description: Các chức năng thay thế có thể dùng
                          items:
                            type: string
                        missing_info:
                          type: array
                          description: Danh sách thông tin còn thiếu
                          items:
                            type: string
                        suggested_params:
                          type: object
                          description: Tham số được đề xuất cho chức năng
                    can_execute:
                      type: boolean
                      description: Có thể thực thi ngay hay cần thêm thông tin
            example:
              success: true
              message: |
                🤖 Tôi hiểu bạn muốn: Gợi ý bữa ăn nhanh và tiết kiệm cho bữa trưa.

                💡 Chức năng đề xuất: meal_suggestion
                📊 Độ tin cậy: 92%

                📋 Thông tin cần bổ sung:
                • Ngân sách dự kiến (VD: 30k-50k)
                • Thời gian chế biến tối đa (VD: 15-30 phút)

                🔄 Các lựa chọn khác:
                • quick_scan - Quét nhanh món ăn bạn đang có
                • weekly_menu - Gợi ý thực đơn cả tuần
              data:
                intent_analysis:
                  intent: "meal_suggestion"
                  confidence: 0.92
                  explanation: "Người dùng muốn được gợi ý bữa ăn nhanh và tiết kiệm cho bữa trưa."
                  alternative_actions:
                    - "quick_scan"
                    - "weekly_menu"
                  missing_info:
                    - "budget"
                    - "time_limit"
                  suggested_params:
                    meal_type: "trưa"
                can_execute: false

      400:
        description: Dữ liệu đầu vào không hợp lệ
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
              message: "Yêu cầu không hợp lệ"
              error:
                code: "INVALID_INPUT"
                details: "Tin nhắn không được để trống"

      500:
        description: Lỗi server
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
              message: "Lỗi phân tích ý định"
              error:
                code: "PROCESSING_ERROR"
                details: "Không thể phân tích tin nhắn, vui lòng thử lại"
    """
    try:
        data = request.json
        message = data.get("message", "").strip()
        images = data.get("images", [])
        session_id = data.get("session_id")
        
        conversation_history = conversations.get(session_id, []) if session_id else []
        
        intent_analysis = analyze_user_intent(message, images, conversation_history)
        
        response_message = f"""🤖 **Tôi hiểu bạn muốn: {intent_analysis['explanation']}**

Tôi đề xuất dùng chức năng: **{intent_analysis['intent']}**
Độ tự tin: {int(intent_analysis['confidence'] * 100)}%

📋 **Các bước thực hiện:**"""
        
        function_info = next((f for f in AVAILABLE_FUNCTIONS if f["name"] == intent_analysis["intent"]), None)
        if function_info:
            required_params = function_info["parameters"].get("required", [])
            for param in required_params:
                response_message += f"\n- {param}: {'✅ Đã có' if param in intent_analysis['suggested_params'] else '❌ Cần bổ sung'}"
        
        if intent_analysis.get("alternative_actions"):
            response_message += f"\n\n💡 **Hoặc bạn có thể:**"
            for alt in intent_analysis["alternative_actions"][:3]:
                alt_func = next((f for f in AVAILABLE_FUNCTIONS if f["name"] == alt), None)
                if alt_func:
                    response_message += f"\n- {alt}: {alt_func['description']}"
        
        return jsonify({
            "success": True,
            "intent_analysis": intent_analysis,
            "message": response_message,
            "can_execute": len(intent_analysis.get("missing_info", [])) == 0
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# @app.route('/api/agent/multi-step', methods=['POST'])
# def agent_multi_step():
#     """
#     AI Agent - Thực thi workflow nhiều bước
#     ---
#     tags:
#       - AI Agent
#     summary: Thực thi chuỗi nhiều chức năng liên tiếp
#     description: |
#       Thực thi tự động các workflow có cấu trúc nhiều bước, phù hợp cho các nhiệm vụ phức tạp.
#       Mỗi workflow được thiết kế để giải quyết một use case cụ thể với chuỗi actions được định nghĩa trước.

#       ## 🔥 Workflow hỗ trợ

#       ### 1️⃣ `complete_analysis` (cần **1 ảnh**)
#       Phân tích toàn diện một món ăn từ ảnh:
#       - **Bước 1**: Quick scan nhận diện món ăn  
#       - **Bước 2**: Phân tích chi tiết món (calo, dinh dưỡng, phù hợp sức khỏe)
#       - **Bước 3**: Gợi ý các món tương tự hoặc thay thế

#       ### 2️⃣ `daily_tracking` (cần **nhiều ảnh**)  
#       Theo dõi và cân bằng dinh dưỡng cả ngày:
#       - **Bước 1**: Theo dõi calo toàn bộ các bữa trong ngày từ ảnh
#       - **Bước 2**: Gợi ý bữa tối cân bằng dựa trên tổng calo đã tiêu thụ

#       ### 3️⃣ `meal_planning` (không cần ảnh)  
#       Lập kế hoạch bữa ăn dài hạn:
#       - **Bước 1**: Gợi ý một bữa ăn phù hợp
#       - **Bước 2**: Cung cấp công thức chi tiết cho 3 ngày
#       - **Bước 3**: Tạo thực đơn đầy đủ cho cả tuần

#     requestBody:
#       required: true
#       content:
#         application/json:
#           schema:
#             type: object
#             required:
#               - workflow
#             properties:
#               workflow:
#                 type: string
#                 enum:
#                   - complete_analysis
#                   - daily_tracking
#                   - meal_planning
#                 description: Tên workflow cần thực thi
#                 example: "complete_analysis"
#               images:
#                 type: array
#                 description: |
#                   Danh sách ảnh base64 (bắt buộc cho complete_analysis và daily_tracking)
#                   - complete_analysis: cần 1 ảnh
#                   - daily_tracking: cần nhiều ảnh (tùy số bữa)
#                   - meal_planning: không cần ảnh
#                 items:
#                   type: string
#                 example:
#                   - "data:image/jpeg;base64,/9j/4AAQ..."
#               user_preferences:
#                 type: object
#                 description: Thông tin và sở thích của người dùng
#                 properties:
#                   health_condition:
#                     type: string
#                     description: Tình trạng sức khỏe
#                     example: "tiểu đường"
#                   dietary_goals:
#                     type: string
#                     description: Mục tiêu dinh dưỡng
#                     example: "giảm cân"
#                   target_calories:
#                     type: integer
#                     description: Lượng calo mục tiêu mỗi ngày
#                     example: 1800
#                   budget_range:
#                     type: string
#                     description: Ngân sách cho bữa ăn
#                     example: "100k"
#                   meal_time:
#                     type: string
#                     description: Thời gian bữa ăn (sáng/trưa/tối)
#                     example: "trưa"
#                   dietary_preferences:
#                     type: string
#                     description: Chế độ ăn ưa thích
#                     example: "ăn chay"

#     responses:
#       200:
#         description: Workflow đã hoàn thành thành công
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                   description: Trạng thái thành công
#                 workflow:
#                   type: string
#                   description: Tên workflow đã thực thi
#                 total_steps:
#                   type: integer
#                   description: Tổng số bước đã thực hiện
#                 results:
#                   type: array
#                   description: Kết quả của từng bước trong workflow
#                   items:
#                     type: object
#                     properties:
#                       step:
#                         type: integer
#                         description: Số thứ tự bước
#                       action:
#                         type: string
#                         description: Tên chức năng đã thực thi
#                       result:
#                         type: object
#                         description: Kết quả trả về từ chức năng
#                 summary:
#                   type: string
#                   description: Tóm tắt kết quả workflow
#             example:
#               success: true
#               workflow: "complete_analysis"
#               total_steps: 3
#               results:
#                 - step: 1
#                   action: "quick_scan"
#                   result:
#                     detected_foods:
#                       - name: "phở bò"
#                         confidence: 98.5
#                       - name: "bánh phở"
#                         confidence: 95.2
#                     status: "success"
#                 - step: 2
#                   action: "analyze_food"
#                   result:
#                     food_name: "phở bò"
#                     calories: 350
#                     analysis: "Phở bò khoảng 350 kcal, giàu protein từ thịt bò..."
#                     health_rating: 8
#                     suitable_for_condition: true
#                 - step: 3
#                   action: "meal_suggestion"
#                   result:
#                     suggestions:
#                       - name: "bún bò Huế"
#                         calories: 380
#                         reason: "Tương tự về hương vị và dinh dưỡng"
#                       - name: "hủ tiếu"
#                         calories: 320
#                         reason: "Ít calo hơn, vẫn đủ chất"
#               summary: "Đã hoàn thành 3 bước trong workflow 'complete_analysis'"

#       400:
#         description: Thiếu dữ liệu hoặc không hợp lệ
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                 error:
#                   type: string
#                 details:
#                   type: object
#             example:
#               success: false
#               error: "Workflow 'complete_analysis' yêu cầu ít nhất 1 ảnh"
#               details:
#                 workflow: "complete_analysis"
#                 required_images: 1
#                 provided_images: 0

#       500:
#         description: Lỗi server
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                 error:
#                   type: string
#                 details:
#                   type: object
#             example:
#               success: false
#               error: "Lỗi server nội bộ"
#               details:
#                 message: "Unexpected error occurred"
#                 code: "internal_error"
#     """
#     try:
#         data = request.json
#         workflow_name = data.get("workflow", "complete_analysis")
#         images = data.get("images", [])
#         user_preferences = data.get("user_preferences", {})
        
#         results = []
        
#         if workflow_name == "complete_analysis" and images:
#             scan_result = internal_quick_scan(images[0])
#             results.append({"step": 1, "action": "quick_scan", "result": scan_result})
            
#             analysis_result = internal_analyze_food(
#                 images[0],
#                 user_preferences.get("health_condition", "khỏe mạnh"),
#                 user_preferences.get("dietary_goals", "duy trì cân nặng")
#             )
#             results.append({"step": 2, "action": "analyze_food", "result": analysis_result})
            
#             suggestion_result = internal_meal_suggestion(
#                 "trưa",
#                 user_preferences.get("health_condition", "khỏe mạnh"),
#                 "tương tự món vừa phân tích",
#                 user_preferences.get("budget_range", "100k"),
#                 "30 phút"
#             )
#             results.append({"step": 3, "action": "meal_suggestion", "result": suggestion_result})
        
#         elif workflow_name == "daily_tracking" and images:
#             tracking_result = internal_track_calories(
#                 images,
#                 user_preferences.get("target_calories", 2000),
#                 user_preferences.get("health_condition", "khỏe mạnh")
#             )
#             results.append({"step": 1, "action": "track_calories", "result": tracking_result})
            
#             suggestion_result = internal_meal_suggestion(
#                 "tối",
#                 user_preferences.get("health_condition", "khỏe mạnh"),
#                 "cân bằng với các bữa đã ăn",
#                 user_preferences.get("budget_range", "100k"),
#                 "30 phút"
#             )
#             results.append({"step": 2, "action": "meal_suggestion", "result": suggestion_result})
        
#         elif workflow_name == "meal_planning":
#             suggestion_result = internal_meal_suggestion(
#                 user_preferences.get("meal_time", "trưa"),
#                 user_preferences.get("health_condition", "khỏe mạnh"),
#                 user_preferences.get("dietary_preferences", "không"),
#                 user_preferences.get("budget_range", "100k"),
#                 "30 phút"
#             )
#             results.append({"step": 1, "action": "meal_suggestion", "result": suggestion_result})
            
#             recipes_result = internal_detailed_recipes(
#                 3,
#                 user_preferences.get("health_condition", "khỏe mạnh"),
#                 user_preferences.get("dietary_preferences", "không"),
#                 user_preferences.get("budget_range", "500k")
#             )
#             results.append({"step": 2, "action": "detailed_recipes", "result": recipes_result})
            
#             menu_result = internal_weekly_menu(
#                 user_preferences.get("health_condition", "khỏe mạnh"),
#                 user_preferences.get("dietary_preferences", "không"),
#                 user_preferences.get("budget_range", "500k"),
#                 "45 phút"
#             )
#             results.append({"step": 3, "action": "weekly_menu", "result": menu_result})
        
#         return jsonify({
#             "success": True,
#             "workflow": workflow_name,
#             "total_steps": len(results),
#             "results": results,
#             "summary": f"Đã hoàn thành {len(results)} bước trong workflow '{workflow_name}'"
#         }), 200
        
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


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


@app.route('/api/v1/chat', methods=['POST'])
def chat():
    """
    Chat với AI (không dùng Agent)
    ---
    tags:
      - AI Chat
    summary: Chat tự do với AI dinh dưỡng
    description: >
      Endpoint chat thông thường, KHÔNG dùng Agent mode. 
      Chỉ trả lời trực tiếp dạng chat, không phân tích intent và không thực thi function.
      Có thể bật Agent mode bằng cách set use_agent: true.
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              message:
                type: string
                example: "Xin chào, bạn có thể tư vấn dinh dưỡng không?"
              session_id:
                type: string
                example: "session_abc123"
              use_agent:
                type: boolean
                default: false
                example: false
    responses:
      200:
        description: Trả lời thành công
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
                    reply:
                      type: string
                    session_id:
                      type: string
                    processing_time:
                      type: string
            example:
              success: true
              message: "Chat thành công"
              data:
                reply: "Xin chào! Tôi là trợ lý AI dinh dưỡng. Tôi có thể giúp bạn phân tích món ăn, tư vấn thực đơn, và theo dõi dinh dưỡng. Bạn cần tôi hỗ trợ gì?"
                session_id: "session_abc123"
                processing_time: "0.8s"

      400:
        description: Dữ liệu đầu vào không hợp lệ
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
              message: "Yêu cầu không hợp lệ"
              error:
                code: "INVALID_INPUT"
                details: "Tin nhắn không được để trống"

      500:
        description: Lỗi server
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
              message: "Lỗi xử lý chat"
              error:
                code: "PROCESSING_ERROR"
                details: "OpenAI API rate limit exceeded"
    """

    try:
        data = request.json
        message = data.get("message", "").strip()
        session_id = data.get("session_id", str(uuid.uuid4()))
        use_agent = data.get("use_agent", False)

        if not message:
            return jsonify({"error": "Tin nhắn không được để trống"}), 400

        if use_agent:
            return ai_agent()

        if session_id not in conversations:
            conversations[session_id] = []

        history = conversations[session_id]
        messages = [{"role": "system", "content": AGENT_SYSTEM_PROMPT}]
        messages.extend(history[-10:])
        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=1500,
            temperature=0.7
        )

        bot_reply = response.choices[0].message.content.strip()

        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": bot_reply})

        return jsonify({"reply": bot_reply, "session_id": session_id}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/v1/analyze-food', methods=['POST'])
def analyze_food():
    """
    Phân tích món ăn từ ảnh
    ---
    tags:
      - Food Analysis
    summary: Phân tích dinh dưỡng món ăn từ hình ảnh
    description: >
      Phân tích món ăn dựa trên hình ảnh, đánh giá dinh dưỡng và đưa ra khuyến nghị 
      phù hợp với tình trạng sức khỏe và mục tiêu dinh dưỡng của người dùng.
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
                description: Ảnh món ăn dạng base64
                example: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
              health_condition:
                type: string
                description: Tình trạng sức khỏe
                default: "khỏe mạnh"
                example: "tiểu đường"
              dietary_goals:
                type: string
                description: Mục tiêu dinh dưỡng
                default: "duy trì cân nặng"
                example: "giảm cân"
              session_id:
                type: string
                description: ID phiên làm việc
                example: "uuid-v4"
              user_id:
                type: string
                description: ID người dùng
                example: "user_123"
    responses:
      200:
        description: Phân tích thành công
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
                    detected_foods:
                      type: array
                      items:
                        type: object
                        properties:
                          name:
                            type: string
                          confidence:
                            type: number
                    analysis:
                      type: string
                    health_condition:
                      type: string
                    dietary_goals:
                      type: string
                    recommendations:
                      type: array
                      items:
                        type: string
                    processing_time:
                      type: string
            example:
              success: true
              message: "Phân tích món ăn thành công"
              data:
                session_id: "550e8400-e29b-41d4-a716-446655440000"
                detected_foods:
                  - name: "phở bò"
                    confidence: 98.5
                  - name: "bánh phở"
                    confidence: 95.2
                analysis: "Phở bò khoảng 380 kcal, giàu protein từ thịt bò (20-25g), carbohydrate từ bánh phở (50-60g). Chỉ số đường huyết trung bình do bánh phở."
                health_condition: "tiểu đường"
                dietary_goals: "giảm cân"
                recommendations:
                  - "💡 Nên ăn phần nhỏ hơn và bỏ bớt bánh phở"
                  - "🥗 Thêm rau xanh để tăng chất xơ"
                  - "⚠️ Lưu ý: Kiểm tra đường huyết sau 1-2 giờ"
                processing_time: "2.3s"

      400:
        description: Dữ liệu đầu vào không hợp lệ
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
              message: "Yêu cầu không hợp lệ"
              error:
                code: "INVALID_INPUT"
                details: "Không tìm thấy ảnh món ăn hoặc định dạng không hợp lệ"

      500:
        description: Lỗi server
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
              message: "Lỗi xử lý ảnh"
              error:
                code: "PROCESSING_ERROR"
                details: "OpenAI API rate limit exceeded"
    """
    try:
        data = request.json
        result = internal_analyze_food(
            data.get("image"),
            data.get("health_condition", "khỏe mạnh"),
            data.get("dietary_goals", "duy trì cân nặng")
        )
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify({"success": True, **result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# @app.route('/api/compare-foods', methods=['POST'])
# def compare_foods():
#     """
#     So sánh nhiều món ăn
#     ---
#     tags:
#       - Food Analysis
#     summary: So sánh 2-4 món ăn về dinh dưỡng
#     description: >
#       So sánh các món ăn dựa trên hình ảnh về calo, protein, carb, fat.
#       Xếp hạng theo độ lành mạnh và đưa ra khuyến nghị nên chọn món nào
#       phù hợp với tình trạng sức khỏe và mục tiêu dinh dưỡng.
#     requestBody:
#       required: true
#       content:
#         application/json:
#           schema:
#             type: object
#             required:
#               - images
#             properties:
#               images:
#                 type: array
#                 description: Mảng 2-4 ảnh món ăn dạng base64
#                 minItems: 2
#                 maxItems: 4
#                 items:
#                   type: string
#                 example:
#                   - "data:image/jpeg;base64,/9j/4AAQ..."
#                   - "data:image/jpeg;base64,iVBORw0KGg..."
#               health_condition:
#                 type: string
#                 description: Tình trạng sức khỏe
#                 default: "khỏe mạnh"
#                 example: "tiểu đường"
#               dietary_goals:
#                 type: string
#                 description: Mục tiêu dinh dưỡng
#                 default: "duy trì cân nặng"
#                 example: "giảm cân"
#               session_id:
#                 type: string
#                 description: ID phiên làm việc
#                 example: "uuid-v4"
#               user_id:
#                 type: string
#                 description: ID người dùng
#                 example: "user_123"
#     responses:
#       200:
#         description: So sánh thành công
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                 session_id:
#                   type: string
#                 detected_foods:
#                   type: array
#                   items:
#                     type: object
#                     properties:
#                       dish_number:
#                         type: integer
#                       foods:
#                         type: array
#                         items:
#                           type: object
#                           properties:
#                             name:
#                               type: string
#                             confidence:
#                               type: number
#                 comparison:
#                   type: string
#                   description: Bảng so sánh chi tiết
#                 ranking:
#                   type: array
#                   items:
#                     type: object
#                     properties:
#                       rank:
#                         type: integer
#                       dish_number:
#                         type: integer
#                       reason:
#                         type: string
#                 health_condition:
#                   type: string
#                 dietary_goals:
#                   type: string
#                 recommendations:
#                   type: array
#                   items:
#                     type: string
#                 total_foods:
#                   type: integer
#             example:
#               success: true
#               session_id: "550e8400-e29b-41d4-a716-446655440000"
#               detected_foods:
#                 - dish_number: 1
#                   foods:
#                     - name: "phở bò"
#                       confidence: 98.5
#                     - name: "bánh phở"
#                       confidence: 95.2
#                 - dish_number: 2
#                   foods:
#                     - name: "cơm gà"
#                       confidence: 97.8
#                     - name: "gạo trắng"
#                       confidence: 94.5
#               comparison: |
#                 | Món | Calo | Protein | Carb | Fat |
#                 |-----|------|---------|------|-----|
#                 | Phở bò | 380 | 25g | 55g | 8g |
#                 | Cơm gà | 450 | 30g | 65g | 12g |
#               ranking:
#                 - rank: 1
#                   dish_number: 1
#                   reason: "Ít calo hơn, carb thấp hơn, phù hợp với tiểu đường"
#                 - rank: 2
#                   dish_number: 2
#                   reason: "Calo và carb cao hơn, có thể làm tăng đường huyết"
#               health_condition: "tiểu đường"
#               dietary_goals: "giảm cân"
#               recommendations:
#                 - "🥇 Nên chọn: Phở bò (ít calo và carb hơn)"
#                 - "💡 Nếu chọn cơm gà: Giảm lượng cơm đi 1/2"
#                 - "🥗 Thêm rau xanh cho cả 2 món"
#               total_foods: 2

#       400:
#         description: Thiếu dữ liệu hoặc không hợp lệ
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                 error:
#                   type: string
#                 details:
#                   type: object
#             example:
#               success: false
#               error: "Cần ít nhất 2 ảnh để so sánh"
#               details:
#                 field: "images"
#                 reason: "minItems: 2"
#                 received: 1

#       500:
#         description: Lỗi server
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                 error:
#                   type: string
#                 details:
#                   type: object
#             example:
#               success: false
#               error: "OpenAI API error"
#               details:
#                 message: "Rate limit exceeded"
#                 code: "rate_limit_error"
#     """
#     try:
#         data = request.json
#         images = data.get("images", [])
        
#         if len(images) < 2:
#             return jsonify({"error": "Cần ít nhất 2 ảnh"}), 400
        
#         result = internal_compare_foods(images, data.get("health_condition", "khỏe mạnh"))
        
#         return jsonify({"success": True, **result}), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


# @app.route('/api/track-calories', methods=['POST'])
# def track_calories():
#     """
#     Tính tổng calo trong ngày
#     ---
#     tags:
#       - Food Analysis
#     summary: Tính tổng calo và dinh dưỡng từ nhiều bữa ăn
#     description: >
#       Tính tổng calo, protein, carb, fat từ các bữa ăn trong ngày.
#       So sánh với nhu cầu khuyến nghị và đưa ra đánh giá tổng quan
#       về chế độ ăn trong ngày.
#     requestBody:
#       required: true
#       content:
#         application/json:
#           schema:
#             type: object
#             required:
#               - meals
#             properties:
#               meals:
#                 type: array
#                 description: Danh sách các bữa ăn trong ngày
#                 minItems: 1
#                 items:
#                   type: object
#                   properties:
#                     meal_type:
#                       type: string
#                       enum: ["sáng", "trưa", "tối", "phụ"]
#                     images:
#                       type: array
#                       items:
#                         type: string
#                     food_names:
#                       type: array
#                       items:
#                         type: string
#                 example:
#                   - meal_type: "sáng"
#                     images: ["data:image/jpeg;base64,/9j/4AAQ..."]
#                     food_names: ["phở bò", "bánh mì"]
#                   - meal_type: "trưa"
#                     images: ["data:image/jpeg;base64,iVBORw0KGg..."]
#                     food_names: ["cơm gà"]
#               health_condition:
#                 type: string
#                 description: Tình trạng sức khỏe
#                 default: "khỏe mạnh"
#                 example: "tiểu đường"
#               dietary_goals:
#                 type: string
#                 description: Mục tiêu dinh dưỡng
#                 default: "duy trì cân nặng"
#                 example: "giảm cân"
#               target_calories:
#                 type: integer
#                 description: Mục tiêu calo trong ngày
#                 default: 2000
#                 example: 1500
#               session_id:
#                 type: string
#                 description: ID phiên làm việc
#                 example: "uuid-v4"
#               user_id:
#                 type: string
#                 description: ID người dùng
#                 example: "user_123"
#     responses:
#       200:
#         description: Tính toán thành công
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                 session_id:
#                   type: string
#                 daily_summary:
#                   type: object
#                   properties:
#                     total_calories:
#                       type: number
#                     total_protein:
#                       type: number
#                     total_carb:
#                       type: number
#                     total_fat:
#                       type: number
#                     target_calories:
#                       type: integer
#                     calories_remaining:
#                       type: number
#                 meals_breakdown:
#                   type: array
#                   items:
#                     type: object
#                     properties:
#                       meal_type:
#                         type: string
#                       foods:
#                         type: array
#                       calories:
#                         type: number
#                       protein:
#                         type: number
#                       carb:
#                         type: number
#                       fat:
#                         type: number
#                 nutritional_assessment:
#                   type: object
#                   properties:
#                     calories_status:
#                       type: string
#                     protein_status:
#                       type: string
#                     carb_status:
#                       type: string
#                     fat_status:
#                       type: string
#                 health_condition:
#                   type: string
#                 dietary_goals:
#                   type: string
#                 recommendations:
#                   type: array
#                   items:
#                     type: string
#             example:
#               success: true
#               session_id: "550e8400-e29b-41d4-a716-446655440000"
#               daily_summary:
#                 total_calories: 1350
#                 total_protein: 65
#                 total_carb: 180
#                 total_fat: 28
#                 target_calories: 1500
#                 calories_remaining: 150
#               meals_breakdown:
#                 - meal_type: "sáng"
#                   foods: ["phở bò", "bánh mì"]
#                   calories: 550
#                   protein: 30
#                   carb: 75
#                   fat: 12
#                 - meal_type: "trưa"
#                   foods: ["cơm gà"]
#                   calories: 450
#                   protein: 25
#                   carb: 65
#                   fat: 10
#                 - meal_type: "tối"
#                   foods: ["salad"]
#                   calories: 350
#                   protein: 10
#                   carb: 40
#                   fat: 6
#               nutritional_assessment:
#                 calories_status: "Tốt - Còn 150 calo"
#                 protein_status: "Đủ - 65g/60g khuyến nghị"
#                 carb_status: "Hơi cao - 180g/150g khuyến nghị"
#                 fat_status: "Tốt - 28g/50g khuyến nghị"
#               health_condition: "tiểu đường"
#               dietary_goals: "giảm cân"
#               recommendations:
#                 - "✅ Lượng calo trong ngày phù hợp với mục tiêu giảm cân"
#                 - "💡 Có thể ăn thêm 1 bữa phụ nhẹ (150 calo)"
#                 - "⚠️ Carb hơi cao, nên giảm cơm/bánh mì ở bữa tối"
#                 - "🥗 Protein đủ, duy trì lượng này"

#       400:
#         description: Thiếu dữ liệu hoặc không hợp lệ
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                 error:
#                   type: string
#                 details:
#                   type: object
#             example:
#               success: false
#               error: "Danh sách bữa ăn không được rỗng"
#               details:
#                 field: "meals"
#                 reason: "minItems: 1"
#                 received: 0

#       500:
#         description: Lỗi server
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                 error:
#                   type: string
#                 details:
#                   type: object
#             example:
#               success: false
#               error: "OpenAI API error"
#               details:
#                 message: "Rate limit exceeded"
#                 code: "rate_limit_error"
#     """
#     try:
#         data = request.json
#         images = data.get("images", [])
        
#         if not images:
#             return jsonify({"error": "Chưa có ảnh"}), 400
        
#         result = internal_track_calories(
#             images,
#             data.get("target_calories", 2000),
#             data.get("health_condition", "khỏe mạnh")
#         )
        
#         return jsonify({"success": True, **result}), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


# @app.route('/api/quick-scan', methods=['POST'])
# def quick_scan():
#     """
#     Quét nhanh nhận diện món ăn
#     ---
#     tags:
#       - Food Analysis
#     summary: Nhận diện nhanh tên món (không phân tích)
#     description: >
#       Khác với /api/analyze-food - Chỉ nhận diện tên món, không phân tích dinh dưỡng.
#       Nhanh hơn, tiết kiệm token hơn, phù hợp khi chỉ cần biết tên món ăn.
#     requestBody:
#       required: true
#       content:
#         application/json:
#           schema:
#             type: object
#             required:
#               - image
#             properties:
#               image:
#                 type: string
#                 description: Ảnh món ăn dạng base64
#                 example: "data:image/jpeg;base64,/9j/4AAQ..."
#               session_id:
#                 type: string
#                 description: ID phiên làm việc
#                 example: "uuid-v4"
#               user_id:
#                 type: string
#                 description: ID người dùng
#                 example: "user_123"
#     responses:
#       200:
#         description: Nhận diện thành công
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                 session_id:
#                   type: string
#                 detected_foods:
#                   type: array
#                   items:
#                     type: object
#                     properties:
#                       name:
#                         type: string
#                       confidence:
#                         type: number
#                 total:
#                   type: integer
#                   description: Số món nhận diện được
#             example:
#               success: true
#               session_id: "550e8400-e29b-41d4-a716-446655440000"
#               detected_foods:
#                 - name: "phở bò"
#                   confidence: 98.5
#                 - name: "bánh phở"
#                   confidence: 95.2
#                 - name: "thịt bò"
#                   confidence: 92.8
#               total: 3

#       400:
#         description: Thiếu dữ liệu hoặc không hợp lệ
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                 error:
#                   type: string
#                 details:
#                   type: object
#             example:
#               success: false
#               error: "Không nhận diện được món ăn trong ảnh"
#               details:
#                 field: "image"
#                 reason: "invalid_or_unclear_image"

#       500:
#         description: Lỗi server
#         content:
#           application/json:
#             schema:
#               type: object
#               properties:
#                 success:
#                   type: boolean
#                 error:
#                   type: string
#                 details:
#                   type: object
#             example:
#               success: false
#               error: "OpenAI API error"
#               details:
#                 message: "Rate limit exceeded"
#                 code: "rate_limit_error"
#     """
#     try:
#         data = request.json
#         result = internal_quick_scan(data.get("image"))
        
#         if "error" in result:
#             return jsonify(result), 400
        
#         return jsonify({"success": True, **result}), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


@app.route('/api/v1/meal-suggestion', methods=['POST'])
def meal_suggestion():
    """
    Gợi ý thực đơn cho 1 bữa
    ---
    tags:
      - Meal Planning
    summary: Gợi ý món ăn cho 1 bữa ăn
    description: >
      AI sẽ gợi ý 2-3 món Việt phù hợp với bữa ăn, kèm lý do chọn món,
      cách làm đơn giản và ước tính calo cho từng món.
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              meal_time:
                type: string
                description: Bữa ăn trong ngày
                enum: ["sáng", "trưa", "tối", "phụ"]
                default: "trưa"
                example: "trưa"
              health_condition:
                type: string
                description: Tình trạng sức khỏe
                default: "khỏe mạnh"
                example: "tiểu đường"
              dietary_preferences:
                type: string
                description: Sở thích ăn uống
                default: "không"
                example: "ăn chay"
              budget_range:
                type: string
                description: Ngân sách cho bữa ăn
                default: "100k"
                example: "50k"
              cooking_time:
                type: string
                description: Thời gian nấu mong muốn
                default: "30 phút"
                example: "15 phút"
              session_id:
                type: string
                description: ID phiên làm việc
                example: "uuid-v4"
              user_id:
                type: string
                description: ID người dùng
                example: "user_123"
    responses:
      200:
        description: Gợi ý thành công
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
                    meal_time:
                      type: string
                    suggestions:
                      type: array
                      items:
                        type: object
                        properties:
                          dish_name:
                            type: string
                          reason:
                            type: string
                          cooking_method:
                            type: string
                          estimated_calories:
                            type: number
                          estimated_cost:
                            type: integer
                    health_condition:
                      type: string
                    dietary_preferences:
                      type: string
                    recommendations:
                      type: array
                      items:
                        type: string
            example:
              success: true
              message: "Gợi ý thực đơn thành công"
              data:
                session_id: "550e8400-e29b-41d4-a716-446655440000"
                meal_time: "trưa"
                suggestions:
                  - dish_name: "Phở gà"
                    reason: "Ít calo, dễ làm, giàu protein từ gà, phù hợp người tiểu đường"
                    cooking_method: "Luộc gà, nấu nước dùng với xương, chan nước dùng vào bánh phở"
                    estimated_calories: 350
                    estimated_cost: 40000
                  - dish_name: "Cơm gạo lứt với cá hồi nướng"
                    reason: "Gạo lứt giúp kiểm soát đường huyết, cá hồi giàu omega-3"
                    cooking_method: "Ướp cá với muối tiêu, nướng 15 phút, ăn kèm cơm gạo lứt"
                    estimated_calories: 420
                    estimated_cost: 55000
                  - dish_name: "Salad ức gà"
                    reason: "Ít carb, nhiều rau xanh và protein, cực kỳ phù hợp giảm cân"
                    cooking_method: "Luộc ức gà, trộn với rau xanh, cà chua, dưa leo"
                    estimated_calories: 280
                    estimated_cost: 35000
                health_condition: "tiểu đường"
                dietary_preferences: "không"
                recommendations:
                  - "💡 Nên chọn phở gà hoặc salad ức gà (ít carb hơn)"
                  - "🥗 Thêm rau xanh vào bất kỳ món nào"
                  - "⚠️ Tránh nước ngọt và tráng miệng ngọt"

      400:
        description: Thiếu dữ liệu hoặc không hợp lệ
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
              message: "Bữa ăn không hợp lệ"
              error:
                code: "INVALID_MEAL_TIME"
                details: "meal_time must be one of: sáng, trưa, tối, phụ"

      500:
        description: Lỗi server
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
              message: "Lỗi xử lý gợi ý thực đơn"
              error:
                code: "PROCESSING_ERROR"
                details: "OpenAI API rate limit exceeded"
    """
    try:
        data = request.json
        result = internal_meal_suggestion(
            data.get("meal_time", "trưa"),
            data.get("health_condition", "khỏe mạnh"),
            data.get("dietary_preferences", "không"),
            data.get("budget_range", "100k"),
            data.get("cooking_time", "30 phút")
        )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/v1/weekly-menu', methods=['POST'])
def weekly_menu():
    """
    Lập thực đơn cả tuần (7 ngày)
    ---
    tags:
      - Meal Planning
    summary: Tạo thực đơn 7 ngày với 3 bữa/ngày
    description: >
      Tạo thực đơn đầy đủ cho cả tuần từ Thứ 2 đến Chủ Nhật.
      Mỗi ngày bao gồm bữa sáng, trưa, tối với tổng calo và chi phí ước tính.
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              health_condition:
                type: string
                description: Tình trạng sức khỏe
                default: "khỏe mạnh"
                example: "giảm cân"
              dietary_preferences:
                type: string
                description: Sở thích ăn uống
                default: "không"
                example: "low-carb"
              budget_range:
                type: string
                description: Ngân sách mỗi ngày
                default: "500k"
                example: "300k"
              cooking_time:
                type: string
                description: Thời gian nấu trung bình mỗi bữa
                default: "45 phút"
                example: "30 phút"
              session_id:
                type: string
                description: ID phiên làm việc
                example: "uuid-v4"
              user_id:
                type: string
                description: ID người dùng
                example: "user_123"
    responses:
      200:
        description: Tạo menu thành công
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
                    duration:
                      type: string
                    weekly_menu:
                      type: array
                      items:
                        type: object
                        properties:
                          day:
                            type: string
                          date:
                            type: string
                          meals:
                            type: array
                            items:
                              type: object
                              properties:
                                meal_type:
                                  type: string
                                dishes:
                                  type: array
                                  items:
                                    type: string
                                estimated_calories:
                                  type: number
                                estimated_cost:
                                  type: integer
                          daily_total:
                            type: object
                            properties:
                              calories:
                                type: number
                              cost:
                                type: integer
                    health_condition:
                      type: string
                    dietary_preferences:
                      type: string
                    weekly_summary:
                      type: object
                      properties:
                        total_calories:
                          type: number
                        avg_daily_calories:
                          type: number
                        total_cost:
                          type: integer
                        avg_daily_cost:
                          type: integer
                    recommendations:
                      type: array
                      items:
                        type: string
            example:
              success: true
              message: "Tạo thực đơn tuần thành công"
              data:
                session_id: "550e8400-e29b-41d4-a716-446655440000"
                duration: "7 ngày"
                weekly_menu:
                  - day: "Thứ 2"
                    date: "2025-12-02"
                    meals:
                      - meal_type: "sáng"
                        dishes: ["Phở gà không dầu mỡ", "Rau thơm"]
                        estimated_calories: 320
                        estimated_cost: 35000
                      - meal_type: "trưa"
                        dishes: ["Cơm gạo lứt", "Gà nướng", "Rau luộc"]
                        estimated_calories: 450
                        estimated_cost: 45000
                      - meal_type: "tối"
                        dishes: ["Canh chua cá", "Rau muống xào"]
                        estimated_calories: 380
                        estimated_cost: 40000
                    daily_total:
                      calories: 1150
                      cost: 120000
                  - day: "Thứ 3"
                    date: "2025-12-03"
                    meals:
                      - meal_type: "sáng"
                        dishes: ["Bánh mì trứng ốp la", "Cà phê đen"]
                        estimated_calories: 350
                        estimated_cost: 25000
                      - meal_type: "trưa"
                        dishes: ["Bún chả", "Rau sống"]
                        estimated_calories: 480
                        estimated_cost: 50000
                      - meal_type: "tối"
                        dishes: ["Salad ức gà", "Bánh mì nguyên cám"]
                        estimated_calories: 400
                        estimated_cost: 40000
                    daily_total:
                      calories: 1230
                      cost: 115000
                health_condition: "giảm cân"
                dietary_preferences: "low-carb"
                weekly_summary:
                  total_calories: 8190
                  avg_daily_calories: 1170
                  total_cost: 840000
                  avg_daily_cost: 120000
                recommendations:
                  - "✅ Thực đơn phù hợp với mục tiêu giảm cân (1170 calo/ngày)"
                  - "💡 Protein đủ, carb được kiểm soát tốt"
                  - "💰 Chi phí trung bình: 120,000 VNĐ/ngày"
                  - "🥗 Đã cân đối đủ rau xanh trong tuần"
                  - "⚠️ Nhớ uống đủ nước và tập thể dục 30 phút/ngày"

      400:
        description: Thiếu dữ liệu hoặc không hợp lệ
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
              message: "Ngân sách không hợp lệ"
              error:
                code: "INVALID_BUDGET"
                details: "budget_range must be in format: số + k (e.g., 300k)"

      500:
        description: Lỗi server
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
              message: "Lỗi tạo thực đơn tuần"
              error:
                code: "PROCESSING_ERROR"
                details: "OpenAI API rate limit exceeded"
    """
    try:
        data = request.json
        result = internal_weekly_menu(
            data.get("health_condition", "khỏe mạnh"),
            data.get("dietary_preferences", "không"),
            data.get("budget_range", "500k"),
            data.get("cooking_time", "45 phút")
        )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/v1/detailed-recipes', methods=['POST'])
def detailed_recipes():
    """
    Tạo công thức nấu chi tiết
    ---
    tags:
      - Meal Planning
    summary: Công thức với nguyên liệu và bước làm
    description: >
      Tạo công thức nấu ăn chi tiết cho nhiều ngày với nguyên liệu cụ thể (số lượng, đơn vị),
      bước làm từng bước, thời gian chuẩn bị + nấu, calo và chi phí ước tính cho mỗi món.
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              days:
                type: integer
                description: Số ngày muốn tạo công thức
                minimum: 1
                maximum: 7
                default: 3
                example: 5
              health_condition:
                type: string
                description: Tình trạng sức khỏe
                default: "khỏe mạnh"
                example: "tim mạch"
              dietary_preferences:
                type: string
                description: Sở thích ăn uống
                default: "không"
                example: "không ăn hải sản"
              budget_range:
                type: string
                description: Ngân sách mỗi ngày
                default: "500k"
                example: "200k/ngày"
              session_id:
                type: string
                description: ID phiên làm việc
                example: "uuid-v4"
              user_id:
                type: string
                description: ID người dùng
                example: "user_123"
    responses:
      200:
        description: Tạo công thức thành công
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
                    days:
                      type: integer
                    recipes:
                      type: array
                      items:
                        type: object
                        properties:
                          day:
                            type: integer
                          date:
                            type: string
                          meals:
                            type: array
                            items:
                              type: object
                              properties:
                                meal_type:
                                  type: string
                                dish_name:
                                  type: string
                                ingredients:
                                  type: array
                                  items:
                                    type: object
                                    properties:
                                      name:
                                        type: string
                                      quantity:
                                        type: string
                                      unit:
                                        type: string
                                cooking_steps:
                                  type: array
                                  items:
                                    type: string
                                prep_time:
                                  type: string
                                cook_time:
                                  type: string
                                total_time:
                                  type: string
                                estimated_calories:
                                  type: number
                                estimated_cost:
                                  type: integer
                    health_condition:
                      type: string
                    dietary_preferences:
                      type: string
                    total_summary:
                      type: object
                      properties:
                        total_recipes:
                          type: integer
                        total_cost:
                          type: integer
                        avg_calories_per_meal:
                          type: number
                    recommendations:
                      type: array
                      items:
                        type: string
            example:
              success: true
              message: "Tạo công thức nấu thành công"
              data:
                session_id: "550e8400-e29b-41d4-a716-446655440000"
                days: 5
                recipes:
                  - day: 1
                    date: "2025-12-03"
                    meals:
                      - meal_type: "sáng"
                        dish_name: "Phở gà"
                        ingredients:
                          - name: "Gà ta"
                            quantity: "300"
                            unit: "g"
                          - name: "Bánh phở"
                            quantity: "200"
                            unit: "g"
                          - name: "Hành lá"
                            quantity: "50"
                            unit: "g"
                          - name: "Gừng"
                            quantity: "20"
                            unit: "g"
                          - name: "Nước mắm"
                            quantity: "2"
                            unit: "muống canh"
                        cooking_steps:
                          - "Rửa sạch gà, chần qua nước sôi để loại bỏ tạp chất"
                          - "Nấu nước dùng: Cho gà, gừng, hành vào nồi, đổ 2 lít nước"
                          - "Ninh 45 phút lửa vừa, vớt bọt thường xuyên"
                          - "Luộc bánh phở trong 1 phút, vớt ra tô"
                          - "Xé gà, cho lên bánh phở, chan nước dùng nóng"
                          - "Rắc hành lá, ngò gai, tiêu"
                        prep_time: "15 phút"
                        cook_time: "45 phút"
                        total_time: "60 phút"
                        estimated_calories: 350
                        estimated_cost: 40000
                      - meal_type: "trưa"
                        dish_name: "Cơm gạo lứt với cá hồi nướng"
                        ingredients:
                          - name: "Gạo lứt"
                            quantity: "150"
                            unit: "g"
                          - name: "Cá hồi"
                            quantity: "200"
                            unit: "g"
                          - name: "Muối"
                            quantity: "1"
                            unit: "thìa cà phê"
                          - name: "Tiêu"
                            quantity: "1/2"
                            unit: "thìa cà phê"
                          - name: "Rau củ luộc"
                            quantity: "150"
                            unit: "g"
                        cooking_steps:
                          - "Vo gạo lứt, ngâm 30 phút, nấu cơm"
                          - "Rửa cá hồi, thấm khô"
                          - "Ướp cá với muối, tiêu 10 phút"
                          - "Nướng lò 180°C trong 15 phút hoặc chiên chảo không dầu"
                          - "Luộc rau củ (cà rốt, bông cải)"
                          - "Bày cơm, cá, rau ra đĩa"
                        prep_time: "40 phút"
                        cook_time: "20 phút"
                        total_time: "60 phút"
                        estimated_calories: 480
                        estimated_cost: 70000
                  - day: 2
                    date: "2025-12-04"
                    meals:
                      - meal_type: "sáng"
                        dish_name: "Bánh mì trứng"
                        ingredients:
                          - name: "Bánh mì"
                            quantity: "1"
                            unit: "ổ"
                          - name: "Trứng gà"
                            quantity: "2"
                            unit: "quả"
                          - name: "Dưa leo"
                            quantity: "50"
                            unit: "g"
                          - name: "Cà chua"
                            quantity: "50"
                            unit: "g"
                        cooking_steps:
                          - "Đập trứng vào bát, đánh tan"
                          - "Chiên trứng ốp la hoặc tráng"
                          - "Nướng bánh mì giòn"
                          - "Kẹp trứng, dưa leo, cà chua vào bánh mì"
                        prep_time: "5 phút"
                        cook_time: "10 phút"
                        total_time: "15 phút"
                        estimated_calories: 320
                        estimated_cost: 15000
                health_condition: "tim mạch"
                dietary_preferences: "không ăn hải sản"
                total_summary:
                  total_recipes: 15
                  total_cost: 625000
                  avg_calories_per_meal: 385
                recommendations:
                  - "✅ Công thức phù hợp với người tim mạch (ít muối, ít dầu mỡ)"
                  - "💡 Tổng chi phí 5 ngày: 625,000 VNĐ (125,000 VNĐ/ngày)"
                  - "🥗 Đã tránh hải sản theo yêu cầu"
                  - "⚠️ Nhớ rửa sạch rau củ và nấu chín kỹ"
                  - "📊 Trung bình 385 calo/bữa, phù hợp giảm cân nhẹ"

      400:
        description: Thiếu dữ liệu hoặc không hợp lệ
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
              message: "Số ngày phải từ 1-7"
              error:
                code: "INVALID_DAYS"
                details: "days must be between 1 and 7"

      500:
        description: Lỗi server
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
              message: "Lỗi tạo công thức"
              error:
                code: "PROCESSING_ERROR"
                details: "OpenAI API rate limit exceeded"
    """
    try:
        data = request.json
        result = internal_detailed_recipes(
            data.get("days", 3),
            data.get("health_condition", "khỏe mạnh"),
            data.get("dietary_preferences", "không"),
            data.get("budget_range", "500k")
        )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint không tồn tại"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Lỗi server"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)


