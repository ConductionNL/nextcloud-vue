/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * URL builder for CnIndexPage's native Export menu — constructs the
 * OpenRegister export-leaf URL for a given register/schema pair, forwarding
 * the page's current route-query filters through so a filtered index
 * exports only the visible rows. OpenRegister performs the actual CSV/Excel
 * serialization, filtering, and RBAC enforcement server-side; this module
 * only builds the URL the browser navigates to.
 *
 * @module utils/indexExportHelpers
 */

import { buildQueryString, prefixUrl } from './headers.js'

/**
 * Build the `GET /apps/openregister/api/objects/{register}/{schema}/export`
 * URL for CnIndexPage's Export menu.
 *
 * `routeQuery` is spread into the query string after `format` so the
 * current page's filters (e.g. `$route.query`) pass straight through to
 * OpenRegister unchanged — array values become repeated `key[]=` params and
 * null/undefined/empty-string values are skipped, matching
 * {@link buildQueryString}'s existing semantics.
 *
 * @param {string} register The register slug.
 * @param {string} schema The schema slug.
 * @param {object} [routeQuery] The current route's query params (filters) to pass through.
 * @param {'csv'|'excel'} format The requested export format.
 * @return {string} The webroot-prefixed export URL, ready for `window.location.assign()`.
 */
export function buildExportUrl(register, schema, routeQuery, format) {
	const base = `/apps/openregister/api/objects/${register}/${schema}/export`
	const params = { format, ...(routeQuery || {}) }
	return prefixUrl(base) + buildQueryString(params)
}
