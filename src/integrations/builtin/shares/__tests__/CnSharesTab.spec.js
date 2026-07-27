/**
 * Tests for CnSharesTab — bespoke sidebar tab for the `shares` integration.
 *
 * Covers:
 *  - empty-state with "Manage in Files" CTA when the provider returns no shares;
 *  - row rendering grouped by share type (user / group / link / federated);
 *  - permission label rendering (read / write / share);
 *  - password-protected indicator rendering;
 *  - revoke action: DELETE call + optimistic row removal + emit;
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnSharesTab = require('../CnSharesTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

// IShare::TYPE_USER=0, TYPE_GROUP=1, TYPE_LINK=3, TYPE_REMOTE=6.
// Permissions: READ=1, UPDATE=2, SHARE=16. So 19 = read+write+share.
function makeShare(overrides = {}) {
	return {
		id: 'sh-1',
		shareType: 0,
		shareWith: 'alice',
		shareWithDisplayname: 'Alice',
		permissions: 19,
		passwordProtected: false,
		stime: 1716537600,
		canRevoke: true,
		...overrides,
	}
}

describe('CnSharesTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with a "Manage in Files" CTA when no shares', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnSharesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No shares on this object yet')
		expect(wrapper.text()).toContain('Manage in Files')
		wrapper.unmount()
	})

	it('groups shares by type with one section per non-empty type', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeShare({ id: 'a', shareType: 0, shareWithDisplayname: 'Alice' }),
					makeShare({ id: 'b', shareType: 1, shareWithDisplayname: 'Editors' }),
					makeShare({ id: 'c', shareType: 3, shareWithDisplayname: '', token: 'tok-xyz' }),
				],
			}),
		})
		const wrapper = mount(CnSharesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const groups = wrapper.findAll('.cn-shares-tab__group')
		expect(groups).toHaveLength(3)
		expect(wrapper.text()).toContain('Users')
		expect(wrapper.text()).toContain('Groups')
		expect(wrapper.text()).toContain('Public links')
		// Recipient labels are bound to the NcListItem `name` attribute.
		const names = wrapper.findAll('.cn-shares-tab__row').wrappers.map((r) => r.attributes('name'))
		expect(names).toContain('Alice')
		expect(names).toContain('Editors')
		// Public link rows fall back to the generic "Share link" label.
		expect(names).toContain('Share link')
		wrapper.unmount()
	})

	it('renders permission badges derived from the NC bitmask', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeShare({ id: 'r', shareWithDisplayname: 'ReadOnly', permissions: 1 }),
					makeShare({ id: 'rw', shareWithDisplayname: 'ReadWrite', permissions: 3 }),
					makeShare({ id: 'rws', shareWithDisplayname: 'Full', permissions: 19 }),
				],
			}),
		})
		const wrapper = mount(CnSharesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-shares-tab__permissions')
		const texts = rows.wrappers.map((r) => r.text())
		// read-only share -> "Read only" badge.
		expect(texts.some((t) => t.includes('Read only'))).toBe(true)
		// edit shares (perms 3 and 19) -> "Can edit" badge.
		expect(texts.some((t) => t.includes('Can edit'))).toBe(true)
		// reshare bit (perms 19) -> "Can reshare" badge.
		expect(texts.some((t) => t.includes('Can reshare'))).toBe(true)
		// CnStatusBadge pills are rendered for the permissions.
		expect(wrapper.findAll('.cn-shares-tab__badge').length).toBeGreaterThan(0)
		wrapper.unmount()
	})

	it('renders a lock icon for password-protected shares', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeShare({ id: 'plain', shareType: 3, passwordProtected: false }),
					makeShare({ id: 'locked', shareType: 3, passwordProtected: true }),
				],
			}),
		})
		const wrapper = mount(CnSharesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		// Just count the rendered share rows.
		const rows = wrapper.findAll('.cn-shares-tab__row')
		expect(rows.length).toBe(2)
		// Locked row must contain the title in a row marked with the lock; the
		// component renders LockOutline only when passwordProtected truthy, so
		// at least one of the rows' raw HTML contains "lock-outline".
		const html = wrapper.html()
		expect(html).toMatch(/lock-outline/i)
		wrapper.unmount()
	})

	it('calls DELETE and removes the row when revoke is clicked', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({
					results: [makeShare({ id: 'sh-77', shareWithDisplayname: 'Bob' })],
				}),
			})
			.mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}) })

		const wrapper = mount(CnSharesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.revoke({ id: 'sh-77' })
		await wrapper.vm.$nextTick()

		// Second fetch call: DELETE on the share id.
		const lastCall = global.fetch.mock.calls[1]
		expect(lastCall[0]).toContain('/integrations/shares/sh-77')
		expect(lastCall[1].method).toBe('DELETE')

		// Optimistic removal.
		expect(wrapper.vm.shares).toHaveLength(0)
		expect(wrapper.emitted('share-revoked')).toBeTruthy()
		wrapper.unmount()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnSharesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC sharing is currently unavailable.')
		expect(wrapper.find('.cn-shares-tab__row').exists()).toBe(false)
		wrapper.unmount()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnSharesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load shares.')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('renders a "Share file" toolbar button', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnSharesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-shares-tab-share-file"]').exists()).toBe(true)
		wrapper.unmount()
	})

	it('opens the create dialog and fetches shareable files', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) }) // initial list
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [{ fileId: 5, fileName: 'a.txt' }] }) }) // files
		const wrapper = mount(CnSharesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.openCreateDialog()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.showCreate).toBe(true)
		expect(wrapper.vm.shareableFiles).toEqual([{ fileId: 5, fileName: 'a.txt' }])
		const filesCall = global.fetch.mock.calls[global.fetch.mock.calls.length - 1]
		expect(filesCall[0]).toContain('/integrations/shares/files/reg/schema/obj-1')
		wrapper.unmount()
	})

	it('POSTs to the dedicated /shares endpoint on createShare and refetches', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) }) // initial list
			.mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve({ shareId: 's1' }) }) // create
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) }) // refetch
		const wrapper = mount(CnSharesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()

		const payload = { fileId: 5, shareType: 0, shareWith: 'bob', permissions: 1, password: null, expiration: null }
		await wrapper.vm.createShare(payload)
		await wrapper.vm.$nextTick()

		const createCall = global.fetch.mock.calls[1]
		expect(createCall[0]).toContain('/objects/reg/schema/obj-1/shares')
		expect(createCall[1].method).toBe('POST')
		expect(JSON.parse(createCall[1].body)).toEqual(payload)
		expect(wrapper.vm.showCreate).toBe(false)
		expect(wrapper.emitted('share-created')).toBeTruthy()
		wrapper.unmount()
	})

	it('surfaces the backend error message when createShare fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) }) // initial list
			.mockResolvedValueOnce({ ok: false, status: 400, json: () => Promise.resolve({ error: 'bad recipient' }) }) // create
		const wrapper = mount(CnSharesTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.createShare({ fileId: 5, shareType: 0, shareWith: '', permissions: 1 })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.error).toBe('bad recipient')
		wrapper.unmount()
		spy.mockRestore()
	})
})
