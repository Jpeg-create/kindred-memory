# KindredMemory — frontend

The Vite + React frontend for [KindredMemory](../README.md) — three pages
(`Landing`, `Dashboard`, `Chat`) talking to the AWS Lambda backend over
`react-router-dom`.

Live at https://kindred-memory.vercel.app/. See the [root README](../README.md)
for what the project does and how the pieces fit together.

## Running locally

```
npm install
npm run dev
```

By default it talks to the deployed KindredMemory API. To point it at a
different backend, copy `.env.example` to `.env` and set
`VITE_API_BASE_URL`.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — typecheck (`tsc -b`) then production build
- `npm run preview` — preview a production build locally
- `npm run lint` — oxlint
