/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record open in the split pane gets the same detail-object context it
 * gets on its own route.
 *
 * `detailLoadContext` read only `currentPage.type`, and a split address
 * resolves to the INDEX page — so the pane got no object context and every
 * `@object.<field>` token in it resolved against nothing.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import { shallowMount } from '@vue/test-utils'
import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'
import { buildManifestRoutes } from '../../src/utils/buildManifestRoutes.js'

const ID = 'b64dc5a3-0130-4399-9345-67138717ae25'

const manifest = {
	$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	menu: [],
	pages: [
		{
			id: 'Cases',
			route: '/cases',
			type: 'index',
			title: 'Cases',
			splitView: { enabled: true, breakpoint: 900 },
			config: { register: 'dossiq', schema: 'case' },
		},
		{
			id: 'CaseDetail',
			route: '/cases/:id',
			type: 'detail',
			title: 'Case',
			config: { register: 'dossiq', schema: 'case' },
		},
	],
}

const IndexStub = { name: 'IndexStub', render: () => null }
const DetailStub = { name: 'DetailStub', render: () => null }

function mountOn(route) {
	const records = buildManifestRoutes(manifest, { component: CnPageRenderer })
	return shallowMount(CnPageRenderer, {
		propsData: { manifest, pageTypes: { index: IndexStub, detail: DetailStub } },
		mocks: {
			$route: route,
			$router: {
				push: jest.fn(() => Promise.resolve()),
				resolve: () => ({ href: '#/x' }),
				hasRoute: (name) => records.some((r) => r.name === name),
				getRoutes: () => records,
			},
		},
	})
}

const records = buildManifestRoutes(manifest, { component: CnPageRenderer })
const splitRecord = records.find((r) => r.meta?.cnSplitOf === 'Cases')
const detailRecord = records.find((r) => r.name === 'CaseDetail')

const splitRoute = {
	name: splitRecord.name,
	path: `/cases/split/${ID}`,
	params: { id: ID, splitId: ID },
	query: {},
	meta: splitRecord.meta,
}
const detailRoute = {
	name: 'CaseDetail',
	path: `/cases/${ID}`,
	params: { id: ID },
	query: {},
	meta: detailRecord.meta,
}
const listRoute = {
	name: 'Cases',
	path: '/cases',
	params: {},
	query: {},
	meta: { cnPageId: 'Cases' },
}

describe('CnPageRenderer — the detail-object context on a split address', () => {
	it('resolves the same context the record’s own route resolves', () => {
		const pane = mountOn(splitRoute).vm.detailLoadContext
		const full = mountOn(detailRoute).vm.detailLoadContext

		expect(pane).not.toBeNull()
		expect(pane).toEqual(full)
	})

	it('names the record the SPLIT address names', () => {
		expect(mountOn(splitRoute).vm.detailLoadContext).toEqual({
			register: 'dossiq',
			schema: 'case',
			objectId: ID,
			slug: 'dossiq-case',
		})
	})

	it('stays null on the plain list, where no record is open', () => {
		expect(mountOn(listRoute).vm.detailLoadContext).toBeNull()
	})

	it('stays null for a split address whose list has no detail page to open', () => {
		const lonely = {
			...manifest,
			pages: [manifest.pages[0]],
		}
		const lonelyRecords = buildManifestRoutes(lonely, { component: CnPageRenderer })
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest: lonely, pageTypes: { index: IndexStub, detail: DetailStub } },
			mocks: {
				$route: splitRoute,
				$router: {
					push: jest.fn(() => Promise.resolve()),
					resolve: () => ({ href: '#/x' }),
					hasRoute: (name) => lonelyRecords.some((r) => r.name === name),
					getRoutes: () => lonelyRecords,
				},
			},
		})

		expect(wrapper.vm.detailLoadContext).toBeNull()
	})
})
