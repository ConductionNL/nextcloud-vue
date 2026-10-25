/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `@context.<name>.<path>` in a widget's props: a value off the records the
 * detail page reads beside the record (a case's case type).
 *
 * @spec openspec/changes/files-second-line-fields/specs/files-second-line-fields/spec.md#requirement-widget-props-can-read-the-detail-pages-context-records
 */
import { resolveDeepTokens, resolveFilterValue } from '../../src/utils/resolveFilterTokens.js'

describe('@context tokens', () => {
	const context = { caseType: { documentReview: { enabled: true }, name: 'Woo' } }

	it('reads a dot path off a context record', () => {
		expect(resolveFilterValue('@context.caseType.documentReview.enabled', { context })).toBe(true)
		expect(resolveFilterValue('@context.caseType.name', { context })).toBe('Woo')
	})

	it('stays as written while the record is not read or the path is missing', () => {
		expect(resolveFilterValue('@context.caseType.documentReview.enabled', {})).toBe('@context.caseType.documentReview.enabled')
		expect(resolveFilterValue('@context.caseType.nope', { context })).toBe('@context.caseType.nope')
	})

	it('resolves inside nested props', () => {
		expect(resolveDeepTokens({ secondLine: [{ when: '@context.caseType.documentReview.enabled', fields: ['type'] }] }, { context }))
			.toEqual({ secondLine: [{ when: true, fields: ['type'] }] })
	})
})
