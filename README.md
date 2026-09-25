# Link Sheet

Enter a URL or paste a QR code image that contains a website link. Link Sheet creates a large QR code that opens the original URL, then prints the QR code, short link, and original URL on one US Letter page. The preview matches the print sheet, and both URL labels in the preview are clickable for verification.

Open the [live app on GitHub Pages](https://codexjdub.github.io/LinksToQRandShortURL/). The entire app is [`index.html`](index.html): HTML, styles, QR generation, and printing are in that one file. You can also save it to your computer and open it directly. No login, API key, build step, or server is needed.

To use an existing QR code, copy its image and paste it anywhere on the page (⌘V or Ctrl+V), choose an image file, or drop an image into the QR image box. The browser reads the image locally and accepts it only if the QR code contains a website URL. It then uses the same Generate flow as a typed URL.

When you select Generate or import a QR image, the browser sends the URL to [Spoo.me](https://spoo.me/api) for shortening. If that service is unavailable, it tries [Shrtr](https://shrtr.top/api). Both services allow browser requests without an API key. Shortening needs an internet connection and is subject to their rate limits. The QR code always opens the original URL, including if both shortening services fail. QR image reading, QR creation, SVG download, preview, and printing work offline.

The bundled [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 code is by Kazuhiko Arase under the MIT license; its copyright and license notice are included in `index.html`.

The bundled [QR Scanner](https://github.com/nimiq/qr-scanner) 1.4.2 code is by Nimiq and danimoh under the MIT license; its copyright and license notice are included in `index.html`.
