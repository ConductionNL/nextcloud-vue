/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stat tile's caption can be coloured by a rule on the value
 * (`captionVariantWhen`), set outright (`captionVariant`), or replaced and
 * coloured by a record override (`overrides[].caption` / `captionVariant`).
 * `{value}` in a caption is the tile's own number. Without these keys the
 * caption renders uncoloured, as before.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-stat-tile-colours-its-caption-by-rule
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = { NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' } }
const CAPTION = '[data-testid="cn-stat-widget-caption"]'

async function mountEndpoint(content, payload) {
	axios.get.mockResolvedValue({ data: payload })
	const wrapper = mount(CnStatWidget, { propsData: { content }, stubs, provide: { cnWorkspaceContext: {} } })
	await flush()
	await flush()
	await flush()
	return wrapper
}

describe('CnStatWidget — caption rule', () => {
	beforeEach(() => jest.clearAllMocks())

	it('leaves a plain caption uncoloured', async () => {
		const w = await mountEndpoint({ endpointSource: { url: '/apps/dossiq/api/kpi-a' }, valueField: 'n', caption: 'longest: 9 days' }, { n: 4 })
		const caption = w.find(CAPTION)
		expect(caption.text()).toBe('longest: 9 days')
		expect(caption.classes().some((c) => c.startsWith('cn-kpi-card__label--'))).toBe(false)
	})

	it('colours the caption by a rule on the value and fills {value}', async () => {
		const content = {
			endpointSource: { url: '/apps/dossiq/api/kpi-b' },
			valueField: 'n',
			caption: '{value} due today',
			captionVariantWhen: [{ op: 'gte', value: 1, variant: 'error' }],
		}
		const red = await mountEndpoint(content, { n: 1 })
		expect(red.find(CAPTION).text()).toBe('1 due today')
		expect(red.find(CAPTION).classes()).toContain('cn-kpi-card__label--error')
		const calm = await mountEndpoint({ ...content, endpointSource: { url: '/apps/dossiq/api/kpi-c' } }, { n: 0 })
		expect(calm.find(CAPTION).classes()).not.toContain('cn-kpi-card__label--error')
	})

	it('takes a static captionVariant, danger reading as error', async () => {
		const w = await mountEndpoint({ endpointSource: { url: '/apps/dossiq/api/kpi-d' }, valueField: 'n', caption: 'x', captionVariant: 'danger' }, { n: 2 })
		expect(w.find(CAPTION).classes()).toContain('cn-kpi-card__label--error')
	})

	it('lets a record override replace and colour the caption', () => {
		const w = mount(CnStatWidget, {
			props: {
				content: {
					label: 'Deadline',
					caption: 'on schedule',
					overrides: [{ when: { field: 'status', value: 'suspended' }, label: 'Suspended', caption: 'clock stopped', captionVariant: 'warning' }],
				},
			},
			global: { provide: { cnObjectContext: ref({ objectId: 'c-1', object: { status: 'suspended' }, register: 'dossiq', schema: 'case' }) } },
		})
		expect(w.find(CAPTION).text()).toBe('clock stopped')
		expect(w.find(CAPTION).classes()).toContain('cn-kpi-card__label--warning')
	})
})
