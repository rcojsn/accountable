import re
from datetime import date, datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator


class Stage(StrEnum):
    new = "new"
    qualified = "qualified"
    proposal = "proposal"
    negotiation = "negotiation"
    won = "won"
    lost = "lost"


class ContactStatus(StrEnum):
    lead = "lead"
    qualified = "qualified"
    customer = "customer"


class ActivityType(StrEnum):
    note = "note"
    call = "call"
    email = "email"
    stage_change = "stage_change"


class EditableActivityType(StrEnum):
    note = "note"
    call = "call"
    email = "email"


Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
OptText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)] | None
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_VALUE = 1_000_000_000
_KEEP_BLANK = ("name", "description")


class Base(BaseModel):
    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="before")
    @classmethod
    def _blanks_to_none(cls, data):
        """Empty optional text fields mean 'no value'."""
        if isinstance(data, dict):
            return {
                k: (None if isinstance(v, str) and not v.strip() and k not in _KEEP_BLANK else v)
                for k, v in data.items()
            }
        return data


def _not_null(v):
    if v is None:
        raise ValueError("This field is required")
    return v


# Organizations
class OrganizationIn(Base):
    name: Name
    website: OptText = None
    industry: OptText = None
    notes: OptText = None


class OrganizationPatch(Base):
    name: Name | None = None
    website: OptText = None
    industry: OptText = None
    notes: OptText = None

    _req = field_validator("name", mode="before")(_not_null)


# Contacts
class _ContactFields(Base):
    email: OptText = None
    phone: OptText = None
    job_title: OptText = None
    organization_id: int | None = None

    @field_validator("email")
    @classmethod
    def _email(cls, v):
        if v is not None and not _EMAIL.match(v):
            raise ValueError("Enter a valid email address")
        return v


class ContactIn(_ContactFields):
    name: Name
    status: ContactStatus = ContactStatus.lead


class ContactPatch(_ContactFields):
    name: Name | None = None
    status: ContactStatus | None = None

    _req = field_validator("name", "status", mode="before")(_not_null)


# Deals
class DealIn(Base):
    name: Name
    organization_id: int
    contact_id: int | None = None
    stage: Stage
    value: int = Field(ge=0, le=MAX_VALUE)
    probability: int | None = Field(default=None, ge=0, le=100)
    close_date: date | None = None


class DealPatch(Base):
    name: Name | None = None
    organization_id: int | None = None
    contact_id: int | None = None
    stage: Stage | None = None
    value: int | None = Field(default=None, ge=0, le=MAX_VALUE)
    probability: int | None = Field(default=None, ge=0, le=100)
    close_date: date | None = None

    _req = field_validator("name", "organization_id", "stage", "value", mode="before")(_not_null)


class MoveIn(BaseModel):
    stage: Stage
    before_id: int | None = None


# Activities
class ActivityIn(Base):
    type: EditableActivityType
    contact_id: int | None = None
    deal_id: int | None = None
    description: Name
    happened_at: datetime
    follow_up_date: date | None = None

    @model_validator(mode="after")
    def _one_owner(self):
        if (self.contact_id is None) == (self.deal_id is None):
            raise ValueError("Give either a contact or a deal")
        return self


class ActivityPatch(Base):
    type: EditableActivityType | None = None
    description: Name | None = None
    happened_at: datetime | None = None
    follow_up_date: date | None = None
    done: bool | None = None

    _req = field_validator("type", "description", "happened_at", "done", mode="before")(_not_null)


# Response shapes (the repo returns plain dicts of this shape)
class DealOut(BaseModel):
    id: int
    name: str
    organization_id: int
    organization_name: str
    contact_id: int | None
    contact_name: str | None
    stage: Stage
    value: int
    probability: int
    expected_revenue: int
    close_date: date | None
    position: int
    is_late: bool
    created_at: datetime
    updated_at: datetime


class ContactOut(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    job_title: str | None
    organization_id: int | None
    organization_name: str | None
    status: ContactStatus
    created_at: datetime
    updated_at: datetime


class OrganizationOut(BaseModel):
    id: int
    name: str
    website: str | None
    industry: str | None
    notes: str | None
    contact_count: int
    open_deal_count: int
    open_value: int
    created_at: datetime
    updated_at: datetime


class ActivityOut(BaseModel):
    id: int
    type: ActivityType
    contact_id: int | None
    contact_name: str | None
    deal_id: int | None
    deal_name: str | None
    description: str
    happened_at: datetime
    follow_up_date: date | None
    done: bool
    from_stage: Stage | None
    to_stage: Stage | None
