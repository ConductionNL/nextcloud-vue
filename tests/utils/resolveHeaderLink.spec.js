/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header link's route params and query read the record the page shows, so a
 * card can link to the page its record names (DqZaaktype "Bekijken als flow").
 *
 * @spec openspec/changes/header-link-param-tokens/specs/header-link-param-tokens/spec.md#requirement-a-header-links-route-params-read-the-record
 */
import { resolveHeaderLink } from '../../src/utils/contentHeaderLink.js'

const LINK = { label: 'View as flow', route: 'WorkflowDefinitionDetail', params: { id: '@object.workflowDefinition' } }

describe('resolveHeaderLink', () => {
	it('fills a route param from the record', () => {
		expect(resolveHeaderLink(LINK, { objectId: 'ct-1', object: { workflowDefinition: 'wf-9' } }))
			.toEqual({ ...LINK, params: { id: 'wf-9' } })
	})

	it('fills @objectId in params and query', () => {
		const link = { label: 'Cases', route: 'Cases', params: { id: '@objectId' }, query: { caseType: '@objectId' } }
		expect(resolveHeaderLink(link, { objectId: 'ct-1', object: {} })).toEqual({ ...link, params: { id: 'ct-1' }, query: { caseType: 'ct-1' } })
	})

	it('drops a link whose route param the record does not hold', () => {
		expect(resolveHeaderLink(LINK, { objectId: 'ct-1', object: {} })).toBeNull()
	})

	it('leaves a link without params as it is', () => {
		const link = { label: 'All', route: 'Cases' }
		expect(resolveHeaderLink(link, {})).toBe(link)
		expect(resolveHeaderLink(null, {})).toBeNull()
	})
})

describe('the strip and a stacked card resolve their header links', () => {
	const fs = require('fs')
	const path = require('path')
	it.each(['CnTabsWidget/CnTabsWidget.vue', 'CnDetailWidgetHost/CnDetailWidgetHost.vue'])('%s', (file) => {
		expect(fs.readFileSync(path.join(__dirname, '../../src/components', file), 'utf8')).toMatch(/resolveHeaderLink\(widgetHeaderLink\(/)
	})
})
