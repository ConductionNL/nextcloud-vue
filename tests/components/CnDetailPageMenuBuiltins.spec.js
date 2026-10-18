/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakMeer's Actions menu: no "Markeren als ongelezen" and no "Zijbalk
 * openen", and each admin-only entry ends in a muted "beheerder" tag. A page
 * can drop the two built-ins with `actionsMenu.showMarkUnread: false` and
 * `actionsMenu.showOpenSidebar: false`; the tag comes with the board look.
 */
const fs = require('fs')
const path = require('path')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const { showMarkUnread, showOpenSidebar } = CnDetailPage.computed

/**
 * A stand-in for the page's `this`, with Mark as unread and Open sidebar on.
 *
 * @param {object} over Fields to set.
 * @return {object} The context.
 */
function ctx(over = {}) {
	return {
		actionsMenu: null,
		resolvedSelf: { unread: false },
		register: 'dossiq',
		schema: 'case',
		objectId: 'c-1',
		isBoard: true,
		hasExternalSidebar: true,
		sidebarActive: true,
		objectSidebarState: { open: false },
		...over,
	}
}

describe('CnDetailPage menu built-ins', () => {
	it('offers both built-ins by default', () => {
		expect(showMarkUnread.call(ctx())).toBe(true)
		expect(showOpenSidebar.call(ctx())).toBe(true)
	})

	it('drops each one on its own switch', () => {
		expect(showMarkUnread.call(ctx({ actionsMenu: { showMarkUnread: false } }))).toBe(false)
		expect(showOpenSidebar.call(ctx({ actionsMenu: { showMarkUnread: false } }))).toBe(true)
		expect(showOpenSidebar.call(ctx({ actionsMenu: { showOpenSidebar: false } }))).toBe(false)
		expect(showMarkUnread.call(ctx({ actionsMenu: { showOpenSidebar: false } }))).toBe(true)
	})

	it('accepts the two switches in the manifest', () => {
		const manifest = (actionsMenu) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [],
			pages: [{ id: 'case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'dossiq', schema: 'case', actionsMenu } }],
		})
		expect(validateManifestV2(manifest({ showMarkUnread: false, showOpenSidebar: false })).valid).toBe(true)
		expect(validateManifestV2(manifest({ showMarkUnread: 'no' })).valid).toBe(false)
	})
})

describe('CnDetailPage admin tag', () => {
	const tagFor = (isBoard, group) => CnDetailPage.methods.adminTagFor.call({ isBoard }, group)

	it('tags an entry in the admin group in the board look only', () => {
		expect(tagFor(true, { key: 'cn-admin' })).toBe('admin')
		expect(tagFor(false, { key: 'cn-admin' })).toBeNull()
		expect(tagFor(true, { key: '' })).toBeNull()
		expect(tagFor(true, { key: 'cn-group-0' })).toBeNull()
	})

	it('draws the tag as muted text at the end of the row, from the attribute', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/detail-page.css'), 'utf8')
		const at = css.indexOf('.action-button[data-cn-admin-tag]::after')
		expect(at).toBeGreaterThan(-1)
		const rule = css.slice(at, css.indexOf('}', at))
		expect(rule).toContain('content: attr(data-cn-admin-tag)')
		expect(rule).toContain('margin-inline-start: auto')
		expect(rule).toContain('color: var(--color-text-maxcontrast)')
	})

	it('reads "beheerder" in Dutch', () => {
		expect(require('../../l10n/nl.json').translations.admin).toBe('beheerder')
	})
})
