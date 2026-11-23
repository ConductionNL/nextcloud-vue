/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * At its root the files browser marks the trail as at-root, and the board look
 * draws no trail there (DqZaakDocumenten: the bar holds the buttons only); in
 * a subfolder the trail shows.
 *
 * @spec openspec/changes/board-files-root-crumb/specs/board-files-root-crumb/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function mountBrowser() {
	return mount(CnFilesBrowser, {
		props: { rootPath: '/Open Registers/Cases/abc' },
		global: { stubs: { NcDateTime: { template: '<time />' }, NcIconSvgWrapper: { template: '<i />' } } },
	})
}

describe('CnFilesBrowser trail at the root', () => {
	beforeEach(() => {
		global.__cnDavContents = []
		global.__cnFileActions = []
		global.__cnNewMenuEntries = []
	})

	it('is marked at-root at the root and not in a subfolder', async () => {
		const w = mountBrowser()
		await flushPromises()
		expect(w.find('.cn-files-browser__crumbs').classes()).toContain('cn-files-browser__crumbs--at-root')
		await w.setData({ currentPath: '/Open Registers/Cases/abc/Scans' })
		expect(w.find('.cn-files-browser__crumbs').classes()).not.toContain('cn-files-browser__crumbs--at-root')
		w.unmount()
	})

	it('is not drawn at the root in the board look', () => {
		const at = css.indexOf('.cn-look-board .cn-files-browser__crumbs--at-root:not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toMatch(/display:\s*none/)
	})
})
