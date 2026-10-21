/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The dialogs give the board's text area heights and widths: the action
 * dialog's reason and the assign dialog's note take `rows`, the facts are rows
 * of their own, and a two-column form dialog is the 720px width.
 *
 * @spec openspec/changes/board-dialog-controls/specs/board-dialog-controls/spec.md#requirement-a-board-dialog-draws-its-controls-as-the-boards-do
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnActionDialog from '../../src/components/CnActionDialog/CnActionDialog.vue'
import CnAssignDialog from '../../src/components/CnAssignDialog/CnAssignDialog.vue'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))
jest.mock('../../src/utils/userAutocomplete.js', () => ({ searchNextcloudGroups: jest.fn().mockResolvedValue([]), searchNextcloudUsers: jest.fn().mockResolvedValue([]) }))

const CnDialogStub = { name: 'CnDialog', props: ['name', 'defaultWidth', 'width'], template: '<div class="dialog" :data-default-width="defaultWidth"><slot /><slot name="actions" /></div>' }
const TextArea = { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<textarea :aria-label="label" :value="modelValue" />' }

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { title: 'Verlichting fietspad' } })
})

describe('CnActionDialog: the board\'s fields', () => {
	const mountAction = async (config) => {
		const w = mount(CnActionDialog, {
			props: { config, objectId: 'z-1' },
			global: { stubs: { CnDialog: CnDialogStub, NcTextArea: TextArea, CnIcon: true } },
		})
		await flushPromises()
		return w
	}

	it('sizes the reason by reason.rows, two lines by default', async () => {
		expect((await mountAction({ reason: { label: 'Reden', rows: 4 } })).find('textarea').attributes('rows')).toBe('4')
		expect((await mountAction({ reason: { label: 'Reden' } })).find('textarea').attributes('rows')).toBe('2')
	})

	it('draws each fact as a row of its own', async () => {
		const w = await mountAction({ summary: { source: { url: '/apps/dossiq/api/case/@objectId/summary' }, title: '{title}' }, facts: [{ title: 'Bewaring', items: [{ label: 'Archiefnominatie', value: 'Vernietigen' }, { label: 'Bewaartermijn', value: '5 jaar' }] }] })
		expect(w.findAll('.cn-action-dialog__fact')).toHaveLength(2)
	})
})

describe('CnAssignDialog: the board\'s note', () => {
	it('is three lines unless note.rows says otherwise', async () => {
		const mountAssign = (note) => mount(CnAssignDialog, {
			props: { config: { title: 'Overdragen', note }, objectId: 'z-1' },
			global: { stubs: { CnDialog: CnDialogStub, NcTextArea: TextArea, CnSearchSelect: true, NcCheckboxRadioSwitch: true, CnIcon: true } },
		})
		expect(mountAssign({ label: 'Waarom' }).find('textarea').attributes('rows')).toBe('3')
		expect(mountAssign({ label: 'Waarom', rows: 5 }).find('textarea').attributes('rows')).toBe('5')
	})
})

describe('CnFormDialog: the two-column form', () => {
	const schema = { title: 'Zaak', properties: { title: { type: 'string', title: 'Titel' } } }
	const mountForm = (props) => mount(CnFormDialog, {
		props: { schema, item: null, ...props },
		global: { stubs: { CnDialog: CnDialogStub, NcButton: true, NcNoteCard: true, NcLoadingIcon: true, NcTextField: true, NcSelect: true, NcCheckboxRadioSwitch: true } },
	})

	it('takes the 720px width the boards draw it at, one column keeps the form width', () => {
		expect(mountForm({ columns: 2 }).find('.dialog').attributes('data-default-width')).toBe('wizard')
		expect(mountForm({}).find('.dialog').attributes('data-default-width')).toBe('form')
	})
})
