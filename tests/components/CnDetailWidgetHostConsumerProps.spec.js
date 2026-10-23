/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An app's own widget takes its props from the manifest: `props` values are
 * literals or `@objectId` / `@object.<field>` / `@content.<path>` /
 * `@config.<key>` tokens. Only the props the component declares are passed,
 * an unresolved token is left out so the component's default holds, and a
 * widget that asks for `@objectId` waits until the page has one.
 *
 * @spec openspec/changes/consumer-widget-props/specs/detail-page/spec.md#requirement-an-app-widget-takes-its-props-from-the-manifest
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const Relations = {
	name: 'Relations',
	props: {
		entityId: { type: String, default: '' },
		entityType: { type: String, default: 'contact' },
		entityName: { type: String, default: '' },
		category: { type: String, default: 'none' },
	},
	template: '<div class="relations">{{ entityId }}|{{ entityType }}|{{ entityName }}|{{ category }}</div>',
}

/**
 * Mount the host with one consumer widget.
 *
 * @param {object} widget The widget definition.
 * @param {object} [props] Extra host props.
 * @return {object} The wrapper.
 */
function mountHost(widget, props = {}) {
	return mount(CnDetailWidgetHost, {
		props: {
			widget: { id: 'w', type: 'relations', ...widget },
			objectId: 'client-1',
			object: { id: 'client-1', name: 'Acme' },
			cnRegistry: { relations: { kind: 'widget', component: Relations } },
			...props,
		},
		global: { mocks: { t: (_a, s) => s } },
	})
}

describe('CnDetailWidgetHost: an app widget takes its props from the manifest', () => {
	it('resolves @objectId, @object.<field> and @content.<path>, and passes literals', () => {
		const w = mountHost({
			content: { kind: 'client' },
			props: { entityId: '@objectId', entityName: '@object.name', entityType: '@content.kind' },
		})
		expect(w.find('.relations').text()).toBe('client-1|client|Acme|none')
	})

	it('leaves an unresolved token out, so the default holds', () => {
		const w = mountHost({ props: { entityId: '@objectId', category: '@object.category', entityType: 'client' } })
		expect(w.find('.relations').text()).toBe('client-1|client||none')
	})

	it('waits for the record id a widget asks for', () => {
		const w = mountHost({ props: { entityId: '@objectId' } }, { objectId: '', object: null })
		expect(w.find('.relations').exists()).toBe(false)
	})

	it('passes only the props the component declares', () => {
		const w = mountHost({ props: { entityId: '@objectId', stray: 'x' } })
		expect(w.find('.relations').attributes('stray')).toBeUndefined()
	})
})
