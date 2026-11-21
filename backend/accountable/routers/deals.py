from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, insert, select, update
from sqlalchemy.engine import Engine

from .. import clock, repo, rules
from ..db import deals
from ..schemas import DealIn, DealPatch, MoveIn
from .common import field_error, get_engine, not_found

router = APIRouter(prefix="/deals", tags=["deals"])


def _check_links(conn, organization_id, contact_id):
    if organization_id is not None and not repo.organization_exists(conn, organization_id):
        raise field_error("organization_id", "Organization not found")
    if contact_id is not None and not repo.contact_exists(conn, contact_id):
        raise field_error("contact_id", "Contact not found")


@router.get("")
def list_deals(engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        return repo.list_deals(conn)


@router.post("", status_code=201)
def create_deal(body: DealIn, engine: Engine = Depends(get_engine)):
    values = body.model_dump()
    values["stage"] = body.stage.value
    if values["probability"] is None:
        values["probability"] = rules.PROBABILITY[values["stage"]]  # REQ-14
    with engine.begin() as conn:
        _check_links(conn, values["organization_id"], values["contact_id"])
        new_id = conn.execute(insert(deals).values(**values, position=0)).inserted_primary_key[0]
        # New deals go to the top of their column (REQ-64).
        others = repo.column_ids(conn, values["stage"], exclude=new_id)
        repo.place_deal(conn, new_id, values["stage"], others[0] if others else None)
        return repo.get_deal(conn, new_id)


@router.get("/{deal_id}")
def get_deal(deal_id: int, engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        deal = repo.get_deal(conn, deal_id)
    if deal is None:
        raise not_found("Deal")
    return deal


@router.patch("/{deal_id}")
def update_deal(deal_id: int, body: DealPatch, engine: Engine = Depends(get_engine)):
    sent = body.model_dump(exclude_unset=True)
    with engine.begin() as conn:
        current = repo.get_deal(conn, deal_id)
        if current is None:
            raise not_found("Deal")
        _check_links(conn, sent.get("organization_id"), sent.get("contact_id"))
        values = dict(sent)
        new_stage = body.stage.value if body.stage is not None else None
        changed = new_stage is not None and new_stage != current["stage"]
        if new_stage is not None:
            values["stage"] = new_stage
        if changed:
            values.update(rules.stage_change_values(new_stage, set(sent), clock.today()))  # REQ-15
        # The stage itself is set by place_deal so both columns stay numbered.
        stage_value = values.pop("stage", None)
        if values:
            conn.execute(update(deals).where(deals.c.id == deal_id).values(**values))
        if changed:
            top = repo.column_ids(conn, stage_value, exclude=deal_id)
            repo.place_deal(conn, deal_id, stage_value, top[0] if top else None)
            repo.add_stage_change(conn, deal_id, current["stage"], stage_value)
        return repo.get_deal(conn, deal_id)


@router.post("/{deal_id}/move")
def move_deal(deal_id: int, body: MoveIn, engine: Engine = Depends(get_engine)):
    with engine.begin() as conn:
        if repo.get_deal(conn, deal_id) is None:
            raise not_found("Deal")
        try:
            repo.move_deal(conn, deal_id, body.stage.value, body.before_id)
        except ValueError as e:
            raise HTTPException(409, str(e))
        return repo.get_deal(conn, deal_id)


@router.get("/{deal_id}/delete-impact")
def deal_delete_impact(deal_id: int, engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        impact = repo.deal_delete_impact(conn, deal_id)
    if impact is None:
        raise not_found("Deal")
    return impact


@router.get("/{deal_id}/timeline")
def deal_timeline(deal_id: int, engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        if conn.execute(select(deals.c.id).where(deals.c.id == deal_id)).first() is None:
            raise not_found("Deal")
        return repo.deal_timeline(conn, deal_id)


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: int, engine: Engine = Depends(get_engine)):
    with engine.begin() as conn:
        deal = repo.get_deal(conn, deal_id)
        if deal is None:
            raise not_found("Deal")
        conn.execute(delete(deals).where(deals.c.id == deal_id))
        repo.close_gap(conn, deal["stage"])
    return Response(status_code=204)
