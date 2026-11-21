from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import db
from .config import Settings
from .routers import activities, contacts, dashboard, deals, organizations, system


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        is_new = not settings.db_path.exists()
        engine = db.make_engine(settings.db_path)
        db.create_schema(engine)
        app.state.engine = engine
        app.state.settings = settings
        if is_new and settings.seed_new_db:  # REQ-1: a new database starts with sample data
            from . import seed

            seed.seed_sample(engine)
        yield
        engine.dispose()

    app = FastAPI(title="Accountable", lifespan=lifespan)
    for router in (organizations.router, contacts.router, deals.router, activities.router, dashboard.router):
        app.include_router(router, prefix="/api")
    app.include_router(system.router, prefix="/api")
    if settings.test_mode:
        app.include_router(system.test_router, prefix="/api")
    return app


app = create_app()
