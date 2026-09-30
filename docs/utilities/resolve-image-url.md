# resolveImageUrl

Resolve a stored image reference to a URL an `<img :src>` can load, at render time.

Stored content keeps a logical reference, never the instance's routing or install path. `resolveImageUrl()` turns it into a real URL when the image is shown. Two shapes are resolved; everything else passes through unchanged.

| Stored value | Resolves to | Use it for |
|--------------|-------------|------------|
| `/apps/<app>/…` | `generateUrl()` of it: the webroot and `/index.php` prepended | A backend route that serves an image, such as `/apps/launchpad/resource/<name>` |
| `app:<app>/<file>` | `imagePath(<app>, <file>)`: the file in that app's own `img/` folder, wherever the app is installed | An image the app ships, such as the hero images of seed or demo data |

Every other value is returned as it is: `http(s)://` URLs, protocol-relative `//` URLs, `data:` and `blob:` URLs, paths that are already resolved (`/index.php/apps/…`, a webrooted `/<webroot>/apps/…`), a malformed `app:` reference, and anything that is not a string.

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `url` | `string \| null \| undefined` | The stored image reference. |

## Returns

`string` — the URL to use as the image source, or the input unchanged when it is not one of the two resolved shapes.

## Usage

```js
import { resolveImageUrl } from '@conduction/nextcloud-vue'

resolveImageUrl('/apps/launchpad/resource/x.gif')      // → '/index.php/apps/launchpad/resource/x.gif'
resolveImageUrl('app:pipelinq/marketing/hero.svg')     // → imagePath('pipelinq', 'marketing/hero.svg')
resolveImageUrl('https://example.com/logo.png')        // → 'https://example.com/logo.png'
resolveImageUrl('/index.php/apps/launchpad/x.gif')     // → unchanged, never double-prefixed
```

An `app:` reference resolves to wherever that app's `img/` folder is served from on the instance, which depends on the apps directory it is installed in. Nextcloud's `imagePath()` knows that; the stored value never has to.

## Where it is applied

`CnObjectCard` and `CnObjectRow` pass the schema's `objectImageField` value (or the row's `imageField`) through it, so an `app:` reference in an object renders in the cards and list views. `CnImageWidget` and `CnHeaderWidget` resolve their configured image URL the same way.

A path in a user's Nextcloud Files (`/Photos/hero.jpg`) is not one of these shapes. It can only be shown through Nextcloud's preview endpoint for the user who owns the file, so a consumer that stores one resolves it itself.

For validating a URL's scheme before binding it, see [`safeImageSrc`](./safe-image-src.md).
