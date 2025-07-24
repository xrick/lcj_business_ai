from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse, JSONResponse
import sys
import os
import json
from pathlib import Path
import logging

# Add libs to path
current_dir = Path(__file__).parent.parent
sys.path.append(str(current_dir))

try:
    from libs.service_manager import ServiceManager
except ImportError as e:
    logging.error(f"Failed to import ServiceManager: {e}")
    ServiceManager = None

router = APIRouter()

# Initialize service manager
service_manager = ServiceManager() if ServiceManager else None

@router.get("/services")
async def get_services():
    """獲取可用的服務列表"""
    if not service_manager:
        return {"error": "Service manager not available"}
    
    try:
        services = service_manager.list_services()
        return {"services": services}
    except Exception as e:
        logging.error(f"Error getting services: {e}")
        return {"error": str(e)}

@router.post("/chat-stream")
async def chat_stream(request: Request):
    """處理聊天請求並返回流式響應"""
    if not service_manager:
        return JSONResponse(status_code=500, content={"error": "Service manager not available"})
    
    try:
        data = await request.json()
        query = data.get("query")
        service_name = data.get("service_name", "sales_assistant")

        if not query:
            return JSONResponse(status_code=400, content={"error": "Query cannot be empty"})

        service = service_manager.get_service(service_name)
        if not service:
            return JSONResponse(status_code=404, content={"error": f"Service '{service_name}' not found"})

        # 返回一個流式響應，從服務的 chat_stream 方法獲取內容
        return StreamingResponse(service.chat_stream(query), media_type="text/event-stream")

    except Exception as e:
        logging.error(f"Error in chat_stream: {e}")
        return JSONResponse(status_code=500, content={"error": "Internal Server Error"})

@router.post("/chat")
async def chat(request: Request):
    """處理聊天請求並返回 JSON 響應"""
    if not service_manager:
        return JSONResponse(status_code=500, content={"error": "Service manager not available"})
    
    try:
        data = await request.json()
        query = data.get("query")
        service_name = data.get("service_name", "sales_assistant")

        if not query:
            return JSONResponse(status_code=400, content={"error": "Query cannot be empty"})

        service = service_manager.get_service(service_name)
        if not service:
            return JSONResponse(status_code=404, content={"error": f"Service '{service_name}' not found"})

        # 獲取服務響應
        if hasattr(service, 'chat_stream'):
            # 如果服務支援串流，使用chat_stream
            response_gen = service.chat_stream(query)
            # 收集所有串流回應
            response_parts = []
            async for part in response_gen:
                if part.startswith('data: '):
                    try:
                        data = json.loads(part[6:])
                        response_parts.append(data)
                    except json.JSONDecodeError:
                        pass
            return {"response": response_parts}
        else:
            # 回退到process_query
            response = service.process_query(query)
            return {"response": response}

    except Exception as e:
        logging.error(f"Error in chat: {e}")
        return JSONResponse(status_code=500, content={"error": "Internal Server Error"})

@router.post("/multichat")
async def multichat_response(request: Request):
    """處理多輪對話回應"""
    if not service_manager:
        return JSONResponse(status_code=500, content={"error": "Service manager not available"})
    
    try:
        data = await request.json()
        session_id = data.get("session_id")
        user_choice = data.get("user_choice")
        user_input = data.get("user_input", "")
        service_name = data.get("service_name", "sales_assistant")

        if not session_id or not user_choice:
            return JSONResponse(status_code=400, content={"error": "session_id and user_choice are required"})

        service = service_manager.get_service(service_name)
        if not service:
            return JSONResponse(status_code=404, content={"error": f"Service '{service_name}' not found"})

        # 檢查服務是否支援多輪對話
        if not hasattr(service, 'process_multichat_response'):
            return JSONResponse(status_code=400, content={"error": "Service does not support multichat"})

        # 處理多輪對話回應
        result = await service.process_multichat_response(session_id, user_choice, user_input)
        return result

    except Exception as e:
        logging.error(f"Error in multichat: {e}")
        return JSONResponse(status_code=500, content={"error": "Internal Server Error"})