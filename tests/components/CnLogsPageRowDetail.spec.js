/**
 * Tests for CnLogsPage's opt-in row-detail dialog.
 *
 * A log entry's most useful payload is often a nested bag — a stack trace's
 * frames, an action's argument map — which a table cell can only summarise.
 * `rowDetail` opens a read-only dialog rendering those bags as labelled rows.
 * It defaults OFF so a row click stays inert for pages that navigate instead.
 */

const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	errors: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({
		title: 'Job log',
		properties: { stackTrace: { type: 'object', title: 'Stack trace' } },
	}),
	getSchema: jest.fn(() => ({ title: 'Job log', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnLogsPage = require('../../src/components/CnLogsPage/CnLogsPage.vue').default

const stubs = {
	CnDataTable: true,
	CnPagination: true,
	CnPageHeader: true,
	CnDetailGrid: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	NcDialog: true,
	NcButton: true,
}

// A real job_log row, trimmed: two scalars, a flat bag, a nested bag.
const ROW = {
	id: '4f23436f-3ce5-4d73-9761-949778815d14',
	level: 'INFO',
	message: 'Synchronized 100 successfully',
	executionTime: 6245,
	arguments: { synchronizationId: 'australia-austender-to-spectr-tender' },
	stackTrace: {
		frame_0: 'Check for a valid synchronization ID',
		frame_1: 'Doing the synchronization',
	},
	'@self': { id: '4f23436f-3ce5-4d73-9761-949778815d14', owner: 'admin' },
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

/**
 * Mount helper with one row already in the collection.
 *
 * @param {object} [propsData] Extra props.
 * @return {object} The Vue Test Utils wrapper.
 */
function mountPage(propsData) {
	mockStore.collections['openconnector-job_log'] = [ROW]
	return mount(CnLogsPage, {
		propsData: { register: 'openconnector', schema: 'job_log', ...propsData },
		stubs,
		mocks: { $route: { query: {}, params: {} }, $router: { push: jest.fn() } },
	})
}

beforeEach(() => {
	mockStore.fetchCollection.mockClear()
	mockStore.collections = {}
	mockStore.errors = {}
})

describe('CnLogsPage — row detail', () => {
	it('a row click opens nothing by default', async () => {
		const wrapper = mountPage()
		await flush()
		wrapper.findComponent({ name: 'CnDataTable' }).vm.$emit('row-click', ROW)
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.detailRow).toBeNull()
		expect(wrapper.findComponent({ name: 'NcDialog' }).exists()).toBe(false)
	})

	it('always re-emits row-click, so a host can navigate instead', async () => {
		const wrapper = mountPage()
		await flush()
		wrapper.findComponent({ name: 'CnDataTable' }).vm.$emit('row-click', ROW)
		await wrapper.vm.$nextTick()
		expect(wrapper.emitted('row-click')).toEqual([[ROW]])
	})

	it('rowDetail opens the dialog on a row click', async () => {
		const wrapper = mountPage({ rowDetail: true })
		await flush()
		wrapper.findComponent({ name: 'CnDataTable' }).vm.$emit('row-click', ROW)
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'NcDialog' }).exists()).toBe(true)
		expect(wrapper.vm.detailTitle).toBe('Synchronized 100 successfully')
	})

	it('renders the scalar fields, dropping @self', async () => {
		const wrapper = mountPage({ rowDetail: true })
		await flush()
		wrapper.vm.detailRow = ROW
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.detailScalarItems).toEqual([
			{ label: 'Id', value: '4f23436f-3ce5-4d73-9761-949778815d14' },
			{ label: 'Level', value: 'INFO' },
			{ label: 'Message', value: 'Synchronized 100 successfully' },
			{ label: 'Execution time', value: '6245' },
		])
	})

	it('renders a flat bag as its own labelled grid, titled from the schema when available', async () => {
		const wrapper = mountPage({ rowDetail: true })
		await flush()
		wrapper.vm.detailRow = ROW
		await wrapper.vm.$nextTick()
		const blocks = wrapper.vm.detailObjectBlocks
		expect(blocks.map((b) => b.key)).toEqual(['arguments', 'stackTrace'])

		// No schema title for `arguments` → humanised key.
		expect(blocks[0].label).toBe('Arguments')
		expect(blocks[0].items).toEqual([
			{ label: 'Synchronization id', value: 'australia-austender-to-spectr-tender' },
		])

		// The schema titles this one, so its own title wins over the humanised key.
		expect(blocks[1].label).toBe('Stack trace')
		expect(blocks[1].items).toEqual([
			{ label: 'Frame 0', value: 'Check for a valid synchronization ID' },
			{ label: 'Frame 1', value: 'Doing the synchronization' },
		])
		expect(blocks[1].json).toBeNull()
	})

	it('falls back to pretty-printed JSON for a bag that is not flat', async () => {
		const wrapper = mountPage({ rowDetail: true })
		await flush()
		wrapper.vm.detailRow = { id: '1', context: { nested: { deep: true } } }
		await wrapper.vm.$nextTick()
		const block = wrapper.vm.detailObjectBlocks[0]
		expect(block.items).toBeNull()
		expect(block.json).toBe(JSON.stringify({ nested: { deep: true } }, null, 2))
	})

	it('titles the dialog with the row id when the entry has no message', async () => {
		const wrapper = mountPage({ rowDetail: true })
		await flush()
		wrapper.vm.detailRow = { id: 'log-9', level: 'ERROR' }
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.detailTitle).toBe('log-9')
	})

	it('rowRoute navigates instead of opening the dialog, passing the row id as :id', async () => {
		const push = jest.fn().mockResolvedValue()
		mockStore.collections['openconnector-job_log'] = [ROW]
		const wrapper = mount(CnLogsPage, {
			propsData: { register: 'openconnector', schema: 'job_log', rowRoute: 'TraceDetail' },
			stubs,
			mocks: { $route: { query: {}, params: {} }, $router: { push } },
		})
		await flush()
		wrapper.findComponent({ name: 'CnDataTable' }).vm.$emit('row-click', ROW)
		await wrapper.vm.$nextTick()
		expect(push).toHaveBeenCalledWith({ name: 'TraceDetail', params: { id: ROW.id } })
		expect(wrapper.vm.detailRow).toBeNull()
	})

	it('rowRoute wins over rowDetail — a real page beats a generic dialog', async () => {
		const push = jest.fn().mockResolvedValue()
		mockStore.collections['openconnector-job_log'] = [ROW]
		const wrapper = mount(CnLogsPage, {
			propsData: { register: 'openconnector', schema: 'job_log', rowRoute: 'TraceDetail', rowDetail: true },
			stubs,
			mocks: { $route: { query: {}, params: {} }, $router: { push } },
		})
		await flush()
		wrapper.findComponent({ name: 'CnDataTable' }).vm.$emit('row-click', ROW)
		await wrapper.vm.$nextTick()
		expect(push).toHaveBeenCalled()
		expect(wrapper.findComponent({ name: 'NcDialog' }).exists()).toBe(false)
	})

	it('swallows a rejected push (NavigationDuplicated on an already-open row)', async () => {
		const push = jest.fn().mockRejectedValue(new Error('NavigationDuplicated'))
		mockStore.collections['openconnector-job_log'] = [ROW]
		const wrapper = mount(CnLogsPage, {
			propsData: { register: 'openconnector', schema: 'job_log', rowRoute: 'TraceDetail' },
			stubs,
			mocks: { $route: { query: {}, params: {} }, $router: { push } },
		})
		await flush()
		expect(() => wrapper.findComponent({ name: 'CnDataTable' }).vm.$emit('row-click', ROW)).not.toThrow()
		await flush()
	})

	it('closeDetail dismisses the dialog', async () => {
		const wrapper = mountPage({ rowDetail: true })
		await flush()
		wrapper.vm.detailRow = ROW
		await wrapper.vm.$nextTick()
		wrapper.vm.closeDetail()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.detailRow).toBeNull()
		expect(wrapper.findComponent({ name: 'NcDialog' }).exists()).toBe(false)
	})
})
