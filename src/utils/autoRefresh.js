/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `autoRefresh` setting of a dashboard page (CnDashboardPage).
 *
 * @module utils/autoRefresh
 */

/**
 * The `autoRefresh` prop with its defaults: every 5 minutes, outdated after
 * 10, with a button. `null`, `false` or anything else turns it off.
 *
 * @spec openspec/changes/dashboard-auto-refresh/specs/dashboard-page/spec.md#requirement-a-dashboard-reads-its-widgets-again-on-a-timer
 * @param {boolean|object|null} value The prop.
 * @return {{intervalSeconds: number, staleAfterSeconds: number, button: boolean}|null}
 */
export function normalizeAutoRefresh(value) {
	if (value !== true && (value === null || typeof value !== 'object' || Array.isArray(value))) {
		return null
	}
	const cfg = value === true ? {} : value
	const positive = (n, fallback) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : fallback)
	return {
		intervalSeconds: positive(cfg.intervalSeconds, 300),
		staleAfterSeconds: positive(cfg.staleAfterSeconds, 600),
		button: cfg.button !== false,
	}
}
