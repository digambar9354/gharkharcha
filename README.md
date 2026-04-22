# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/lea# GharKharcha — React App

## Quick start
```bash
npm install
npm run dev
```
Open http://localhost:5173

## Build for production
```bash
npm run build
```
Output goes to `dist/` folder.

## Deploy on AWS Amplify
1. Push to GitHub
2. In Amplify Console → Update build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Save → Redeploy

## After deploy — update Google OAuth
Add your Amplify URL to Google Cloud Console:
APIs & Services → Credentials → OAuth Client ID → Authorized JavaScript origins
rn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
