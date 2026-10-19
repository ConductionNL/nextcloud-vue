/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The files leaf's drop state as board DqZaakDocumentenSlepen draws it: the
 * overlay fills the panel, says "Laat los om toe te voegen" and, under it,
 * where the files go ("3 bestanden komen bij zaak 2026-0082, als nog te
 * beoordelen document."). Both lines go through the host translate, and the
 * files tab (the case files leaf) forwards them.
 *
 * @spec openspec/changes/files-drop-panel/specs/files-browser/spec.md#requirement-the-drop-state-fills-the-panel-and-says-where-the-files-go
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'
import CnFilesTab from '../../src/components/CnObjectSidebar/CnFilesTab.vue'

const NL = {
	'Drop to add here': 'Laat los om toe te voegen',
	'{count} files go to this case, as documents to review.': '{count} bestanden komen bij deze zaak, als nog te beoordelen document.',
}

/**
 * A drag carrying files; `items` lists them when the browser says.
 *
 * @param {number|null} count The files the drag carries, null when unknown.
 * @return {object} The event init.
 */
function filesDrag(count) {
	return {
		dataTransfer: { types: ['Files'], files: [], items: count === null ? undefined : Array.from({ length: count }, () => ({ kind: 'file' })) },
	}
}

/**
 * Mount a browser.
 *
 * @param {object} props Props.
 * @return {import('@vue/test-utils').VueWrapper} The browser.
 */
function mountBrowser(props) {
	return mount(CnFilesBrowser, {
		props: { rootPath: '/Open Registers/Cases/abc', dropOverlay: true, ...props },
		global: {
			provide: { cnTranslate: (key) => NL[key] ?? key },
			stubs: { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' } },
		},
	})
}

describe('CnFilesBrowser drop panel', () => {
	beforeEach(() => {
		global.__cnDavContents = []
		global.__cnFileActions = []
		global.__cnNewMenuEntries = []
	})

	it('says where the files go, with the count, and fills the panel', async () => {
		const w = mountBrowser({ dropLabel: 'Drop to add here', dropDetail: '{count} files go to this case, as documents to review.' })
		await flushPromises()
		await w.trigger('dragenter', filesDrag(3))
		const overlay = w.find('[data-testid="cn-files-browser-drop-overlay"]')
		expect(overlay.find('.cn-files-browser__drop-label').text()).toBe('Laat los om toe te voegen')
		expect(overlay.find('[data-testid="cn-files-browser-drop-detail"]').text()).toBe('3 bestanden komen bij deze zaak, als nog te beoordelen document.')
		expect(w.classes()).toContain('cn-files-browser--drop-panel')
		expect(w.find('[data-testid="cn-files-browser-drop-status"]').text()).toBe('Laat los om toe te voegen 3 bestanden komen bij deze zaak, als nog te beoordelen document.')
		w.unmount()
	})

	it('leaves out a counted line when the browser does not say how many', async () => {
		const w = mountBrowser({ dropDetail: '{count} files go to this case.' })
		await flushPromises()
		await w.trigger('dragenter', filesDrag(null))
		expect(w.find('[data-testid="cn-files-browser-drop-detail"]').exists()).toBe(false)
		w.unmount()
	})

	it('keeps the drop state as it was without a detail line', async () => {
		const w = mountBrowser({})
		await flushPromises()
		await w.trigger('dragenter', filesDrag(2))
		expect(w.find('[data-testid="cn-files-browser-drop-overlay"]').text()).toBe('Drop to add')
		expect(w.classes()).not.toContain('cn-files-browser--drop-panel')
		w.unmount()
	})

	it('fills the panel while dragging with a detail line (stylesheet rule)', () => {
		const sfc = require('fs').readFileSync(require('path').join(__dirname, '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'), 'utf8')
		expect(sfc).toMatch(/\.cn-files-browser--dragging\.cn-files-browser--drop-panel \{[^}]*min-height: max\(320px, 100%\)/)
	})

	it('is forwarded by the files tab', () => {
		const props = CnFilesTab.props
		expect(props.dropLabel).toBeDefined()
		expect(props.dropDetail).toBeDefined()
	})
})
