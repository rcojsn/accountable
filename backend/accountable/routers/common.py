from fastapi import HTTPException, Request
from sqlalchemy.engine import Engine


def get_engine(request: Request) -> Engine:
    return request.app.state.engine


def not_found(what: str) -> HTTPException:
    return HTTPException(404, f"{what} not found")


def field_error(field: str, message: str) -> HTTPException:
    """A 422 in the same shape FastAPI uses for body validation, so the UI shows it by the field."""
    return HTTPException(422, [{"loc": ["body", field], "msg": message, "type": "value_error"}])
