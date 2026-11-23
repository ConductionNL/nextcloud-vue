/**
 * Tests for the working-list wiring on CnIndexPage: lenses as tabs, the
 * claimed-teams preference, the priority sort, the quick edit and the
 * keyboard path (working-list-row-actions, tasks 2, 4, 5 and 7).
 */

const { shallowMount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const ROWS = [
	{ id: 'a', title: 'Alpha', prioriteit: 'low' },
	{ id: 'b', title: 'Beta', prioriteit: 'high' },
	{ id: 'c', title: 'Gamma' },
	{ id: 'd', title: 'Delta', prioriteit: 'medium' },
	// Carries a priority, but not one the page declared a rank for. This is a
	// DIFFERENT case from 'c', which carries none at all, and it is the one
	// that exercises the unranked branch: an absent value is already sunk by
	// the empty-value rule before the levels are consulted.
	{ id: 'e', title: 'Epsilon', prioriteit: 'urgent' },
]

const VIEWS = [
	{ id: 'all', title: 'All', filters: {} },
	{ id: 'mine', title: 'Mine', filters: { team: '@myTeams' } },
	{ id: 'overdue', title: 'Overdue', filters: { overdue: true } },
]

function mountPage(propsData = {}) {
	return shallowMount(CnIndexPage, {
		propsData: { objects: ROWS, schema: { title: 'Case', properties: {} }, ...propsData },
	})
}

describe('CnIndexPage — lenses as tabs', () => {
	it('keeps every view in the control when no view is named as a tab', () => {
		const wrapper = mountPage()
		wrapper.vm.savedViews = VIEWS
		expect(wrapper.vm.lensTabs).toEqual([])
		expect(wrapper.vm.viewsForControl).toHaveLength(3)
	})

	it('renders the named views as tabs and takes them out of the control', () => {
		const wrapper = mountPage({ viewTabs: ['all', 'mine'] })
		wrapper.vm.savedViews = VIEWS
		expect(wrapper.vm.lensTabs.map((t) => t.id)).toEqual(['all', 'mine'])
		expect(wrapper.vm.viewsForControl.map((v) => v.id)).toEqual(['overdue'])
	})

	it('uses one tab strip, never two', () => {
		const wrapper = mountPage({
			viewTabs: ['all'],
			quickFilters: [{ id: 'q', label: 'Quick', filter: {} }],
		})
		wrapper.vm.savedViews = VIEWS
		expect(wrapper.vm.tabStripEntries.map((t) => t.id)).toEqual(['all'])
	})
})

describe('CnIndexPage — the teams this person claimed', () => {
	const OFFERED = ['vergunningen', 'handhaving']

	it('claims nothing until the person chooses', () => {
		expect(mountPage({ offeredTeams: OFFERED }).vm.claimedTeamIds).toEqual([])
	})

	it('narrows a lens to the teams they claimed', () => {
		const wrapper = mountPage({
			viewTabs: ['mine'],
			offeredTeams: OFFERED,
			claimedTeams: ['handhaving', 'vergunningen'],
		})
		wrapper.vm.savedViews = VIEWS
		expect(wrapper.vm.lensTabs[0].filter).toEqual({ team: ['vergunningen', 'handhaving'] })
		expect(wrapper.vm.lensTabs[0].narrowsToNothing).toBe(false)
	})

	it('a stored claim cannot resurrect a team the instance stopped offering', () => {
		const wrapper = mountPage({
			offeredTeams: OFFERED,
			claimedTeams: ['vergunningen', 'archief'],
		})
		expect(wrapper.vm.claimedTeamIds).toEqual(['vergunningen'])
	})

	it('says a lens narrowed to nothing rather than showing everything under it', () => {
		const wrapper = mountPage({ viewTabs: ['mine'], offeredTeams: OFFERED, claimedTeams: [] })
		wrapper.vm.savedViews = VIEWS
		expect(wrapper.vm.lensTabs[0].filter).toEqual({ team: [] })
		expect(wrapper.vm.lensTabs[0].narrowsToNothing).toBe(true)
	})
})

describe('CnIndexPage — the priority it reads', () => {
	const props = { priorityField: 'prioriteit', priorityLevels: ['low', 'medium', 'high'] }

	it('sorts on the priority the record carries', () => {
		const wrapper = mountPage(props)
		expect(wrapper.vm.displayObjects.map((r) => r.id).slice(0, 3)).toEqual(['b', 'd', 'a'])
	})

	it('a record with no priority at all is last and still in the list', () => {
		const wrapper = mountPage(props)
		const ids = wrapper.vm.displayObjects.map((r) => r.id)
		expect(ids).toHaveLength(5)
		expect(ids.indexOf('c')).toBeGreaterThan(ids.indexOf('a'))
	})

	it('a record whose priority the page did not rank is last too, under a DESCENDING sort', () => {
		// This is the assertion the empty-value rule cannot cover for us: 'e'
		// carries a value, so it reaches the levels comparison, and the sort is
		// descending, so a rule that multiplied the unranked answer by the
		// direction would float it to the top.
		const wrapper = mountPage(props)
		const ids = wrapper.vm.displayObjects.map((r) => r.id)
		expect(ids[0]).toBe('b')
		expect(ids.indexOf('e')).toBeGreaterThan(ids.indexOf('a'))
	})

	it('and last under an ASCENDING sort as well', () => {
		const wrapper = mountPage({ ...props, defaultSort: [{ field: 'prioriteit', order: 'asc' }] })
		const ids = wrapper.vm.displayObjects.map((r) => r.id)
		expect(ids[0]).toBe('a')
		expect(ids.indexOf('e')).toBeGreaterThan(ids.indexOf('b'))
	})

	it('the list never computes a priority', () => {
		// The rows go in and come out carrying exactly what they carried.
		const wrapper = mountPage(props)
		expect(wrapper.vm.displayObjects.find((r) => r.id === 'c').prioriteit).toBeUndefined()
		expect(Object.hasOwn(wrapper.vm.displayObjects.find((r) => r.id === 'c'), 'prioriteit')).toBe(false)
	})

	it('changes nothing when the page names no priority field', () => {
		const wrapper = mountPage()
		expect(wrapper.vm.displayObjects.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
	})
})

describe('CnIndexPage — quick edit from the row', () => {
	it('opens on nothing when the page names no quick-edit fields', () => {
		const wrapper = mountPage()
		wrapper.vm.openQuickEdit(ROWS[0])
		expect(wrapper.vm.quickEditRow).toBeNull()
	})

	it('writes the patch onto the row without refetching', () => {
		const wrapper = mountPage({ quickEditFields: ['title'] })
		wrapper.vm.openQuickEdit(ROWS[0])
		expect(wrapper.vm.quickEditRow.id).toBe('a')
		wrapper.vm.onQuickEditSave({ id: 'a', patch: { title: 'Alpha prime' } })
		expect(wrapper.vm.quickEditRow).toBeNull()
		expect(wrapper.vm.displayObjects.find((r) => r.id === 'a').title).toBe('Alpha prime')
		expect(wrapper.emitted('quick-edit-save')[0]).toEqual([{ id: 'a', patch: { title: 'Alpha prime' } }])
	})

	it('writes nothing for an empty patch', () => {
		const wrapper = mountPage({ quickEditFields: ['title'] })
		wrapper.vm.openQuickEdit(ROWS[0])
		wrapper.vm.onQuickEditSave({ id: 'a', patch: {} })
		expect(wrapper.vm.displayObjects.find((r) => r.id === 'a').title).toBe('Alpha')
		expect(wrapper.emitted('quick-edit-save')).toBeUndefined()
	})

	it('takes the server version on a conflict, whole', () => {
		const wrapper = mountPage({ quickEditFields: ['title'] })
		wrapper.vm.onQuickEditKeepTheirs({ id: 'a', title: 'What a colleague wrote' })
		expect(wrapper.vm.displayObjects.find((r) => r.id === 'a').title).toBe('What a colleague wrote')
		expect(wrapper.vm.quickEditRow).toBeNull()
	})
})

describe('CnIndexPage — the keyboard path', () => {
	function press(wrapper, key, target = { tagName: 'DIV' }) {
		const prevented = []
		wrapper.vm.onListKeydown({ key, target, preventDefault: () => prevented.push(key) })
		return prevented
	}

	it('does nothing until the page asks for shortcuts', () => {
		const wrapper = mountPage()
		expect(press(wrapper, 'j')).toEqual([])
		expect(wrapper.vm.focusedRowIndex).toBe(-1)
	})

	it('moves down and up the rows, and stops at both ends', () => {
		const wrapper = mountPage({ listShortcuts: true })
		press(wrapper, 'j')
		press(wrapper, 'j')
		expect(wrapper.vm.focusedRow.id).toBe('b')
		press(wrapper, 'k')
		press(wrapper, 'k')
		press(wrapper, 'k')
		expect(wrapper.vm.focusedRow.id).toBe('a')
		for (let i = 0; i < 10; i++) {
			press(wrapper, 'j')
		}
		expect(wrapper.vm.focusedRow.id).toBe('e')
	})

	it('selects the focused row', () => {
		const wrapper = mountPage({ listShortcuts: true })
		press(wrapper, 'j')
		press(wrapper, 'x')
		expect(wrapper.vm.internalSelectedIds).toEqual(['a'])
		press(wrapper, 'x')
		expect(wrapper.vm.internalSelectedIds).toEqual([])
	})

	it('keeps its hands off while somebody is typing', () => {
		const wrapper = mountPage({ listShortcuts: true })
		expect(press(wrapper, 'j', { tagName: 'INPUT' })).toEqual([])
		expect(wrapper.vm.focusedRowIndex).toBe(-1)
	})

	it('opens the help sheet, and the sheet lists only what the page can run', () => {
		const wrapper = mountPage({ listShortcuts: true })
		press(wrapper, '?')
		expect(wrapper.vm.showShortcutHelp).toBe(true)
		const ids = wrapper.vm.shortcutHelpEntries.map((e) => e.id)
		expect(ids).toContain('row-next')
		expect(ids).not.toContain('row-quick-edit')
	})

	it('lists the same shortcuts in the command palette as on the help key', () => {
		// One catalogue, or the two disagree and one of them is a lie.
		const wrapper = mountPage({ listShortcuts: true, quickEditFields: ['title'] })
		const help = wrapper.vm.shortcutHelpEntries.map((e) => e.id).sort()
		const palette = wrapper.vm.listPaletteEntries.map((e) => e.id.replace(/^list\./, '')).sort()
		expect(palette).toEqual(help)
		expect(help).toContain('row-quick-edit')
	})
})
