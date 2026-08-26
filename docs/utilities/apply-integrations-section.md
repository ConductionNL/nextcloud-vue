# applyIntegrationsSection

Moves the menu entries listed in `menu-layout.json#integrationsSection` **out of the navigation entirely** and into the Integrations section at the bottom of the per-user settings modal, which [`CnAppRoot`](../components/cn-app-root.md) renders (ADR-110).

This is where a link that *leaves this app for another one* belongs. Such a link is not a page of this app: it can never be the active route, it carries no counter, and putting it in the navigation makes another app's capability read as this app's feature. The one deep link that stays in the navigation is Admin settings, and [`CnAppNav`](../components/cn-app-nav.md) auto-prepends that itself (ADR-079) — no app declares it.

The entry is **relocated, never dropped**, which is what keeps this compatible with the ADR-044 no-functionality-loss invariant.

```js
import { applyIntegrationsSection } from '@conduction/nextcloud-vue'

const menu = applyIntegrationsSection(laidOutMenu, ['AvgRegisterLink', 'AiOversightLink'])
```

Declared in `menu-layout.json` alongside the other layout keys:

```json
{
  "settingsSection": ["CaseTypesMenu", "PartnersMenu"],
  "integrationsSection": ["AvgRegisterLink", "AiOversightLink"]
}
```

`applyMenuLayout` runs this step **last**, so an id listed in both `settingsSection` and `integrationsSection` ends up in Integrations — an integration link is not a settings page of this app, and the entry must land in exactly one place.

Gate a cross-app link on the target app being present, so the section never advertises a guaranteed 404:

```json
{ "id": "AiOversightLink", "label": "AI oversight", "href": "/apps/hermiq/ai-oversight",
  "section": "integrations", "visibleIf": { "appInstalled": "hermiq" } }
```

| Param | Type | Description |
|-------|------|-------------|
| `menu` | `Array<object>` | The merged + relocated + pruned menu. |
| `integrationIds` | `Array<string> \| undefined` | Entry ids to move to Integrations. |

Returns the menu with the integration entries lifted out.
