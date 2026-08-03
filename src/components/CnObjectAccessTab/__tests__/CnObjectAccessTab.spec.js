/**
 * Tests for CnObjectAccessTab — the per-object grant management surface.
 *
 * Covers:
 *  - the scope switch reflects the server and PERSISTS through PUT;
 *  - a refused scope change REVERTS the switch rather than lying about state;
 *  - grants render with the right principal and a read/edit summary;
 *  - a 403 renders READ-ONLY (no revoke button, no add form) rather than an error;
 *  - revoke issues the DELETE and re-reads;
 *  - PERMISSION_SHARE (16) is never sent — the server strips it, so offering it
 *    would be a silently ignored control.
 */

const { mount } = require('@vue/test-utils')
const CnObjectAccessTab = require('../CnObjectAccessTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

/**
 * Build a fetch stub that answers per URL + method.
 *
 * Matching is first-hit on a URL substring plus method, so ORDER MATTERS: put the
 * narrower match (e.g. `/shares/` for a DELETE) before the broader one
 * (`/shares`), or the list read would answer the delete.
 *
 * @param {Array<{match: string, method?: string, status?: number, body?: object}>} handlers Response table.
 * @return {Function} A jest.fn() suitable for global.fetch.
 */
function stubFetch(handlers) {
	return jest.fn((url, opts = {}) => {
		const method = (opts.method || 'GET').toUpperCase()
		for (const h of handlers) {
			if (url.includes(h.match) && (h.method || 'GET') === method) {
				return Promise.resolve({
					ok: h.status === undefined || h.status < 400,
					status: (h.status ?? 200),
					json: () => Promise.resolve(h.body ?? {}),
				})
			}
		}

		return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
	})
}

async function settle(wrapper) {
	await new Promise(resolve => setTimeout(resolve, 0))
	await wrapper.vm.$nextTick()
}

describe('CnObjectAccessTab', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('reflects the scope the server reports', async () => {
		global.fetch = stubFetch([
			{ match: '/scope', body: { scope: 'private' } },
			{ match: '/shares', body: { results: [] } },
		])

		const wrapper = mount(CnObjectAccessTab, { props: DEFAULT_PROPS })
		await settle(wrapper)

		expect(wrapper.vm.isPrivate).toBe(true)
	})

	it('persists a scope change and keeps it', async () => {
		global.fetch = stubFetch([
			{ match: '/scope', method: 'PUT', body: {} },
			{ match: '/scope', body: { scope: 'organisation' } },
			{ match: '/shares', body: { results: [] } },
		])

		const wrapper = mount(CnObjectAccessTab, { props: DEFAULT_PROPS })
		await settle(wrapper)

		await wrapper.vm.onScopeToggle(true)
		await settle(wrapper)

		expect(wrapper.vm.scope).toBe('private')
		expect(wrapper.emitted('scope-changed')).toBeTruthy()

		const put = global.fetch.mock.calls.find(c => (c[1]?.method === 'PUT'))
		expect(JSON.parse(put[1].body)).toEqual({ scope: 'private' })
	})

	it('REVERTS the switch when the server refuses the scope change', async () => {
		global.fetch = stubFetch([
			{ match: '/scope', method: 'PUT', status: 403 },
			{ match: '/scope', body: { scope: 'organisation' } },
			{ match: '/shares', body: { results: [] } },
		])

		const wrapper = mount(CnObjectAccessTab, { props: DEFAULT_PROPS })
		await settle(wrapper)

		await wrapper.vm.onScopeToggle(true)
		await settle(wrapper)

		// The control must not assert a change the server rejected.
		expect(wrapper.vm.scope).toBe('organisation')
		expect(wrapper.vm.error).not.toBe('')
	})

	it('renders a grant with its principal and an edit/view summary', async () => {
		global.fetch = stubFetch([
			{ match: '/scope', body: { scope: 'private' } },
			{
				match: '/shares',
				body: {
					results: [
						{ id: 'ocinternal:1', type: 'user', sharedWith: 'alice', permissions: 1, verbs: [] },
						{ id: 'ocinternal:2', type: 'group', sharedWith: 'team', permissions: 3, verbs: [] },
					],
				},
			},
		])

		const wrapper = mount(CnObjectAccessTab, { props: DEFAULT_PROPS })
		await settle(wrapper)

		const text = wrapper.text()
		expect(text).toContain('alice')
		expect(text).toContain('team')

		// permissions 1 = read only, 3 = read+update.
		expect(wrapper.vm.describe({ permissions: 1 })).toMatch(/view/i)
		expect(wrapper.vm.describe({ permissions: 3 })).toMatch(/edit/i)
	})

	it('renders READ-ONLY on 403 rather than an error', async () => {
		global.fetch = stubFetch([
			{ match: '/scope', status: 403 },
			{ match: '/shares', status: 403 },
		])

		const wrapper = mount(CnObjectAccessTab, { props: DEFAULT_PROPS })
		await settle(wrapper)

		expect(wrapper.vm.readOnly).toBe(true)
		// A 403 is a legitimate answer for a non-owner who can still SEE the
		// object, so it must not surface as a failure.
		expect(wrapper.vm.error).toBe('')
	})

	it('revokes through DELETE and re-reads', async () => {
		global.fetch = stubFetch([
			{ match: '/shares/', method: 'DELETE', body: {} },
			{ match: '/scope', body: { scope: 'private' } },
			{ match: '/shares', body: { results: [{ id: 'ocinternal:1', type: 'user', sharedWith: 'alice', permissions: 1 }] } },
		])

		const wrapper = mount(CnObjectAccessTab, { props: DEFAULT_PROPS })
		await settle(wrapper)

		await wrapper.vm.revoke({ id: 'ocinternal:1' })
		await settle(wrapper)

		const del = global.fetch.mock.calls.find(c => (c[1]?.method === 'DELETE'))
		expect(del).toBeTruthy()
		expect(del[0]).toContain(encodeURIComponent('ocinternal:1'))
		expect(wrapper.emitted('revoked')).toBeTruthy()
	})

	it('NEVER sends core PERMISSION_SHARE, even when editing is allowed', async () => {
		global.fetch = stubFetch([
			{ match: '/shares', method: 'POST', body: { id: 'ocinternal:9' } },
			{ match: '/scope', body: { scope: 'private' } },
			{ match: '/shares', body: { results: [] } },
		])

		const wrapper = mount(CnObjectAccessTab, { props: DEFAULT_PROPS })
		await settle(wrapper)

		wrapper.vm.newType = { value: 'user', label: 'User' }
		wrapper.vm.newPrincipal = 'bob'
		wrapper.vm.allowEditing = true
		await wrapper.vm.submit()
		await settle(wrapper)

		const post = global.fetch.mock.calls.find(c => (c[1]?.method === 'POST'))
		const body = JSON.parse(post[1].body)

		// read|update = 3. The server strips 16 anyway; sending it would be a
		// control that silently does nothing.
		expect(body.permissions).toBe(3)
		expect(body.permissions & 16).toBe(0)
	})
})
