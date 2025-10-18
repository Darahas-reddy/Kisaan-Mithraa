Supabase: applying migrations and using the SoilHealthTracker sync

This document explains how to apply the SQL migration included in this repo and how the `SoilHealthTracker` page behaves if the database table is not present.

Files of interest:

- `supabase/migrations/20251017190000_add_soil_and_loan_tables.sql`
  - Creates `soil_health_records` and `loan_queries` tables.
- `src/pages/SoilHealthTracker.tsx`
  - Implements a localStorage fallback and a "Sync pending" button to upload locally-saved records when the DB is ready.

---

Recommended ways to apply the migration

Option A — (Recommended) Run the SQL in the Supabase Dashboard

1. Open your Supabase project in the browser.
2. Go to "SQL" → "SQL editor".
3. Click "New query" and paste the contents of `supabase/migrations/20251017190000_add_soil_and_loan_tables.sql` into the editor.
4. Click "Run".
5. Verify tables exist by running:

    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

You should see `soil_health_records` and `loan_queries` in the result.

Option B — Use Supabase CLI (if you prefer CLI workflow)

1. Install Supabase CLI (PowerShell example):

    npm install -g supabase

    # then check the version
    supabase --version

2. Authenticate:

    supabase login

3. Link your local folder to the project (from your project root):

    cd C:\temp\i3\KisaanMithra\anna-sahayak
    supabase link --project-ref <YOUR_PROJECT_REF>

   Find `<YOUR_PROJECT_REF>` in the Supabase dashboard URL (project id / ref).

4. Push migrations to remote DB (this will apply SQL files under `supabase/migrations`):

    supabase db push

Alternatively, execute a single SQL file against the database:

    supabase db query < supabase/migrations/20251017190000_add_soil_and_loan_tables.sql

Notes and troubleshooting
- If the CLI isn't available on your machine, use the Dashboard SQL editor (Option A).
- If you see permission errors, ensure your Supabase user has permission to create tables or run the SQL as a project owner.

How the app handles missing tables (Soil Health Tracker)

- If an insert to `soil_health_records` fails because the table is missing, `SoilHealthTracker` will now:
  - Save the submitted record to `localStorage` under the key `soil_health_records_pending`.
  - Show a "Pending: N" indicator and a "Sync pending" button in the UI.
  - When you click "Sync pending" (or later, after you apply the migration), the app will attempt to upload the pending records to the Supabase table. On success the local cache is cleared.

Limitations:
- localStorage is local to the browser and device. Pending records won't appear on other devices until synced to the server.
- Currently the sync uploads records one-by-one. If you expect large numbers of pending records, let me know and I can change the implementation to use a bulk insert for better performance.

Recommended workflow

1. Apply the migration (Option A or B above).
2. Open the web app and go to Soil Health Tracker.
3. If you previously saved local pending records, click "Sync pending" to upload them to the cloud.

If you want, I can:
- Convert the sync to perform a bulk insert (recommended for many pending records).
- Add a small admin-only interface to run the migration from the app (requires secure credentials, not recommended for production).
- Generate a one-line PowerShell script that runs the SQL against your DB using environment variables (I can do that if you share your connection details in a secure way — not recommended here).

---

If anything above is unclear or you'd like me to make the sync bulk-insert now, tell me and I'll implement it and run a quick type-check/build afterwards.
