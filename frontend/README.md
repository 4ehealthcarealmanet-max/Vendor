This is a Next.js frontend for the MedVendor procurement workspace.

## Hosting Target

This module is intended to be hosted on Vercel.

Recommended cloud split for this repo:

- Frontend: Vercel
- Backend: Render

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Create a local env file before starting the app:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Then open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Vercel Deployment

Deploy the `frontend` directory as a separate Vercel project.

Vercel project settings:

- Root Directory: `frontend`
- Framework Preset: Next.js
- Install Command: `npm install`
- Build Command: `npm run build`

Set the backend origin through `NEXT_PUBLIC_API_BASE_URL`.

Example:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-backend-service.onrender.com
```

Production command:

```bash
npm run start
```

If the backend is hosted separately, make sure its CORS settings allow your Vercel frontend domain.
