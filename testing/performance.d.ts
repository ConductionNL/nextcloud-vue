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
	limitMs: number
	runBudgetMs: number
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
	medianMs: number | null
	failure: string | null
	slowest: PerfRequest[]
}

export interface PerfOptions {
	file?: string
	env?: Record<string, string | undefined>
	cwd?: string
}

export const PAGE_TARGET_MS: number
export const API_TARGET_MS: number
export const BUDGET_FILE: string
export const DEFAULT_READY: string
export const BUSY_SELECTOR: string
export const IGNORED_REQUESTS: RegExp[]

export function findBudgetFile(options?: PerfOptions): string
export function validateBudget(budget: unknown): string[]
export function loadBudget(options?: PerfOptions): PerfBudget
export function pageLimit(budget: PerfBudget, pageName: string, options?: { env?: Record<string, string | undefined>, now?: Date }): PerfLimit
export function median(values: number[]): number
export function isTracked(request: { url(): string, resourceType(): string }): boolean
export function measureLoad(page: unknown, url: string, options?: { ready?: string, timeoutMs?: number, quietMs?: number, clock?: () => number }): Promise<{ usableMs: number | null, requests: PerfRequest[], pending: string[] }>
export function measurePage(page: unknown, target: PerfBudgetPage, options?: { runs?: number, timeoutMs?: number, quietMs?: number, clock?: () => number }): Promise<PerfPageResult>
export function formatFailure(result: PerfPageResult, limit: Pick<PerfLimit, 'limitMs' | 'expired'>): string

/**
 * Declare one test per page in the app's budget file. Pass Playwright's `test`.
 */
export function definePerformanceSpec(test: any, options?: PerfOptions): PerfBudget
