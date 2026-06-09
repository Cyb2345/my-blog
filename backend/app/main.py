from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import (
    admin,
    auth,
    categories,
    comments,
    health,
    links,
    posts,
    site,
    tags,
    uploads,
    users,
)
from app.core.config import get_settings
from app.utils.response import error

settings = get_settings()

app = FastAPI(title=settings.PROJECT_NAME)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_: Request, exc: StarletteHTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(status_code=exc.status_code, content=error(exc.status_code, message))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content=error(422, "请求参数无效", jsonable_encoder(exc.errors())))

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

api_prefix = settings.API_V1_PREFIX
app.include_router(health.router, prefix=api_prefix)
app.include_router(auth.router, prefix=api_prefix)
app.include_router(posts.router, prefix=api_prefix)
app.include_router(posts.admin_router, prefix=api_prefix)
app.include_router(categories.router, prefix=api_prefix)
app.include_router(categories.admin_router, prefix=api_prefix)
app.include_router(tags.router, prefix=api_prefix)
app.include_router(tags.admin_router, prefix=api_prefix)
app.include_router(comments.router, prefix=api_prefix)
app.include_router(comments.admin_router, prefix=api_prefix)
app.include_router(links.router, prefix=api_prefix)
app.include_router(links.admin_router, prefix=api_prefix)
app.include_router(uploads.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(site.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
