# AAU Nightlife Poll

This app is now wired for Supabase-backed data with a Vercel admin function for protected writes.

## Setup

1. Create a Supabase project.
2. Run [supabase/schema.sql](supabase/schema.sql) in the SQL editor.
3. Run [supabase/seed.sql](supabase/seed.sql) to load the current demo data.
4. Create a public storage bucket named `candidate-media` if it was not created by the schema script.
5. Copy [`.env.example`](.env.example) to `.env.local` and fill in the Supabase values.

## Environment Variables

The frontend needs:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The Vercel admin function needs:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_ACCESS_PASSWORD`

## Local Uploads

Admin can upload a candidate photo or flyer from the local machine. The image is stored in Supabase Storage under the `candidate-media` bucket and the public URL is saved on the candidate record.

## Deployment

Deploy the Vite app to Vercel as usual. The `api/admin.js` function handles protected admin actions, and `vercel.json` rewrites all routes back to `index.html` so `/control` and `/results` work on refresh.
