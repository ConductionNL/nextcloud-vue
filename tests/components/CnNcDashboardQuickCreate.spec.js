/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A Nextcloud Dashboard quick-create form as configuration (pipelinq's
 * CreateLeadWidget and StartRequestWidget).
 *
 * @spec openspec/changes/pl4-nc-dashboard/specs/pl4-nc-dashboard/spec.md#requirement-a-dashboard-widget-can-create-an-object
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnNcDashboardQuickCreate from '../../src/components/CnNcDashboardQuickCreate/CnNcDashboardQuickCreate.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/index.php${p}`, generateOcsUrl: (p) => p }))

const PIPELINES = [
	{ id: 'p1', title: 'Sales', stages: [{ name: 'Qualified', order: 2 }, { name: 'New', order: 1 }] },
	{ id: 'p2', title: 'Renewals', stages: [{ name: 'Due', order: 1 }] },
]

const NEW_LEAD = {
	register: 'pipelinq',
	schema: 'lead',
	fields: [
		{ key: 'title', label: 'Title', required: true },
		{ key: 'client', label: 'Client', type: 'object', register: 'pipelinq', schema: 'client' },
		{ key: 'pipeline', label: 'Pipeline', type: 'select', optionsFrom: { register: 'pipelinq', schema: 'pipeline' }, default: 'first' },
		{ key: 'value', label: 'Value', type: 'number' },
		{ key: 'source', label: 'Source', type: 'select', options: [{ value: 'website', label: 'Website' }, { value: 'referral', label: 'Referral' }] },
	],
	defaults: { status: 'open', occurredAt: '@now' },
	derive: { stage: { from: 'pipeline', path: 'stages', sortBy: 'order', field: 'name' } },
	submitLabel: 'Create lead',
	successText: 'Lead created',
	successLinkText: 'View lead',
	successHref: '/apps/pipelinq/leads/{id}',
}

const Select = {
	name: 'NcSelect',
	props: ['modelValue', 'options', 'inputLabel'],
	emits: ['update:modelValue', 'search'],
	template: '<div class="select">{{ inputLabel }}<span v-for="o in options" :key="String(o.value)" class="opt">{{ o.label }}</span></div>',
}
const TextField = {
	name: 'NcTextField',
	props: ['modelValue', 'label', 'error'],
	emits: ['update:modelValue'],
	template: '<label class="text">{{ label }}<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></label>',
}
const Note = { name: 'NcNoteCard', props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' }

/**
 * Mount the form and let it load its options.
 *
 * @param {object} config The config.
 * @param {object} [props] More props.
 * @return {Promise<import('@vue/test-utils').VueWrapper>}
 */
async function mountForm(config = NEW_LEAD, props = {}) {
	const w = mount(CnNcDashboardQuickCreate, {
		props: { config, ...props },
		global: {
			stubs: { NcSelect: Select, NcTextField: TextField, NcNoteCard: Note },
			provide: { cnTranslate: (key) => ({ Website: 'Website (nl)', 'Lead created': 'Lead aangemaakt' })[key] || key },
		},
	})
	await flushPromises()
	return w
}

describe('CnNcDashboardQuickCreate', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		axios.get.mockResolvedValue({ data: { results: PIPELINES } })
	})

	it('offers the configured fields, translated, with the first pipeline chosen', async () => {
		const w = await mountForm()
		expect(axios.get.mock.calls[0][0]).toBe('/index.php/apps/openregister/api/objects/pipelinq/pipeline')
		const pipeline = w.findAllComponents(Select).find((s) => s.props('inputLabel') === 'Pipeline')
		expect(pipeline.props('modelValue')).toMatchObject({ value: 'p1', label: 'Sales' })
		expect(w.text()).toContain('Website (nl)')
	})

	it('creates the object with defaults, the derived first stage and the stored values, then links to it', async () => {
		axios.post.mockResolvedValue({ data: { id: 'lead-9', title: 'Acme' } })
		const w = await mountForm()
		await w.find('[data-testid="cn-quick-create-field-title"] input').setValue('Acme')
		await w.find('[data-testid="cn-quick-create-field-value"] input').setValue('1200')
		const source = w.findAllComponents(Select).find((s) => s.props('inputLabel') === 'Source')
		source.vm.$emit('update:modelValue', source.props('options')[1])
		await w.find('form').trigger('submit')
		await flushPromises()
		const [url, body] = axios.post.mock.calls[0]
		expect(url).toBe('/index.php/apps/openregister/api/objects/pipelinq/lead')
		expect(body).toMatchObject({ title: 'Acme', status: 'open', pipeline: 'p1', stage: 'New', value: 1200, source: 'referral' })
		expect(body.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
		expect(w.find('[data-testid="cn-quick-create-done"]').text()).toContain('Lead aangemaakt')
		expect(w.find('[data-testid="cn-quick-create-open"]').attributes('href')).toBe('/index.php/apps/pipelinq/leads/lead-9')
		expect(w.emitted('created')[0][0]).toMatchObject({ id: 'lead-9' })
	})

	it('stores the option value, never its translated label', async () => {
		axios.post.mockResolvedValue({ data: { id: 'x' } })
		const w = await mountForm()
		await w.find('[data-testid="cn-quick-create-field-title"] input').setValue('A')
		const source = w.findAllComponents(Select).find((s) => s.props('inputLabel') === 'Source')
		source.vm.$emit('update:modelValue', source.props('options')[0])
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(axios.post.mock.calls[0][1].source).toBe('website')
	})

	it('refuses an empty required field without writing', async () => {
		const w = await mountForm()
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(axios.post).not.toHaveBeenCalled()
		expect(w.findAllComponents(TextField).find((f) => f.props('label') === 'Title').props('error')).toBe(true)
	})

	it('says a failed create failed and keeps what was typed', async () => {
		axios.post.mockRejectedValue({ response: { data: { message: 'Not allowed' } } })
		const w = await mountForm()
		await w.find('[data-testid="cn-quick-create-field-title"] input').setValue('Acme')
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(w.find('[data-testid="cn-quick-create-error"]').text()).toBe('Not allowed')
		expect(w.find('[data-testid="cn-quick-create-done"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-quick-create-field-title"] input').element.value).toBe('Acme')
	})

	it('searches an object field on the server and stores the picked id', async () => {
		jest.useFakeTimers()
		axios.post.mockResolvedValue({ data: { id: 'x' } })
		const w = await mountForm()
		axios.get.mockResolvedValue({ data: { results: [{ id: 'c-250', name: 'Late client' }] } })
		const client = w.findAllComponents(Select).find((s) => s.props('inputLabel') === 'Client')
		client.vm.$emit('search', 'late')
		jest.advanceTimersByTime(300)
		jest.useRealTimers()
		await flushPromises()
		const call = axios.get.mock.calls.at(-1)
		expect(call[0]).toBe('/index.php/apps/openregister/api/objects/pipelinq/client')
		expect(call[1].params._search).toBe('late')
		expect(client.props('options')).toEqual([{ value: 'c-250', label: 'Late client', row: { id: 'c-250', name: 'Late client' } }])
		client.vm.$emit('update:modelValue', client.props('options')[0])
		await w.find('[data-testid="cn-quick-create-field-title"] input').setValue('A')
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(axios.post.mock.calls[0][1].client).toBe('c-250')
	})

	it('fills defaults and the heading from the record it was opened on', async () => {
		axios.post.mockResolvedValue({ data: { id: 'r1' } })
		const w = await mountForm({
			register: 'pipelinq',
			schema: 'ticket',
			heading: 'New request for {name}',
			fields: [{ key: 'title', label: 'Title', required: true }],
			defaults: { client: '{id}', ticketType: 'request' },
		}, { context: { id: 'c-1', name: 'Acme' }, cancelable: true })
		expect(w.text()).toContain('New request for Acme')
		await w.find('[data-testid="cn-quick-create-field-title"] input').setValue('Help')
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(axios.post.mock.calls[0][1]).toEqual({ client: 'c-1', ticketType: 'request', title: 'Help' })
	})
})
