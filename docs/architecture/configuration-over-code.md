---
title: Configuration over code
sidebar_position: 3
---

# Configuration over code

The point of `@conduction/nextcloud-vue` + OpenRegister isn't "less Vue to write". It's **less code, full stop**. Every page, every form, every list, every dashboard tile that a Conduction app ships is meant to be a row in a JSON file, not a `.vue` file in a `src/` tree.

That distinction matters because **configuration is safe in a way code is not**. Configuration runs inside a sandbox the library controls. Code runs inside the host app with the full power of the runtime — to crash it, to leak from it, to render arbitrary HTML, to call arbitrary backends. If we want non-engineers — and AI — to compose apps without paging the on-call, the contract has to be: you can change the JSON, you cannot change the runtime.

## The shift

A traditional Nextcloud app is a Vue project. Routes are defined in `router/index.js`. Navigation is rendered in `MainMenu.vue`. Each route is a hand-written view. CRUD is hand-written forms. Permissions are scattered through templates. The "shape" of the app lives across thirty files and is enforced by code review.

A Conduction app declares all of that in a single `manifest.json`:

```json
{
  "$schema": "https://nextcloud-vue.conduction.nl/schemas/app-manifest.schema.json",
  "menu": [
    { "id": "decisions", "label": "Decisions", "icon": "ScaleBalance", "order": 1 }
  ],
  "pages": [
    { "id": "decisions", "type": "index",  "config": { "register": "decidesk", "schema": "decision" } },
    { "id": "decision",  "type": "detail", "config": { "register": "decidesk", "schema": "decision" } }
  ]
}
```

The same JSON Schema that defines the `decision` record drives the table columns, the filter bar, the create/edit dialog, the detail panel, and the validation. The same `manifest.json` decides what's in the left nav, who can see it, and which page mounts where. There is **no Vue to write** for either of those screens.

The library does the rendering. The schema does the typing. The manifest does the composition. The app author does none of it twice.

## Why this is a safer surface for AI (and citizen developers)

If "building an app" reduces to **writing two JSON files** — a schema and a manifest — then the failure modes collapse to a small, enumerable set:

- **A typo is a validation error.** Both files are JSON Schema-validated at build time and at runtime by [`useAppManifest`](/docs/utilities/composables/use-app-manifest). The user sees a clear "this field is wrong" — never a white screen, never a runtime exception, never a console stack trace.
- **There is no JavaScript to execute.** The user cannot ship a piece of code that an attacker can later use to compromise the host. The widest a manifest can reach is to reference a `customComponents` entry already shipped by the host bundle. Anything new the user adds is **data**, not behaviour.
- **The blast radius is bounded.** A bad schema breaks one page. A bad manifest entry hides one menu item. The chassis still renders. The user is never offered an "edit `App.vue`" affordance from which they can take the workspace down.
- **The change is reversible.** Both files are version-controlled, diffable, and round-trip through every editor — an admin UI, the OpenBuilt visual editor, an AI agent, a `git revert`. Anything reversible is testable; anything testable is safe to let non-engineers and AI touch.

That last point is the one that turns this from "nice architecture" into a deployable AI strategy. The reason it is hard to let an AI agent write a Nextcloud app today is the same reason it is hard to let a customer write one: the surface is too wide, and the failure modes are unbounded. Restrict the surface to a typed JSON contract and the work the AI has to do becomes generation **inside** a sandbox the platform owns. The output is constrained by the schema. The runtime stays the property of the library. The customer — or the model — never touches code that runs.

## Two concepts that make this concrete

### Spec-driven development

The discipline of describing what an app *is* (its schemas, its pages, its permissions, its data flows) in machine-readable specs **before** any rendering code exists. The library is the renderer. The spec is the source of truth. Every Conduction app — and every app a citizen developer or AI agent builds — starts at the spec and ends at the runtime, never the other way around.

We teach the full workflow — schemas first, manifest next, slots and integrations last — in the academy:

→ [Build an app with spec-driven development](https://conduction.nl/academy/spec-driven-development) (tutorial)

The tutorial walks a beginner through composing a working app without writing a single line of Vue. The same workflow is what an AI agent follows when it generates a Conduction app: pick the schemas, write the manifest, validate, ship.

### App builder

The end state of the configuration-over-code shift is that you don't author either file by hand. **OpenBuilt** is the visual app builder we're building on top of the manifest contract: drag schemas in, point and click the navigation, preview the chassis, publish — no JSON editor, no terminal, no Vue, no review.

→ [OpenBuilt — visual app builder](https://conduction.nl/apps/openbuilt)

OpenBuilt's output is a `manifest.json` and a set of OpenRegister schemas. The same files this docs site teaches you to hand-write. **Anything you build by hand here, you can later open in OpenBuilt and keep editing — and vice versa.** The artifact is identical because the contract is identical.

The same artifact is what we hand to an AI agent: today, an LLM that's been given the manifest schema and a list of available `register` + `schema` slugs can generate a working Conduction app in one shot. We're moving towards making that the default authoring loop, not the exception.

## What this means for you

You are reading the docs of the **library that holds the line**. Everything in this site — the chassis, the atoms, the stacked views, the manifest, the schemas — exists so that the configuration above it has somewhere to land. If we keep the runtime small and opinionated, the configuration on top can be wide and unprivileged. That is the trade: a tighter library, a freer authoring surface.

When you next add a feature to a Conduction app, the question to ask is not *"what Vue component do I write?"* — it's *"what would I have to add to the manifest, or the schema, for the existing components to render this?"*. If the answer is "nothing, the contract already covers it" — ship it as config. If the answer is "the contract doesn't have a primitive for this" — propose adding the primitive to the library, not the app. Every primitive added at the library tier is one fewer thing every citizen developer, every AI agent, and every future app author has to know.

## Where to next

- **[App manifest](./manifest.md)** — the contract. JSON schema, page types, slot system.
- **[Schemas and registers](./schemas-and-registers.md)** — the data side. How a single JSON Schema drives forms, columns, filters, and validation.
- **[App design principles](./app-design-principles.md)** — the chassis and atoms the configuration composes.
- **[Build an app with spec-driven development](https://conduction.nl/academy/spec-driven-development)** — the tutorial. Schemas first, manifest next, slots last.
- **[OpenBuilt](https://conduction.nl/apps/openbuilt)** — visual app builder. Same contract, no JSON editor.
