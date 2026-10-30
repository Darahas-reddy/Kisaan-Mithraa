# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/c54ab296-9157-428a-9a2d-d381a3b208da

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/c54ab296-9157-428a-9a2d-d381a3b208da) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Build the app before deploying it:

```sh
npm run build
```

Deploy the generated `dist` directory as the site root. The source `index.html`
references `/src/main.tsx`, which is intentionally transformed by the Vite
development server; serving the repository root with a generic static server
will return that TypeScript file as `application/octet-stream` and browsers
will reject it as a module. For a local production preview, run:

```sh
npm run preview
```

If you use the VS Code Live Server extension, run `npm run build` first and
open the generated `dist/index.html`. This workspace is configured to use
`dist` as Live Server's root. Do not serve the repository root with Live
Server, because it will send the untransformed `/src/main.tsx` file with the
wrong MIME type.

### Production deployment

Deploy the Vite frontend and Flask API separately:

1. Deploy the repository as a Vercel project. Use `npm run build` as the build
   command and `dist` as the output directory.
2. Deploy the Flask API as a Render Web Service. Use `pip install -r
   requirements.txt` as the build command and `gunicorn predict:app` as the
   start command.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel
   project environment variables.
4. Set `VITE_PREDICT_URL` in Vercel to the public Render URL, for example
   `https://your-api.onrender.com`, then redeploy the frontend.
5. Configure `LOVABLE_API_KEY`, `OPENWEATHER_API_KEY`, and
   `AGMARKNET_API_KEY` as Supabase Edge Function secrets. Do not put these
   secrets in Vercel or in frontend code.
6. Link the repository to the Supabase project and run `supabase db push`, then
   deploy the Edge Functions with `supabase functions deploy`.

The Supabase dashboard must also allow the deployed Vercel URL under
Authentication → URL Configuration → Redirect URLs. The Render service must
include the committed `model/plant_model.pkl` file for `/predict` to work.

You can also open [Lovable](https://lovable.dev/projects/c54ab296-9157-428a-9a2d-d381a3b208da) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
