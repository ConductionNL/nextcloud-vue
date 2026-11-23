/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFilesCard's `addable`: a tonal add button in the card header that picks
 * files and attaches them to the object, so a manifest integration card can
 * offer "Bestand toevoegen" (pipelinq PqTaak Documenten) without a slot.
 * `addLabel` defaults to the translated "Add file".
 *
 * @spec openspec/changes/files-card-add-button/specs/files-card-add-button/spec.md#requirement-a-files-card-can-add-a-file
 */
const { flushPromises, mount } = require('@vue/test-utils')

const mockCnFetchJson = jest.fn().mockResolvedValue({})
jest.mock('../../src/utils/cnFetch.js', () => ({ cnFetchJson: (...args) => mockCnFetchJson(...args) }))

/** Let the FileReader and the request chain settle. */
async function settle() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await flushPromises()
	}
}

const CnFilesCard = require('../../src/components/CnFilesCard/CnFilesCard.vue').default

describe('CnFilesCard add button', () => {
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ results: [] }), text: () => Promise.resolve('{}') })
	})

	afterEach(() => {
		delete global.fetch
	})

	it('draws no add button unless addable', async () => {
		const wrapper = mount(CnFilesCard, { props: { register: 'r1', schema: 's1', objectId: 'o1' } })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-files-card-add"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('draws the add button as a tonal pill in the card header', async () => {
		const wrapper = mount(CnFilesCard, { props: { register: 'r1', schema: 's1', objectId: 'o1', addable: true, addLabel: 'Bestand toevoegen' } })
		await flushPromises()
		const button = wrapper.find('.cn-detail-card__header [data-testid="cn-files-card-add"]')
		expect(button.exists()).toBe(true)
		expect(button.text()).toContain('Bestand toevoegen')
		expect(button.classes()).toContain('cn-button--tonal')
		wrapper.unmount()
	})

	it('attaches a picked file to the object and reads the files again', async () => {
		const wrapper = mount(CnFilesCard, { props: { register: 'r1', schema: 's1', objectId: 'o1', addable: true, addLabel: 'Bestand toevoegen' } })
		await flushPromises()
		global.fetch.mockClear()

		const file = new File(['hello'], 'brief.pdf', { type: 'application/pdf' })
		const input = wrapper.find('[data-testid="cn-files-card-input"]')
		Object.defineProperty(input.element, 'files', { value: [file] })
		await input.trigger('change')
		await settle()

		const [url, init] = mockCnFetchJson.mock.calls[0]
		expect(url).toBe('/apps/openregister/api/objects/r1/s1/o1/files')
		expect(init.method).toBe('POST')
		const body = JSON.parse(init.body)
		expect(body.name).toBe('brief.pdf')
		expect(body.content).toMatch(/^data:application\/pdf;base64,/)
		expect(wrapper.emitted('uploaded')).toEqual([[['brief.pdf']]])
		expect(global.fetch).toHaveBeenCalledTimes(1)
		wrapper.unmount()
	})

	it('reads Add file by default', async () => {
		const wrapper = mount(CnFilesCard, { props: { register: 'r1', schema: 's1', objectId: 'o1', addable: true } })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-files-card-add"]').text()).toContain('Add file')
		wrapper.unmount()
	})
})
