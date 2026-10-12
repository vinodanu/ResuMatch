# ResuMatch source export

React 19 + TypeScript using Vinext/Vite. Includes browser-local PDF, DOC, DOCX and text extraction, keyword scoring and plain-text resume templates.

## Run locally
Install Node.js 22.13 or newer and pnpm 11.

    corepack enable
    corepack prepare pnpm@11.25.0 --activate
    pnpm install --frozen-lockfile
    pnpm dev

Open the localhost URL printed by the dev command (normally http://localhost:5173).

## Current authentication
This source uses ChatGPT Sites authentication headers and platform sign-in routes. Those routes are supplied by Sites hosting, not this application. Localhost will show a guest workspace and analysis is gated on sign-in. To use analysis outside Sites, replace app/chatgpt-auth.ts and the sign-in/sign-out links with your own authentication integration. Never trust user-supplied identity headers on an unprotected server.

## Push to your repository
Create an empty repository and run these commands from this folder, replacing YOUR_GIT_REPOSITORY_URL:

    git init
    git add .
    git commit -m "Initial ResuMatch application"
    git branch -M main
    git remote add origin YOUR_GIT_REPOSITORY_URL
    git push -u origin main

## Scope
Java, Spring Boot, WebFlux, microservices and Spring Security/JWT are not included in this version. Resume analysis runs in the browser; there is no saved-resume database or OCR. Templates download as TXT.

The export excludes Git history, credentials, generated output, dependencies and the original Site identity. package.json and pnpm-lock.yaml reproduce dependencies. public/pdf.worker.min.mjs must be kept aligned with the pdfjs-dist version.
