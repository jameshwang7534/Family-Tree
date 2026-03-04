# Profile assets setup (media, voice, stories)

Two things must be done in your **Supabase project** (same project as your `users` and `trees` tables).

## 1. Create the Storage bucket

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. In the left sidebar click **Storage**.
3. Click **New bucket**.
4. **Name:** `profile-assets` (must be exactly this).
5. Set the bucket to **Public** (so the app can build public file URLs).
6. Click **Create bucket**.

## 2. Allow uploads (Storage RLS policy)

Without this, uploads fail with "new row violates row-level security policy".

1. Go to **SQL Editor** → **New query**.
2. If you already added a policy that failed, drop it first (replace `Your existing policy name` with the exact name if different):

```sql
drop policy if exists "Service role can manage profile-assets" on storage.objects;
```

3. Add a permissive policy for the bucket (backend uses service key; must allow **upload, read, and delete**):

```sql
-- Allow all operations on profile-assets bucket (upload, read, delete)
create policy "Allow profile-assets bucket access"
on storage.objects for all
using (bucket_id = 'profile-assets')
with check (bucket_id = 'profile-assets');
```

   If profile media/voice files remain in Storage after deleting a profile, the policy may not be applied or the schema cache may need a reload. Re-run the policy above and ensure no other policy blocks DELETE.

4. Run the query (run the drop first if needed, then run the create).

## 3. Create the database tables and reload schema

1. In the same project, go to **SQL Editor**.
2. Click **New query** and paste the contents of `supabase_migration_profile_assets.sql` (in this folder).
3. Run the query (Run or Ctrl+Enter).
4. Reload the schema cache so the new tables are visible:
   - Go to **Settings** (gear icon) → **API**.
   - Find **“Reload schema”** / **“Schema cache”** and run it (or wait 1–2 minutes for auto-refresh).

After all steps, restart your backend and try again.
