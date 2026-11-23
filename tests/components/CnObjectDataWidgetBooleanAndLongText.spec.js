/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A data card reads a yes/no field as a word and shows a long text whole, as
 * the boards draw their facts (PqMailinglijst "Openbare aanmelding: Ja" and
 * the full "Omschrijving"; the Dq boards' "Nee").
 *
 * @spec openspec/changes/data-facts-yes-no-and-whole-text/specs/data-facts-yes-no-and-whole-text/spec.md
 */

import { mount } from '@vue/test-utils'
import CnObjectDataWidget from '@/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const LONG = 'Maandelijks nieuws voor ondernemers in Zuiddrecht: subsidies, werkzaamheden bij winkelstraten, vergunningen en het ondernemersontbijt.'

const schema = {
	title: 'Mailing list',
	properties: {
		publicSignup: { type: 'boolean', title: 'Public sign-up' },
		archived: { type: 'boolean', title: 'Archived' },
		description: { type: 'string', title: 'Description' },
	},
}

const stubs = {
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	CnObjectMetadataModal: true,
	NcButton: true,
	NcSelect: true,
	NcTextField: true,
	NcCheckboxRadioSwitch: true,
	NcLoadingIcon: true,
	NcActions: true,
	NcActionButton: true,
}

function valueOf(wrapper, label) {
	return wrapper.findAll('.cn-object-data-widget__cell')
		.filter((c) => c.find('.cn-object-data-widget__label').text() === label)
		.at(0)
		.find('.cn-object-data-widget__value')
		.text()
}

describe('CnObjectDataWidget: yes/no and long text', () => {
	const wrapper = mount(CnObjectDataWidget, {
		propsData: { schema, objectData: { publicSignup: true, archived: false, description: LONG } },
		stubs,
	})

	it('reads true as Yes and false as No', () => {
		expect(valueOf(wrapper, 'Public sign-up')).toBe('Yes')
		expect(valueOf(wrapper, 'Archived')).toBe('No')
	})

	it('shows a long text whole', () => {
		expect(valueOf(wrapper, 'Description')).toBe(LONG)
	})
})
