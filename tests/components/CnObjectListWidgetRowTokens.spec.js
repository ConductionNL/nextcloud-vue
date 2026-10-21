/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Row actions on an object list read the row they run on: `@row.<field>` and
 * `{field}` (dot paths) in a target, url, payload or props fill from the row.
 * A navigate row action with row tokens is a per-row link
 * (DqZaakGerelateerd: each object row's "Alle zaken op dit object").
 *
 * @spec openspec/changes/object-list-row-tokens/specs/object-list/spec.md#requirement-a-row-action-can-read-its-row
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import { fillRowTokens } from '../../src/utils/rowTokens.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: () => Promise.resolve({ status: 200, data: { results: [], total: 0 } }) },
}))

const ROW = { id: 'obj-7', name: 'Lichtmast 15', location: { code: 'LM-0015' }, objectUrl: 'https://or.example/api/objects/7?register=a&schema=b' }

describe('fillRowTokens', () => {
	it('fills @row.<field> and {field} from the row, dot paths included', () => {
		expect(fillRowTokens('/cases?object=@row.id', ROW)).toBe('/cases?object=obj-7')
		expect(fillRowTokens('/objects/{location.code}/cases', ROW)).toBe('/objects/LM-0015/cases')
	})

	it('leaves page tokens and {objectId} for the page context', () => {
		expect(fillRowTokens('/api/case/@objectId/link/{id}', ROW)).toBe('/api/case/@objectId/link/obj-7')
		expect(fillRowTokens('/api/{objectId}/x', ROW)).toBe('/api/{objectId}/x')
	})

	it('fills a missing field as empty and walks objects and arrays', () => {
		expect(fillRowTokens('@row.nope', ROW)).toBe('')
		expect(fillRowTokens({ query: { object: '@row.id' }, list: ['{name}'] }, ROW)).toEqual({ query: { object: 'obj-7' }, list: ['Lichtmast 15'] })
	})
})

describe('fillRowTokens encoding', () => {
	it('URL-encodes a row value in a target or url', () => {
		expect(fillRowTokens('/cases?object={objectUrl}', ROW, { encode: true })).toBe('/cases?object=https%3A%2F%2For.example%2Fapi%2Fobjects%2F7%3Fregister%3Da%26schema%3Db')
	})
})

describe('CnObjectListWidget row tokens', () => {
	function mountList(rowActions, extra = {}) {
		const resolve = (to) => ({ href: `/index.php/apps/dossiq${typeof to === 'string' ? to : '/' + to.name}` })
		return shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'r', schema: 'object', columns: [{ key: 'name', label: 'Naam', widget: 'text' }], rowActions } },
			global: { mocks: { $router: { resolve, push: jest.fn(() => Promise.resolve()) } }, stubs: { CnDataTable: true }, ...extra },
		})
	}

	it('makes a navigate action with row tokens a per-row link', () => {
		const w = mountList([{ label: 'Alle zaken op dit object', type: 'navigate', target: '/cases?object=@row.id' }])
		const [action] = w.vm.mappedRowActions
		expect(typeof action.to).toBe('function')
		expect(action.to(ROW)).toBe('/cases?object=obj-7')
		expect(action.href(ROW)).toBe('')
	})

	it('makes an external navigate action with row tokens a per-row href', () => {
		const w = mountList([{ label: 'Kaart', type: 'navigate', target: 'https://kaart.example/?code={location.code}' }])
		const [action] = w.vm.mappedRowActions
		expect(action.href(ROW)).toBe('https://kaart.example/?code=LM-0015')
		expect(action.to(ROW)).toBeNull()
	})

	it('makes a navigate action with route and a row-token query a per-row router location', () => {
		const w = mountList([{ label: 'Alle zaken op dit object', type: 'navigate', route: 'Cases', query: { '_related[caseObject][case][objectUrl]': '{objectUrl}' } }])
		const [action] = w.vm.mappedRowActions
		expect(action.to(ROW)).toEqual({ name: 'Cases', query: { '_related[caseObject][case][objectUrl]': ROW.objectUrl } })
		expect(action.href(ROW)).toBe('')
	})

	it('encodes a row value that lands in a navigate target', () => {
		const w = mountList([{ label: 'Zaken', type: 'navigate', target: '/cases?object={objectUrl}' }])
		const [action] = w.vm.mappedRowActions
		expect(action.to(ROW)).toBe('/cases?object=' + encodeURIComponent(ROW.objectUrl))
	})

	it('fills the row into an action it dispatches', () => {
		const dispatch = jest.fn()
		const encoded = mountList([{ label: 'Koppelen', type: 'api-call', url: '/apps/dossiq/api/link?object={objectUrl}' }], { provide: { cnDispatchAction: dispatch } })
		encoded.vm.runRowAction(encoded.vm.content.rowActions[0], ROW)
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ url: '/apps/dossiq/api/link?object=' + encodeURIComponent(ROW.objectUrl) }))
		dispatch.mockClear()
		const w = mountList([{ label: 'Koppelen', type: 'api-call', url: '/apps/dossiq/api/objects/{id}/link', payload: { name: '@row.name' } }], { provide: { cnDispatchAction: dispatch } })
		w.vm.runRowAction(w.vm.content.rowActions[0], ROW)
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ url: '/apps/dossiq/api/objects/obj-7/link', payload: { name: 'Lichtmast 15' } }))
	})
})
