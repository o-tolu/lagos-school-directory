CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE schools (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id          TEXT UNIQUE,              -- ID from the dataset, or MANUAL-<timestamp>
    school_name        TEXT NOT NULL,
    lga                TEXT,
    school_type        TEXT,
    ownership          TEXT,
    address            TEXT,
    phone_number       TEXT,                     -- comma-separated, as scraped
    email              TEXT,
    website            TEXT,
    head_teacher       TEXT,
    boys_population    INTEGER,
    girls_population   INTEGER,
    total_population   INTEGER,
    profile_url        TEXT,
    group_id           TEXT,
    group_type         TEXT,
    recommended_action TEXT,
    linked_school_ids  TEXT,                     -- comma-separated dataset school_ids
    is_manual          BOOLEAN NOT NULL DEFAULT false,
    phone_overrides    TEXT[] NOT NULL DEFAULT '{}',
    email_override     TEXT,
    created_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_date       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX schools_group_idx ON schools (group_id);

CREATE TABLE salespersons (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    phone        TEXT,
    email        TEXT,
    created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assignments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_record_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    salesperson_id   UUID NOT NULL REFERENCES salespersons(id) ON DELETE CASCADE,
    interest_level   TEXT NOT NULL DEFAULT 'not_contacted' CHECK (interest_level IN
        ('not_contacted','reached_out','no_response','interested','follow_up','committed','not_interested')),
    created_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_record_id)                   -- a school has at most one owner
);
CREATE INDEX assignments_salesperson_idx ON assignments (salesperson_id);

CREATE TABLE added_contacts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_record_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    contact_type     TEXT NOT NULL CHECK (contact_type IN ('phone','email')),
    value            TEXT NOT NULL,
    created_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_date     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX added_contacts_school_idx ON added_contacts (school_record_id);

-- Placeholder for future authentication / role-based access control (not used while AUTH_ENABLED=false).
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    full_name     TEXT,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
    created_date  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_date  TIMESTAMPTZ NOT NULL DEFAULT now()
);
