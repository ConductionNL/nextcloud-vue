/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The files browser re-reads its folder when the page says files changed, and
 * a declared row action reads in the user's language.
 *
 * Zuiddrecht rehearsal R2 (15 Oct): a dossiq case's Files tab kept a deleted
 * file until the page was reloaded (the Files app's delete finishes after its
 * own call returned), a document filed by a dialog elsewhere on the page never
 * appeared, and the manifest's row actions ("Document properties") were
 * English on a Dutch instance.
 *
 * @spec openspec/changes/files-browser-hears-the-page/specs/files-browser/spec.md#requirement-the-files-browser-re-reads-when-the-page-says-files-changed
 */
import { emit } from '@nextcloud/event-bus'
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'

const ROOT = '/files/admin/Open Registers/Cases/abc'
const STUBS = { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' }, CnIcon: { template: '<i />' } }

/**
 * A listing of the folder with the given files.
 *
 * @param {string[]} names The file names.
 * @return {object[]} The DAV listing.
 */
function listing(names) {
	return [
		{ filename: ROOT, basename: 'abc', type: 'directory', props: { fileid: 10 } },
		...names.map((name, i) => ({ filename: `${ROOT}/${name}`, basename: name, type: 'file', mime: 'application/pdf', size: 10, lastmod: '2026-10-15T10:00:00Z', props: { fileid: 20 + i } })),
	]
}

/**
 * The file names the browser shows.
 *
 * @param {object} wrapper The mounted browser.
 * @return {string[]} The names.
 */
function shown(wrapper) {
	return wrapper.findAll('[data-testid="cn-files-browser-row"]').map((row) => row.attributes('data-name'))
}

/**
 * Wait past the browser's debounce.
 *
 * @return {Promise<void>}
 */
async function afterDebounce() {
	await new Promise((resolve) => setTimeout(resolve, 350))
	await flushPromises()
}

/**
 * Mount the browser on the folder.
 *
 * @param {object} [options] Extra mount options.
 * @return {Promise<object>} The wrapper.
 */
async function mountBrowser(options = {}) {
	const wrapper = mount(CnFilesBrowser, {
		propsData: { rootPath: '/Open Registers/Cases/abc', ...(options.propsData || {}) },
		global: { stubs: STUBS, ...(options.global || {}) },
	})
	await flushPromises()
	return wrapper
}

describe('CnFilesBrowser hears the page', () => {
	beforeEach(() => {
		global.__cnDavContents = listing(['a.pdf', 'b.pdf'])
		global.__cnFileActions = []
		global.__cnNewMenuEntries = []
	})

	afterEach(() => {
		delete global.__cnDavContents
		delete global.__cnFileActions
		delete global.__cnNewMenuEntries
	})

	it.each(['files:node:deleted', 'files:node:created', 'cn:page:refresh'])('re-reads the folder on %s', async (channel) => {
		const wrapper = await mountBrowser()
		expect(shown(wrapper)).toEqual(['a.pdf', 'b.pdf'])

		global.__cnDavContents = listing(['a.pdf', 'c.pdf'])
		emit(channel, {})
		await afterDebounce()

		expect(shown(wrapper)).toEqual(['a.pdf', 'c.pdf'])
		wrapper.unmount()
	})

	it('control: without a signal the folder is not re-read', async () => {
		const wrapper = await mountBrowser()
		global.__cnDavContents = listing(['a.pdf', 'c.pdf'])
		await afterDebounce()

		expect(shown(wrapper)).toEqual(['a.pdf', 'b.pdf'])
		wrapper.unmount()
	})

	it('stops listening once unmounted', async () => {
		const wrapper = await mountBrowser()
		const refresh = jest.spyOn(wrapper.vm, 'refresh')
		wrapper.unmount()

		emit('cn:page:refresh', {})
		await afterDebounce()

		expect(refresh).not.toHaveBeenCalled()
	})

	it('reads a declared row action through the host translation', async () => {
		const wrapper = await mountBrowser({
			propsData: { rowActions: [{ id: 'properties', label: 'Document properties', type: 'open-modal', target: 'X' }] },
			global: { provide: { cnTranslate: (key) => (key === 'Document properties' ? 'Documenteigenschappen' : key) } },
		})

		expect(wrapper.find('[data-testid="cn-files-browser-host-action-properties"]').text()).toContain('Documenteigenschappen')
		wrapper.unmount()
	})
})
