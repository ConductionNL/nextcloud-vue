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

/** Resolve all pending microtasks + one macrotask + a Vue render tick. */
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
		const cells = wrapper.findAll('.cell').wrappers.map((w) => w.text())
		expect(cells).toEqual(expect.arrayContaining(['foo', 'bar']))
		expect(cells).not.toContain('—')
	})

	it('mixes string and object column definitions without error', async () => {
		const wrapper = mountTable({
			rows: [{ name: 'hello', status: 'active' }],
			columns: ['name', { key: 'status', label: 'Status' }],
		})
		await wrapper.vm.$nextTick()
		const cells = wrapper.findAll('.cell').wrappers.map((w) => w.text())
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
		expect(wrapper.findAll('.cell').wrappers.map((w) => w.text())).toContain('…')
		// the where filter was interpolated per row
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(axios.get.mock.calls[0][0]).toBe('/index.php/apps/openregister/api/objects/pipelinq/automationLog')
		expect(axios.get.mock.calls[0][1]).toEqual({ params: { automation: 'a', _limit: 0 } })
		expect(axios.get.mock.calls[1][1]).toEqual({ params: { automation: 'b', _limit: 0 } })
		resolveA({ data: { total: 3 } })
		resolveB({ data: { results: [{}, {}] } }) // falls back to results.length
		await flush(wrapper)
		expect(wrapper.findAll('.cell').wrappers.map((w) => w.text()))
			.toEqual(expect.arrayContaining(['Welcome flow', '3', 'Lost-deal flow', '2']))
	})

	it('degrades a single failed aggregate cell to "—"', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		axios.get
			.mockResolvedValueOnce({ data: { total: 5 } })
			.mockRejectedValueOnce(new Error('boom'))
		const wrapper = mountTable({ rows, columns: [aggregateCol] })
		await flush(wrapper)
		expect(wrapper.findAll('.cell').wrappers.map((w) => w.text())).toEqual(expect.arrayContaining(['5', '—']))
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('does not query for non-aggregate columns (regression)', async () => {
		const wrapper = mountTable({ rows, columns: [{ key: 'name', label: 'Name' }] })
		await wrapper.vm.$nextTick()
		expect(axios.get).not.toHaveBeenCalled()
		expect(wrapper.findAll('.cell').wrappers.map((w) => w.text())).toEqual(['Welcome flow', 'Lost-deal flow'])
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
		expect(wrapper.findAll('.cell').wrappers.map((w) => w.text())).toEqual(['1'])
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
		expect(wrapper.findAll('.cell').wrappers.map((w) => w.text())).toEqual(expect.arrayContaining(['Acme', 'https://x/y']))
	})
})
