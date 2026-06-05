/**
 * TypeScript type definitions for the Conduction app manifest.
 *
 * The shape mirrors `src/schemas/app-manifest.schema.json` (JSON Schema
 * draft 2020-12). Apps consume these types when authoring their
 * `src/manifest.json` and when interacting with `useAppManifest`.
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
export type TPageType = 'index' | 'detail' | 'dashboard' | 'custom' | (string & {})

/** Where a menu entry renders inside CnAppNav. */
export type TManifestMenuSection = 'main' | 'footer' | 'settings'

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
	 * External URL. When set, the item opens this URL in a new tab and
	 * `route` is ignored.
	 */
	href?: string
}

/** A top-level menu entry. May contain one level of nested children. */
export interface TManifestMenuItem extends TManifestMenuItemLeaf {
	children?: TManifestMenuItemLeaf[]
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
}

export interface TManifest {
	$schema?: string
	version: string
	dependencies?: string[]
	nav?: TManifestNav
	menu: TManifestMenuItem[]
	pages: TManifestPage[]
}
