
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
import uuid
import base64
from io import BytesIO
from PIL import Image
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
    "info": {
        "title": "Nutrition API",
        "description": "API tư vấn dinh dưỡng thông minh cho người Việt",
        "version": "1.0.0"
    }
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

# Lấy API key từ file .env
api_key = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=api_key)

conversations = {}
user_profiles = {}

SYSTEM_PROMPT = """Bạn là chuyên gia dinh dưỡng AI thân thiện của Việt Nam.

NHIỆM VỤ:
🥗 Tư vấn dinh dưỡng và món ăn Việt
📊 Phân tích thành phần dinh dưỡng
🍽️ Gợi ý thực đơn lành mạnh, phù hợp người Việt
💪 Hỗ trợ các vấn đề sức khỏe (tiểu đường, béo phì, tim mạch...)

PHONG CÁCH:
- Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu
- Sử dụng emoji phù hợp
- Ưu tiên món ăn Việt Nam
- Khuyến khích lối sống lành mạnh"""

def call_openai_text(prompt, model="gpt-4o", max_tokens=1500):
    """Gọi OpenAI text completion"""
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}")


def call_openai_vision(prompt, images_base64, max_tokens=1500):
    """Gọi OpenAI Vision API với ảnh base64"""
    try:
        content = [{"type": "text", "text": prompt}]
        
        for img_b64 in images_base64:
            # Xử lý base64 (bỏ prefix nếu có)
            if ',' in img_b64:
                img_b64 = img_b64.split(',')[1]
            
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
            })
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": content}],
            max_tokens=max_tokens,
            temperature=0.3
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise Exception(f"Vision API error: {str(e)}")
    
@app.route('/api/health', methods=['GET'])
def health_check():
    """Kiểm tra API hoạt động"""
    return jsonify({
        "status": "ok",
        "message": "Nutrition API đang hoạt động",
        "version": "1.0.0"
    }), 200


@app.route('/api/chat', methods=['POST'])
def chat():
    """
Chat Bot API — Gửi tin nhắn và nhận phản hồi từ AI
---
  post:
  tags:
    - Bot
  summary: Chat API — Gửi tin nhắn và nhận phản hồi từ AI
  description: |
    **Endpoint chính dùng cho Chat Bot thông minh**

    API này hỗ trợ:
    1. Gửi tin nhắn văn bản từ người dùng
    2. Tự động duy trì lịch sử hội thoại dựa trên `session_id`
    3. Kết hợp system prompt + lịch sử + tin nhắn mới và gửi đến mô hình OpenAI
    4. Nhận và trả về phản hồi từ AI
    5. Luôn trả kèm `session_id` để tiếp tục hội thoại

    **Tính năng:**
    - Lưu tối đa **10 tin nhắn gần nhất**
    - Tự tạo `session_id` nếu client không gửi
    - Xử lý lỗi thân thiện
    - Tương thích với mô hình `gpt-4o-mini`

  parameters:
    - in: body
      name: body
      required: true
      description: Payload gửi từ client
      schema:
        type: object
        required:
          - message
        properties:
          message:
            type: string
            description: Tin nhắn người dùng
            example: "Xin chào, bạn có thể giúp tôi không?"
          session_id:
            type: string
            description: ID phiên chat (nếu không gửi sẽ tự tạo)
            example: "550e8400-e29b-41d4-a716-446655440000"

  responses:
    200:
      description: Phản hồi thành công từ AI
      schema:
        type: object
        properties:
          reply:
            type: string
            example: "Chào bạn! Tôi có thể hỗ trợ gì cho bạn?"
          session_id:
            type: string
            example: "550e8400-e29b-41d4-a716-446655440000"
      examples:
        application/json:
          reply: "Chào bạn! Tôi có thể hỗ trợ bạn điều gì?"
          session_id: "550e8400-e29b-41d4-a716-446655440000"

    400:
      description: Lỗi input không hợp lệ
      schema:
        type: object
        properties:
          error:
            type: string
            example: "Tin nhắn không được để trống"

    500:
      description: Lỗi server nội bộ
      schema:
        type: object
        properties:
          error:
            type: string
            example: "OpenAI API error"
"""


    try:
        data = request.json
        message = data.get("message", "").strip()
        session_id = data.get("session_id", str(uuid.uuid4()))
        
        if not message:
            return jsonify({"error": "Tin nhắn không được để trống"}), 400
        
        # Khởi tạo conversation nếu chưa có
        if session_id not in conversations:
            conversations[session_id] = []
        
        history = conversations[session_id]
        
        # Tạo messages với context
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(history[-10:])  # Lấy 10 tin nhắn gần nhất
        messages.append({"role": "user", "content": message})
        
        # Gọi OpenAI
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=1500,
            temperature=0.7
        )
        
        bot_reply = response.choices[0].message.content.strip()
        
        # Lưu lịch sử
        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": bot_reply})
        
        return jsonify({
            "reply": bot_reply,
            "session_id": session_id
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/meal-suggestion', methods=['POST'])
def meal_suggestion():
    """
Meal Suggestion — Gợi ý món ăn cho 1 bữa
---
  post:
  tags:
    - Meal
  summary: Gợi ý món ăn theo sức khỏe, sở thích và thời gian nấu
  description: |
    **API gợi ý thực đơn theo ngữ cảnh người dùng**

    Tự động tạo gợi ý bữa ăn dựa trên:
    - Tình trạng sức khỏe
    - Sở thích ăn uống
    - Ngân sách cho bữa ăn
    - Thời gian nấu
    - Thời điểm ăn (sáng / trưa / tối / xế)

    **API sẽ trả về:**
    1. 2–3 món ăn Việt phù hợp
    2. Lý do chọn món liên quan sức khỏe
    3. Cách chế biến đơn giản
    4. Đồ uống gợi ý kèm theo
    5. Tổng calo ước tính
  parameters:
    - in: body
      name: body
      required: true
      description: Dữ liệu mô tả bữa ăn muốn gợi ý
      schema:
        type: object
        properties:
          health_condition:
            type: string
            description: Tình trạng sức khỏe hiện tại
            example: "tiểu đường"
          dietary_preferences:
            type: string
            description: Sở thích/kiêng khem
            example: "ít dầu mỡ"
          budget_range:
            type: string
            description: Ngân sách cho bữa ăn
            example: "100k"
          cooking_time:
            type: string
            description: Thời gian có thể nấu
            example: "20 phút"
          meal_time:
            type: string
            description: Loại bữa (sáng/trưa/tối/xế)
            example: "trưa"

  responses:
    200:
      description: Gợi ý bữa ăn thành công
      schema:
        type: object
        properties:
          suggestion:
            type: string
            description: Gợi ý món ăn từ AI
            example: "🥗 Gợi ý bữa trưa cho người tiểu đường..."
          meal_time:
            type: string
            example: "trưa"
      examples:
        application/json:
          suggestion: |
            🥗 *Bữa trưa cho người tiểu đường – ngân sách 100k*  
            1. **Cá basa kho tộ** – giàu đạm, ít đường  
            2. **Canh rau ngót thịt băm** – thanh, dễ tiêu  
            3. **Salad rau củ** – bổ sung chất xơ  
            👉 Tổng calo ~480 kcal  
          meal_time: "trưa"

    400:
      description: Dữ liệu không hợp lệ
      schema:
        type: object
        properties:
          error:
            type: string
            example: "Thiếu tham số đầu vào"

    500:
      description: Lỗi server
      schema:
        type: object
        properties:
          error:
            type: string
            example: "OpenAI API error"
"""

    try:
        data = request.json
        health_condition = data.get("health_condition", "khỏe mạnh")
        dietary_preferences = data.get("dietary_preferences", "không")
        budget_range = data.get("budget_range", "100k")
        cooking_time = data.get("cooking_time", "30 phút")
        meal_time = data.get("meal_time", "trưa")
        
        prompt = f"""
        Gợi ý thực đơn bữa {meal_time} cho người Việt:
        - Tình trạng sức khỏe: {health_condition}
        - Sở thích ăn uống: {dietary_preferences}
        - Ngân sách: {budget_range}
        - Thời gian nấu: {cooking_time}
        
        Yêu cầu trả lời:
        1. 2-3 món ăn Việt phù hợp
        2. Lý do chọn (liên quan sức khỏe)
        3. Cách chế biến đơn giản
        4. Đồ uống kèm theo
        5. Ước tính calo tổng
        
        Format rõ ràng, dễ đọc với emoji.
        """
        
        result = call_openai_text(prompt, max_tokens=1200)
        
        return jsonify({
            "suggestion": result,
            "meal_time": meal_time
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/weekly-menu', methods=['POST'])
def weekly_menu():
    """
    Tạo thực đơn 7 ngày cho người Việt
    ---
    tags:
      - Analysis
    summary: AI Weekly Menu - Lập thực đơn cả tuần
    description: |
      **Tạo thực đơn dinh dưỡng cho 7 ngày**
      
      - Tự động tính toán calo và dinh dưỡng cho từng bữa
      - Phù hợp với tình trạng sức khỏe và sở thích cá nhân
      - Kèm danh sách mua sắm và tips tiết kiệm thời gian
      - Tối ưu ngân sách và thời gian nấu nướng
      
      **Đặc điểm:**
      - Thực đơn cho 3 bữa/ngày × 7 ngày
      - Món ăn Việt Nam phổ biến
      - Chi tiết calo từng bữa và tổng calo mỗi ngày
      - Danh sách nguyên liệu tổng hợp cho cả tuần
      
    parameters:
      - in: body
        name: body
        required: true
        description: Thông tin về sức khỏe, sở thích và yêu cầu thực đơn
        schema:
          type: object
          properties:
            health_condition:
              type: string
              description: Tình trạng sức khỏe (khỏe mạnh, tiểu đường, huyết áp cao, béo phì, v.v.)
              default: "khỏe mạnh"
              example: "tiểu đường"
            dietary_preferences:
              type: string
              description: Sở thích ăn uống (chay, ít dầu mỡ, nhiều protein, v.v.)
              default: "không"
              example: "ít dầu mỡ"
            budget_range:
              type: string
              description: Ngân sách mỗi ngày (ví dụ 100k, 200k, 500k)
              default: "500k"
              example: "300k"
            cooking_time:
              type: string
              description: Thời gian nấu mỗi bữa (ví dụ 30 phút, 45 phút, 1 giờ)
              default: "45 phút"
              example: "30 phút"
              
    responses:
      200:
        description: Tạo thực đơn tuần thành công
        schema:
          type: object
          properties:
            menu:
              type: string
              description: Thực đơn chi tiết 7 ngày với format markdown
            duration:
              type: string
              description: Thời gian áp dụng thực đơn
              example: "7 ngày"
      400:
        description: Thiếu thông tin hoặc dữ liệu không hợp lệ
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Ngân sách không hợp lệ"
              
      500:
        description: Lỗi server
        schema:
          type: object
          properties:
            error:
              type: string
              example: "OpenAI API error"
    """
    try:
        data = request.json
        health_condition = data.get("health_condition", "khỏe mạnh")
        dietary_preferences = data.get("dietary_preferences", "không")
        budget_range = data.get("budget_range", "500k")
        cooking_time = data.get("cooking_time", "45 phút")
        
        prompt = f"""
        Lập thực đơn 7 ngày cho người Việt:
        - Sức khỏe: {health_condition}
        - Sở thích: {dietary_preferences}
        - Ngân sách mỗi ngày: {budget_range}
        - Thời gian nấu: {cooking_time}
        
        Format theo mẫu:
        **Thứ 2:**
        - Sáng: [món + calo]
        - Trưa: [món + calo]
        - Tối: [món + calo]
        
        Kèm theo:
        - Danh sách mua sắm cho cả tuần
        - Tips tiết kiệm thời gian
        - Tổng calo mỗi ngày
        """
        
        result = call_openai_text(prompt, model="gpt-4o", max_tokens=2500)
        
        return jsonify({
            "menu": result,
            "duration": "7 ngày"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/detailed-recipes', methods=['POST'])
def detailed_recipes():
    """
    Tạo công thức nấu ăn chi tiết
    ---
    tags:
      - Analysis
    summary: AI Detailed Recipes - Công thức nấu ăn chi tiết
    description: |
      **Tạo công thức nấu ăn chi tiết với hướng dẫn từng bước**
      
      - Nguyên liệu cụ thể với khối lượng chính xác
      - Các bước làm chi tiết dễ hiểu
      - Thông tin dinh dưỡng và calo đầy đủ
      - Chi phí ước tính cho từng món
      - Tips và tricks hữu ích
      
      **Đặc điểm:**
      - Công thức chi tiết cho nhiều ngày
      - Phù hợp với tình trạng sức khỏe
      - Tính toán calo và dinh dưỡng
      - Ước tính chi phí nguyên liệu
      - Thời gian chuẩn bị và nấu nướng
      
    parameters:
      - in: body
        name: body
        required: true
        description: Thông tin về sức khỏe, sở thích và số ngày cần công thức
        schema:
          type: object
          properties:
            health_condition:
              type: string
              description: Tình trạng sức khỏe (khỏe mạnh, tiểu đường, huyết áp cao, béo phì, v.v.)
              default: "khỏe mạnh"
              example: "tiểu đường"
            dietary_preferences:
              type: string
              description: Sở thích ăn uống (chay, ít dầu mỡ, nhiều protein, v.v.)
              default: "không"
              example: "ít dầu mỡ"
            budget_range:
              type: string
              description: Ngân sách cho nguyên liệu (ví dụ 100k, 200k, 500k)
              default: "500k"
              example: "300k"
            days:
              type: integer
              description: Số ngày cần công thức (1-7 ngày)
              default: 3
              example: 3
              
    responses:
      200:
        description: Tạo công thức nấu ăn thành công
        schema:
          type: object
          properties:
            recipes:
              type: string
              description: Công thức nấu ăn chi tiết với format markdown
            days:
              type: integer
              description: Số ngày công thức được tạo
              example: 3
      400:
        description: Thiếu thông tin hoặc dữ liệu không hợp lệ
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Số ngày phải từ 1-7"
              
      500:
        description: Lỗi server
        schema:
          type: object
          properties:
            error:
              type: string
              example: "OpenAI API error"
    """   
    try:
        data = request.json
        health_condition = data.get("health_condition", "khỏe mạnh")
        dietary_preferences = data.get("dietary_preferences", "không")
        budget_range = data.get("budget_range", "500k")
        days = data.get("days", 3)
        
        prompt = f"""
        Tạo thực đơn {days} ngày với công thức chi tiết:
        - Sức khỏe: {health_condition}
        - Sở thích: {dietary_preferences}
        - Ngân sách: {budget_range}
        
        Mỗi món gồm:
        1. Tên món và ảnh minh họa (mô tả)
        2. Nguyên liệu cụ thể (khối lượng)
        3. Các bước làm chi tiết
        4. Thời gian chuẩn bị + nấu
        5. Calo và dinh dưỡng
        6. Chi phí ước tính
        7. Tips hay
        """
        
        result = call_openai_text(prompt, model="gpt-4o", max_tokens=3000)
        
        return jsonify({
            "recipes": result,
            "days": days
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/analyze-food', methods=['POST'])
def analyze_food():
    """
    Phân tích món ăn từ ảnh
    ---
    tags:
      - Analysis
    summary: AI Analyze Food - Phân tích món ăn từ ảnh
    description: |
      **Phân tích chi tiết món ăn từ ảnh với AI Vision**
      
      - Nhận diện tên món và nguyên liệu chính
      - Ước tính calo và thông tin dinh dưỡng
      - Đánh giá mức độ phù hợp với sức khỏe
      - Phân tích ưu nhược điểm của món ăn
      - Gợi ý cách ăn tốt hơn hoặc thay thế
      
      **Đặc điểm:**
      - Sử dụng AI Vision để nhận diện món ăn
      - Phân tích dựa trên tình trạng sức khỏe cá nhân
      - Tính toán calo và dinh dưỡng chi tiết
      - Đánh giá theo thang điểm sao (1-5)
      - Gợi ý cải thiện hoặc món thay thế
      
    parameters:
      - in: body
        name: body
        required: true
        description: Ảnh món ăn và thông tin sức khỏe người dùng
        schema:
          type: object
          required:
            - image
          properties:
            image:
              type: string
              description: Ảnh món ăn dạng base64 (có hoặc không có prefix data:image/jpeg;base64,)
              example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
            health_condition:
              type: string
              description: Tình trạng sức khỏe (khỏe mạnh, tiểu đường, huyết áp cao, béo phì, v.v.)
              default: "khỏe mạnh"
              example: "tiểu đường"
            dietary_goals:
              type: string
              description: Mục tiêu ăn uống (duy trì cân nặng, giảm cân, tăng cơ, v.v.)
              default: "duy trì cân nặng"
              example: "giảm cân"
              
    responses:
      200:
        description: Phân tích món ăn thành công
        schema:
          type: object
          properties:
            analysis:
              type: string
              description: Kết quả phân tích chi tiết món ăn với format markdown
      400:
        description: Thiếu thông tin hoặc dữ liệu không hợp lệ
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Chưa có ảnh"
              
      500:
        description: Lỗi server
        schema:
          type: object
          properties:
            error:
              type: string
              example: "OpenAI API error"
    """
    try:
        data = request.json
        image_base64 = data.get("image")
        health_condition = data.get("health_condition", "khỏe mạnh")
        dietary_goals = data.get("dietary_goals", "duy trì cân nặng")
        
        if not image_base64:
            return jsonify({"error": "Chưa có ảnh"}), 400
        
        prompt = f"""
        Phân tích món ăn trong ảnh cho người {health_condition}, mục tiêu {dietary_goals}:
        
        1. **Nhận diện món ăn**: Tên món, nguyên liệu chính
        2. **Dinh dưỡng**: Ước tính calo, protein, carb, fat
        3. **Đánh giá**: Mức độ phù hợp (⭐ 1-5 sao) + lý do
        4. **Ưu điểm**: Điểm tốt của món
        5. **Nhược điểm**: Điểm cần cải thiện
        6. **Gợi ý**: Cách ăn tốt hơn hoặc thay thế
        
        Trả lời ngắn gọn, thực tế, dễ hiểu.
        """
        
        result = call_openai_vision(prompt, [image_base64])
        
        return jsonify({
            "analysis": result
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/compare-foods', methods=['POST'])
def compare_foods():
    """
    So sánh nhiều món ăn
    ---
    tags:
      - Analysis
    summary: AI Compare Foods - So sánh nhiều món ăn
    description: |
      **So sánh chi tiết nhiều món ăn để chọn lựa tốt nhất**
      
      - Nhận diện tên từng món ăn từ ảnh
      - So sánh thông tin dinh dưỡng chi tiết
      - Xếp hạng từ tốt nhất đến kém nhất
      - Khuyến nghị món nên chọn dựa trên sức khỏe
      - Cảnh báo món không phù hợp
      
      **Đặc điểm:**
      - Hỗ trợ so sánh từ 2 món trở lên
      - Bảng so sánh dinh dưỡng trực quan
      - Xếp hạng dựa trên tình trạng sức khỏe
      - Giải thích chi tiết lý do xếp hạng
      - Gợi ý món tốt nhất cho người dùng
      - Cảnh báo rủi ro sức khỏe nếu có
      
    parameters:
      - in: body
        name: body
        required: true
        description: Ảnh các món ăn cần so sánh và thông tin sức khỏe
        schema:
          type: object
          required:
            - images
          properties:
            images:
              type: array
              description: Mảng ảnh các món ăn dạng base64 (tối thiểu 2 ảnh)
              minItems: 2
              items:
                type: string
              example:
                - "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
                - "/9j/4AAQSkZJRgABAQAA..."
                - "/9j/4AAQSkZJRgABAQBB..."
            health_condition:
              type: string
              description: Tình trạng sức khỏe (khỏe mạnh, tiểu đường, huyết áp cao, béo phì, v.v.)
              default: "khỏe mạnh"
              example: "tiểu đường"
              
    responses:
      200:
        description: So sánh món ăn thành công
        schema:
          type: object
          properties:
            comparison:
              type: string
              description: Kết quả so sánh chi tiết các món ăn với format markdown
            total_foods:
              type: integer
              description: Tổng số món ăn được so sánh
              example: 3
      400:
        description: Thiếu thông tin hoặc dữ liệu không hợp lệ
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Cần ít nhất 2 ảnh để so sánh"
              
      500:
        description: Lỗi server
        schema:
          type: object
          properties:
            error:
              type: string
              example: "OpenAI API error"
    """
    try:
        data = request.json
        images = data.get("images", [])
        health_condition = data.get("health_condition", "khỏe mạnh")
        
        if not images or len(images) < 2:
            return jsonify({"error": "Cần ít nhất 2 ảnh để so sánh"}), 400
        
        prompt = f"""
        So sánh {len(images)} món ăn cho người {health_condition}:
        
        1. **Nhận diện**: Tên từng món
        2. **So sánh dinh dưỡng**: Bảng so sánh calo, protein, carb, fat
        3. **Xếp hạng**: Từ tốt nhất → kém nhất (giải thích)
        4. **Khuyến nghị**: Nên chọn món nào và tại sao
        5. **Lưu ý**: Cảnh báo nếu có món không phù hợp
        
        Trình bày rõ ràng, có emoji.
        """
        
        result = call_openai_vision(prompt, images, max_tokens=2000)
        
        return jsonify({
            "comparison": result,
            "total_foods": len(images)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/track-calories', methods=['POST'])
def track_calories():
    """
    Theo dõi calo trong ngày
    ---
    tags:
      - Analysis
    summary: AI Track Calories - Theo dõi calo trong ngày
    description: |
      **Theo dõi và phân tích lượng calo tiêu thụ trong ngày**
      
      - Nhận diện món ăn từ nhiều bữa trong ngày
      - Tính toán tổng calo đã tiêu thụ
      - So sánh với mục tiêu calo hàng ngày
      - Phân tích mức độ đạt mục tiêu
      - Gợi ý điều chỉnh bữa ăn tiếp theo
      
      **Đặc điểm:**
      - Hỗ trợ nhiều ảnh (nhiều bữa ăn)
      - Tính toán calo tự động cho từng bữa
      - So sánh với mục tiêu cá nhân
      - Phân tích chênh lệch chi tiết
      - Gợi ý món ăn thêm hoặc cách điều chỉnh
      - Hiển thị biểu đồ ASCII trực quan
      
    parameters:
      - in: body
        name: body
        required: true
        description: Ảnh các bữa ăn và thông tin mục tiêu calo
        schema:
          type: object
          required:
            - images
          properties:
            images:
              type: array
              description: Mảng ảnh các bữa ăn dạng base64 (có hoặc không có prefix)
              items:
                type: string
              example:
                - "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
                - "/9j/4AAQSkZJRgABAQAA..."
            target_calories:
              type: integer
              description: Mục tiêu calo trong ngày (kcal)
              default: 2000
              example: 1800
            health_condition:
              type: string
              description: Tình trạng sức khỏe (khỏe mạnh, tiểu đường, huyết áp cao, béo phì, v.v.)
              default: "khỏe mạnh"
              example: "giảm cân"
              
    responses:
      200:
        description: Theo dõi calo thành công
        schema:
          type: object
          properties:
            tracking:
              type: string
              description: Kết quả theo dõi và phân tích calo chi tiết với format markdown
            target:
              type: integer
              description: Mục tiêu calo trong ngày
              example: 2000
            meals_count:
              type: integer
              description: Số lượng bữa ăn đã phân tích
              example: 3
      400:
        description: Thiếu thông tin hoặc dữ liệu không hợp lệ
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Chưa có ảnh bữa ăn"
              
      500:
        description: Lỗi server
        schema:
          type: object
          properties:
            error:
              type: string
              example: "OpenAI API error"
    """
    try:
        data = request.json
        images = data.get("images", [])
        target_calories = data.get("target_calories", 2000)
        health_condition = data.get("health_condition", "khỏe mạnh")
        
        if not images:
            return jsonify({"error": "Chưa có ảnh bữa ăn"}), 400
        
        prompt = f"""
        Theo dõi calo từ {len(images)} bữa ăn hôm nay:
        Mục tiêu: {target_calories} kcal
        Sức khỏe: {health_condition}
        
        Yêu cầu:
        1. **Chi tiết bữa ăn**: Nhận diện món + calo từng bữa
        2. **Tổng calo**: Cộng tất cả bữa ăn
        3. **So sánh mục tiêu**: 
           - Đã ăn: X kcal
           - Mục tiêu: {target_calories} kcal
           - Chênh lệch: +/- Y kcal (Z%)
        4. **Phân tích**: Đánh giá tổng thể (tốt/vừa/quá nhiều/quá ít)
        5. **Gợi ý**: 
           - Nếu thiếu: món nên ăn thêm
           - Nếu thừa: cách điều chỉnh bữa sau
        
        Kèm biểu đồ ASCII nếu có thể.
        """
        
        result = call_openai_vision(prompt, images, max_tokens=2000)
        
        return jsonify({
            "tracking": result,
            "target": target_calories,
            "meals_count": len(images)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/user/profile', methods=['POST'])
def save_user_profile():
    """
    Lưu thông tin người dùng
    ---
    tags:
      - User Profile ( Có thể dùng hoặc không )
    summary: Save User Profile - Lưu thông tin cá nhân
    description: |
      **Lưu hoặc cập nhật thông tin cá nhân người dùng**
      
      - Lưu thông tin cơ bản (tên, tuổi, cân nặng, chiều cao)
      - Lưu tình trạng sức khỏe và mục tiêu
      - Lưu sở thích ăn uống và dị ứng
      - Tự động tạo user_id nếu chưa có
      - Hỗ trợ cập nhật thông tin đã lưu
      
    parameters:
      - in: body
        name: body
        required: true
        description: Thông tin cá nhân người dùng
        schema:
          type: object
          properties:
            user_id:
              type: string
              description: ID người dùng (tự động tạo nếu không có)
              example: "user_123"
            name:
              type: string
              description: Tên người dùng
              example: "Nguyễn Văn A"
            age:
              type: integer
              description: Tuổi
              example: 30
            weight:
              type: number
              description: Cân nặng (kg)
              example: 70.5
            height:
              type: number
              description: Chiều cao (cm)
              example: 170
            health_condition:
              type: string
              description: Tình trạng sức khỏe
              default: "khỏe mạnh"
              example: "tiểu đường"
            dietary_preferences:
              type: array
              description: Sở thích ăn uống
              items:
                type: string
              example: ["chay", "ít dầu mỡ"]
            allergies:
              type: array
              description: Dị ứng thực phẩm
              items:
                type: string
              example: ["hải sản", "đậu phộng"]
            target_calories:
              type: integer
              description: Mục tiêu calo hàng ngày (kcal)
              default: 2000
              example: 1800
            activity_level:
              type: string
              description: Mức độ vận động (ít, vừa phải, nhiều)
              default: "vừa phải"
              example: "nhiều"
              
    responses:
      200:
        description: Lưu thông tin thành công
        schema:
          type: object
          properties:
            message:
              type: string
              example: "Lưu thông tin thành công"
            user_id:
              type: string
              example: "user_123"
              
      500:
        description: Lỗi server
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Database error"
    """
    try:
        data = request.json
        user_id = data.get("user_id", str(uuid.uuid4()))
        
        user_profiles[user_id] = {
            "name": data.get("name"),
            "age": data.get("age"),
            "weight": data.get("weight"),
            "height": data.get("height"),
            "health_condition": data.get("health_condition", "khỏe mạnh"),
            "dietary_preferences": data.get("dietary_preferences", []),
            "allergies": data.get("allergies", []),
            "target_calories": data.get("target_calories", 2000),
            "activity_level": data.get("activity_level", "vừa phải")
        }
        
        return jsonify({
            "message": "Lưu thông tin thành công",
            "user_id": user_id
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/user/profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    """
    Lấy thông tin người dùng
    ---
    tags:
      - User Profile ( Có thể dùng hoặc không )
    summary: Get User Profile - Lấy thông tin cá nhân
    description: |
      **Lấy thông tin cá nhân đã lưu của người dùng**
      
      - Lấy toàn bộ thông tin profile
      - Bao gồm thông tin cơ bản và sức khỏe
      - Sở thích ăn uống và dị ứng
      - Mục tiêu calo và mức độ vận động
      
    parameters:
      - in: path
        name: user_id
        required: true
        type: string
        description: ID người dùng cần lấy thông tin
        example: "user_123"
        
    responses:
      200:
        description: Lấy thông tin thành công
        schema:
          type: object
          properties:
            name:
              type: string
              example: "Nguyễn Văn A"
            age:
              type: integer
              example: 30
            weight:
              type: number
              example: 70.5
            height:
              type: number
              example: 170
            health_condition:
              type: string
              example: "tiểu đường"
            dietary_preferences:
              type: array
              items:
                type: string
              example: ["chay", "ít dầu mỡ"]
            allergies:
              type: array
              items:
                type: string
              example: ["hải sản"]
            target_calories:
              type: integer
              example: 1800
            activity_level:
              type: string
              example: "nhiều"
              
      404:
        description: Không tìm thấy người dùng
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Không tìm thấy người dùng"
    """
    if user_id not in user_profiles:
        return jsonify({"error": "Không tìm thấy người dùng"}), 404
    
    return jsonify(user_profiles[user_id]), 200


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint không tồn tại"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Lỗi server"}), 500

if __name__ == '__main__':
    app.run(host='localhost', port=5002, debug=True)


