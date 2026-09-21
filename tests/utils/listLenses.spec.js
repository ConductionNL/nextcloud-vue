/**
 * Tests for the lens tabs, the claimed teams and the record-type counts
 * (working-list-row-actions, tasks 5 and 6).
 */

import {
	MY_TEAMS_TOKEN,
	recordTypeNavEntries,
	resolveClaimedTeams,
	resolveClaimTokens,
	splitViewsIntoTabs,
	viewAsTab,
	viewIdOf,
} from '../../src/utils/listLenses.js'

const VIEWS = [
	{ id: 'all', title: 'All', filters: {} },
	{ id: 'mine', title: 'Mine', filters: { behandelaar: '@me' } },
	{ id: 'unassigned', title: 'Unassigned', filters: { behandelaar: '' } },
	{ id: 'overdue', title: 'Overdue', filters: { overdue: true } },
]

describe('viewIdOf', () => {
	it('reads either spelling OpenRegister answers with', () => {
		expect(viewIdOf({ id: 7 })).toBe('7')
		expect(viewIdOf({ uuid: 'abc' })).toBe('abc')
		expect(viewIdOf({})).toBe('')
	})
})

describe('splitViewsIntoTabs', () => {
	it('leaves everything in the control when the page names no tabs', () => {
		const { tabs, control } = splitViewsIntoTabs(VIEWS, [])
		expect(tabs).toEqual([])
		expect(control).toHaveLength(4)
	})

	it('renders the named views as tabs, in the page order', () => {
		const { tabs } = splitViewsIntoTabs(VIEWS, ['mine', 'all', 'unassigned'])
		expect(tabs.map(viewIdOf)).toEqual(['mine', 'all', 'unassigned'])
	})

	it('a view is a tab or in the control, never both', () => {
		const { tabs, control } = splitViewsIntoTabs(VIEWS, ['all', 'mine', 'unassigned'])
		expect(tabs.map(viewIdOf)).toEqual(['all', 'mine', 'unassigned'])
		expect(control.map(viewIdOf)).toEqual(['overdue'])
		const both = tabs.map(viewIdOf).filter((id) => control.map(viewIdOf).includes(id))
		expect(both).toEqual([])
	})

	it('a tab id naming a view that is gone produces no tab', () => {
		// Rather than a tab that opens nothing, which is how a person learns a
		// page is lying about what it has.
		const { tabs, control } = splitViewsIntoTabs(VIEWS, ['mine', 'retired-lens'])
		expect(tabs.map(viewIdOf)).toEqual(['mine'])
		expect(control.map(viewIdOf)).toEqual(['all', 'unassigned', 'overdue'])
	})

	it('names a view once even when the page lists it twice', () => {
		const { tabs } = splitViewsIntoTabs(VIEWS, ['mine', 'mine'])
		expect(tabs.map(viewIdOf)).toEqual(['mine'])
	})
})

describe('viewAsTab', () => {
	it('shapes a view the way the tab strip already understands', () => {
		expect(viewAsTab(VIEWS[1])).toEqual({ id: 'mine', label: 'Mine', filter: { behandelaar: '@me' } })
	})

	it('falls back to the id when a view has no title', () => {
		expect(viewAsTab({ id: 'x' }).label).toBe('x')
	})
})

describe('resolveClaimedTeams', () => {
	const OFFERED = ['vergunningen', 'handhaving', 'bezwaar']

	it('claims nothing when the person has never chosen', () => {
		expect(resolveClaimedTeams(OFFERED, null)).toEqual([])
	})

	it('claims what they stored, in the offered order', () => {
		expect(resolveClaimedTeams(OFFERED, ['bezwaar', 'vergunningen'])).toEqual(['vergunningen', 'bezwaar'])
	})

	it('a stored claim cannot resurrect a team the instance stopped offering', () => {
		// They claimed "archief" while it was on the list. It is not any more,
		// so it is passed over: a preference chooses among what exists, it is
		// not a second place a membership can be granted.
		expect(resolveClaimedTeams(OFFERED, ['vergunningen', 'archief'])).toEqual(['vergunningen'])
	})

	it('a stored claim cannot invent a team nobody offered', () => {
		expect(resolveClaimedTeams(OFFERED, ['directie'])).toEqual([])
	})

	it('reads offered teams as objects too', () => {
		expect(resolveClaimedTeams([{ id: 'a', label: 'A' }, { id: 'b' }], ['b'])).toEqual(['b'])
	})
})

describe('resolveClaimTokens', () => {
	it('resolves the teams token to what this person claimed', () => {
		const { filter, narrowsToNothing } = resolveClaimTokens(
			{ team: MY_TEAMS_TOKEN, status: 'open' },
			{ teams: ['vergunningen', 'bezwaar'] },
		)
		expect(filter).toEqual({ team: ['vergunningen', 'bezwaar'], status: 'open' })
		expect(narrowsToNothing).toBe(false)
	})

	it('narrows to nothing, and says so, when they claimed no teams', () => {
		// A lens labelled "my teams" that showed every team would be a label
		// stating one rule while the fetch ran another.
		const { filter, narrowsToNothing } = resolveClaimTokens({ team: MY_TEAMS_TOKEN }, { teams: [] })
		expect(filter).toEqual({ team: [] })
		expect(narrowsToNothing).toBe(true)
	})

	it('leaves a filter with no token alone', () => {
		const { filter, narrowsToNothing, tokens } = resolveClaimTokens({ status: 'open' }, { teams: ['a'] })
		expect(filter).toEqual({ status: 'open' })
		expect(narrowsToNothing).toBe(false)
		expect(tokens).toEqual([])
	})
})

describe('recordTypeNavEntries', () => {
	const TYPES = [
		{ id: 'permit', label: 'Permits', page: 'Permits' },
		{ id: 'complaint', label: 'Complaints' },
	]

	it('gives every declared type an entry with its count', () => {
		expect(recordTypeNavEntries(TYPES, { permit: 12, complaint: 0 })).toEqual([
			{ id: 'permit', label: 'Permits', page: 'Permits', count: 12 },
			{ id: 'complaint', label: 'Complaints', page: 'complaint', count: 0 },
		])
	})

	it('a count the page could not confirm is absent, never the last one anybody saw', () => {
		const entries = recordTypeNavEntries(TYPES, { permit: 12 })
		expect(entries[1].count).toBeNull()
	})

	it('treats a failed count as no count, not as zero', () => {
		const entries = recordTypeNavEntries(TYPES, { permit: null, complaint: undefined })
		expect(entries.map((e) => e.count)).toEqual([null, null])
	})

	it('drops a type that names no id', () => {
		expect(recordTypeNavEntries([{ label: 'Nameless' }, TYPES[0]], {})).toHaveLength(1)
	})
})
