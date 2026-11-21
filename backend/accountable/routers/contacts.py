from fastapi import APIRouter, Depends, Response
from sqlalchemy import delete, insert, update
from sqlalchemy.engine import Engine

from .. import repo
from ..db import contacts
from ..schemas import ContactIn, ContactPatch
from .common import field_error, get_engine, not_found

router = APIRouter(prefix="/contacts", tags=["contacts"])


def _check_org(conn, organization_id):
    if organization_id is not None and not repo.organization_exists(conn, organization_id):
        raise field_error("organization_id", "Organization not found")


@router.get("")
def list_contacts(engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        return repo.list_contacts(conn)


@router.post("", status_code=201)
def create_contact(body: ContactIn, engine: Engine = Depends(get_engine)):
    values = body.model_dump()
    with engine.begin() as conn:
        _check_org(conn, values["organization_id"])
        new_id = conn.execute(insert(contacts).values(**values)).inserted_primary_key[0]
        return repo.get_contact(conn, new_id)


@router.get("/{contact_id}")
def get_contact(contact_id: int, engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        contact = repo.get_contact(conn, contact_id)
    if contact is None:
        raise not_found("Contact")
    return contact


@router.patch("/{contact_id}")
def update_contact(contact_id: int, body: ContactPatch, engine: Engine = Depends(get_engine)):
    values = body.model_dump(exclude_unset=True)
    with engine.begin() as conn:
        if not repo.contact_exists(conn, contact_id):
            raise not_found("Contact")
        _check_org(conn, values.get("organization_id"))
        if values:
            conn.execute(update(contacts).where(contacts.c.id == contact_id).values(**values))
        return repo.get_contact(conn, contact_id)


@router.get("/{contact_id}/delete-impact")
def contact_delete_impact(contact_id: int, engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        impact = repo.contact_delete_impact(conn, contact_id)
    if impact is None:
        raise not_found("Contact")
    return impact


@router.get("/{contact_id}/timeline")
def contact_timeline(contact_id: int, engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        if not repo.contact_exists(conn, contact_id):
            raise not_found("Contact")
        return repo.contact_timeline(conn, contact_id)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, engine: Engine = Depends(get_engine)):
    with engine.begin() as conn:
        if not repo.contact_exists(conn, contact_id):
            raise not_found("Contact")
        conn.execute(delete(contacts).where(contacts.c.id == contact_id))
    return Response(status_code=204)
