/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The files browser's root crumb names the object, not the uuid its folder is
 * called on disk (a dossiq case read "95096834-daa7-…" on 10 October 2026).
 *
 * @spec openspec/changes/dutch-library-strings-and-files-crumb/specs/dutch-library-strings-and-files-crumb/spec.md#requirement-the-files-browser-names-the-object-in-its-root-crumb
 */

const { flushPromises, mount } = require('@vue/test-utils')

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
jest.mock('../../src/components/CnFilesBrowser/filesBrowser.js', () => ({
	...jest.requireActual('../../src/components/CnFilesBrowser/filesBrowser.js'),
	resolveObjectFolderInfo: jest.fn(),
}))

const { objectDisplayName, resolveObjectFolderInfo } = require('../../src/components/CnFilesBrowser/filesBrowser.js')
const CnFilesTab = require('../../src/components/CnObjectSidebar/CnFilesTab.vue').default

const UUID = '95096834-daa7-4aee-8770-08ee81617204'

/**
 * Mount the tab with the folder lookup answering `info`, the browser stubbed.
 *
 * @param {object|null} info What resolveObjectFolderInfo answers.
 * @param {object} props Extra props.
 * @return {Promise<object>} The browser stub.
 */
async function browserFor(info, props = {}) {
	resolveObjectFolderInfo.mockResolvedValue(info)
	global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [], total: 0 }) })
	const wrapper = mount(CnFilesTab, {
		propsData: { objectId: UUID, register: 'dossiq', schema: 'case', ...props },
		global: { stubs: { CnFilesBrowser: { name: 'CnFilesBrowser', props: ['rootPath', 'rootLabel'], template: '<div class="browser-stub" />' } } },
	})
	await flushPromises()
	return wrapper.findComponent({ name: 'CnFilesBrowser' })
}

describe('the files browser root crumb', () => {
	it('reads the object name', async () => {
		const browser = await browserFor({ path: `/Open Registers/${UUID}`, name: 'Verbouwing Herengracht 12' })
		expect(browser.props('rootPath')).toBe(`/Open Registers/${UUID}`)
		expect(browser.props('rootLabel')).toBe('Verbouwing Herengracht 12')
	})

	it('keeps a label the host passes', async () => {
		const browser = await browserFor({ path: `/Open Registers/${UUID}`, name: 'Verbouwing' }, { browserRootLabel: 'Zaakdossier' })
		expect(browser.props('rootLabel')).toBe('Zaakdossier')
	})

	it('falls back to the folder name when the object has none', async () => {
		const browser = await browserFor({ path: `/Open Registers/${UUID}`, name: null })
		expect(browser.props('rootLabel')).toBeNull()
	})
})

describe('objectDisplayName', () => {
	it('prefers @self.name, then title, then name, and never the uuid', () => {
		expect(objectDisplayName({ '@self': { name: 'Self' }, title: 'Title' }, UUID)).toBe('Self')
		expect(objectDisplayName({ '@self': { name: UUID }, title: 'Title' }, UUID)).toBe('Title')
		expect(objectDisplayName({ name: ' Name ' }, UUID)).toBe('Name')
		expect(objectDisplayName({ '@self': { name: UUID } }, UUID)).toBeNull()
		expect(objectDisplayName(null, UUID)).toBeNull()
	})
})
