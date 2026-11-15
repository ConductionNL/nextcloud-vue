/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view can be chosen to show as a gallery: a card title, an optional
 * cover image, card fields and a card size, in OpenRegister's
 * `presentation.gallery` shape (openregister records-gallery-view 2.3).
 *
 * @spec openspec/changes/presentation-picker-gallery/specs/presentation-picker-gallery/spec.md
 */
import { mount } from '@vue/test-utils'
import CnViewPresentationPicker from '../../src/components/CnViewPresentationPicker/CnViewPresentationPicker.vue'
import { buildViewCreatePayload } from '../../src/utils/savedViewHelpers.js'
import { isPresentationComplete, presentationCandidates, presentationErrorPath } from '../../src/utils/presentationCandidates.js'

const SCHEMA = {
	properties: {
		name: { type: 'string', title: 'Name' },
		photo: { type: 'file', title: 'Photo' },
		logo: { type: 'string', format: 'image', title: 'Logo' },
		price: { type: 'number', title: 'Price' },
		due: { type: 'string', format: 'date', title: 'Due' },
	},
}
const stubs = {
	NcSelect: { props: ['inputLabel', 'modelValue', 'options'], template: '<div class="sel" :data-label="inputLabel" />' },
	NcCheckboxRadioSwitch: { props: ['modelValue', 'value', 'disabled'], emits: ['update:modelValue'], template: '<label class="radio" :data-disabled="disabled"><slot /></label>' },
	NcButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot name="icon" /></button>' },
}
const mountIt = (props = {}) => mount(CnViewPresentationPicker, { props: { schema: SCHEMA, ...props }, global: { stubs } })
const last = (w) => w.emitted('input').at(-1)[0]

describe('gallery presentation', () => {
	it('offers file and image properties as covers and plain strings as titles', () => {
		const c = presentationCandidates(SCHEMA)
		expect(c.cover.map((x) => x.key)).toEqual(['photo', 'logo'])
		expect(c.title.map((x) => x.key)).toEqual(['name'])
		expect(c.reasons.gallery).toBe('')
		expect(presentationCandidates({ properties: { n: { type: 'number' } } }).reasons.gallery).not.toBe('')
	})

	it('picking Gallery emits the first title and cover, and the settings change one by one', () => {
		const w = mountIt()
		w.vm.pickType('gallery')
		expect(last(w)).toEqual({ viewType: 'gallery', gallery: { titleField: 'name', coverField: 'photo' } })
		const g = mountIt({ value: { viewType: 'gallery', gallery: { titleField: 'name', coverField: 'photo' } } })
		expect(g.find('[data-testid="cn-view-presentation-gallery"]').exists()).toBe(true)
		g.vm.pickGallery('cardSize', 'large')
		expect(last(g)).toEqual({ viewType: 'gallery', gallery: { titleField: 'name', coverField: 'photo', cardSize: 'large' } })
		g.vm.pickGallery('coverField', null)
		expect(last(g)).toEqual({ viewType: 'gallery', gallery: { titleField: 'name' } })
	})

	it('is complete with a title, is kept in the saved view, and routes the server\'s refusals', () => {
		expect(isPresentationComplete({ viewType: 'gallery', gallery: { titleField: 'name' } })).toBe(true)
		expect(isPresentationComplete({ viewType: 'gallery', gallery: {} })).toBe(false)
		expect(buildViewCreatePayload({ name: 'x', state: {}, presentation: { viewType: 'gallery', gallery: { titleField: 'name' } } }).presentation).toEqual({ viewType: 'gallery', gallery: { titleField: 'name' } })
		expect(presentationErrorPath('gallery.coverField must be a file property')).toBe('gallery.coverField')
	})
})
