# Problem 2

- Vite and React currency swap form using current Switcheo USD prices through Axios.
- Keeps the newest valid price per asset and falls back to bundled prices if the request fails.
- Uses React Hook Form and Zod to validate a positive decimal amount and different input/output assets.
- Blocks non-numeric input, negative values, and scientific notation; swap submission shows simulated progress and completion.
- Supports responsive layouts, token icons, light/dark themes, and a visible in-card status state.
- Run `npm run dev`, `npm test`, or `npm run build` inside `src/problem2`.
