from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, insert, update
from sqlalchemy.engine import Engine

from .. import repo
from ..db import activities
from ..schemas import ActivityIn, ActivityPatch
from .common import field_error, get_engine, not_found

router = APIRouter(prefix="/activities", tags=["activities"])


@router.post("", status_code=201)
def create_activity(body: ActivityIn, engine: Engine = Depends(get_engine)):
    values = body.model_dump()
    values["type"] = body.type.value
    with engine.begin() as conn:
        if body.contact_id is not None and not repo.contact_exists(conn, body.contact_id):
            raise field_error("contact_id", "Contact not found")
        if body.deal_id is not None and repo.get_deal(conn, body.deal_id) is None:
            raise field_error("deal_id", "Deal not found")
        new_id = conn.execute(insert(activities).values(**values, done=False)).inserted_primary_key[0]
        return repo.get_activity(conn, new_id)


@router.get("/{activity_id}")
def get_activity(activity_id: int, engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        activity = repo.get_activity(conn, activity_id)
    if activity is None:
        raise not_found("Activity")
    return activity


@router.patch("/{activity_id}")
def update_activity(activity_id: int, body: ActivityPatch, engine: Engine = Depends(get_engine)):
    values = body.model_dump(exclude_unset=True)
    if "type" in values:
        values["type"] = body.type.value
    with engine.begin() as conn:
        current = repo.get_activity(conn, activity_id)
        if current is None:
            raise not_found("Activity")
        if current["type"] == "stage_change" and values:
            raise HTTPException(409, "Stage changes can't be edited.")
        if values:
            conn.execute(update(activities).where(activities.c.id == activity_id).values(**values))
        return repo.get_activity(conn, activity_id)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int, engine: Engine = Depends(get_engine)):
    with engine.begin() as conn:
        if repo.get_activity(conn, activity_id) is None:
            raise not_found("Activity")
        conn.execute(delete(activities).where(activities.c.id == activity_id))
    return Response(status_code=204)
