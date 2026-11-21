from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.engine import Engine

from .. import db, seed
from .common import get_engine

router = APIRouter(tags=["system"])
test_router = APIRouter(tags=["test"])


@router.get("/health")
def health():
    return {"status": "ok"}


@test_router.post("/test/reset")
def reset(size: str = Query("sample", pattern="^(sample|large|empty)$"), engine: Engine = Depends(get_engine)):
    """Test mode only: replace all data."""
    if size == "empty":
        db.reset_schema(engine)
    elif size == "large":
        seed.seed_large(engine)
    elif size == "sample":
        seed.seed_sample(engine)
    else:
        raise HTTPException(422, "Unknown size")
    return {"status": "ok", "size": size}
