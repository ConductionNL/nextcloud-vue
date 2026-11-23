# configureCnFetch

Chooses where [`cnFetch`](./cn-fetch.md) runs. The default is `'nextcloud'`: the Nextcloud URL prefix and the `requesttoken` header, exactly as before. Under `'public'` (a public origin with no Nextcloud behind it) URLs resolve from a configured base, the request carries a bearer credential and no `requesttoken`, and the credential is removed from any error `cnFetchJson` throws.

```js
import { configureCnFetch } from '@conduction/nextcloud-vue'

configureCnFetch({
  host: 'public',
  baseUrl: 'https://portal.example/api',
  credential: () => session.token, // or a string
})
```

| Parameter | Type | Description |
|---|---|---|
| `config.host` | `'nextcloud' \| 'public'` | Where the runtime runs. Default `'nextcloud'`. Any other value throws, naming the accepted values; it never falls back to either mode. |
| `config.baseUrl` | `string` | Public mode: the API base. A request for `/cases` goes to `<baseUrl>/cases`. `generateUrl` is not called. |
| `config.credential` | `string \| Function` | Public mode: the bearer credential, or a function returning it (read on every request). |

The credential is never put in a URL. A `CnHttpError` thrown in public mode has the credential replaced by `[redacted]` in its message and body, in case the server echoes it.

This is the transport half of the public host mode. The boot half (`bootstrapCnApp({ host })`) is not in this library: apps boot themselves, so call `configureCnFetch` from the app's `main.js` before mounting.
