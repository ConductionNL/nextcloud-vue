/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import {
	MATCH_TIER,
	rankCommandPaletteItems,
	groupRankedResultsBySection,
} from '@/utils/commandPaletteRanking.js'

describe('commandPaletteRanking — rankCommandPaletteItems', () => {
	const items = [
		{ id: 'open-dashboard', title: 'Open Dashboard' },
		{ id: 'open', title: 'Open' },
		{ id: 'settings', title: 'Settings' },
		{ id: 'create-invoice', title: 'Create invoice', keywords: ['factuur', 'new'] },
	]

	it('ranks an exact-title match above a prefix match above a word-prefix match above a fuzzy match', () => {
		const candidates = [
			{ id: 'fuzzy', title: 'Fabulous Nice Dish' }, // "fnd" fuzzy-matches (F-N-D subsequence)
			{ id: 'word', title: 'My Fnd Widget' }, // word "fnd" prefix-matches
			{ id: 'prefix', title: 'fnd extra text' }, // field starts with "fnd"
			{ id: 'exact', title: 'fnd' }, // field equals "fnd"
		]
		const ranked = rankCommandPaletteItems(candidates, 'fnd')
		expect(ranked.map((r) => r.item.id)).toEqual(['exact', 'prefix', 'word', 'fuzzy'])
		expect(ranked[0].tier).toBe(MATCH_TIER.EXACT)
		expect(ranked[1].tier).toBe(MATCH_TIER.EXACT) // prefix is still an EXACT-tier match (starts-with)
		expect(ranked[2].tier).toBe(MATCH_TIER.WORD_PREFIX)
		expect(ranked[3].tier).toBe(MATCH_TIER.FUZZY)
	})

	it('matches an exact-prefix query ("open") against "Open" and "Open Dashboard", excluding "Settings"', () => {
		const ranked = rankCommandPaletteItems(items, 'open')
		const ids = ranked.map((r) => r.item.id)
		expect(ids).toContain('open')
		expect(ids).toContain('open-dashboard')
		expect(ids).not.toContain('settings')
		// The shorter exact field ("Open") outranks the longer one with the same prefix.
		expect(ids[0]).toBe('open')
	})

	it('matches a word-prefix query ("dash") against the second word of "Open Dashboard"', () => {
		const ranked = rankCommandPaletteItems(items, 'dash')
		expect(ranked).toHaveLength(1)
		expect(ranked[0].item.id).toBe('open-dashboard')
		expect(ranked[0].tier).toBe(MATCH_TIER.WORD_PREFIX)
	})

	it('matches a fuzzy subsequence query ("stns") against "Settings"', () => {
		const ranked = rankCommandPaletteItems(items, 'stns')
		expect(ranked.map((r) => r.item.id)).toContain('settings')
		expect(ranked.find((r) => r.item.id === 'settings').tier).toBe(MATCH_TIER.FUZZY)
	})

	it('drops a candidate that matches none of the tiers', () => {
		const ranked = rankCommandPaletteItems(items, 'zzzzz')
		expect(ranked).toEqual([])
	})

	it('is case-insensitive and trims the query', () => {
		const ranked = rankCommandPaletteItems(items, '  OPEN  ')
		expect(ranked.map((r) => r.item.id)).toEqual(expect.arrayContaining(['open', 'open-dashboard']))
	})

	it('matches on keywords, ranked below an equivalent title match (tie-break by field)', () => {
		const ranked = rankCommandPaletteItems(items, 'factuur')
		expect(ranked).toHaveLength(1)
		expect(ranked[0].item.id).toBe('create-invoice')
		expect(ranked[0].tier).toBe(MATCH_TIER.EXACT) // keyword "factuur" equals the query exactly
	})

	it('breaks a same-tier, same-score tie alphabetically by title', () => {
		// Both are WORD_PREFIX matches via a same-length second word
		// ("cat", 3 chars) against query "cat" — neither full title starts
		// with "cat" (that would hit the EXACT tier instead), so both
		// resolve to the exact same score (600 + (20 - 3)) — a genuine tie
		// the array order alone (deliberately "Zap" first) must NOT decide.
		const tied = [
			{ id: 'zap', title: 'Zap Cat' },
			{ id: 'nap', title: 'Nap Cat' },
		]
		const ranked = rankCommandPaletteItems(tied, 'cat')
		expect(ranked[0].score).toBe(ranked[1].score)
		expect(ranked.map((r) => r.item.id)).toEqual(['nap', 'zap'])
	})

	it('breaks a fully-tied (score AND title) case by original array order', () => {
		const tied = [
			{ id: 'first', title: 'Same' },
			{ id: 'second', title: 'Same' },
		]
		const ranked = rankCommandPaletteItems(tied, 'same')
		expect(ranked.map((r) => r.item.id)).toEqual(['first', 'second'])
	})

	it('returns everything in original order (tier NONE, score 0) for an empty query', () => {
		const ranked = rankCommandPaletteItems(items, '')
		expect(ranked).toHaveLength(items.length)
		expect(ranked.every((r) => r.tier === MATCH_TIER.NONE)).toBe(true)
		expect(ranked.map((r) => r.item.id)).toEqual(items.map((i) => i.id))
	})

	it('boosts idle-list order by usageCounts without needing a query', () => {
		const ranked = rankCommandPaletteItems(items, '', {
			usageCounts: { settings: 10 },
		})
		expect(ranked[0].item.id).toBe('settings')
	})

	it('applies a bounded recency boost that cannot promote a lower tier over a higher one', () => {
		const candidates = [
			{ id: 'exact', title: 'ab' }, // EXACT tier, no usage
			{ id: 'fuzzy-popular', title: 'zzzazzzbzzz' }, // FUZZY tier ("ab" subsequence), heavily used
		]
		const ranked = rankCommandPaletteItems(candidates, 'ab', {
			usageCounts: { 'fuzzy-popular': 100000 },
		})
		// Even a huge usage count must not let a FUZZY match outrank an EXACT one.
		expect(ranked[0].item.id).toBe('exact')
	})

	it('handles items with no `keywords` array gracefully', () => {
		const ranked = rankCommandPaletteItems([{ id: 'x', title: 'Xylophone' }], 'xyl')
		expect(ranked).toHaveLength(1)
	})

	it('treats a non-array `items` input as empty', () => {
		expect(rankCommandPaletteItems(null, 'foo')).toEqual([])
		expect(rankCommandPaletteItems(undefined, '')).toEqual([])
	})

	describe('includeNonMatching', () => {
		it('drops non-matching items by default (strict mode)', () => {
			const ranked = rankCommandPaletteItems(items, 'zzzzz', { includeNonMatching: false })
			expect(ranked).toEqual([])
		})

		it('keeps non-matching items, appended after every real match, when includeNonMatching is true', () => {
			const preFiltered = [
				{ id: 'matches-title', title: 'Open Dashboard' },
				{ id: 'server-only-match', title: 'Some unrelated title' }, // simulates a server-side match on a field the client scorer never sees
			]
			const ranked = rankCommandPaletteItems(preFiltered, 'open', { includeNonMatching: true })
			expect(ranked.map((r) => r.item.id)).toEqual(['matches-title', 'server-only-match'])
			expect(ranked[1].tier).toBe(MATCH_TIER.NONE)
		})
	})
})

describe('commandPaletteRanking — groupRankedResultsBySection', () => {
	it('groups entries by section, preserving rank order within each group', () => {
		const ranked = [
			{ item: { id: 'a', section: 'Actions' }, tier: MATCH_TIER.EXACT, score: 900 },
			{ item: { id: 'n', section: 'Navigate' }, tier: MATCH_TIER.EXACT, score: 890 },
			{ item: { id: 'a2', section: 'Actions' }, tier: MATCH_TIER.FUZZY, score: 300 },
		]
		const grouped = groupRankedResultsBySection(ranked)
		expect(grouped.map((g) => g.section)).toEqual(['Actions', 'Navigate'])
		expect(grouped[0].entries.map((e) => e.item.id)).toEqual(['a', 'a2'])
		expect(grouped[1].entries.map((e) => e.item.id)).toEqual(['n'])
	})

	it('groups items without a section under a null key', () => {
		const ranked = [{ item: { id: 'x' }, tier: MATCH_TIER.FUZZY, score: 300 }]
		const grouped = groupRankedResultsBySection(ranked)
		expect(grouped).toEqual([{ section: null, entries: ranked }])
	})

	it('returns an empty array for empty input', () => {
		expect(groupRankedResultsBySection([])).toEqual([])
		expect(groupRankedResultsBySection(undefined)).toEqual([])
	})
})
