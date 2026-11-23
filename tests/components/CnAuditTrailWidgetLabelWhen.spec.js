/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The History card widget keeps an action label that depends on the record
 * (a list of `{ when?, text }`) and translates each of its texts.
 *
 * @spec openspec/changes/audit-label-when/specs/audit-trail/spec.md#requirement-an-action-label-can-depend-on-the-record
 */
describe('CnAuditTrailWidget labels by condition', () => {
	it('keeps a list label and translates each of its texts', () => {
		const CnAuditTrailWidget = require('../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue').default
		const ctx = { content: { actionLabels: { create: [{ when: { field: 'campaign', op: 'notEmpty' }, text: 'In campaign' }, { text: 'Created' }] } }, cnTranslate: (k) => `T(${k})` }
		expect(CnAuditTrailWidget.computed.actionLabels.call(ctx)).toEqual({ create: [{ when: { field: 'campaign', op: 'notEmpty' }, text: 'T(In campaign)' }, { text: 'T(Created)' }] })
	})
})
