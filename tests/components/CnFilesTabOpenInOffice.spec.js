/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * "Open in Office" on a file row of CnFilesTab.
 *
 * An object's files live in the `openregister` account's home (OpenRegister
 * #4316), so Nextcloud Office's own Files action cannot open them for the
 * person looking at the object. OpenRegister serves an Office page that
 * applies the object rule itself: update opens the document for editing, read
 * opens it read-only, no read is a 404. The row links to that page.
 *
 * The link shows only when Office is there for this person and opens the
 * type: richdocuments publishes its capabilities only for a person it lets
 * use Office, and lists the mime types it opens by default.
 */

const { flushPromises, mount } = require('@vue/test-utils')

jest.mock('vue-material-design-icons/Delete.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/FileOutline.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/OpenInNew.vue', () => ({ template: '<span/>' }), { virtual: true })
jest.mock('vue-material-design-icons/Upload.vue', () => ({ template: '<span/>' }), { virtual: true })

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

const { getCapabilities } = require('@nextcloud/capabilities')
const CnFilesTab = require('../../src/components/CnObjectSidebar/CnFilesTab.vue').default

const ODT = 'application/vnd.oasis.opendocument.text'
const OFFICE = { richdocuments: { mimetypes: [ODT, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] } }

/**
 * Mount the tab with the given file rows answered by the files endpoint.
 *
 * @param {Array<object>} files The rows.
 * @return {Promise<object>} The wrapper, with the rows rendered.
 */
async function mountWithFiles(files) {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({ results: files, total: files.length }),
	})
	const wrapper = mount(CnFilesTab, {
		propsData: { objectId: 'obj 1', register: 'cases', schema: 'case' },
	})
	await flushPromises()
	return wrapper
}

/**
 * The Office links in the rendered rows.
 *
 * @param {object} wrapper The mounted tab.
 * @return {Array<object>} The NcActionLink stubs that point at the Office page.
 */
function officeLinks(wrapper) {
	return wrapper.findAll('.stub.NcActionLink').filter((link) => String(link.attributes('href') || '').includes('/apps/openregister/office/'))
}

describe('CnFilesTab "Open in Office"', () => {
	afterEach(() => {
		delete global.fetch
		getCapabilities.mockReset()
		getCapabilities.mockImplementation(() => ({}))
	})

	it('links a document Office opens to OpenRegister\'s Office page for the object', async () => {
		getCapabilities.mockImplementation(() => OFFICE)
		const wrapper = await mountWithFiles([{ id: 77, name: 'besluit.odt', type: ODT, path: '/openregister/files/x/besluit.odt' }])

		const links = officeLinks(wrapper)
		expect(links).toHaveLength(1)
		const href = links[0].attributes('href')
		// Register, schema and object id are path segments, so they are encoded.
		expect(href).toMatch(/\/apps\/openregister\/office\/cases\/case\/obj%201\/77$/)
		// It opens in its own tab: the person stays on the object.
		expect(links[0].attributes('target')).toBe('_blank')
		// The visible label is the accessible name of the menu entry.
		expect(links[0].text()).toContain('Open in Office')
	})

	it('reads the mime type from any of the keys OpenRegister uses', async () => {
		getCapabilities.mockImplementation(() => OFFICE)
		const wrapper = await mountWithFiles([
			{ id: 1, name: 'a.odt', mimetype: ODT },
			{ id: 2, name: 'b.odt', mimeType: ODT },
		])

		expect(officeLinks(wrapper)).toHaveLength(2)
	})

	it('shows no Office action when richdocuments publishes no capabilities', async () => {
		getCapabilities.mockImplementation(() => ({}))
		const wrapper = await mountWithFiles([{ id: 77, name: 'besluit.odt', type: ODT }])

		expect(officeLinks(wrapper)).toHaveLength(0)
		expect(wrapper.text()).not.toContain('Open in Office')
	})

	it('shows no Office action for a type Office does not open', async () => {
		getCapabilities.mockImplementation(() => OFFICE)
		const wrapper = await mountWithFiles([{ id: 5, name: 'photo.png', type: 'image/png' }])

		expect(officeLinks(wrapper)).toHaveLength(0)
	})

	it('shows no Office action when the capability lookup throws', async () => {
		getCapabilities.mockImplementation(() => {
			throw new Error('no initial state')
		})
		const wrapper = await mountWithFiles([{ id: 77, name: 'besluit.odt', type: ODT }])

		expect(officeLinks(wrapper)).toHaveLength(0)
	})

	it('follows a custom apiBase to the Office page of the same app', async () => {
		getCapabilities.mockImplementation(() => OFFICE)
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ results: [{ id: 9, name: 'c.odt', type: ODT }], total: 1 }),
		})
		const wrapper = mount(CnFilesTab, {
			propsData: { objectId: 'o', register: 'r', schema: 's', apiBase: '/apps/openregister/api' },
		})
		await flushPromises()

		expect(wrapper.vm.officeUrlFor({ id: 9 })).toMatch(/\/apps\/openregister\/office\/r\/s\/o\/9$/)
	})

	it('lets a host relabel the action', async () => {
		getCapabilities.mockImplementation(() => OFFICE)
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ results: [{ id: 9, name: 'c.odt', type: ODT }], total: 1 }),
		})
		const wrapper = mount(CnFilesTab, {
			propsData: { objectId: 'o', register: 'r', schema: 's', openInOfficeLabel: 'Bewerk in Office' },
		})
		await flushPromises()

		expect(officeLinks(wrapper)[0].text()).toContain('Bewerk in Office')
	})
})
