/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Query presets on an index page: the menu entry's query (dossiq's Woo
 * requests entry, `?caseType=<uuid>` on the Cases list) brings its own lenses,
 * columns and title, and switching preset remounts the list.
 *
 * @spec openspec/changes/screens-index-query-presets/specs/index-query-presets/spec.md#requirement-a-query-preset-overlays-lenses-columns-and-copy
 */
import { shallowMount } from '@vue/test-utils'
import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'
import { buildManifestRoutes } from '../../src/utils/buildManifestRoutes.js'
import { applyQueryPreset, matchQueryPreset } from '../../src/utils/queryPresets.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const WOO = {
	id: 'woo',
	match: { caseType: 'uuid-woo' },
	title: 'Woo requests',
	quickFilters: [{ label: 'All', filter: {}, default: true }, { label: 'Overdue', filter: { overdue: true } }],
	columns: ['title', 'requester', 'receivedAt'],
}

const manifest = {
	$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	menu: [],
	pages: [{
		id: 'Cases',
		route: '/cases',
		type: 'index',
		title: 'Cases',
		config: {
			register: 'dossiq',
			schema: 'case',
			quickFilters: [{ label: 'Mine', filter: { assignee: '@me' } }],
			columns: ['title', 'status'],
			queryPresets: [WOO],
		},
	}],
}

const IndexStub = { name: 'IndexStub', render: () => null }

function mountOn(query) {
	const records = buildManifestRoutes(manifest, { component: CnPageRenderer })
	return shallowMount(CnPageRenderer, {
		propsData: { manifest, pageTypes: { index: IndexStub } },
		mocks: {
			$route: { name: 'Cases', params: {}, query, meta: { cnPageId: 'Cases' } },
			$router: { push: jest.fn(() => Promise.resolve()), hasRoute: () => true, getRoutes: () => records },
		},
	})
}

describe('matchQueryPreset and applyQueryPreset', () => {
	it('matches only when every pair is in the query, a repeated parameter included', () => {
		const presets = [{ match: { a: '1', b: 'x' } }, { match: { a: '1' } }, { match: {} }]
		expect(matchQueryPreset(presets, { a: '1' })).toBe(1)
		expect(matchQueryPreset(presets, { a: '1', b: 'x' })).toBe(0)
		expect(matchQueryPreset(presets, { a: ['2', '1'] })).toBe(1)
		expect(matchQueryPreset(presets, {})).toBe(-1)
		expect(matchQueryPreset(null, { a: '1' })).toBe(-1)
	})

	it('replaces only the allowed keys and drops queryPresets', () => {
		const out = applyQueryPreset({ register: 'dossiq', schema: 'case', columns: ['a'], queryPresets: [WOO] }, { ...WOO, register: 'other' })
		expect(out).toEqual({ register: 'dossiq', schema: 'case', columns: WOO.columns, quickFilters: WOO.quickFilters })
		expect(applyQueryPreset({ columns: ['a'], queryPresets: [] }, null)).toEqual({ columns: ['a'] })
	})
})

describe('CnPageRenderer with a query preset', () => {
	it('hands the page the preset lenses, columns and title when the query matches', () => {
		const w = mountOn({ caseType: 'uuid-woo' })
		expect(w.vm.activeQueryPresetIndex).toBe(0)
		expect(w.vm.resolvedProps.quickFilters).toEqual(WOO.quickFilters)
		expect(w.vm.resolvedProps.columns).toEqual(WOO.columns)
		expect(w.vm.resolvedProps.title).toBe('Woo requests')
		expect(w.vm.resolvedProps.register).toBe('dossiq')
		expect(w.vm.resolvedProps.queryPresets).toBeUndefined()
	})

	it('keeps the page config without a match', () => {
		const w = mountOn({ caseType: 'other' })
		expect(w.vm.activeQueryPresetIndex).toBe(-1)
		expect(w.vm.resolvedProps.columns).toEqual(['title', 'status'])
		expect(w.vm.resolvedProps.title).toBe('Cases')
		expect(w.vm.resolvedProps.queryPresets).toBeUndefined()
	})

	it('remounts the list when the preset changes', () => {
		expect(mountOn({ caseType: 'uuid-woo' }).vm.pageRenderKey).not.toBe(mountOn({}).vm.pageRenderKey)
	})

	it('validates as a manifest key and refuses a preset without match', () => {
		expect(validateManifestV2(manifest).valid).toBe(true)
		const bad = JSON.parse(JSON.stringify(manifest))
		bad.pages[0].config.queryPresets = [{ title: 'No match' }]
		expect(validateManifestV2(bad).valid).toBe(false)
	})
})
