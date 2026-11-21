import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    db_path: Path
    test_mode: bool
    seed_new_db: bool = True

    @classmethod
    def from_env(cls) -> "Settings":
        db = os.environ.get("ACCOUNTABLE_DB") or str(ROOT / "backend" / "data" / "accountable.db")
        return cls(
            db_path=Path(db),
            test_mode=os.environ.get("ACCOUNTABLE_TEST_MODE", "") not in ("", "0", "false"),
        )
