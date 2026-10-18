from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text, Float
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


class SavedJobDB(Base):
    __tablename__ = "saved_jobs"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    profile_id: Mapped[int] = mapped_column(
        ForeignKey("profiles.id"),
        nullable=False,
        index=True,
    )

    company_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    job_title: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    salary: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    employment_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    workplace_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    job_description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    application_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="saved",
    )

    analysis_json: Mapped[str | None] = mapped_column(
        Text,
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
