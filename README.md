# component-preview

An experiment from December 2024: describe a UI component in plain English and see it built live.

## Why

I wanted to know whether people who don't write code — designers, product people, content folks — could prototype a component just by describing it, and then keep refining it in conversation instead of handing a spec to a developer and waiting.

## What it did

- **Describe → preview.** Type a description ("a pricing card with three tiers, the middle one highlighted") and Claude returns HTML styled with Tailwind, rendered right next to the prompt.
- **Iterate.** Each follow-up prompt sends the current component back with the change you asked for, so you refine it step by step rather than starting over.
- **Reference images.** Attach a screenshot or sketch and Claude uses it as a visual reference.
- **Assets.** Upload images (logos, photos) to an asset library; Claude references them by ID and the server swaps in the real image.
- **History.** Every version is kept with undo/redo, and the history can be exported and imported as JSON.

## How it worked

A SvelteKit app (Svelte 5, Tailwind) with two moving parts:

- `src/routes/+page.svelte` — the whole UI. It builds the Claude request: a "create a component" system prompt for the first turn, then a "modify this HTML" prompt carrying the current component for every turn after. History and assets live in `localStorage`.
- `src/routes/api/claude/+server.js` — a small server route that forwards the request to the Anthropic Messages API with the server-side key, pulls the code out of the ```` ```html ```` block in the reply, and replaces asset IDs with their image data.

`guidelines/svelte/` holds notes on Svelte conventions I was drafting so the next version could generate real Svelte components rather than plain HTML.

### Branches

- `main` — the working proof of concept, the whole UI in one page.
- `convert-to-components` / `convert-2nd-try` — attempts to split that page into `DesignPanel`, `PreviewPanel` and `AssetManagerModal` components.

## Running it

```bash
pnpm install
echo 'VITE_CLAUDE_API_KEY=your-anthropic-key' > .env
pnpm dev
```

The model is hardcoded in `src/routes/+page.svelte` (`claude-3-5-sonnet-20241022`), which is an old model ID — swap in a current one.

## Don't deploy it

This was a local prototype and it isn't safe to put on the internet as-is:

- `/api/claude` forwards whatever the browser sends (model, token limit, messages) using your API key, with no auth or rate limit. Anyone who can reach it can spend your credits.
- Generated HTML is rendered directly into the page with `{@html}`, not in a sandbox, so a malicious imported history file or a prompt-injected response can run script on the app's origin. A sandboxed `<iframe srcdoc>` would fix that.
