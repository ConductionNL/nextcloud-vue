/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAiInput's attach menu: Upload from device and Choose from Files, the
 * latter adding chips that carry the file id and are sent without an upload.
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))

const mockPickNodes = jest.fn()
jest.mock('@nextcloud/dialogs', () => {
	const builder = {
		setMultiSelect: jest.fn(() => builder),
		setType: jest.fn(() => builder),
		allowDirectories: jest.fn(() => builder),
		setModal: jest.fn(() => builder),
		build: jest.fn(() => ({ pickNodes: (...args) => mockPickNodes(...args) })),
	}
	return { FilePickerType: { Choose: 1 }, getFilePickerBuilder: jest.fn(() => builder) }
})

const axios = require('@nextcloud/axios').default
const CnAiInput = require('../../src/components/CnAiCompanion/CnAiInput.vue').default

const stubs = {
	NcActions: { template: '<div class="stub-actions"><slot /></div>' },
	NcActionButton: { template: '<button class="stub-action" @click="$emit(\'click\')"><slot /></button>' },
}

function mountInput(props = {}) {
	return mount(CnAiInput, {
		propsData: props,
		provide: { cnTranslate: (key) => key },
		stubs,
	})
}

describe('CnAiInput Choose from Files', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('offers both Upload from device and Choose from Files', () => {
		const w = mountInput()
		expect(w.find('[data-testid="cn-ai-input-attach-upload"]').text()).toBe('Upload from device')
		expect(w.find('[data-testid="cn-ai-input-attach-files"]').text()).toBe('Choose from Files')
	})

	it('adds a chip with the file id for each picked file, without uploading', async () => {
		mockPickNodes.mockResolvedValue([
			{ fileid: 11, path: '/Documents/report.pdf', basename: 'report.pdf' },
			{ fileid: 12, path: '/Documents/notes.txt', basename: 'notes.txt' },
		])
		const w = mountInput()
		await w.find('[data-testid="cn-ai-input-attach-files"]').trigger('click')
		await new Promise((resolve) => setTimeout(resolve))
		expect(w.vm.attachments).toEqual([
			{ fileId: 11, path: '/Documents/report.pdf', name: 'report.pdf' },
			{ fileId: 12, path: '/Documents/notes.txt', name: 'notes.txt' },
		])
		expect(axios.post).not.toHaveBeenCalled()
		expect(w.findAll('.cn-ai-input__chip').length).toBe(2)
	})

	it('sends the chosen files by id and clears them', async () => {
		mockPickNodes.mockResolvedValue([{ fileid: 11, path: '/a.pdf', basename: 'a.pdf' }])
		const w = mountInput()
		await w.vm.chooseFromFiles()
		w.vm.inputText = 'Summarise'
		await w.vm.$nextTick()
		await w.find('[data-testid="cn-ai-input-textarea"]').trigger('keydown.enter')
		expect(w.emitted('send')[0][0]).toEqual({
			text: 'Summarise',
			attachments: [{ fileId: 11, path: '/a.pdf', name: 'a.pdf' }],
		})
		expect(w.vm.attachments).toEqual([])
	})

	it('does not add the same file twice, and a dismissed picker is a no-op', async () => {
		mockPickNodes.mockResolvedValueOnce([{ fileid: 11, path: '/a.pdf', basename: 'a.pdf' }])
		const w = mountInput()
		await w.vm.chooseFromFiles()
		mockPickNodes.mockResolvedValueOnce([{ fileid: 11, path: '/a.pdf', basename: 'a.pdf' }])
		await w.vm.chooseFromFiles()
		expect(w.vm.attachments.length).toBe(1)
		mockPickNodes.mockRejectedValueOnce(new Error('closed'))
		await w.vm.chooseFromFiles()
		expect(w.vm.attachments.length).toBe(1)
		expect(w.vm.uploadError).toBe('')
	})
})
