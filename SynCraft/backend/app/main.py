# backend/app/main.py
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import json
from starlette.middleware.base import BaseHTTPMiddleware
# backend/app/main.py

# 导入API路由
from app.api import api_router

# 初始化数据库
from app.database import init_db
init_db()

# 初始化依赖注入容器
from app.di.container import register_services
register_services()

# 自动初始化默认会话（直接在全局启动流程执行，确保数据库有数据）
from sqlmodel import Session as SQLSession, select
from app.database import engine
from app.models.session import Session as SessionModel
from app.services.session_service import SessionService

# 再次确保表已创建
init_db()
with SQLSession(engine) as db:
    if db.exec(select(SessionModel)).first() is None:
        service = SessionService(db)
        service.create_session(name="默认会话", user_id="system")
        print("已自动初始化默认会话")

# 创建FastAPI应用
app = FastAPI(title="SynCraft API")

# 统一响应格式中间件
class UnifiedResponseMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 调用下一个中间件或路由处理函数
        response = await call_next(request)
        
        # 如果响应已经是JSONResponse
        if isinstance(response, JSONResponse):
            # 获取响应内容
            content = response.body
            
            # 解析JSON内容
            try:
                data = json.loads(content)
                
                # 如果已经是统一格式，直接返回
                if isinstance(data, dict) and "success" in data and ("data" in data or "error" in data):
                    return response
                
                # 否则包装为统一格式
                return JSONResponse(
                    content={"success": True, "data": data},
                    status_code=response.status_code,
                    headers=dict(response.headers),
                )
            except:
                # 如果不是有效的JSON，直接返回原响应
                return response
        
        # 如果不是JSONResponse，直接返回原响应
        return response

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 允许前端开发服务器的来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加统一响应格式中间件 - 确保在所有其他中间件之后添加，这样它会最先执行
app.add_middleware(UnifiedResponseMiddleware)

# 打印日志，确认中间件已添加
print("已添加统一响应格式中间件")

# 注册API路由
app.include_router(api_router)  # 所有API路由，包括新的LLM路由

# 全局异常处理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"success": False, "error": exc.errors(), "body": exc.body},
    )

# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "error": str(exc)},
    )

# 健康检查
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}

# 根路由
@app.get("/", tags=["root"])
def read_root():
    return {"message": "Welcome to SynCraft API"}
