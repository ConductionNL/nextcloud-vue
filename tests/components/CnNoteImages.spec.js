/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/notes-replies-group-mentions-and-images/tasks.md#task-4
 */
import { mount } from '@vue/test-utils'
import CnNoteBody from '../../src/components/CnNoteBody/CnNoteBody.vue'
import CnNoteComposer from '../../src/components/CnNoteComposer/CnNoteComposer.vue'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn().mockResolvedValue([{ id: 'jan', label: 'Jan', subline: '' }]),
	searchNextcloudGroups: jest.fn().mockResolvedValue([{ id: 'planning', label: 'Planning', displayName: 'Planning', subline: '' }]),
}))

const record = { apiBase: '/apps/openregister/api', register: 'tasks', schema: 'task', objectId: 'T1' }
const own = '/index.php/apps/openregister/api/objects/tasks/task/T1/files/42/download'
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('CnNoteBody images', () => {
	it('renders a screenshot of this record as an image', () => {
		const w = mount(CnNoteBody, { props: { message: `see ![screenshot](${own})`, record } })
		const img = w.get('img')
		expect(img.attributes('src')).toBe(own)
		expect(img.attributes('alt')).toBe('screenshot')
	})

	it('a foreign image shows a link and loads nothing', () => {
		const w = mount(CnNoteBody, { props: { message: '![x](https://evil.example/p.png)', record } })
		expect(w.find('img').exists()).toBe(false)
		const link = w.get('a')
		expect(link.attributes('href')).toBe('https://evil.example/p.png')
		expect(link.attributes('rel')).toContain('noopener')
	})

	it('markup in a note is text', () => {
		const w = mount(CnNoteBody, { props: { message: '<img src=x onerror=alert(1)> <b>hi</b>', record } })
		expect(w.find('img').exists()).toBe(false)
		expect(w.find('b').exists()).toBe(false)
		expect(w.text()).toContain('<b>hi</b>')
	})

	it('mention chips: resolved name, unknown id, group', () => {
		const w = mount(CnNoteBody, { props: { message: '@jan @piet @"group/planning"', names: { jan: 'Jan de Vries', 'group/planning': 'Planning' } } })
		expect(w.get('[data-testid="cn-note-group-chip"]').text()).toBe('Planning')
		const users = w.findAll('[data-testid="cn-note-user-chip"]')
		expect(users[0].text()).toBe('Jan de Vries')
		expect(users[1].text()).toBe('piet')
		expect(users[1].classes()).toContain('cn-notes-tab__mention--unknown')
	})
})

describe('CnNoteComposer images', () => {
	afterEach(() => {
		delete global.fetch
	})

	const png = () => new File([new Uint8Array(4)], 'shot.png', { type: 'image/png' })
	const mountComposer = (props = {}) => mount(CnNoteComposer, { props: { modelValue: 'look:', ...props, ...record, apiBase: record.apiBase, objectId: 'T1' } })

	it('uploads a pasted image through filesMultipart and adds its markdown to the note', async () => {
		const calls = []
		global.fetch = jest.fn((url, init) => {
			calls.push({ url, method: init.method, body: init.body })
			return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [{ id: 42 }] }) })
		})
		const w = mountComposer()
		await w.vm.onPaste({ clipboardData: { files: [png()] }, preventDefault: jest.fn() })
		await flush()
		expect(calls[0].url).toContain('/apps/openregister/api/objects/tasks/task/T1/filesMultipart')
		expect(calls[0].method).toBe('POST')
		expect(calls[0].body.get('files[]').name).toBe('shot.png')
		const text = w.emitted('update:modelValue').at(-1)[0]
		expect(text).toMatch(/^look:\n!\[shot\.png\]\(.*\/objects\/tasks\/task\/T1\/files\/42\/download\)$/)
		expect(w.emitted('uploaded')).toHaveLength(1)
	})

	it('takes a dropped image the same way', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 7 }) })
		const w = mountComposer()
		await w.get('[data-testid="cn-note-composer"]').trigger('drop', { dataTransfer: { files: [png()] } })
		await flush()
		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(w.emitted('update:modelValue').at(-1)[0]).toContain('/files/7/download')
	})

	it('only images: another file type is left alone', async () => {
		global.fetch = jest.fn()
		const w = mountComposer()
		const prevented = jest.fn()
		await w.vm.onPaste({ clipboardData: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] }, preventDefault: prevented })
		expect(global.fetch).not.toHaveBeenCalled()
		expect(prevented).not.toHaveBeenCalled()
	})

	it('without a record, paste does nothing new', async () => {
		global.fetch = jest.fn()
		const w = mount(CnNoteComposer, { props: { modelValue: '' } })
		await w.vm.onPaste({ clipboardData: { files: [png()] }, preventDefault: jest.fn() })
		expect(global.fetch).not.toHaveBeenCalled()
	})

	it('a failed upload says so and leaves the note as it was', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 413, json: () => Promise.resolve({}) })
		const w = mountComposer()
		await w.vm.onPaste({ clipboardData: { files: [png()] }, preventDefault: jest.fn() })
		await flush()
		expect(w.get('[data-testid="cn-note-composer-error"]').text()).toBe('The image could not be added.')
		expect(w.emitted('update:modelValue')).toBeUndefined()
	})

	it('offers groups beside users in the @ suggestions, stored with the group/ prefix', async () => {
		const w = mountComposer()
		const out = await new Promise((resolve) => w.vm.fetchMentionSuggestions('pl', resolve))
		expect(out.map((s) => [s.id, s.source])).toEqual([['jan', 'users'], ['group/planning', 'groups']])
	})
})
