# Link Sheet

Create a large QR code, shorten its destination URL, and print the QR code, short link, and original URL on one US Letter page. The preview matches the print sheet.

Open the [live app on GitHub Pages](https://codexjdub.github.io/LinksToQRandShortURL/). The entire app is [`index.html`](index.html): HTML, styles, QR generation, and printing are in that one file. You can also save it to your computer and open it directly. No login, API key, build step, or server is needed.

When you select Generate, the browser sends the URL to [Spoo.me](https://spoo.me/api) for shortening. If that service is unavailable, it tries [Shrtr](https://shrtr.top/api). Both services allow browser requests without an API key. Shortening needs an internet connection and is subject to their rate limits. If both fail, the QR code still opens the original URL and the page shows a warning. QR creation, SVG download, preview, and printing work offline.

The bundled [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 code is by Kazuhiko Arase under the MIT license; its copyright and license notice are included in `index.html`.
