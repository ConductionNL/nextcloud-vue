/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Types for `@conduction/nextcloud-vue/testing/playwright`.
 *
 * `page` is typed structurally rather than as `import('@playwright/test').Page`
 * on purpose: the runtime module has no dependency on `@playwright/test` (see
 * the module docblock in `playwright.js`), and importing the type here would
 * reintroduce exactly that coupling for TypeScript consumers — a spec repo
 * without Playwright installed would fail to type-check a module it can
 * legitimately use with `playwright-core`. The structural type covers every
 * method the helpers actually call, so a real `Page` satisfies it.
 */

/** Minimal structural stand-in for Playwright's `Locator`. */
export interface CnTestLocator {
	first(): CnTestLocator
	click(options?: Record<string, unknown>): Promise<void>
	waitFor(options?: Record<string, unknown>): Promise<void>
	isVisible(options?: Record<string, unknown>): Promise<boolean>
	getByRole(role: string, options?: Record<string, unknown>): CnTestLocator
}

/** Minimal structural stand-in for Playwright's `Page`. */
export interface CnTestPage {
	locator(selector: string): CnTestLocator
	evaluate<R = unknown>(pageFunction: string | ((...args: any[]) => R), arg?: any): Promise<R>
	addInitScript(script: ((...args: any[]) => void) | string, arg?: any): Promise<void>
	keyboard: { press(key: string): Promise<void> }
}

/**
 * Minimal structural stand-in for Playwright's `BrowserContext`.
 *
 * Accepted by the seeding helpers so a seed can cover every page the context
 * opens AND survive into `storageState()` — which the page-scoped match-all
 * form cannot do. See {@link seedFirstVisitOverlaysSeen}.
 */
export interface CnTestBrowserContext {
	addInitScript(script: ((...args: any[]) => void) | string, arg?: any): Promise<void>
	pages(): CnTestPage[]
	newPage(): Promise<CnTestPage>
}

/** Anything the seeding helpers can be pointed at. */
export type CnSeedTarget = CnTestPage | CnTestBrowserContext

/** Options for {@link appDialog}. */
export interface CnAppDialogOptions {
	/** Extra selectors treated as chrome, added to `CHROME_DIALOG_SELECTORS`. */
	exclude?: string[]
	/** Return the full match set instead of `.first()`. */
	all?: boolean
}

/** Outcome of {@link retireFirstRunWizard}. */
export interface CnWizardRetirement {
	/** HTTP status of the DELETE, or `-1` when the request itself threw. */
	status: number
	/**
	 * False when the firstrunwizard app is not installed (404); `null` when the
	 * status could not tell us — a 401 is answered by Nextcloud's auth layer
	 * before the wizard app is ever consulted, so both booleans would be
	 * inventions.
	 */
	installed: boolean | null
	/**
	 * True when no wizard will block clicks — a 2xx, a 404, or a guest surface
	 * where the per-user wizard could never have rendered at all.
	 */
	cleared: boolean
	/**
	 * True when the wizard could not exist on this surface, so nothing was
	 * dismissed and nothing needed to be. Assert `false` when a spec means to
	 * prove a REAL dismissal happened.
	 */
	notApplicable: boolean
	/** Why, when `notApplicable` — currently `'no-user-session'`. */
	reason: string | null
}

/** Outcome of {@link dismissFirstVisitOverlays}. */
export interface CnOverlayDismissal {
	/**
	 * True on a Nextcloud GUEST surface: nc-vue mounts `CnWalkthrough` and
	 * `CnSupportDialog` from `CnAppRoot`, and a logged-out page has no app root,
	 * so there is nothing to clear. The call short-circuits instead of spending
	 * two timeouts polling for elements that cannot appear.
	 */
	notApplicable: boolean
	/** Why, when `notApplicable` — currently `'guest-surface'`. */
	reason: string | null
	/** True when a walkthrough tour was actually closed. */
	walkthroughDismissed: boolean
	/** How many support dialogs were actually closed (nested roots raise more). */
	supportDialogsDismissed: number
}

/** What kind of Nextcloud surface a page is — see {@link guestSurfaceStatus}. */
export interface CnSurfaceStatus {
	/** A Nextcloud page, with no user session and no mounted `CnAppRoot`. */
	guest: boolean
	/** The logged-in user id, or `null`. */
	user: string | null
	/** Whether the page carries a Nextcloud request token at all. */
	isNextcloudPage: boolean
	/** `appId` of every mounted `CnAppRoot`, outer shell first. */
	appRoots: string[]
}

/** One mounted component instance, reduced to a JSON-safe shape. */
export interface CnMountedComponent {
	/** The component's `name` option, or the `<script setup>` `__name` fallback. */
	name: string
	/** Nesting depth within the walked component tree (0 = app root). */
	depth: number
	/** Props, per-property JSON-cloned; un-serialisable values are elided. */
	props: Record<string, unknown>
}

/** Options accepted by the dismissal helpers. */
export interface CnDismissOptions {
	/** Milliseconds to wait for the overlay (default 3000). */
	timeout?: number
	/** Maximum dialogs to close in one pass (default 3) — see nested CnAppRoot. */
	maxDialogs?: number
}

/**
 * localStorage key prefix `useSupportDialog` writes its "seen" flag under.
 * Exported so a spec can assert against a saved `storageState` directly.
 */
export const SUPPORT_DIALOG_STORAGE_PREFIX: string

/**
 * localStorage key prefix `useWalkthrough` mirrors the last-seen version under.
 * Exported so a spec can assert against a saved `storageState` directly.
 */
export const WALKTHROUGH_STORAGE_PREFIX: string

/** `[role="dialog"]` selectors that are NC / nc-vue chrome, not the app's modal. */
export const CHROME_DIALOG_SELECTORS: string[]

/** Nextcloud's own first-run wizard dismissal route. */
export const FIRST_RUN_WIZARD_ROUTE: string

/** `reason` when {@link retireFirstRunWizard} finds no user session. */
export const NO_USER_SESSION: string

/** `reason` when {@link dismissFirstVisitOverlays} finds a guest surface. */
export const GUEST_SURFACE: string

/**
 * Whether this page is a logged-in app surface or a Nextcloud GUEST surface.
 *
 * Call it AFTER the page has loaded. The seeding helpers cannot answer it for
 * you — they run before `goto()`, where there is no document to interrogate —
 * and on a guest surface they write keys that nothing ever reads.
 */
export function guestSurfaceStatus(page: CnTestPage): Promise<CnSurfaceStatus>

/**
 * Seed the support dialog as already seen.
 *
 * Passing a `CnTestBrowserContext` requires EXPLICIT app ids: `'*'` installs a
 * `getItem` shim, which cannot serialise into `storageState()`, and is rejected
 * rather than silently persisting nothing.
 *
 * @throws When `target` is a BrowserContext and `appId` is `'*'` or omitted.
 */
export function seedSupportDialogSeen(target: CnSeedTarget, appId?: string | string[]): Promise<void>

/** As {@link seedSupportDialogSeen}, for the `CnWalkthrough` tour. */
export function seedWalkthroughSeen(target: CnSeedTarget, appId?: string | string[], version?: string): Promise<void>

/** Both first-visit overlays at once. Prefer the BrowserContext form in a global-setup. */
export function seedFirstVisitOverlaysSeen(target: CnSeedTarget, appId?: string | string[]): Promise<void>

export function dismissWalkthrough(page: CnTestPage, options?: CnDismissOptions): Promise<boolean>
export function dismissSupportDialog(page: CnTestPage, options?: CnDismissOptions): Promise<number>
export function dismissFirstVisitOverlays(page: CnTestPage, options?: CnDismissOptions): Promise<CnOverlayDismissal>

/** A `Locator` for the app's own modal, excluding NC and nc-vue chrome dialogs. */
export function appDialog(page: CnTestPage, options?: CnAppDialogOptions): CnTestLocator

/** Retire Nextcloud's `#firstrunwizard` server-side. A 404 is reported, not thrown. */
export function retireFirstRunWizard(page: CnTestPage, options?: { route?: string }): Promise<CnWizardRetirement>

export function mountedAppIds(page: CnTestPage): Promise<string[]>
export function mountedComponents(page: CnTestPage): Promise<CnMountedComponent[]>
export function mountedComponentNames(page: CnTestPage): Promise<string[]>
export function findMounted(page: CnTestPage, componentName: string): Promise<CnMountedComponent[]>
export function readComponentProp(page: CnTestPage, componentName: string, propName: string): Promise<unknown>
