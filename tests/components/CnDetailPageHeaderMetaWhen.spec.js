/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqOfferte's header line reads "nog niet verstuurd · prijzen excl. btw" on a
 * draft and names the day it was sent once it is: `headerMetaWhen` lists
 * `{ when, text }` entries and the first whose condition holds for the record
 * replaces `headerMeta`.
 *
 * @spec openspec/changes/header-meta-when/specs/detail-page/spec.md#requirement-a-header-line-can-depend-on-the-record
 */
const { mount } = require('@vue/test-utils')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

/**
 * @param {object} object The record.
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountPage(object, props) {
	const store = {
		objects: { 'pipelinq-salesQuote': { 'q-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
	return mount(CnDetailPage, {
		propsData: { title: 'Quote', register: 'pipelinq', schema: 'salesQuote', objectId: 'q-1', objectStore: store, ...props },
	})
}

const WHEN = [
	{ when: { field: 'status', value: 'draft' }, text: 'not sent yet · prices excl. VAT' },
	{ when: { field: 'sentAt', op: 'notEmpty' }, text: 'sent {sentAt} · prices excl. VAT' },
]

describe('CnDetailPage headerMetaWhen', () => {
	it('reads the first entry whose condition holds', () => {
		const w = mountPage({ status: 'draft', number: 'OFF-1' }, { headerMeta: 'prices excl. VAT', headerMetaWhen: WHEN })
		expect(w.vm.headerMetaText).toBe('not sent yet · prices excl. VAT')
	})

	it('fills the entry from the record', () => {
		const w = mountPage({ status: 'sent', sentAt: 'today' }, { headerMeta: 'prices excl. VAT', headerMetaWhen: WHEN })
		expect(w.vm.headerMetaText).toBe('sent today · prices excl. VAT')
	})

	it('falls back to headerMeta when no condition holds', () => {
		const w = mountPage({ status: 'accepted' }, { headerMeta: 'prices excl. VAT', headerMetaWhen: WHEN })
		expect(w.vm.headerMetaText).toBe('prices excl. VAT')
	})

	it('reads headerMeta alone without the list', () => {
		const w = mountPage({ status: 'draft' }, { headerMeta: 'prices excl. VAT' })
		expect(w.vm.headerMetaText).toBe('prices excl. VAT')
	})
})
