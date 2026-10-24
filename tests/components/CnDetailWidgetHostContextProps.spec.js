/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page widget's props read `@context.<name>.<path>` from the records
 * the page reads beside the record.
 *
 * @spec openspec/changes/files-second-line-fields/specs/files-second-line-fields/spec.md#requirement-widget-props-can-read-the-detail-pages-context-records
 */
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

describe('CnDetailWidgetHost: @context in props', () => {
	it('resolves a context token in the widget props', () => {
		const vm = {
			widget: { props: { secondLine: [{ when: '@context.caseType.documentReview.enabled', fields: ['type'] }] } },
			objectId: 'z-1',
			object: { id: 'z-1' },
			cnAppConfig: {},
			cnDetailVisibilityRows: { value: { caseType: { documentReview: { enabled: true } } } },
		}
		expect(CnDetailWidgetHost.computed.resolvedWidgetProps.call(vm).secondLine[0].when).toBe(true)
	})
})
