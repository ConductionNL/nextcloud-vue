/**
 * TypeScript type definitions for the Conduction app manifest.
 *
 * The shape tracks the canonical v2 schema
 * `src/schemas/app-manifest-v2.schema.json` (JSON Schema draft 2020-12), not
 * the legacy v1 schema. Apps consume these types when authoring their
 * `src/manifest.json` and when interacting with `useAppManifest`.
 *
 * These types are hand-authored for ergonomics; the drift guard in
 * `tests/types/manifest-types-schema-sync.spec.js` fails CI if the v2 schema
 * grows a top-level property or page type this file does not reflect.
 *
 * @example
 * import type { TManifest, TManifestPage } from '@conduction/nextcloud-vue'
 */

/**
 * Built-in page types shipped by the library. The `type` field of a
 * manifest page is a string that should match a key in the resolved
 * `pageTypes` registry (library defaults plus any consumer extensions)
 * OR be `"custom"`, in which case `component` is resolved against the
 * customComponents registry.
 *
 * Apps with custom built-in types declare those keys in their own
 * pageTypes map and may extend this string union locally for type
 * safety.
 */
export type TPageType =
	| 'index' | 'detail' | 'dashboard' | 'logs' | 'settings' | 'chat'
	| 'files' | 'form' | 'map' | 'roadmap' | 'search' | 'wiki'
	| 'flows' | 'flow-detail' | 'custom'
	| (string & {})

/**
 * Where a menu entry renders. `main` / `footer` / `settings` are the three
 * CnAppNav buckets; `integrations` renders NOT in the navigation at all but in
 * the Integrations section of the per-user settings modal (ADR-110).
 */
export type TManifestMenuSection = 'main' | 'footer' | 'settings' | 'integrations'

/**
 * Render kind of a menu entry. `"item"` (default) renders as a regular
 * `NcAppNavigationItem`; `"caption"` renders as an `NcAppNavigationCaption`
 * (a non-interactive section divider). Caption entries ignore `route`,
 * `href`, `action`, `icon`, `count`, `children`, and `pinned` — only
 * `label`, `id`, `order`, and `section` are honoured.
 */
export type TManifestMenuItemType = 'item' | 'caption'

/** A nested menu entry. Cannot have further children. */
export interface TManifestMenuItemLeaf {
	id: string
	label: string
	icon?: string
	route?: string
	order?: number
	permission?: string
	/**
	 * Placement within CnAppNav. `"main"` (default) renders in the top
	 * scrollable list; `"footer"` renders as a flat pinned-bottom entry
	 * above the settings foldout; `"settings"` renders inside the
	 * NcAppNavigationSettings gear-icon foldout.
	 */
	section?: TManifestMenuSection
	/**
	 * Render kind. Defaults to `"item"`. Set `"caption"` to render an
	 * `NcAppNavigationCaption` section divider instead of a clickable
	 * entry — only `label`, `id`, `order`, and `section` are honoured.
	 */
	type?: TManifestMenuItemType
	/**
	 * External URL. When set, the item opens this URL in a new tab and
	 * `route` is ignored.
	 */
	href?: string
	/**
	 * Counter badge rendered in the entry's `#counter` slot via
	 * `NcCounterBubble`. Two binding modes:
	 *  - A positive number — rendered as-is.
	 *  - The sentinel string `"auto"` — `CnAppNav` resolves the count from
	 *    the `cnMenuCounts` inject (populated by `CnAppRoot` from
	 *    `useObjectStore` totals) for the entry's resolved `index`-type
	 *    page (`{ register, schema }` in its `config`).
	 *
	 * A resolved count of `0`, `null`, or `undefined` renders no badge.
	 */
	count?: number | 'auto'
	/**
	 * Forwarded to the rendered `NcAppNavigationItem`'s `pinned` prop. NC
	 * bottom-pins pinned items inside the parent list region. Defaults to
	 * `false`. Note: `section: "footer"` entries are pinned automatically
	 * — `pinned` is for the rare case of explicitly pinning a `"main"`
	 * entry inside the top list.
	 */
	pinned?: boolean
}

/** A top-level menu entry. May contain one level of nested children. */
export interface TManifestMenuItem extends TManifestMenuItemLeaf {
	children?: TManifestMenuItemLeaf[]
	/**
	 * Initial expansion state for a parent entry's children. When `true`
	 * and `children[]` is non-empty, the parent `NcAppNavigationItem`
	 * renders with `:open="true"` so children are visible on mount. The
	 * user can still collapse/expand interactively; the manifest value is
	 * only the initial state. Defaults to `false`.
	 */
	open?: boolean
}

/**
 * A primary action declared on either a `pages[]` entry (active-page
 * scoped) or `nav.primaryAction` (app-wide default). Rendered above the
 * menu list as an `NcAppNavigationNew` button. The button click emits
 * `@primary-action-click` on `CnAppNav` with the resolved block as
 * payload.
 */
export interface TManifestPrimaryAction {
	/**
	 * Stable identifier for the primary action — used by host listeners
	 * to dispatch on which action was clicked. Recommended when both a
	 * page-scoped and a nav-root action are declared in the same manifest.
	 */
	id?: string
	/** i18n translation key / text rendered on the button. */
	label: string
	/**
	 * MDI icon name (e.g. `"Plus"`) resolved against CnIcon's ICON_MAP.
	 * Defaults to `"Plus"` when omitted.
	 */
	icon?: string
	/** Named vue-router route the button navigates to on click. */
	route?: string
	/**
	 * External URL opened in a new tab on click. Takes precedence over
	 * `route` when both are set.
	 */
	href?: string
	/**
	 * Free-form payload passed back to the host inside the
	 * `@primary-action-click` payload. Use for context the host
	 * dispatcher needs (e.g. a preset schema id for the create dialog).
	 */
	payload?: unknown
}

/**
 * A page definition. `id` doubles as the vue-router route name; the
 * renderer matches by `$route.name === page.id`. `route` is the path
 * pattern, used when the consuming app builds its router config.
 */
export interface TManifestPage {
	id: string
	route: string
	type: TPageType
	title: string
	config?: Record<string, unknown>
	component?: string
	headerComponent?: string
	actionsComponent?: string
	/**
	 * Generic slot-override map: slot name → registry component name.
	 * Forwarded by CnPageRenderer to the dispatched page component as
	 * scoped slots, preserving every override the underlying Cn*Page
	 * exposes (`#create-dialog`, `#form-fields`, `#row-actions`, etc.).
	 */
	slots?: Record<string, string>
	/**
	 * Active-page-scoped primary action rendered as an `NcAppNavigationNew`
	 * button above the menu list when the current route resolves to this
	 * page. Page-scoped declarations win over `nav.primaryAction` — see
	 * the `cn-app-nav-shell-refactor` change for the resolution rules.
	 */
	primaryAction?: TManifestPrimaryAction
}

/**
 * Top-level manifest shape. `version` is the semver of the manifest
 * content (distinct from the schema's own version). `dependencies`
 * lists Nextcloud app IDs that must be installed and enabled.
 */
/** Navigation-level configuration consumed by CnAppNav. */
export interface TManifestNav {
	/**
	 * Auto-prepend a "Personal settings" entry at the top of the settings
	 * foldout (opens the host's NcAppSettingsDialog via cnOpenUserSettings).
	 * Defaults to `true`; set `false` for apps with no per-user settings.
	 */
	includePersonalSettings?: boolean
	/** Override label for the settings foldout's gear button (default "Settings"). */
	settingsLabel?: string
	/**
	 * App-wide default primary action rendered above the menu list as an
	 * `NcAppNavigationNew` button. A page-scoped `pages[].primaryAction`
	 * for the current route wins over this default.
	 */
	primaryAction?: TManifestPrimaryAction
}

/**
 * A declarative health check descriptor (ADR-040). The OpenRegister AppHost
 * observability engine renders these as the `{status, app, version, checks}`
 * health response.
 */
export interface TManifestHealthCheck {
	id: string
	type: 'database' | 'filesystem' | 'appEnabled' | 'appConfig' | 'orAvailable'
	severity?: 'critical' | 'degraded'
	/** App id — for the `appEnabled` check. */
	app?: string
	/** Config key — for the `appConfig` check. */
	key?: string
}

/**
 * A declarative Prometheus metric descriptor (ADR-040). The `{app}_` prefix,
 * exposition format, and implicit `{app}_info` / `{app}_up` gauges are
 * engine-owned; `source.kind` is one of the closed metric-source kinds.
 */
export interface TManifestMetric {
	name: string
	type: 'gauge' | 'counter'
	help?: string
	source: {
		kind: 'tableCount' | 'objectCount' | 'objectSum' | 'appConfig' | 'provider'
		[key: string]: unknown
	}
}

/**
 * ADR-040 AppHost observability block. Rendered by OpenRegister's generic
 * health/metrics controllers — health public, metrics admin-only. An
 * observability-only manifest (no `pages`) is valid as of schema v2.13.0.
 */
export interface TManifestObservability {
	_note?: string
	health?: {
		statusCodePolicy?: 'adr006' | 'always200'
		checks?: TManifestHealthCheck[]
		/** ADR-040: emit permissive CORS headers on `/api/health`. */
		cors?: boolean
	}
	metrics?: TManifestMetric[]
}

/**
 * ADR-040 deep-link descriptor. The generic listener resolves the template at
 * event time so a register/schema object gets a routable in-app URL.
 */
export interface TManifestDeepLink {
	registerSlug: string
	schemaSlug: string
	urlTemplate: string
	displayName?: string
}

/**
 * External-provider credential declaration (credential-broker capability).
 * The app never receives the secret — OpenRegister's broker performs the
 * outbound call on the user's behalf; the app only declares which provider,
 * why, and at what scope.
 */
export interface TManifestCredential {
	provider: string
	reason?: string
	scopes?: string[]
}

/**
 * Declarative scheduled-task descriptor (apphost-scheduling capability).
 * The OpenRegister AppHost schedule-reconciler turns each entry into an
 * Integriq job that runs on the existing background-job path, so a
 * manifest-driven app (including a pure-virtual Buildiq app) can own its
 * cadence without shipping a PHP TimedJob. Consumed by the OpenRegister
 * engine, never by the Vue renderer. Exactly one of `interval` or `cron`
 * must be set.
 */
export interface TManifestSchedule {
	/** Stable id, unique within the manifest — the reconciled job is keyed on applicationId + this id. */
	id: string
	/** Run cadence in seconds. Exactly one of `interval` or `cron`. */
	interval?: number
	/** 5-field cron expression; the reconciler computes nextRun from it. Exactly one of `interval` or `cron`. */
	cron?: string
	/**
	 * A server-allow-listed generic action type (e.g. `"openconnector:synchronization"`),
	 * NOT a PHP class name. The reconciler maps the type to a trusted jobClass;
	 * a manifest-supplied class name is never executed. Non-allow-listed → rejected + logged.
	 */
	action: string
	/** Free-form arguments passed to the vetted action (e.g. a synchronization ref). */
	arguments?: Record<string, unknown>
	/** Whether the schedule is active (default true). `false` disables the job, preserving run history. */
	enabled?: boolean
}

/**
 * MCP tool visibility/UX hints (ADR-063). Purely advisory: OpenRegister's
 * register (`x-openregister-mcp` dialect + `#[McpTool]` attributes) is the
 * single source of CRUD-tool truth and OpenRegister RBAC is the
 * authoritative invoke-time gate. Consumed by Hermiq / openbuild surfaces,
 * never by nextcloud-vue itself. See the `mcp` property in the v2 schema.
 */
export interface TManifestMcp {
	/** Advisory app-wide default for showing this app's tools in pickers. Defaults to `false`. */
	expose?: boolean
	/** Maps a `pages[].id` to the ordered MCP tool ids relevant on that page. */
	pageTools?: Record<string, string[]>
	/** Advisory agent-facing metadata (summary, defaultTools, keywords, and future advisory keys). */
	agentHints?: {
		summary?: string
		defaultTools?: string[]
		keywords?: string[]
		[key: string]: unknown
	}
}

export interface TManifest {
	$schema?: string
	version: string
	dependencies?: string[]
	nav?: TManifestNav
	/**
	 * Required for a UI manifest. Omitted only by an observability-only
	 * manifest (an ADR-040 Tier-0 adopter with no manifest-driven UI —
	 * then `observability` is required instead). See schema v2.13.0.
	 */
	menu?: TManifestMenuItem[]
	pages?: TManifestPage[]
	/** ADR-040 AppHost observability engine config. */
	observability?: TManifestObservability
	/** ADR-040 deep links. */
	deepLinks?: TManifestDeepLink[]
	/** External-provider credentials via the OpenRegister broker. */
	credentials?: TManifestCredential[]
	/** Declarative scheduled tasks (apphost-scheduling) reconciled into Integriq jobs. */
	schedules?: TManifestSchedule[]
	/**
	 * Admin-only settings sections rendered by CnAppRoot's generic admin
	 * NcAppSettingsDialog, gated on app-owner-group membership. See the
	 * `adminSettingsEntry` $def in the v2 schema for the full shape (a
	 * built-in `type` — currently only `"organisation-credentials"` — or a
	 * custom `component` resolved from the renderer registry).
	 */
	adminSettings?: Record<string, unknown>[]
	/**
	 * ADR-041: offer the Buildiq in-app edit button on this app's pages.
	 * Default true; set false to suppress (e.g. Buildiq's own UI).
	 *
	 * The property name keeps its `openbuildEditable` spelling: it is a
	 * manifest data key that shipped manifests already carry, so the
	 * 2026-08-21 OpenBuild → Buildiq rename deliberately left it untouched.
	 */
	openbuildEditable?: boolean
	/**
	 * First-time setup wizard descriptor (ADR-042). See the `setup` $def in
	 * the v2 schema for the full shape.
	 */
	setup?: Record<string, unknown>
	/**
	 * Product walkthrough descriptor (ADR-043). See the `walkthrough` $def in
	 * the v2 schema for the full shape.
	 */
	walkthrough?: Record<string, unknown>
	/**
	 * First-open support and donation note. `CnAppRoot` reads
	 * `support.enabled` to decide whether to mount `CnSupportDialog`;
	 * `CnEditSupportModal` writes the block. Omit it to keep the default-on
	 * behaviour with the shell's own copy. See the `support` property in the
	 * v2 schema for the full shape.
	 */
	support?: Record<string, unknown>
	/**
	 * Server-injected runtime context (e.g. `runtime.user`), added by
	 * OpenRegister's ManifestController — never hand-authored.
	 */
	runtime?: Record<string, unknown>
	/**
	 * Entity-scaffold page templates (manifest-entity-scaffold-templating).
	 * A template declares one reusable index/detail page shape with
	 * `{{param}}` placeholders; `utils/expandPageTemplates` materialises
	 * `pageInstances[]` into concrete `pages[]`. See the `pageTemplate` $def
	 * in the v2 schema for the full shape.
	 */
	pageTemplates?: Record<string, unknown>[]
	/**
	 * Per-entity template instantiations — each references a
	 * `pageTemplates[]` entry by `templateRef` and supplies the varying
	 * values. See the v2 schema `pageInstance` $def.
	 */
	pageInstances?: Record<string, unknown>[]
	/**
	 * Named, reusable field/column/sidebar sets referenced from templates
	 * via `{{set:NAME}}` placeholders. Each value is arbitrary JSON.
	 */
	sets?: Record<string, unknown>
	/**
	 * MCP tool visibility/UX hints (ADR-063). Advisory only; see
	 * `TManifestMcp`. Nothing in nextcloud-vue reads this field.
	 */
	mcp?: TManifestMcp
}
