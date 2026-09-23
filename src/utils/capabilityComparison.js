/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Presentation logic for the capability comparison rendered by
 * `CnCapabilityTable`. Pure functions over the comparison document the host
 * app supplies, kept out of the SFC so the search predicate, the grouping
 * switch and the provider fallback are unit-testable without a DOM.
 *
 * THE ONE RULE THIS MODULE ENFORCES. A row never disappears. Not for an
 * unknown provider key, not for an area the document forgot to declare, not
 * for a feature nobody has mapped yet, and not for a rating outside the three
 * the audit emits. Every one of those lands in a named bucket with the raw
 * value visible, because a silently dropped row reads exactly like a row that
 * was never written.
 *
 * Tallies are DERIVED here rather than read from the document. A stored total
 * is a second copy of the truth that goes stale the moment a row is corrected,
 * and nothing would fail: the page would show a number that no longer counts
 * its own rows.
 *
 * @module utils/capabilityComparison
 */

/**
 * Ratings in the order they are counted and rendered.
 *
 * @type {ReadonlyArray<string>}
 */
export const RATINGS = Object.freeze(['yes', 'partial', 'no'])

/**
 * The columns the totals table and the legend show: the ratings plus
 * `unknown`. `unknown` is a real answer, not a data error. A later audit round
 * can add a capability row without re-reading the products an earlier round
 * rated, and the honest cell for those columns is empty.
 *
 * @type {ReadonlyArray<string>}
 */
export const RATING_COLUMNS = Object.freeze([...RATINGS, 'unknown'])

/**
 * The provider kinds the document may declare. Anything else is carried
 * through as `unknown`, which renders as a plain chip rather than a styled
 * one.
 *
 * @type {ReadonlyArray<string>}
 */
export const PROVIDER_KINDS = Object.freeze(['self', 'app', 'platform'])

/**
 * Group key for rows that carry no `feature`. It is a bucket, never a filter:
 * the rows render under a heading that says they are not mapped yet.
 *
 * @type {string}
 */
export const UNMAPPED_GROUP_KEY = '__cn-unmapped__'

/**
 * Lower-case and strip diacritics so a reader typing `zaken` finds `Zaken` and
 * a reader typing `een` finds `Eén`.
 *
 * `normalize('NFD')` splits a letter from its accent and the range strips the
 * combining marks. Both have been in every browser and in Node since long
 * before this library's floor, so the accent-insensitive half costs one regex.
 *
 * @param {unknown} value Any value; non-strings are coerced.
 * @return {string} The comparable form.
 */
export function normaliseText(value) {
	if (value === null || value === undefined) {
		return ''
	}
	return String(value)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
}

/**
 * Pick the reader's language variant of a labelled entry.
 *
 * The document carries `name` (English) and `name_nl` (Dutch) side by side.
 * Dutch wins only for a Dutch locale AND only when the Dutch string is
 * actually there, so a half-translated document degrades to English rather
 * than to a blank cell.
 *
 * @param {{name?: string, name_nl?: string}} entry Labelled entry.
 * @param {string} [locale] BCP 47 locale, e.g. `nl`, `nl_NL`, `en-GB`.
 * @return {string} The label to render.
 */
export function labelFor(entry, locale = 'en') {
	if (!entry) {
		return ''
	}
	const dutch = String(locale || '').toLowerCase().startsWith('nl')
	if (dutch && typeof entry.name_nl === 'string' && entry.name_nl.trim() !== '') {
		return entry.name_nl
	}
	return entry.name ?? ''
}

/**
 * Index the document's `providers` list by key.
 *
 * @param {object} comparison Parsed comparison document.
 * @return {Map<string, object>} Provider entries by key.
 */
function providerIndex(comparison) {
	const map = new Map()
	for (const provider of comparison?.providers ?? []) {
		if (provider && typeof provider.key === 'string') {
			map.set(provider.key, provider)
		}
	}
	return map
}

/**
 * Resolve the provider of one capability row.
 *
 * An unrecognised key is NOT an error and never costs the row its place: the
 * raw key becomes the label and the kind becomes `unknown`, so a reader sees
 * that the document names a provider the dictionary forgot rather than seeing
 * nothing at all.
 *
 * @param {object} row One capability row.
 * @param {object} comparison Parsed comparison document.
 * @param {string} [locale] BCP 47 locale used to pick the provider name.
 * @return {{key: string, name: string, kind: string, declared: boolean}|null}
 *   The provider, or null when the row names none.
 */
export function resolveProvider(row, comparison, locale = 'en') {
	const key = row?.provider
	if (typeof key !== 'string' || key.trim() === '') {
		return null
	}
	const declared = providerIndex(comparison).get(key)
	if (!declared) {
		return { key, name: key, kind: 'unknown', declared: false }
	}
	const kind = PROVIDER_KINDS.includes(declared.kind) ? declared.kind : 'unknown'
	return {
		key,
		name: labelFor(declared, locale) || key,
		kind,
		declared: true,
	}
}

/**
 * Every string a search should match on for one row, joined.
 *
 * Both languages are indexed whatever the reader's locale, because a Dutch
 * reader searching for the English term they read in a tender document should
 * still find the row.
 *
 * @param {object} row One capability row.
 * @param {object} comparison Parsed comparison document.
 * @return {string} The haystack, already normalised.
 */
export function capabilitySearchIndex(row, comparison) {
	const areas = comparison?.areas ?? []
	const features = comparison?.features ?? []
	const area = areas.find((entry) => entry?.key === row?.area)
	const feature = features.find((entry) => entry?.key === row?.feature)
	const provider = resolveProvider(row, comparison)
	// The declared entry and not `provider.name`: that one is already resolved
	// to a single language, so indexing it would honour the rule above for the
	// row, the area and the feature and quietly break it for the provider.
	const declared = providerIndex(comparison).get(provider?.key)
	const parts = [
		row?.id,
		row?.name,
		row?.name_nl,
		row?.area,
		area?.name,
		area?.name_nl,
		row?.feature,
		feature?.name,
		feature?.name_nl,
		provider?.key,
		provider?.name,
		declared?.name,
		declared?.name_nl,
	]
	return parts.filter((part) => part !== null && part !== undefined && part !== '')
		.map((part) => normaliseText(part))
		.join(' ')
}

/**
 * Does one row match the reader's query?
 *
 * Every whitespace-separated term must appear somewhere in the row's index, so
 * `intake dossiq` narrows rather than widens. An empty query matches
 * everything, which is what keeps the unsearched page identical to the
 * searched-for-nothing page.
 *
 * @param {object} row One capability row.
 * @param {string} query The reader's raw input.
 * @param {object} comparison Parsed comparison document.
 * @return {boolean} True when the row should stay on the page.
 */
export function matchesQuery(row, query, comparison) {
	const terms = normaliseText(query).split(/\s+/).filter(Boolean)
	if (terms.length === 0) {
		return true
	}
	const haystack = capabilitySearchIndex(row, comparison)
	return terms.every((term) => haystack.includes(term))
}

/**
 * The rows that survive the reader's query, in document order.
 *
 * @param {object} comparison Parsed comparison document.
 * @param {string} [query] The reader's raw input.
 * @return {Array<object>} Matching rows.
 */
export function filterCapabilities(comparison, query = '') {
	return (comparison?.capabilities ?? []).filter((row) => matchesQuery(row, query, comparison))
}

/**
 * Count one system's ratings across a set of capability rows.
 *
 * A rating outside `RATINGS` is counted under `unknown` rather than dropped,
 * so a bad row shows up as a number that does not add up instead of
 * disappearing.
 *
 * @param {Array<object>} capabilities Capability rows.
 * @param {string} systemKey Key of the system column, e.g. `dossiq`.
 * @return {{yes: number, partial: number, no: number, unknown: number, total: number}} The tally.
 */
export function tally(capabilities, systemKey) {
	const counts = { yes: 0, partial: 0, no: 0, unknown: 0, total: 0 }
	for (const row of capabilities ?? []) {
		const rating = row?.[systemKey]
		counts[RATINGS.includes(rating) ? rating : 'unknown'] += 1
		counts.total += 1
	}
	return counts
}

/**
 * Tally every system over a set of rows.
 *
 * @param {object} comparison Parsed comparison document.
 * @param {Array<object>} [rows] Rows to count; defaults to all of them.
 * @return {Record<string, object>} Tally per system key.
 */
export function overallTallies(comparison, rows = null) {
	const counted = rows ?? comparison?.capabilities ?? []
	const out = {}
	for (const system of comparison?.systems ?? []) {
		out[system.key] = tally(counted, system.key)
	}
	return out
}

/**
 * Which grouping a document should open on.
 *
 * Feature grouping is the default the moment ANY row carries a `feature`,
 * because a document that bothered to map features wants them shown. A
 * document without them groups by area, which is what every consumer does
 * today.
 *
 * @param {object} comparison Parsed comparison document.
 * @return {'feature'|'area'} The opening mode.
 */
export function defaultGroupMode(comparison) {
	const mapped = (comparison?.capabilities ?? []).some((row) => typeof row?.feature === 'string' && row.feature.trim() !== '')
	return mapped ? 'feature' : 'area'
}

/**
 * Does any row in the document name a provider?
 *
 * Drives whether the provided-by column renders at all. A consumer whose
 * document predates the field gets exactly the columns it has today.
 *
 * @param {object} comparison Parsed comparison document.
 * @return {boolean} True when at least one row names a provider.
 */
export function hasProviders(comparison) {
	return (comparison?.capabilities ?? []).some((row) => typeof row?.provider === 'string' && row.provider.trim() !== '')
}

/**
 * Group the rows for rendering, in the order a reader should meet them.
 *
 * Declared groups come first, in the order the document declares them: for
 * areas that is the audit's own numbering, and re-sorting would put `13.1`
 * above `1.1` on a table whose first column is that number. Then come keys the
 * rows use that the document never declared, labelled with the raw key. Last
 * comes the bucket for rows that name no group at all.
 *
 * An empty group is dropped, because a search that matches nothing in an area
 * should not leave an empty heading behind. The unmapped bucket follows the
 * same rule.
 *
 * @param {object} comparison Parsed comparison document.
 * @param {object} [options] Options.
 * @param {'feature'|'area'} [options.mode] Grouping mode.
 * @param {string} [options.locale] BCP 47 locale used for labels.
 * @param {string} [options.query] The reader's search input.
 * @param {string} [options.unmappedLabel] Heading for rows that name no group.
 * @return {Array<{key: string, label: string, declared: boolean, capabilities: Array<object>, tallies: object}>}
 *   One entry per non-empty group.
 */
export function groupCapabilities(comparison, options = {}) {
	const mode = options.mode === 'feature' ? 'feature' : 'area'
	const locale = options.locale ?? 'en'
	const unmappedLabel = options.unmappedLabel ?? ''
	const declared = mode === 'feature' ? (comparison?.features ?? []) : (comparison?.areas ?? [])
	const rows = filterCapabilities(comparison, options.query ?? '')

	const buckets = new Map()
	/**
	 * Fetch or create a bucket, keeping insertion order.
	 *
	 * @param {string} key Bucket key.
	 * @param {string} label Bucket heading.
	 * @param {boolean} isDeclared Whether the document declares this key.
	 * @return {object} The bucket.
	 */
	const bucket = (key, label, isDeclared) => {
		if (!buckets.has(key)) {
			buckets.set(key, { key, label, declared: isDeclared, capabilities: [] })
		}
		return buckets.get(key)
	}

	// Seed the declared groups first so they keep the document's order even
	// when the rows arrive in another one.
	for (const entry of declared) {
		if (entry && typeof entry.key === 'string') {
			bucket(entry.key, labelFor(entry, locale) || entry.key, true)
		}
	}

	const unmapped = []
	for (const row of rows) {
		const key = row?.[mode]
		if (typeof key !== 'string' || key.trim() === '') {
			unmapped.push({ ...row, label: labelFor(row, locale) })
			continue
		}
		// An undeclared key gets a bucket of its own, labelled with the raw
		// key. Dropping the row here is the silent failure this module exists
		// to prevent.
		bucket(key, key, false).capabilities.push({ ...row, label: labelFor(row, locale) })
	}

	const groups = [...buckets.values()].filter((entry) => entry.capabilities.length > 0)
	if (unmapped.length > 0) {
		groups.push({
			key: UNMAPPED_GROUP_KEY,
			label: unmappedLabel,
			declared: false,
			capabilities: unmapped,
		})
	}

	for (const group of groups) {
		group.tallies = overallTallies(comparison, group.capabilities)
	}
	return groups
}
