/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * commandPaletteRanking — the pure scoring/sorting core of `CnCommandPalette`.
 *
 * Deliberately dependency-free and side-effect-free: given a candidate list
 * and a query string, it returns a ranked, sectioned result set. No DOM, no
 * Vue, no network — every rule here is unit-testable in isolation and reused
 * identically for the three source kinds the palette aggregates (navigation,
 * actions, objects).
 *
 * Ranking tiers (highest wins; a candidate is included once it clears ANY
 * tier against ANY of its searchable fields — title first, then keywords):
 *
 *  1. EXACT      — the field equals the query, or the query is a prefix of
 *                  the whole field ("open" matches "Open dashboard").
 *  2. WORD_PREFIX — the query is a prefix of one of the field's individual
 *                  words ("dash" matches "Open Dashboard" via the second
 *                  word, not just position 0).
 *  3. FUZZY      — every character of the query appears, in order, inside
 *                  the field (a subsequence match — "cmdp" matches "Command
 *                  Palette"). Denser / earlier matches score higher within
 *                  the tier so "cp" ranking two fuzzy candidates never ties
 *                  arbitrarily.
 *
 * A candidate that matches NONE of its fields at any tier is dropped. An
 * empty query short-circuits to "everything included, original order,
 * optional recency boost only" — this is what powers the palette's
 * before-you-type default list (e.g. "recently used" / static command list).
 *
 * @module utils/commandPaletteRanking
 */

/**
 * Match tiers, ordered low → high. Exported so callers (and tests) can
 * compare/assert on tier without hard-coding the magic numbers.
 *
 * @type {Readonly<{NONE: number, FUZZY: number, WORD_PREFIX: number, EXACT: number}>}
 */
export const MATCH_TIER = Object.freeze({
	NONE: 0,
	FUZZY: 1,
	WORD_PREFIX: 2,
	EXACT: 3,
})

/**
 * Per-tier base score. Gaps between tiers are large (300+) so a small
 * per-candidate adjustment (title vs. keyword match, recency boost) can
 * never let a lower tier outrank a higher one.
 *
 * @type {Readonly<{FUZZY: number, WORD_PREFIX: number, EXACT: number}>}
 */
const TIER_BASE_SCORE = Object.freeze({
	[MATCH_TIER.EXACT]: 900,
	[MATCH_TIER.WORD_PREFIX]: 600,
	[MATCH_TIER.FUZZY]: 300,
})

/**
 * Multiplier applied when a match comes from `keywords` rather than the
 * primary `title` field, so a title match always outranks a keyword match
 * at the same tier (ties break in the more-visible field's favour).
 *
 * @type {number}
 */
const KEYWORD_FIELD_PENALTY = 0.85

/**
 * Maximum score contribution the optional recency/frequency boost may add.
 * Kept well below the smallest inter-tier gap (300) so recency can only
 * break ties WITHIN a tier, never promote a fuzzy match over an exact one.
 *
 * @type {number}
 */
const MAX_RECENCY_BOOST = 20

/**
 * Lower-case + trim a value for comparison. Non-string input coerces to ''.
 *
 * @param {*} value The raw value.
 * @return {string} The normalised string.
 */
function normalise(value) {
	return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

/**
 * Split a field into lower-cased "words" on any run of non-alphanumeric
 * characters, so "Open Dashboard", "open-dashboard", and "open_dashboard"
 * all yield `['open', 'dashboard']` for word-prefix matching.
 *
 * @param {string} value The raw field value.
 * @return {string[]} The lower-cased word list (never contains empty strings).
 */
function splitWords(value) {
	return normalise(value).split(/[^a-z0-9]+/).filter(Boolean)
}

/**
 * Score a single field against a (pre-normalised, non-empty) query as a
 * fuzzy subsequence match: every character of `query` must appear, in
 * order, somewhere in `field`. Returns `null` when it isn't a subsequence.
 *
 * The returned `0..1` compactness score rewards two independent things:
 *  - a short match SPAN (the matched characters are close together, not
 *    scattered across the whole field)
 *  - an EARLY match start (a match at position 0 beats the same span
 *    starting at position 20)
 *
 * @param {string} field The normalised haystack.
 * @param {string} query The normalised, non-empty needle.
 * @return {?number} Compactness score in `[0, 1]`, or `null` when no subsequence match exists.
 */
function fuzzySubsequenceScore(field, query) {
	let searchFrom = 0
	let firstIndex = -1
	let lastIndex = -1
	let longestRun = 0
	let currentRun = 0

	for (let qi = 0; qi < query.length; qi++) {
		const char = query[qi]
		const foundAt = field.indexOf(char, searchFrom)
		if (foundAt === -1) {
			return null
		}
		if (firstIndex === -1) {
			firstIndex = foundAt
		}
		currentRun = (lastIndex !== -1 && foundAt === lastIndex + 1) ? currentRun + 1 : 1
		longestRun = Math.max(longestRun, currentRun)
		lastIndex = foundAt
		searchFrom = foundAt + 1
	}

	const span = lastIndex - firstIndex + 1
	const compactness = query.length / span // 1 when the match is fully contiguous
	const runRatio = longestRun / query.length // 1 when the whole query matched contiguously
	const startBonus = 1 / (firstIndex + 1) // earlier start → closer to 1

	return (compactness * 0.6) + (runRatio * 0.25) + (startBonus * 0.15)
}

/**
 * Score one field (title or a single keyword) against a query. Returns the
 * tier plus a fully-resolved numeric score, or `{ tier: MATCH_TIER.NONE }`
 * when the field doesn't match at all.
 *
 * @param {string} rawField The raw (un-normalised) field value.
 * @param {string} normalisedQuery The already-normalised, non-empty query.
 * @return {{tier: number, score: number}} The match result.
 */
function scoreField(rawField, normalisedQuery) {
	const field = normalise(rawField)
	if (field === '') {
		return { tier: MATCH_TIER.NONE, score: 0 }
	}

	if (field === normalisedQuery || field.startsWith(normalisedQuery)) {
		// Shorter fields with the same prefix are slightly more relevant
		// ("Open" ranks above "Open dashboard settings" for query "open").
		return { tier: MATCH_TIER.EXACT, score: TIER_BASE_SCORE[MATCH_TIER.EXACT] + Math.max(0, 50 - field.length) }
	}

	const words = splitWords(rawField)
	const wordHit = words.find((w) => w.startsWith(normalisedQuery))
	if (wordHit !== undefined) {
		return { tier: MATCH_TIER.WORD_PREFIX, score: TIER_BASE_SCORE[MATCH_TIER.WORD_PREFIX] + Math.max(0, 20 - wordHit.length) }
	}

	const fuzzy = fuzzySubsequenceScore(field, normalisedQuery)
	if (fuzzy !== null) {
		return { tier: MATCH_TIER.FUZZY, score: TIER_BASE_SCORE[MATCH_TIER.FUZZY] + (fuzzy * 100) }
	}

	return { tier: MATCH_TIER.NONE, score: 0 }
}

/**
 * Resolve the best (tier, score) a candidate achieves across its title and
 * keyword fields. Keyword matches are penalised by `KEYWORD_FIELD_PENALTY`
 * so a title match always wins a same-tier tie against a keyword match.
 *
 * @param {{title?: string, keywords?: string[]}} item The candidate's searchable fields.
 * @param {string} normalisedQuery The already-normalised, non-empty query.
 * @return {{tier: number, score: number}} The best match result across all fields.
 */
function scoreCandidate(item, normalisedQuery) {
	let best = scoreField(item.title, normalisedQuery)

	const keywords = Array.isArray(item.keywords) ? item.keywords : []
	for (const keyword of keywords) {
		const result = scoreField(keyword, normalisedQuery)
		if (result.tier === MATCH_TIER.NONE) continue
		const adjusted = { tier: result.tier, score: result.score * KEYWORD_FIELD_PENALTY }
		if (adjusted.tier > best.tier || (adjusted.tier === best.tier && adjusted.score > best.score)) {
			best = adjusted
		}
	}

	return best
}

/**
 * Resolve a bounded recency/frequency boost (`[0, MAX_RECENCY_BOOST]`) for
 * an item id from an optional usage-count map. Pure — callers own how the
 * map is built/persisted (see `commandPaletteRecency.js`).
 *
 * @param {?Record<string, number>} usageCounts Map of item id → use count.
 * @param {string} id The candidate's id.
 * @return {number} The boost, `0` when `usageCounts` is omitted or the id is unseen.
 */
function recencyBoostFor(usageCounts, id) {
	if (!usageCounts || typeof usageCounts !== 'object') return 0
	const count = usageCounts[id]
	if (typeof count !== 'number' || count <= 0) return 0
	// Diminishing returns — the first few uses matter most, capped well
	// under one tier-gap so it can only re-order WITHIN a tier.
	return Math.min(MAX_RECENCY_BOOST, Math.log2(count + 1) * 6)
}

/**
 * Rank a flat list of candidates against a query.
 *
 * @param {Array<object>} items Candidates. Each MUST carry a stable `id` and
 *   a `title`; MAY carry `keywords: string[]` and `section: string`.
 * @param {string} query The raw (un-normalised) query text.
 * @param {object} [options] Ranking options.
 * @param {?Record<string, number>} [options.usageCounts] Optional id → use-count map for the recency/frequency boost.
 * @param {boolean} [options.includeNonMatching] When `true`, items that match NONE of the tiers are still included (appended after every real match, ordered by recency boost then original order) instead of dropped. For sources that were already filtered server-side (e.g. an OpenRegister `_search` result matching on a body field the client-side scorer never sees) — dropping those here would silently vanish a legitimate server match. Defaults to `false` (strict local filtering, the right default for locally-known lists like navigation/commands).
 * @return {Array<{item: object, tier: number, score: number}>} Ranked entries, highest score first. Stable tie-break: alphabetical by `title`, then original array order.
 */
export function rankCommandPaletteItems(items, query, options = {}) {
	const list = Array.isArray(items) ? items : []
	const normalisedQuery = normalise(query)
	const usageCounts = options.usageCounts || null

	if (normalisedQuery === '') {
		// No query yet — surface everything, ordered by recency boost (if
		// any) then original registration order. Every entry is tagged
		// MATCH_TIER.NONE / score 0 + boost so callers can distinguish
		// "idle list" from "search result" if they need to.
		return list
			.map((item, index) => ({ item, tier: MATCH_TIER.NONE, score: recencyBoostFor(usageCounts, item.id), index }))
			.sort((a, b) => b.score - a.score || a.index - b.index)
			.map(({ item, tier, score }) => ({ item, tier, score }))
	}

	const ranked = []
	const unmatched = []
	list.forEach((item, index) => {
		const { tier, score } = scoreCandidate(item, normalisedQuery)
		if (tier === MATCH_TIER.NONE) {
			if (options.includeNonMatching) {
				unmatched.push({ item, tier: MATCH_TIER.NONE, score: recencyBoostFor(usageCounts, item.id), index })
			}
			return
		}
		const boosted = score + recencyBoostFor(usageCounts, item.id)
		ranked.push({ item, tier, score: boosted, index })
	})

	const byScoreThenTitleThenIndex = (a, b) => {
		if (b.score !== a.score) return b.score - a.score
		const titleA = normalise(a.item.title)
		const titleB = normalise(b.item.title)
		if (titleA !== titleB) return titleA < titleB ? -1 : 1
		return a.index - b.index
	}

	ranked.sort(byScoreThenTitleThenIndex)
	unmatched.sort(byScoreThenTitleThenIndex)

	return [...ranked, ...unmatched].map(({ item, tier, score }) => ({ item, tier, score }))
}

/**
 * Group already-ranked entries (the output of `rankCommandPaletteItems`)
 * into sections, preserving each entry's rank order within its section and
 * ordering sections by their best (first, since input is pre-sorted)
 * entry's score, descending. Entries without a `section` fall into a
 * `null`-keyed group, rendered by the caller under a default label.
 *
 * @param {Array<{item: object, tier: number, score: number}>} rankedEntries Output of `rankCommandPaletteItems`.
 * @return {Array<{section: ?string, entries: Array<{item: object, tier: number, score: number}>}>} Sections in display order.
 */
export function groupRankedResultsBySection(rankedEntries) {
	const list = Array.isArray(rankedEntries) ? rankedEntries : []
	const order = []
	const bySection = new Map()

	for (const entry of list) {
		const key = entry.item && typeof entry.item.section === 'string' && entry.item.section !== ''
			? entry.item.section
			: null
		if (!bySection.has(key)) {
			bySection.set(key, [])
			order.push(key)
		}
		bySection.get(key).push(entry)
	}

	// `order` already reflects best-first (input is pre-sorted and each
	// section's first push is its highest-ranked entry), so no re-sort
	// is needed beyond the natural insertion order.
	return order.map((section) => ({ section, entries: bySection.get(section) }))
}
