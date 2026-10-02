# Requirements

> Note: These were written without A.I. so I could provide A.I. with some additional instructions.

## Summary

A TypeScript client/server monorepo application using npm workspaces with a "client" and "api" based on the high-level instructions in "Cloud-Core Take Home Test.docx". This implementation should remain simple and not add any additional behavior or features outside what is written in these documents unless asked later.

## Coding Conventions

Keep this minimal as possible with well named functions and variables and no comments as this should be straightforward. Keep code organized and centralize shared code use constants where it makes sense. Otherwise follow best practices for React and Node.js. Use camel casing for any data objects.

## Technologies

- Root
  - npm workspaces
  - Formatting - prettier (ensure format on save and organize imports is enabled in .vscode/settings.json for VS Code)
  - Linting - eslint
  - Testing - vitest and testing-library
  - Husky - pre-commit hooks for formatting, linting, and testing.
- api
  - Technologies - Express and express middleware, tRpc and Zod for type safety
  - Data - All data stored in JSON files, one for transaction history (transactions.json) and one users and authentication and authorization (auth.json).
  - Port - 3001
- client
  - Technologies - Vite React Project (npm create vite@latest), vitest and testing-library for unit testing, tRpc and Zod for type safety and validation.
  - Styling - Try to use pico.css without any additional CSS.
  - Port - 3000

## Security

- authentication and authorization - Minimal OAuth implementation using a JSON file (auth.json). Create one user called "testuser" with password "Ch4\*Nip!RLNg". This user will have access only to transaction REST API with only the HTTP methods required for them.
- REST API - All endpoints should be secure using CORS, CSRF, and any other standards. All other routes and unused HTTP methods should be locked down.
- Client - Cannot access REST API without being logged in. Ensure all other security concerns like HTTPS, cookie security, XSS, and CSP if necessary are in place.

## Testing

- Unit testing should be implemented using vitest and testing-library.
