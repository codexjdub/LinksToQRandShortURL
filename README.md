# Link Sheet

Create a large QR code, shorten its destination URL, and print the QR code, short link, and original URL on one US Letter page. The preview matches the print sheet. No account or API key is needed to use the published page.

## Use on GitHub Pages

The complete webpage is [`index.html`](index.html). Publish the repository's `main` branch from the root (`/`) in **Settings → Pages**. GitHub Pages serves the static page; the existing Link Sheet backend at `https://link-sheet-qr.w42425.chatgpt.site/api/shorten` handles shortening because CleanURI does not support direct browser requests from this page.

The backend must have `PAGES_ORIGIN` set to the exact Pages origin, such as `https://codexjdub.github.io`. This is configured on the Link Sheet Site, not in this public repository. The backend accepts requests from that origin and its own site only.

You can also download `index.html` as a single file. QR creation, preview, SVG download, and printing work locally. Shortening requires the published website; local files cannot safely use the hosted shortening backend without exposing its access to other websites.

## Project files

- `index.html` — the complete static page, including styles, app code, and the bundled QR generator.
- `src/worker.mjs` — the backend that validates URLs and calls CleanURI.
- `scripts/build.mjs` — embeds `index.html` in the backend build for the existing hosted site.
- `tests/backend.test.mjs` — backend behavior and origin checks.
- `.openai/hosting.json` — identifies the existing hosted Site used for the shortening backend.

Run `npm test` to check the backend and `npm run build` to create the ignored `dist/server/index.js` deployment artifact. Node.js 20 or newer is sufficient; there are no npm dependencies.

## How shortening works

When you select Generate on the published page, the browser sends the URL to the hosted backend. The backend sends it to [CleanURI](https://cleanuri.com/docs) and returns the resulting short link. If shortening fails, the page still creates a QR code for the original URL and shows a warning. The Worker never visits the submitted destination. It bounds request size and URL length, caches successful results temporarily, and paces requests to the provider.

The bundled [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 code is by Kazuhiko Arase under the MIT license; its copyright and license notice are included in `index.html`.
