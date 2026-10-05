import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.errors import APIException
from app.database.base import Base
from app.database.session import engine
# Import models so Base.metadata knows about them
import app.models  # noqa: F401
from app.routes.api import api_router
from app.monitoring.metrics import metrics_router, PrometheusMiddleware
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.error_handler import (
    api_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    sqlalchemy_exception_handler,
    generic_exception_handler
)

# Setup logging
logging.basicConfig(
    level=getattr(logging, settings.ENVIRONMENT.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("streamops.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: initialize database tables and resources."""
    logger.info("Starting StreamOps Backend service [%s]...", settings.ENVIRONMENT)
    try:
        # Create database tables if not exist (idempotent)
        Base.metadata.create_all(bind=engine)
        logger.info("Database schemas verified and initialized.")
    except Exception as exc:
        logger.warning("Could not auto-initialize DB tables on startup (DB may still be starting): %s", exc)

    yield

    logger.info("Shutting down StreamOps Backend service...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-grade API backend for DevOps Video Streaming Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(PrometheusMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Centralized Error Handlers
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(metrics_router)


@app.get("/", include_in_schema=False)
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
        "api_prefix": settings.API_V1_STR
    }
