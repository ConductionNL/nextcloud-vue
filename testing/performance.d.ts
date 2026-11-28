/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Types for `@conduction/nextcloud-vue/testing/performance`.
 */

/** One main page in `tests/performance/budget.json`. */
export interface PerfBudgetPage {
	name: string
	path: string
	ready?: string
	/** The page's own floor page, measured in the same run (e.g. a core settings page for an admin settings page). */
	floor?: string
}

/** A temporary exception: one page or one request, with a reason and an expiry. */
export interface PerfBudgetException {
	page?: string
	request?: string
	budgetMs: number
	reason: string
	expires: string
}

/** The contents of `tests/performance/budget.json`. */
export interface PerfBudget {
	app: string
	pages: PerfBudgetPage[]
	exceptions?: PerfBudgetException[]
	file?: string
}

export interface PerfLimit {
	/** The page's total limit: floor + allowance, or the flat run budget without a floor. */
	limitMs: number
	runBudgetMs: number
	floorMs: number | null
	/** What the page may add to the floor in this run; null without a floor. */
	allowanceMs: number | null
	firstContentLimitMs: number
	exception: PerfBudgetException | null
	expired: PerfBudgetException | null
}

export interface PerfRequest {
	method: string
	url: string
	ms: number
}

export interface PerfPageResult {
	name: string
	path: string
	loads: number[]
	/** Median total full load. */
	medianMs: number | null
	/** First useful content (main-region LCP) per warm load. */
	firstContent: number[]
	firstContentMs: number | null
	failure: string | null
	slowest: PerfRequest[]
}

export interface PerfFloor {
	path: string
	medianMs: number | null
	loads: number[]
	firstContentMs: number | null
	source: 'measured' | 'PERF_FLOOR_MS'
	failure: string | null
}

export interface PerfLoad {
	usableMs: number | null
	firstContentMs: number | null
	firstContentSource?: 'main' | 'page'
	lcpMs: number | null
	fcpMs: number | null
	requests: PerfRequest[]
	pending: string[]
}

export interface PerfOptions {
	file?: string
	env?: Record<string, string | undefined>
	cwd?: string
}

export const PAGE_TARGET_MS: number
export const FLOOR_ALLOWANCE_MS: number
export const FIRST_CONTENT_TARGET_MS: number
export const FLOOR_PATH: string
export const API_TARGET_MS: number
export const BUDGET_FILE: string
export const DEFAULT_READY: string
export const BUSY_SELECTOR: string
export const IGNORED_REQUESTS: RegExp[]

export function findBudgetFile(options?: PerfOptions): string
export function validateBudget(budget: unknown): string[]
export function loadBudget(options?: PerfOptions): PerfBudget
export function pageLimit(budget: PerfBudget, pageName: string, options?: { env?: Record<string, string | undefined>, now?: Date, floorMs?: number | null }): PerfLimit
export function median(values: number[]): number
export function isTracked(request: { url(): string, resourceType(): string }): boolean
export function measureLoad(page: unknown, url: string, options?: { ready?: string, timeoutMs?: number, quietMs?: number, clock?: () => number }): Promise<PerfLoad>
export function measurePage(page: unknown, target: PerfBudgetPage, options?: { runs?: number, timeoutMs?: number, quietMs?: number, clock?: () => number }): Promise<PerfPageResult>
export function measureFloor(page: unknown, options?: { env?: Record<string, string | undefined>, runs?: number, timeoutMs?: number, clock?: () => number, cacheDir?: string, floorPath?: string }): Promise<PerfFloor>
export function withinLimits(result: PerfPageResult, limit: Partial<PerfLimit> & Pick<PerfLimit, 'limitMs'>): boolean
export function formatSummary(result: PerfPageResult, limit: Partial<PerfLimit> & Pick<PerfLimit, 'limitMs'>): string
export function formatFailure(result: PerfPageResult, limit: Partial<PerfLimit> & Pick<PerfLimit, 'limitMs' | 'expired'>): string

/**
 * Declare one test per page in the app's budget file. Pass Playwright's `test`.
 */
export function definePerformanceSpec(test: any, options?: PerfOptions): PerfBudget
