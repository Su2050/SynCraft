# backend/app/main.py
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

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

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 允许前端开发服务器的来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册API路由
app.include_router(api_router)  # 所有API路由，包括新的LLM路由

# 全局异常处理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
    )

# 健康检查
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}

# 根路由
@app.get("/", tags=["root"])
def read_root():
    return {"message": "Welcome to SynCraft API"}
