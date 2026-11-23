import axios from '@nextcloud/axios'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-file-and-camera-fields/tasks.md#task-1
 * @spec openspec/changes/form-file-and-camera-fields/tasks.md#task-3
 */
import { mount } from '@vue/test-utils'
import CnFileField from '../../src/components/CnFileField/CnFileField.vue'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), patch: jest.fn(), get: jest.fn().mockResolvedValue({ data: {} }) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}`, generateOcsUrl: (p) => p }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
	NcNoteCard: { template: '<div><slot /></div>' },
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	CnFieldHelper: true,
}
const schema = {
	slug: 'permit',
	title: 'Permit',
	properties: {
		title: { type: 'string', title: 'Title', order: 1 },
		signedCopy: { type: 'file', title: 'Signed copy', allowedTypes: ['application/pdf'], order: 2 },
		drawing: { type: 'file', title: 'Drawing', maxSize: 20971520, order: 3 },
	},
}
const mountDialog = () => mount(CnFormDialog, { props: { schema, register: 'permits', feedback: false }, global: { stubs } })

describe('CnFormDialog file properties', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('renders a file property as a file field that offers its allowed types only', () => {
		const w = mountDialog()
		const fields = w.findAllComponents(CnFileField)
		expect(fields).toHaveLength(2)
		expect(fields[0].props('accept')).toBe('application/pdf')
		expect(w.get('[data-testid="cn-file-field-input"]').attributes('accept')).toBe('application/pdf')
	})

	it('a limit above the inline cap holds big files; nothing uploads before the save', async () => {
		const w = mountDialog()
		const drawing = w.findAllComponents(CnFileField)[1]
		expect(drawing.props('inlineMax')).toBe(1024 * 1024)
		expect(drawing.props('maxSize')).toBe(20971520)

		const pdf = new File([new Uint8Array(2 * 1024 * 1024)], 'drawing.pdf', { type: 'application/pdf' })
		w.vm.updateField('title', 'Permit A')
		w.vm.updateField('drawing', pdf)
		const payload = w.vm.buildSubmitPayload()
		expect(payload.drawing).toBeNull()
		expect(axios.post).not.toHaveBeenCalled()

		axios.post.mockResolvedValue({ data: { files: [{ id: 'f1' }] } })
		axios.patch.mockResolvedValue({})
		await w.vm.setResult({ success: true, id: 'P1' })
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post.mock.calls[0][0]).toContain('/permits/permit/P1/filesMultipart')
		expect(axios.patch.mock.calls[0][1]).toEqual({ drawing: { id: 'f1' } })
	})

	it('saves with a failed upload kept: names the file and offers Retry', async () => {
		const w = mountDialog()
		const pdf = new File([new Uint8Array(2 * 1024 * 1024)], 'drawing.pdf', { type: 'application/pdf' })
		w.vm.updateField('drawing', pdf)
		w.vm.buildSubmitPayload()
		axios.post.mockRejectedValueOnce(new Error('413'))
		await w.vm.setResult({ success: true, id: 'P1' })
		await flush()
		expect(w.text()).toContain('drawing.pdf')
		const retry = w.get('[data-testid="cn-form-dialog-retry-uploads"]')

		axios.post.mockResolvedValue({ data: { id: 'f2' } })
		axios.patch.mockResolvedValue({})
		await retry.trigger('click')
		await flush()
		expect(axios.post).toHaveBeenCalledTimes(2)
		expect(w.find('[data-testid="cn-form-dialog-retry-uploads"]').exists()).toBe(false)
	})
})
