# useEnvironment

Resolves which environment (OTAP) an app screen belongs to, for [`CnEnvironmentBanner`](../../components/cn-environment-banner.md).

```js
import { useEnvironment } from '@conduction/nextcloud-vue'

const { environment } = useEnvironment({ environment: () => props.environment })
```

| Argument | Type | Description |
|----------|------|-------------|
| `options.environment` | `() => unknown` | Getter for the app's own `environment` setting. It wins over the organisation. |
| `options.tenant` | `object` | The tenant context; defaults to the injected one. |
| `options.apiBase` | `string` | OpenRegister API base used to read an organisation by uuid. Default `/apps/openregister/api`. |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `environment` | `ComputedRef<string>` | `development`, `test` or `acceptance`; `''` for none, production or an unknown value. |

The active organisation's `environment` field is used when the app sets none. It follows a tenant switch. A failed read resolves to `''` and logs one warning.
