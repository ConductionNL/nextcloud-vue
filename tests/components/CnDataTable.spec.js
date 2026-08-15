/**
 * Tests for CnDataTable's `columns[].aggregate` support — a column whose
 * cell value is a count of related OpenRegister objects (`op: "count"`),
 * fetched once per visible row with `_limit=0`, the `@self.<path>` segments
 * in `aggregate.where` interpolated per-row. Failures degrade the one cell;
 * a stale batch is discarded when `rows` changes mid-flight.
 */

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => `/index.php${p}`,
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const axios = jest.requireMock('@nextcloud/axios').default
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

/**
 * Mount helper. Stubs CnCellRenderer so the test asserts the *value* the
 * table feeds it, not its rendering (covered by CnCellRenderer.spec.js).
 *
 * @param {object} propsData Component props.
 * @return {object} The Vue Test Utils wrapper.
 */
function mountTable(propsData) {
	return mount(CnDataTable, {
		propsData,
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

/**
 * Resolve all pending microtasks + one macrotask + a Vue render tick.
 *
 * @param {object} wrapper The Vue Test Utils wrapper to flush.
 */
async function flush(wrapper) {
	await new Promise((resolve) => setTimeout(resolve))
	await wrapper.vm.$nextTick()
}

const rows = [
	{ id: 'a', name: 'Welcome flow' },
	{ id: 'b', name: 'Lost-deal flow' },
]
const aggregateCol = {
	key: 'runCount',
	label: 'Runs',
	aggregate: { register: 'pipelinq', schema: 'automationLog', op: 'count', where: { automation: '@self.id' } },
}

beforeEach(() => {
	axios.get.mockReset()
})

describe('CnDataTable — string columns normalisation', () => {
	it('renders correct cell values when columns is a string array', async () => {
		const wrapper = mountTable({
			rows: [{ name: 'foo', type: 'bar' }],
			columns: ['name', 'type'],
		})
		await wrapper.vm.$nextTick()
		const cells = wrapper.findAll('.cell').map((w) => w.text())
		expect(cells).toEqual(expect.arrayContaining(['foo', 'bar']))
		expect(cells).not.toContain('—')
	})

	it('mixes string and object column definitions without error', async () => {
		const wrapper = mountTable({
			rows: [{ name: 'hello', status: 'active' }],
			columns: ['name', { key: 'status', label: 'Status' }],
		})
		await wrapper.vm.$nextTick()
		const cells = wrapper.findAll('.cell').map((w) => w.text())
		expect(cells).toEqual(expect.arrayContaining(['hello', 'active']))
	})
})

describe('CnDataTable — columns[].aggregate', () => {
	it('shows "…" while pending, then the per-row total', async () => {
		let resolveA
		let resolveB
		axios.get
			.mockReturnValueOnce(new Promise((resolve) => { resolveA = resolve }))
			.mockReturnValueOnce(new Promise((resolve) => { resolveB = resolve }))
		const wrapper = mountTable({ rows, columns: [{ key: 'name', label: 'Name' }, aggregateCol] })
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cell').map((w) => w.text())).toContain('…')
		// the where filter was interpolated per row
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(axios.get.mock.calls[0][0]).toBe('/index.php/apps/openregister/api/objects/pipelinq/automationLog')
		expect(axios.get.mock.calls[0][1]).toEqual({ params: { automation: 'a', _limit: 0 } })
		expect(axios.get.mock.calls[1][1]).toEqual({ params: { automation: 'b', _limit: 0 } })
		resolveA({ data: { total: 3 } })
		resolveB({ data: { results: [{}, {}] } }) // falls back to results.length
		await flush(wrapper)
		expect(wrapper.findAll('.cell').map((w) => w.text()))
			.toEqual(expect.arrayContaining(['Welcome flow', '3', 'Lost-deal flow', '2']))
	})

	it('degrades a single failed aggregate cell to "—"', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		axios.get
			.mockResolvedValueOnce({ data: { total: 5 } })
			.mockRejectedValueOnce(new Error('boom'))
		const wrapper = mountTable({ rows, columns: [aggregateCol] })
		await flush(wrapper)
		expect(wrapper.findAll('.cell').map((w) => w.text())).toEqual(expect.arrayContaining(['5', '—']))
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('does not query for non-aggregate columns (regression)', async () => {
		const wrapper = mountTable({ rows, columns: [{ key: 'name', label: 'Name' }] })
		await wrapper.vm.$nextTick()
		expect(axios.get).not.toHaveBeenCalled()
		expect(wrapper.findAll('.cell').map((w) => w.text())).toEqual(['Welcome flow', 'Lost-deal flow'])
	})

	it('re-runs the batch and discards the stale one when rows change', async () => {
		axios.get.mockResolvedValue({ data: { total: 1 } })
		const wrapper = mountTable({ rows, columns: [aggregateCol] })
		await wrapper.vm.$nextTick()
		const firstCalls = axios.get.mock.calls.length
		expect(firstCalls).toBe(2)
		await wrapper.setProps({ rows: [{ id: 'c', name: 'New flow' }] })
		await flush(wrapper)
		expect(axios.get.mock.calls.length).toBe(firstCalls + 1)
		expect(axios.get.mock.calls[firstCalls][1]).toEqual({ params: { automation: 'c', _limit: 0 } })
		expect(wrapper.findAll('.cell').map((w) => w.text())).toEqual(['1'])
	})
})

describe('CnDataTable — row click selection', () => {
	const cols = [{ key: 'name', label: 'Name' }]

	it('toggles selection on row-body click when selectable (no row-click)', async () => {
		const wrapper = mountTable({ rows, columns: cols, selectable: true, selectedIds: [] })
		await wrapper.vm.$nextTick()
		await wrapper.findAll('.cn-table-row').at(0).trigger('click')
		expect(wrapper.emitted('select')).toBeTruthy()
		expect(wrapper.emitted('select')[0][0]).toEqual(['a'])
		expect(wrapper.emitted('row-click')).toBeFalsy()
	})

	it('deselects an already-selected row on click', async () => {
		const wrapper = mountTable({ rows, columns: cols, selectable: true, selectedIds: ['a'] })
		await wrapper.vm.$nextTick()
		await wrapper.findAll('.cn-table-row').at(0).trigger('click')
		expect(wrapper.emitted('select')[0][0]).toEqual([])
	})

	it('does NOT toggle selection when the click ends a text-selection drag', async () => {
		const wrapper = mountTable({ rows, columns: cols, selectable: true, selectedIds: [] })
		await wrapper.vm.$nextTick()
		const row = wrapper.findAll('.cn-table-row').at(0)
		await row.trigger('mousedown', { clientX: 10, clientY: 10 })
		await row.trigger('click', { clientX: 120, clientY: 40 })
		expect(wrapper.emitted('select')).toBeFalsy()
	})

	it('toggles selection when the pointer barely moves (deliberate click)', async () => {
		const wrapper = mountTable({ rows, columns: cols, selectable: true, selectedIds: [] })
		await wrapper.vm.$nextTick()
		const row = wrapper.findAll('.cn-table-row').at(0)
		await row.trigger('mousedown', { clientX: 10, clientY: 10 })
		await row.trigger('click', { clientX: 12, clientY: 11 })
		expect(wrapper.emitted('select')[0][0]).toEqual(['a'])
	})

	it('emits row-click (not select) when not selectable', async () => {
		const wrapper = mountTable({ rows, columns: cols, selectable: false })
		await wrapper.vm.$nextTick()
		await wrapper.findAll('.cn-table-row').at(0).trigger('click')
		expect(wrapper.emitted('row-click')).toBeTruthy()
		expect(wrapper.emitted('row-click')[0][0]).toEqual(rows[0])
		expect(wrapper.emitted('select')).toBeFalsy()
	})
})

// OpenRegister system/metadata fields live under the object's `@self` block.
// Sidebar-enabled metadata columns (uri, size, owner, ...) use bare keys, so
// the table must fall back to @self for them — without it they render blank.
describe('CnDataTable — @self metadata fallback', () => {
	const row = { id: 'top-id', name: 'Acme', '@self': { id: 'self-id', uri: 'https://x/y', size: 1024, owner: 'admin' } }

	it('resolves bare metadata keys from the @self block', () => {
		const wrapper = mountTable({ rows: [row], columns: [{ key: 'name', label: 'Name' }] })
		expect(wrapper.vm.getCellValue(row, 'uri')).toBe('https://x/y')
		expect(wrapper.vm.getCellValue(row, 'size')).toBe(1024)
		expect(wrapper.vm.getCellValue(row, 'owner')).toBe('admin')
	})

	it('prefers a top-level value over @self for a shared key', () => {
		const wrapper = mountTable({ rows: [row], columns: [{ key: 'name', label: 'Name' }] })
		expect(wrapper.vm.getCellValue(row, 'id')).toBe('top-id')
	})

	it('renders an enabled metadata column from @self', () => {
		const wrapper = mountTable({ rows: [row], columns: [{ key: 'name', label: 'Name' }, { key: 'uri', label: 'URI' }] })
		expect(wrapper.findAll('.cell').map((w) => w.text())).toEqual(expect.arrayContaining(['Acme', 'https://x/y']))
	})
})

// hideHeader lets compact dashboard list widgets render a plain bordered-row
// list with no column-label row (matches the older bespoke ManageListWidget look).
describe('CnDataTable — hideHeader', () => {
	it('renders the <thead> by default', () => {
		const wrapper = mountTable({ rows, columns: ['name'] })
		expect(wrapper.find('thead').exists()).toBe(true)
	})

	it('omits the <thead> when hideHeader is set', () => {
		const wrapper = mountTable({ rows, columns: ['name'], hideHeader: true })
		expect(wrapper.find('thead').exists()).toBe(false)
		// Rows still render.
		expect(wrapper.findAll('.cn-table-row').length).toBe(2)
	})
})

// A #footer scoped slot lets a host render its own footer link with its own
// handler (a "+ New" create action, or an always-shown "View all") — usable
// outside a vue-router context, where the built-in link's $router.push no-ops.
describe('CnDataTable — #footer slot', () => {
	it('renders custom footer content instead of the built-in view-all link', () => {
		const wrapper = mount(CnDataTable, {
			propsData: { rows, columns: ['name'] },
			stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
			scopedSlots: { footer: '<a class="my-footer" @click="props.total">+ New thing</a>' },
		})
		expect(wrapper.find('.cn-data-table__footer').exists()).toBe(true)
		expect(wrapper.find('.my-footer').text()).toBe('+ New thing')
		expect(wrapper.find('.cn-data-table__view-all').exists()).toBe(false)
	})

	it('renders no footer when neither a slot nor a subset view-all applies', () => {
		const wrapper = mountTable({ rows, columns: ['name'] })
		expect(wrapper.find('.cn-data-table__footer').exists()).toBe(false)
	})

	// The sticky footer only pins if it is OUTSIDE the element that owns the
	// horizontal scroll. `overflow-x: auto` coerces `overflow-y` to `auto`, so
	// whichever element carries it becomes the nearest scrollport — and a
	// footer inside that scrollport scrolls away with the rows instead of
	// pinning to the bottom of the enclosing widget. Structure is the
	// invariant; jsdom cannot assert the resulting layout.
	it('keeps the footer OUTSIDE the horizontal scroll wrapper so it can stick', () => {
		const wrapper = mount(CnDataTable, {
			propsData: { rows, columns: ['name'] },
			stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
			scopedSlots: { footer: '<a class="my-footer">+ New thing</a>' },
		})
		const scroll = wrapper.find('.cn-data-table__scroll')
		expect(scroll.exists()).toBe(true)
		// The table IS inside the scroll wrapper; the footer is NOT.
		expect(scroll.find('table.cn-data-table').exists()).toBe(true)
		expect(scroll.find('.cn-data-table__footer').exists()).toBe(false)
		expect(wrapper.find('.cn-data-table__footer').exists()).toBe(true)
	})
})

// Column headers come from schema property titles, which are authored in
// English (canonical source, for API predictability). The visible header is
// resolved through the consumer's translation function, provided by CnAppRoot
// as `cnTranslate` (bound to the host app id). This is what makes an
// English-authored `signatureLevel: { title: 'Level' }` render as "Niveau" for
// a Dutch user instead of leaking whichever language the schema was typed in.
describe('CnDataTable — column header translation via cnTranslate', () => {
	it('translates column labels through the injected cnTranslate', () => {
		const dict = { Name: 'Naam', Level: 'Niveau' }
		const wrapper = mount(CnDataTable, {
			propsData: { rows, columns: [{ key: 'name', label: 'Name' }, { key: 'level', label: 'Level' }] },
			provide: { cnTranslate: (key) => dict[key] || key },
			stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
		})
		const headers = wrapper.findAll('thead th').map((w) => w.text())
		expect(headers).toContain('Naam')
		expect(headers).toContain('Niveau')
		// The English source label is never shown when a translation exists.
		expect(headers).not.toContain('Name')
		expect(headers).not.toContain('Level')
	})

	it('falls back to the source label when no cnTranslate is provided', () => {
		const wrapper = mountTable({ rows, columns: [{ key: 'name', label: 'Name' }] })
		const headers = wrapper.findAll('thead th').map((w) => w.text())
		expect(headers).toContain('Name')
	})
})
