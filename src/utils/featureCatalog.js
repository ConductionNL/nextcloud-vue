/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * featureCatalog: the feature list of the Features and roadmap page, read the
 * way the board look draws it. A feature carries a status (available, beta,
 * in progress or planned), an optional category and optional per-language
 * titles (`title_nl`, `summary_nl`) next to the English ones.
 *
 * @module utils/featureCatalog
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md
 */

/** The statuses, in the order the filter and the captions list them. */
export const FEATURE_STATUSES = Object.freeze(['available', 'beta', 'in_progress', 'planned'])

/** The badge variant of each status. */
export const FEATURE_STATUS_VARIANTS = Object.freeze({
	available: 'success',
	beta: 'warning',
	in_progress: 'primary',
	planned: 'purple',
})

const STATUS_ALIASES = Object.freeze({
	available: 'available',
	stable: 'available',
	done: 'available',
	released: 'available',
	shipped: 'available',
	beta: 'beta',
	preview: 'beta',
	in_progress: 'in_progress',
	'in-progress': 'in_progress',
	inprogress: 'in_progress',
	building: 'in_progress',
	development: 'in_progress',
	planned: 'planned',
	roadmap: 'planned',
	proposed: 'planned',
})

/**
 * The status key of a feature. A feature without a status is one the app
 * ships, as every entry of the list was before statuses existed.
 *
 * @param {unknown} raw The feature's `status`.
 * @return {string} One of FEATURE_STATUSES.
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md#requirement-a-feature-has-one-of-four-statuses
 */
export function featureStatus(raw) {
	if (typeof raw !== 'string' || raw.trim() === '') {
		return 'available'
	}
	return STATUS_ALIASES[raw.trim().toLowerCase()] || 'available'
}

/**
 * A text field of a feature in the reader's language: `title_nl` for a Dutch
 * reader when the feature has one, else `title`.
 *
 * @param {object} feature The feature.
 * @param {string} field `title` or `summary`.
 * @param {string} [language] The reader's language tag (`nl`, `nl_NL`, `de-DE`).
 * @return {string} The text, or ''.
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md#requirement-a-feature-reads-in-the-readers-language
 */
export function featureText(feature, field, language = '') {
	if (!feature || typeof feature !== 'object') {
		return ''
	}
	const base = String(language || '').split(/[-_]/)[0].toLowerCase()
	const own = base ? feature[`${field}_${base}`] : undefined
	if (typeof own === 'string' && own.trim() !== '') {
		return own
	}
	return typeof feature[field] === 'string' ? feature[field] : ''
}

/**
 * How many features carry each status.
 *
 * @param {Array<{status: string}>} features Features with a normalised status.
 * @return {{all: number, available: number, beta: number, in_progress: number, planned: number}} The counts.
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md#requirement-the-status-filter-shows-a-count-per-status
 */
export function countByStatus(features) {
	const counts = { all: features.length, available: 0, beta: 0, in_progress: 0, planned: 0 }
	for (const feature of features) {
		counts[feature.status] += 1
	}
	return counts
}

/**
 * The features in the reader's language, grouped by category. Groups follow
 * the order of `categories`; features without a known category come first,
 * under no caption. Inside a group the features keep their given order.
 *
 * @param {Array<object>} features The raw features.
 * @param {object} [categories] Category key to caption.
 * @param {string} [language] The reader's language tag.
 * @return {Array<{key: string, label: string, features: Array<object>}>} The groups; a group without features is left out.
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md#requirement-features-are-grouped-by-category
 */
export function groupFeatures(features, categories = {}, language = '') {
	const captions = categories && typeof categories === 'object' && !Array.isArray(categories) ? categories : {}
	const groups = [{ key: '', label: '', features: [] }]
	const byKey = { '': groups[0] }
	for (const [key, label] of Object.entries(captions)) {
		const group = { key, label: String(label), features: [] }
		groups.push(group)
		byKey[key] = group
	}
	for (const raw of Array.isArray(features) ? features : []) {
		if (!raw || typeof raw !== 'object') {
			continue
		}
		const feature = {
			slug: String(raw.slug || raw.id || ''),
			title: featureText(raw, 'title', language) || String(raw.slug || ''),
			summary: featureText(raw, 'summary', language),
			status: featureStatus(raw.status),
			expected: typeof raw.expected === 'string' ? raw.expected : '',
			docsUrl: typeof raw.docsUrl === 'string' ? raw.docsUrl : '',
		}
		const group = byKey[typeof raw.category === 'string' ? raw.category : ''] || byKey['']
		group.features.push(feature)
	}
	return groups.filter((group) => group.features.length > 0)
}
