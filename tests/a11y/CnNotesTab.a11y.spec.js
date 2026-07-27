/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnNotesTab` — the object-sidebar notes
 * surface (composer + notes list). Part of the `wcag-a11y-anchor` sample.
 *
 * Building this spec surfaced (and this change fixed) two REAL violations:
 *  - a bare `<NcLoadingIcon>` rendered an unlabelled `role="img"` in the
 *    loading state (axe `role-img-alt`, WCAG 1.1.1) — now given an
 *    accessible name via `loadingLabel`.
 *  - notes rendered `<NcListItem>` (`<li>`) inside a plain `<div>` (axe
 *    `listitem`, WCAG 1.3.1) — the wrapper is now a `<ul>`.
 */

jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))

const { mountAttached } = require('./support/mountAttached.js')
const { expectAccessible } = require('../../src/testing/a11y.js')
const CnNotesTab = require('../../src/components/CnObjectSidebar/CnNotesTab.vue').default

describe('CnNotesTab — accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations in the empty state (composer + empty list)', async () => {
		wrapper = mountAttached(CnNotesTab, { propsData: { objectId: 'obj-1' } })
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations in the loading state', async () => {
		wrapper = mountAttached(CnNotesTab, { propsData: { objectId: 'obj-1' } })
		await wrapper.setData({ loading: true })
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with a populated notes list', async () => {
		wrapper = mountAttached(CnNotesTab, { propsData: { objectId: 'obj-1' } })
		await wrapper.setData({
			notes: [
				{ id: '1', actorDisplayName: 'Alice', message: 'First note', creationDateTime: '2026-01-01T10:00:00Z', actorId: 'alice' },
				{ id: '2', actorDisplayName: 'Bob', message: 'Second note', creationDateTime: '2026-01-02T11:00:00Z', actorId: 'bob' },
			],
		})
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})
})
