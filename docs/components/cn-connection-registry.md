# CnConnectionRegistry

The connections one app declares, as integriq checked them. It reads the `app_connection` objects of the `integriq` register and draws them as status cards. Every app gets the same page; only the content is its own.

It is the manifest page type `connections`, and a component an admin settings tab can mount on its own: it needs no `CnAppRoot`, router or manifest.

## From the manifest

```json
{
  "id": "Integrations",
  "route": "/settings/integrations",
  "type": "connections",
  "title": "Integrations",
  "config": {
    "app": "pipelinq",
    "appName": "Pipelinq",
    "addUrl": "/apps/integriq/connections?app=pipelinq&link=1"
  }
}
```

Set `app`. The page then lists that app's connections however it is opened. Without `app` it reads `?app=` from the route, and with neither it lists every connection.

## In an admin settings tab

```vue
<CnConnectionRegistry
  app="pipelinq"
  app-name="Pipelinq"
  :show-title="false"
  add-url="/apps/integriq/connections?app=pipelinq&link=1" />
```

## What it draws

- The heading, a line such as "10 of 10 connections that Pipelinq declares, checked by integriq", and an "Add integration" button when `addUrl` is set. The `#header-actions` slot adds buttons before it.
- Status chips with their counts: All connections, Set up, Limited, Not set, Error. They are toggle buttons; one shows only the cards of its status. A text field filters on title, description, kind and status message.
- One card per connection, in `order`: an icon, the title, "kind · checked 7 Oct, 08:12" or "never checked", a status chip, the description, the status message, and a button to its `settingsUrl` ("Set up" for a connection not set up, "Open settings" otherwise). Without a `settingsUrl` the card says "No settings screen yet". A card reads `kind` and `icon` from the connection or its `declaration`.
- Beside the cards: Needs attention (the limited and failing connections with their message), Checked by integriq (the last check, and a link to integriq), and Add a connection.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `app` | String | `''` | The app whose connections are listed. Empty reads `?app=` from the route. |
| `appName` | String | `''` | The app's name in the line under the heading. |
| `title` | String | `''` | The heading. Defaults to the page title, else "Integrations". |
| `showTitle` | Boolean | `true` | Draw the heading. Off where the host titles the page. |
| `addUrl` | String | `''` | Target of the primary header button. No button without it. |
| `addLabel` | String | `''` | The button's label. Defaults to "Add integration". |
| `integriqUrl` | String | `'/apps/integriq'` | Target of "Open integriq". Empty hides the link. |
| `footnote` | String | `''` | A muted line under the page. |
| `register` | String | `'integriq'` | The register holding the connections. |
| `schema` | String | `'app_connection'` | The connection schema. |
| `page` | Object | `{}` | The whole manifest page; its `config` fills the props above, and a set prop wins. |

## Accessibility

- The status chips are a named group of toggle buttons with `aria-pressed`.
- Each card is an `<article>` named by its heading. Its button is named after the connection ("Open settings for Mastodon").
- The aside is a landmark named "About these connections".
