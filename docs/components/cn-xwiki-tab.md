import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnXwikiTab.md'

# CnXwikiTab

Sidebar tab for the XWiki ("Articles") integration in the [pluggable integration registry](../../guides/integrations.md). Lists the XWiki pages linked to an OpenRegister object, each with its full breadcrumb so same-titled pages in different spaces are distinguishable. Link a page by pasting a full XWiki URL (parsed server-side to a canonical `Space.Page` reference) or by typing the path directly; unlink removes the pairing only — it never deletes the page in XWiki. Shows a reconnect banner when the OpenConnector `xwiki` source's credentials need attention.

You don't mount this directly — it's registered as the `tab` for the `xwiki` integration and rendered by `CnObjectSidebar` in registry mode.

## Try it

<Playground component="CnXwikiTab" />

## Usage

```js
import { CnXwikiTab, CnXwikiCard, registerXwikiIntegration } from '@conduction/nextcloud-vue'

// registerXwikiIntegration() wires CnXwikiTab + CnXwikiCard onto the
// `xwiki` integration; OpenRegister's bundle calls it when OpenConnector
// is installed. Or register manually:
window.OCA.OpenRegister.integrations.register({
  id: 'xwiki', label: 'Articles', icon: 'FileDocumentMultiple',
  requiredApp: 'openconnector', group: 'external', referenceType: 'xwiki',
  tab: CnXwikiTab, widget: CnXwikiCard,
})
```

## Events

- `@linked(reference)` — a page was linked (after the list refreshes)
- `@unlinked(id)` — a page was unlinked

## Reference

<GeneratedRef />
