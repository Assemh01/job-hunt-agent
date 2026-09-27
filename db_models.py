from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ProfileDB(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    resume_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    resume_filename: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

class ResumeDataDB(Base):
    __tablename__ = "resume_data"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    profile_id: Mapped[int] = mapped_column(
        ForeignKey("profiles.id"),
        unique=True,
        nullable=False,
    )

    data_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

class ProfileFactDB(Base):
    __tablename__ = "profile_facts"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    profile_id: Mapped[int] = mapped_column(
        ForeignKey("profiles.id"),
        nullable=False,
    )

    key: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    statement: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    value_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    response_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )