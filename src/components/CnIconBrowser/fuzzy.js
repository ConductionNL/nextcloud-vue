/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tiny, dependency-free fuzzy matcher for {@link CnIconBrowser}'s search box.
 * Scoped to icon names, so a compact subsequence scorer (fzf / quick-open
 * style) is enough — no Levenshtein library needed.
 *
 * Two properties matter for icon search:
 *   1. Separator-insensitive — the query is normalized to letters+digits only,
 *      and separators in the target are skipped, so `CalendarRange`,
 *      `calendar range` and `calendarrange` all match the same query.
 *   2. Order-preserving subsequence — `cal rng` matches `Calendar Range`, so a
 *      user who only half-remembers the name still finds it.
 *
 * Note: this is subsequence-based, not edit-distance-based — it tolerates
 * skipped/extra characters but not letter substitutions (`calender` won't find
 * `Calendar`). Swap in a Levenshtein lib here if that ever becomes important.
 */

/**
 * Normalize a search query to lowercase letters and digits only (drops spaces,
 * dashes, punctuation) so separator styles don't affect matching.
 *
 * @param {string} query the raw search input.
 * @return {string} the normalized query.
 */
export function normalizeQuery(query) {
	return (query || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Score a normalized query against a candidate label. Returns a positive score
 * when every query character appears in order (separators in the label are
 * skipped); higher is a better match. Returns -1 when it doesn't match.
 *
 * @param {string} normalizedQuery the query from {@link normalizeQuery}.
 * @param {string} label the candidate display label (raw, may contain spaces).
 * @return {number} the match score, or -1 for no match.
 */
export function fuzzyScore(normalizedQuery, label) {
	if (!normalizedQuery) {
		return 0
	}
	const target = (label || '').toLowerCase()
	const ql = normalizedQuery.length
	let qi = 0
	let score = 0
	let prevMatchIndex = -2

	for (let ti = 0; ti < target.length && qi < ql; ti++) {
		const c = target[ti]
		if (c === ' ' || c === '-' || c === '_') {
			continue
		}
		if (c === normalizedQuery[qi]) {
			let s = 1
			if (ti === 0) {
				s += 3 // start of the string
			} else if (target[ti - 1] === ' ' || target[ti - 1] === '-' || target[ti - 1] === '_') {
				s += 2 // start of a word
			}
			if (prevMatchIndex === ti - 1) {
				s += 2 // contiguous with the previous match
			}
			score += s
			prevMatchIndex = ti
			qi++
		}
	}

	return qi === ql ? score : -1
}

/**
 * Fuzzy-filter and rank a catalogue by a raw query. Matches against each
 * entry's `label` and `key`, keeps the best of the two, and sorts by score
 * (then shorter label, then alphabetically) so the tightest matches lead.
 *
 * @param {Array<{key: string, label: string}>} icons the catalogue to search.
 * @param {string} query the raw search input.
 * @return {Array<object>} matching entries, best first.
 */
export function fuzzyFilter(icons, query) {
	const q = normalizeQuery(query)
	if (!q) {
		return icons
	}
	const scored = []
	for (const icon of icons) {
		const score = Math.max(fuzzyScore(q, icon.label), fuzzyScore(q, icon.key))
		if (score >= 0) {
			scored.push({ icon, score })
		}
	}
	scored.sort((a, b) =>
		b.score - a.score
		|| a.icon.label.length - b.icon.label.length
		|| a.icon.label.localeCompare(b.icon.label),
	)
	return scored.map((s) => s.icon)
}
