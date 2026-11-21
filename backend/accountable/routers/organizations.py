from fastapi import APIRouter, Depends, Response
from sqlalchemy import delete, insert, update
from sqlalchemy.engine import Engine

from .. import repo
from ..db import organizations
from ..schemas import OrganizationIn, OrganizationPatch
from .common import get_engine, not_found

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("")
def list_organizations(engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        return repo.list_organizations(conn)


@router.post("", status_code=201)
def create_organization(body: OrganizationIn, engine: Engine = Depends(get_engine)):
    with engine.begin() as conn:
        new_id = conn.execute(insert(organizations).values(**body.model_dump())).inserted_primary_key[0]
        return repo.get_organization(conn, new_id)


@router.get("/{org_id}")
def get_organization(org_id: int, engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        org = repo.get_organization(conn, org_id)
    if org is None:
        raise not_found("Organization")
    return org


@router.patch("/{org_id}")
def update_organization(org_id: int, body: OrganizationPatch, engine: Engine = Depends(get_engine)):
    values = body.model_dump(exclude_unset=True)
    with engine.begin() as conn:
        if not repo.organization_exists(conn, org_id):
            raise not_found("Organization")
        if values:
            conn.execute(update(organizations).where(organizations.c.id == org_id).values(**values))
        return repo.get_organization(conn, org_id)


@router.get("/{org_id}/delete-impact")
def organization_delete_impact(org_id: int, engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        impact = repo.organization_delete_impact(conn, org_id)
    if impact is None:
        raise not_found("Organization")
    return impact


@router.delete("/{org_id}", status_code=204)
def delete_organization(org_id: int, engine: Engine = Depends(get_engine)):
    with engine.begin() as conn:
        if not repo.organization_exists(conn, org_id):
            raise not_found("Organization")
        conn.execute(delete(organizations).where(organizations.c.id == org_id))
        repo.renumber_all(conn)
    return Response(status_code=204)
