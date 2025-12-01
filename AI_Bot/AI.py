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


@app.route('/api/agent', methods=['POST'])
def ai_agent():
    """
    AI Agent - Tự động phân tích và thực thi
    ---
    tags:
      - AI Agent
    summary: AI Agent tự động phân tích ý định và thực thi function
    description: >
      AI Agent phân tích intent, chọn function và thực thi tự động.
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
              session_id:
                type: string
                example: "uuid-v4"
              user_id:
                type: string
                example: "user_123"
    responses:
      200:
        description: Phân tích và thực thi thành công
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                session_id:
                  type: string
                intent_analysis:
                  type: object
                result:
                  type: object
                suggestions:
                  type: array
                  items:
                    type: string
                executed:
                  type: boolean
            example:
              success: true
              session_id: "550e8400-e29b-41d4-a716-446655440000"
              intent_analysis:
                intent: "analyze_food"
                confidence: 0.95
                explanation: "User muốn phân tích món ăn..."
                alternative_actions: ["quick_scan", "compare_foods"]
                missing_info: []
              result:
                detected_foods:
                  - name: "phở bò"
                    confidence: 98.5
                  - name: "bánh phở"
                    confidence: 95.2
                analysis: "Calo: 350-400..."
                health_condition: "tiểu đường"
                dietary_goals: "kiểm soát đường huyết"
              suggestions:
                - "💡 So sánh với phở gà?"
                - "📊 Tính tổng calo?"
              executed: true

      400:
        description: Thiếu dữ liệu hoặc không hợp lệ
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                error:
                  type: string
                details:
                  type: object
            example:
              success: false
              error: "Tin nhắn không được để trống"
              details:
                field: "message"
                reason: "required"

      500:
        description: Lỗi server
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                error:
                  type: string
                details:
                  type: object
            example:
              success: false
              error: "OpenAI API error"
              details:
                message: "Rate limit exceeded"
                code: "rate_limit_error"
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


@app.route('/api/agent/suggest', methods=['POST'])
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
              session_id:
                type: string
                description: ID phiên làm việc để theo dõi lịch sử hội thoại
                example: "550e8400-e29b-41d4-a716-446655440000"
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
                intent_analysis:
                  type: object
                  description: Kết quả phân tích ý định
                  properties:
                    intent:
                      type: string
                      description: Tên chức năng được đề xuất
                      example: "meal_suggestion"
                    confidence:
                      type: number
                      format: float
                      description: Độ tin cậy của phân tích (0-1)
                      example: 0.92
                    explanation:
                      type: string
                      description: Giải thích ý định của người dùng
                      example: "User muốn được gợi ý bữa ăn nhanh và rẻ."
                    alternative_actions:
                      type: array
                      description: Các chức năng thay thế có thể dùng
                      items:
                        type: string
                      example: ["quick_scan", "weekly_menu"]
                    missing_info:
                      type: array
                      description: Danh sách thông tin còn thiếu
                      items:
                        type: string
                      example: []
                    suggested_params:
                      type: object
                      description: Tham số được đề xuất cho chức năng
                      example:
                        meal_type: "trưa"
                message:
                  type: string
                  description: Tin nhắn tóm tắt gợi ý cho người dùng
                  example: |
                    🤖 Tôi hiểu bạn muốn: User muốn được gợi ý bữa ăn nhanh và rẻ.

                    Tôi đề xuất dùng chức năng: meal_suggestion
                    Độ tự tin: 92%

                    📋 Các bước thực hiện:
                    - budget: ❌ Cần bổ sung
                    - time_limit: ❌ Cần bổ sung

                    💡 Hoặc bạn có thể:
                    - quick_scan: Quét nhanh món ăn bạn đang có
                    - weekly_menu: Gợi ý thực đơn cả tuần
                can_execute:
                  type: boolean
                  description: Có thể thực thi ngay hay cần thêm thông tin
                  example: false
            example:
              success: true
              intent_analysis:
                intent: "meal_suggestion"
                confidence: 0.92
                explanation: "User muốn được gợi ý bữa ăn nhanh và rẻ."
                alternative_actions:
                  - "quick_scan"
                  - "weekly_menu"
                missing_info: ["budget", "time_limit"]
                suggested_params:
                  meal_type: "trưa"
              message: |
                🤖 Tôi hiểu bạn muốn: User muốn được gợi ý bữa ăn nhanh và rẻ.

                Tôi đề xuất dùng chức năng: meal_suggestion
                Độ tự tin: 92%

                📋 Các bước thực hiện:
                - budget: ❌ Cần bổ sung
                - time_limit: ❌ Cần bổ sung

                💡 Hoặc bạn có thể:
                - quick_scan: Quét nhanh món ăn bạn đang có
                - weekly_menu: Gợi ý thực đơn cả tuần
              can_execute: false

      400:
        description: Thiếu dữ liệu hoặc không hợp lệ
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                error:
                  type: string
                details:
                  type: object
            example:
              success: false
              error: "Tin nhắn không được để trống"
              details:
                field: "message"
                reason: "required"

      500:
        description: Lỗi server
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                error:
                  type: string
                details:
                  type: object
            example:
              success: false
              error: "Internal server error"
              details:
                message: "Unexpected error occurred"
                code: "internal_error"
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


@app.route('/api/agent/multi-step', methods=['POST'])
def agent_multi_step():
    """
    AI Agent - Thực thi workflow nhiều bước
    ---
    tags:
      - AI Agent
    summary: Thực thi chuỗi nhiều chức năng liên tiếp
    description: |
      Thực thi tự động các workflow có cấu trúc nhiều bước, phù hợp cho các nhiệm vụ phức tạp.
      Mỗi workflow được thiết kế để giải quyết một use case cụ thể với chuỗi actions được định nghĩa trước.

      ## 🔥 Workflow hỗ trợ

      ### 1️⃣ `complete_analysis` (cần **1 ảnh**)
      Phân tích toàn diện một món ăn từ ảnh:
      - **Bước 1**: Quick scan nhận diện món ăn  
      - **Bước 2**: Phân tích chi tiết món (calo, dinh dưỡng, phù hợp sức khỏe)
      - **Bước 3**: Gợi ý các món tương tự hoặc thay thế

      ### 2️⃣ `daily_tracking` (cần **nhiều ảnh**)  
      Theo dõi và cân bằng dinh dưỡng cả ngày:
      - **Bước 1**: Theo dõi calo toàn bộ các bữa trong ngày từ ảnh
      - **Bước 2**: Gợi ý bữa tối cân bằng dựa trên tổng calo đã tiêu thụ

      ### 3️⃣ `meal_planning` (không cần ảnh)  
      Lập kế hoạch bữa ăn dài hạn:
      - **Bước 1**: Gợi ý một bữa ăn phù hợp
      - **Bước 2**: Cung cấp công thức chi tiết cho 3 ngày
      - **Bước 3**: Tạo thực đơn đầy đủ cho cả tuần

    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - workflow
            properties:
              workflow:
                type: string
                enum:
                  - complete_analysis
                  - daily_tracking
                  - meal_planning
                description: Tên workflow cần thực thi
                example: "complete_analysis"
              images:
                type: array
                description: |
                  Danh sách ảnh base64 (bắt buộc cho complete_analysis và daily_tracking)
                  - complete_analysis: cần 1 ảnh
                  - daily_tracking: cần nhiều ảnh (tùy số bữa)
                  - meal_planning: không cần ảnh
                items:
                  type: string
                example:
                  - "data:image/jpeg;base64,/9j/4AAQ..."
              user_preferences:
                type: object
                description: Thông tin và sở thích của người dùng
                properties:
                  health_condition:
                    type: string
                    description: Tình trạng sức khỏe
                    example: "tiểu đường"
                  dietary_goals:
                    type: string
                    description: Mục tiêu dinh dưỡng
                    example: "giảm cân"
                  target_calories:
                    type: integer
                    description: Lượng calo mục tiêu mỗi ngày
                    example: 1800
                  budget_range:
                    type: string
                    description: Ngân sách cho bữa ăn
                    example: "100k"
                  meal_time:
                    type: string
                    description: Thời gian bữa ăn (sáng/trưa/tối)
                    example: "trưa"
                  dietary_preferences:
                    type: string
                    description: Chế độ ăn ưa thích
                    example: "ăn chay"

    responses:
      200:
        description: Workflow đã hoàn thành thành công
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  description: Trạng thái thành công
                workflow:
                  type: string
                  description: Tên workflow đã thực thi
                total_steps:
                  type: integer
                  description: Tổng số bước đã thực hiện
                results:
                  type: array
                  description: Kết quả của từng bước trong workflow
                  items:
                    type: object
                    properties:
                      step:
                        type: integer
                        description: Số thứ tự bước
                      action:
                        type: string
                        description: Tên chức năng đã thực thi
                      result:
                        type: object
                        description: Kết quả trả về từ chức năng
                summary:
                  type: string
                  description: Tóm tắt kết quả workflow
            example:
              success: true
              workflow: "complete_analysis"
              total_steps: 3
              results:
                - step: 1
                  action: "quick_scan"
                  result:
                    detected_foods:
                      - name: "phở bò"
                        confidence: 98.5
                      - name: "bánh phở"
                        confidence: 95.2
                    status: "success"
                - step: 2
                  action: "analyze_food"
                  result:
                    food_name: "phở bò"
                    calories: 350
                    analysis: "Phở bò khoảng 350 kcal, giàu protein từ thịt bò..."
                    health_rating: 8
                    suitable_for_condition: true
                - step: 3
                  action: "meal_suggestion"
                  result:
                    suggestions:
                      - name: "bún bò Huế"
                        calories: 380
                        reason: "Tương tự về hương vị và dinh dưỡng"
                      - name: "hủ tiếu"
                        calories: 320
                        reason: "Ít calo hơn, vẫn đủ chất"
              summary: "Đã hoàn thành 3 bước trong workflow 'complete_analysis'"

      400:
        description: Thiếu dữ liệu hoặc không hợp lệ
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                error:
                  type: string
                details:
                  type: object
            example:
              success: false
              error: "Workflow 'complete_analysis' yêu cầu ít nhất 1 ảnh"
              details:
                workflow: "complete_analysis"
                required_images: 1
                provided_images: 0

      500:
        description: Lỗi server
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                error:
                  type: string
                details:
                  type: object
            example:
              success: false
              error: "Lỗi server nội bộ"
              details:
                message: "Unexpected error occurred"
                code: "internal_error"
    """
    try:
        data = request.json
        workflow_name = data.get("workflow", "complete_analysis")
        images = data.get("images", [])
        user_preferences = data.get("user_preferences", {})
        
        results = []
        
        if workflow_name == "complete_analysis" and images:
            scan_result = internal_quick_scan(images[0])
            results.append({"step": 1, "action": "quick_scan", "result": scan_result})
            
            analysis_result = internal_analyze_food(
                images[0],
                user_preferences.get("health_condition", "khỏe mạnh"),
                user_preferences.get("dietary_goals", "duy trì cân nặng")
            )
            results.append({"step": 2, "action": "analyze_food", "result": analysis_result})
            
            suggestion_result = internal_meal_suggestion(
                "trưa",
                user_preferences.get("health_condition", "khỏe mạnh"),
                "tương tự món vừa phân tích",
                user_preferences.get("budget_range", "100k"),
                "30 phút"
            )
            results.append({"step": 3, "action": "meal_suggestion", "result": suggestion_result})
        
        elif workflow_name == "daily_tracking" and images:
            tracking_result = internal_track_calories(
                images,
                user_preferences.get("target_calories", 2000),
                user_preferences.get("health_condition", "khỏe mạnh")
            )
            results.append({"step": 1, "action": "track_calories", "result": tracking_result})
            
            suggestion_result = internal_meal_suggestion(
                "tối",
                user_preferences.get("health_condition", "khỏe mạnh"),
                "cân bằng với các bữa đã ăn",
                user_preferences.get("budget_range", "100k"),
                "30 phút"
            )
            results.append({"step": 2, "action": "meal_suggestion", "result": suggestion_result})
        
        elif workflow_name == "meal_planning":
            suggestion_result = internal_meal_suggestion(
                user_preferences.get("meal_time", "trưa"),
                user_preferences.get("health_condition", "khỏe mạnh"),
                user_preferences.get("dietary_preferences", "không"),
                user_preferences.get("budget_range", "100k"),
                "30 phút"
            )
            results.append({"step": 1, "action": "meal_suggestion", "result": suggestion_result})
            
            recipes_result = internal_detailed_recipes(
                3,
                user_preferences.get("health_condition", "khỏe mạnh"),
                user_preferences.get("dietary_preferences", "không"),
                user_preferences.get("budget_range", "500k")
            )
            results.append({"step": 2, "action": "detailed_recipes", "result": recipes_result})
            
            menu_result = internal_weekly_menu(
                user_preferences.get("health_condition", "khỏe mạnh"),
                user_preferences.get("dietary_preferences", "không"),
                user_preferences.get("budget_range", "500k"),
                "45 phút"
            )
            results.append({"step": 3, "action": "weekly_menu", "result": menu_result})
        
        return jsonify({
            "success": True,
            "workflow": workflow_name,
            "total_steps": len(results),
            "results": results,
            "summary": f"Đã hoàn thành {len(results)} bước trong workflow '{workflow_name}'"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
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


@app.route('/api/chat', methods=['POST'])
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
                reply:
                  type: string
                session_id:
                  type: string
            example:
              success: true
              reply: "Xin chào! Tôi là trợ lý AI dinh dưỡng. Tôi có thể giúp bạn phân tích món ăn, tư vấn thực đơn, và theo dõi dinh dưỡng. Bạn cần tôi hỗ trợ gì?"
              session_id: "session_abc123"

      400:
        description: Thiếu dữ liệu hoặc không hợp lệ
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                error:
                  type: string
                details:
                  type: object
            example:
              success: false
              error: "Tin nhắn không được để trống"
              details:
                field: "message"
                reason: "required"

      500:
        description: Lỗi server
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                error:
                  type: string
                details:
                  type: object
            example:
              success: false
              error: "OpenAI API error"
              details:
                message: "Rate limit exceeded"
                code: "rate_limit_error"
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


@app.route('/api/analyze-food', methods=['POST'])
def analyze_food():
    """
    Phân tích món ăn từ ảnh
    ---
    tags:
      - Food Analysis
    summary: Phân tích dinh dưỡng món ăn từ hình ảnh
    description: Phân tích món ăn dựa trên hình ảnh, đánh giá dinh dưỡng và đưa ra khuyến nghị.
    parameters:
      - in: body
        name: body
        required: true
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
    responses:
      200:
        description: Phân tích thành công
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            detected_foods:
              type: array
              items:
                type: object
                properties:
                  name:
                    type: string
                  confidence:
                    type: number
              example:
                - name: "phở bò"
                  confidence: 98.5
                - name: "bánh phở"
                  confidence: 95.2
            analysis:
              type: string
              example: "Phở bò khoảng 380 kcal, giàu protein từ thịt bò..."
            health_condition:
              type: string
              example: "tiểu đường"
            dietary_goals:
              type: string
              example: "giảm cân"
      400:
        description: Thiếu dữ liệu hoặc không hợp lệ
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: false
            error:
              type: string
              example: "Không tìm thấy ảnh món ăn"
            details:
              type: object
              example:
                field: "image"
                reason: "required"
      500:
        description: Lỗi server
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: false
            error:
              type: string
              example: "OpenAI API error"
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


@app.route('/api/compare-foods', methods=['POST'])
def compare_foods():
    """
  So sánh nhiều món ăn
  ---
  post:
  tags:
    - Food Analysis
  summary: So sánh 2-4 món ăn
  description: |
    So sánh các món ăn về:
    - Calo, protein, carb, fat
    - Xếp hạng theo độ lành mạnh
    - Khuyến nghị nên chọn món nào
  parameters:
    - in: body
      name: body
      required: true
      schema:
        type: object
        required:
          - images
        properties:
          images:
            type: array
            description: Mảng 2-4 ảnh base64
            minItems: 2
            maxItems: 4
            items:
              type: string
            example:
              - "data:image/jpeg;base64,/9j/4AAQ..."
              - "data:image/jpeg;base64,iVBORw0KGg..."
          health_condition:
            type: string
            default: "khỏe mạnh"
            example: "tiểu đường"
  responses:
    200:
      description: So sánh thành công
      schema:
        type: object
        properties:
          success:
            type: boolean
            example: true
          detected_foods:
            type: array
            description: Món ăn đã nhận diện từng ảnh
            items:
              type: object
              properties:
                dish_number:
                  type: integer
                foods:
                  type: array
          comparison:
            type: string
            description: Bảng so sánh chi tiết
            example: "| Món | Calo | Protein |\n|-----|------|---------|..."
          total_foods:
            type: integer
            example: 2
    400:
      description: Cần ít nhất 2 ảnh
    500:
      description: Lỗi server
"""
    try:
        data = request.json
        images = data.get("images", [])
        
        if len(images) < 2:
            return jsonify({"error": "Cần ít nhất 2 ảnh"}), 400
        
        result = internal_compare_foods(images, data.get("health_condition", "khỏe mạnh"))
        
        return jsonify({"success": True, **result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/track-calories', methods=['POST'])
def track_calories():
    """
  Theo dõi tổng calo trong ngày
  ---
  post:
  tags:
    - Calorie Tracking
  summary: Tính tổng calo từ nhiều bữa ăn
  description: |
    **Chức năng:**
    - Nhận diện món từ nhiều ảnh
    - Tính tổng calo đã ăn
    - So với mục tiêu
    - Gợi ý điều chỉnh
  parameters:
    - in: body
      name: body
      required: true
      schema:
        type: object
        required:
          - images
        properties:
          images:
            type: array
            description: Ảnh các bữa ăn trong ngày (tối đa 4 bữa)
            items:
              type: string
            example:
              - "data:image/jpeg;base64,..."
              - "data:image/jpeg;base64,..."
              - "data:image/jpeg;base64,..."
          target_calories:
            type: integer
            description: Mục tiêu calo/ngày
            default: 2000
            example: 1800
          health_condition:
            type: string
            default: "khỏe mạnh"
            example: "giảm cân"
  responses:
    200:
      description: Tracking thành công
      schema:
        type: object
        properties:
          success:
            type: boolean
            example: true
          daily_meals:
            type: array
            description: Chi tiết từng bữa
            items:
              type: object
              properties:
                meal_name:
                  type: string
                  example: "Bữa Sáng"
                foods:
                  type: array
          tracking:
            type: string
            description: Báo cáo chi tiết
            example: "**Tổng calo:** 1650 kcal\n**So với mục tiêu:** Thiếu 150 kcal..."
          target_calories:
            type: integer
            example: 1800
    400:
      description: Chưa có ảnh
    500:
      description: Lỗi server
"""
    try:
        data = request.json
        images = data.get("images", [])
        
        if not images:
            return jsonify({"error": "Chưa có ảnh"}), 400
        
        result = internal_track_calories(
            images,
            data.get("target_calories", 2000),
            data.get("health_condition", "khỏe mạnh")
        )
        
        return jsonify({"success": True, **result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/quick-scan', methods=['POST'])
def quick_scan():
    """
  Quét nhanh nhận diện món ăn
  ---
  post:
  tags:
    - Food Analysis
  summary: Nhận diện nhanh tên món (không phân tích)
  description: |
    **Khác với `/api/analyze-food`:**
    - Chỉ nhận diện tên món
    - Không phân tích dinh dưỡng
    - Nhanh hơn, ít token hơn
  parameters:
    - in: body
      name: body
      required: true
      schema:
        type: object
        required:
          - image
        properties:
          image:
            type: string
            description: Ảnh base64
            example: "data:image/jpeg;base64,/9j/4AAQ..."
  responses:
    200:
      description: Nhận diện thành công
      schema:
        type: object
        properties:
          success:
            type: boolean
            example: true
          detected_foods:
            type: array
            items:
              type: object
              properties:
                name:
                  type: string
                  example: "phở bò"
                confidence:
                  type: number
                  example: 98.5
          total:
            type: integer
            description: Số món nhận diện được
            example: 3
    400:
      description: Không nhận diện được
    500:
      description: Lỗi server
"""
    try:
        data = request.json
        result = internal_quick_scan(data.get("image"))
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify({"success": True, **result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/meal-suggestion', methods=['POST'])
def meal_suggestion():
    """
  Gợi ý thực đơn cho 1 bữa
  ---
  post:
  tags:
    - Meal Planning
  summary: Gợi ý món ăn cho 1 bữa
  description: |
    **AI sẽ gợi ý:**
    - 2-3 món Việt phù hợp
    - Lý do chọn món
    - Cách làm đơn giản
    - Ước tính calo
  parameters:
    - in: body
      name: body
      schema:
        type: object
        properties:
          meal_time:
            type: string
            description: Bữa nào
            enum: ["sáng", "trưa", "tối", "phụ"]
            default: "trưa"
            example: "trưa"
          health_condition:
            type: string
            default: "khỏe mạnh"
            example: "tiểu đường"
          dietary_preferences:
            type: string
            description: Sở thích ăn uống
            default: "không"
            example: "ăn chay"
          budget_range:
            type: string
            description: Ngân sách
            default: "100k"
            example: "50k"
          cooking_time:
            type: string
            description: Thời gian nấu
            default: "30 phút"
            example: "15 phút"
  responses:
    200:
      description: Gợi ý thành công
      schema:
        type: object
        properties:
          suggestion:
            type: string
            description: Gợi ý chi tiết từ GPT
            example: "**Món 1: Phở gà**\n- Lý do: Ít calo, dễ làm..."
          meal_time:
            type: string
            example: "trưa"
    500:
      description: Lỗi server
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


@app.route('/api/weekly-menu', methods=['POST'])
def weekly_menu():
    """
  Lập thực đơn cả tuần (7 ngày)
  ---
  post:
  tags:
    - Meal Planning
  summary: Tạo thực đơn 7 ngày với 3 bữa/ngày
  description: |
    **Output:**
    - Thứ 2 → Chủ Nhật
    - Mỗi ngày: Sáng, Trưa, Tối
    - Tổng calo mỗi ngày
  parameters:
    - in: body
      name: body
      schema:
        type: object
        properties:
          health_condition:
            type: string
            default: "khỏe mạnh"
            example: "giảm cân"
          dietary_preferences:
            type: string
            default: "không"
            example: "low-carb"
          budget_range:
            type: string
            description: Ngân sách/ngày
            default: "500k"
            example: "300k"
          cooking_time:
            type: string
            description: Thời gian nấu trung bình
            default: "45 phút"
            example: "30 phút"
  responses:
    200:
      description: Tạo menu thành công
      schema:
        type: object
        properties:
          menu:
            type: string
            description: Thực đơn đầy đủ 7 ngày
            example: "**Thứ 2:**\n- Sáng: Phở gà...\n- Trưa: Cơm..."
          duration:
            type: string
            example: "7 ngày"
    500:
      description: Lỗi server
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


@app.route('/api/detailed-recipes', methods=['POST'])
def detailed_recipes():
    """
  Tạo công thức nấu chi tiết
  ---
  post:
  tags:
    - Meal Planning
  summary: Công thức với nguyên liệu và bước làm
  description: |
    **Chi tiết mỗi món:**
    - Nguyên liệu cụ thể (số lượng, đơn vị)
    - Bước làm từng bước
    - Thời gian chuẩn bị + nấu
    - Calo, chi phí ước tính
  parameters:
    - in: body
      name: body
      schema:
        type: object
        properties:
          days:
            type: integer
            description: Số ngày muốn tạo công thức
            default: 3
            example: 5
          health_condition:
            type: string
            default: "khỏe mạnh"
            example: "tim mạch"
          dietary_preferences:
            type: string
            default: "không"
            example: "không ăn hải sản"
          budget_range:
            type: string
            default: "500k"
            example: "200k/ngày"
  responses:
    200:
      description: Tạo công thức thành công
      schema:
        type: object
        properties:
          recipes:
            type: string
            description: Công thức chi tiết
            example: "**Ngày 1: Canh chua cá**\n- Nguyên liệu:\n  + Cá lóc: 300g..."
          days:
            type: integer
            example: 5
    500:
      description: Lỗi server
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
    app.run(host='localhost', port=5001, debug=True)


