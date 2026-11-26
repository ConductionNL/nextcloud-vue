# An image field holding a file shows the file

## Why
larpinq's map page (worlds-maps) shows the map object in a data widget. Its `image` property is an OpenRegister file property, so the record holds the file object (`{ id, downloadUrl, accessUrl, ... }`). The data widget passed that object to `<img :src>`, which rendered `src="[object Object]"`: a broken image with the alt text "Map image". Seen live on 25 Nov 2026 (Nextcloud 34, OpenRegister main).

## What changes
- The data widget's image row takes its URL through `fileHref()`, the helper the map widget's image layer already uses: a string as stored, a file object's `downloadUrl`, `accessUrl` or `url`, or the first file of a list.
- A value without a URL falls through to the ordinary display instead of rendering an empty `<img>`.
