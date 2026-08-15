/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnIndexPage's native Export menu URL builder.
 */

import { buildExportUrl } from '../../src/utils/indexExportHelpers.js'

describe('buildExportUrl', () => {
	it('builds a bare export URL with just the format when there is no route query', () => {
		const url = buildExportUrl('procest', 'case', {}, 'csv')
		expect(url).toBe('/apps/openregister/api/objects/procest/case/export?format=csv')
	})

	it('passes route-query filters through after the format', () => {
		const url = buildExportUrl('procest', 'case', { status: 'open', assignee: 'me' }, 'csv')
		expect(url).toBe('/apps/openregister/api/objects/procest/case/export?format=csv&status=open&assignee=me')
	})

	it('supports the excel format', () => {
		const url = buildExportUrl('procest', 'case', {}, 'excel')
		expect(url).toBe('/apps/openregister/api/objects/procest/case/export?format=excel')
	})

	it('defaults a missing/null routeQuery to no extra params', () => {
		expect(buildExportUrl('procest', 'case', null, 'csv'))
			.toBe('/apps/openregister/api/objects/procest/case/export?format=csv')
		expect(buildExportUrl('procest', 'case', undefined, 'csv'))
			.toBe('/apps/openregister/api/objects/procest/case/export?format=csv')
	})

	it('passes array filter values through as repeated key[] params', () => {
		const url = buildExportUrl('procest', 'case', { status: ['open', 'pending'] }, 'csv')
		expect(url).toBe('/apps/openregister/api/objects/procest/case/export?format=csv&status%5B%5D=open&status%5B%5D=pending')
	})

	it('skips null, undefined, and empty-string filter values', () => {
		const url = buildExportUrl('procest', 'case', { status: 'open', assignee: null, team: undefined, note: '' }, 'csv')
		expect(url).toBe('/apps/openregister/api/objects/procest/case/export?format=csv&status=open')
	})

	it('skips an empty-array filter value', () => {
		const url = buildExportUrl('procest', 'case', { status: 'open', tags: [] }, 'csv')
		expect(url).toBe('/apps/openregister/api/objects/procest/case/export?format=csv&status=open')
	})

	it('interpolates register and schema slugs into the path', () => {
		const url = buildExportUrl('myregister', 'myschema', {}, 'csv')
		expect(url).toMatch(/^\/apps\/openregister\/api\/objects\/myregister\/myschema\/export/)
	})
})
