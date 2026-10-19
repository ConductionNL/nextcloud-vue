/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page's default views merge by `slug` with the per-user manifest delta
 * (`/api/manifest`): dossiq turns a user's case type pins into per-user
 * default views, and those must join the page's own defaults (such as
 * `woo-requests`) instead of replacing them. A menu entry `default:<slug>`
 * then resolves against the merged list.
 *
 * @spec openspec/changes/my-filters-menu-section/specs/app-nav/spec.md#requirement-default-views-from-the-user-delta-join-the-page-defaults
 */
const { KEYED_ARRAYS, mergeManifestDelta } = require('../../src/utils/mergeManifestDelta.js')
const { syncSavedFilterMenu } = require('../../src/utils/savedFilterMenu.js')
const { defaultFilterViews } = require('../../src/utils/savedViewHelpers.js')

const BASE = {
	pages: [{
		id: 'Cases',
		type: 'index',
		config: { defaultSavedViews: [{ slug: 'woo-requests', name: 'Woo requests', filters: { caseType: 'woo' } }] },
	}],
}

const DELTA = {
	pages: [{
		id: 'Cases',
		config: {
			defaultSavedViews: [
				{ slug: 'pin-objection', name: 'Objections', filters: { caseType: 'objection' } },
				{ slug: 'pin-complaint', name: 'Complaints', filters: { caseType: 'complaint' } },
			],
		},
	}],
}

describe('mergeManifestDelta default views', () => {
	it('merges defaultSavedViews by slug', () => {
		expect(KEYED_ARRAYS.defaultSavedViews).toBe('slug')
	})

	it('keeps the page default and adds the two from the delta', () => {
		const { manifest } = mergeManifestDelta(BASE, DELTA)
		expect(manifest.pages[0].config.defaultSavedViews.map((view) => view.slug)).toEqual(['woo-requests', 'pin-objection', 'pin-complaint'])
	})

	it('lets the delta patch or remove one default by slug', () => {
		const { manifest } = mergeManifestDelta(BASE, {
			pages: [{ id: 'Cases', config: { defaultSavedViews: [{ slug: 'woo-requests', name: 'Woo' }, { slug: 'pin-x', name: 'X' }] } }],
		})
		expect(manifest.pages[0].config.defaultSavedViews).toEqual([
			{ slug: 'woo-requests', name: 'Woo', filters: { caseType: 'woo' } },
			{ slug: 'pin-x', name: 'X' },
		])
		const removed = mergeManifestDelta(BASE, { pages: [{ id: 'Cases', config: { defaultSavedViews: [{ slug: 'woo-requests', $op: 'remove' }] } }] })
		expect(removed.manifest.pages[0].config.defaultSavedViews).toEqual([])
	})

	it('resolves a default:<slug> menu entry against a default the delta brought in', () => {
		const { manifest } = mergeManifestDelta(BASE, DELTA)
		const views = defaultFilterViews(manifest.pages[0].config.defaultSavedViews, { register: 'dossiq', schema: 'case' })
		const menu = [
			{ id: 'default:pin-objection', page: 'Cases', name: 'Objections' },
			{ id: 'default:woo-requests', page: 'Cases', name: 'Woo requests' },
		]
		expect(syncSavedFilterMenu(menu, 'Cases', views).map((entry) => entry.id)).toEqual(['default:pin-objection', 'default:woo-requests'])
	})

	it('leaves the base untouched', () => {
		mergeManifestDelta(BASE, DELTA)
		expect(BASE.pages[0].config.defaultSavedViews).toHaveLength(1)
	})
})
