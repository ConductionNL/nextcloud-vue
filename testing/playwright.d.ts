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

/** localStorage key prefix `useSupportDialog` writes its "seen" flag under. */
export const SUPPORT_DIALOG_STORAGE_PREFIX: string

/** localStorage key prefix `useWalkthrough` mirrors the last-seen version under. */
export const WALKTHROUGH_STORAGE_PREFIX: string

export function seedSupportDialogSeen(page: CnTestPage, appId?: string | string[]): Promise<void>
export function seedWalkthroughSeen(page: CnTestPage, appId?: string | string[], version?: string): Promise<void>
export function seedFirstVisitOverlaysSeen(page: CnTestPage, appId?: string | string[]): Promise<void>

export function dismissWalkthrough(page: CnTestPage, options?: CnDismissOptions): Promise<boolean>
export function dismissSupportDialog(page: CnTestPage, options?: CnDismissOptions): Promise<number>
export function dismissFirstVisitOverlays(page: CnTestPage, options?: CnDismissOptions): Promise<void>

export function mountedAppIds(page: CnTestPage): Promise<string[]>
export function mountedComponents(page: CnTestPage): Promise<CnMountedComponent[]>
export function mountedComponentNames(page: CnTestPage): Promise<string[]>
export function findMounted(page: CnTestPage, componentName: string): Promise<CnMountedComponent[]>
export function readComponentProp(page: CnTestPage, componentName: string, propName: string): Promise<unknown>
