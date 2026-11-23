/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * card-state-notices (R1): the state banner inside a card or dialog. A notice
 * takes a role (status / alert), a stacked layout, buttons and a close
 * button; cards, tables, dialogs and index pages draw a `notices` list, and
 * the detail host provides a widget's manifest `notices` plus what its
 * actions answered.
 *
 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner
 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
 */
import { flushPromises, mount } from '@vue/test-utils'
import { computed } from 'vue'
import CnCardNotices from '../../src/components/CnCardNotices/CnCardNotices.vue'
import CnDetailCard from '../../src/components/CnDetailCard/CnDetailCard.vue'
import CnDialog from '../../src/components/CnDialog/CnDialog.vue'
import CnNoticeWidget, { fillNoticeText } from '../../src/components/CnNoticeWidget/CnNoticeWidget.vue'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'
import { WIDGET_NOTICES } from '../../src/utils/cardNotices.js'

const ICON = { props: ['name'], template: '<i class="icon" :data-name="name" />' }
const BUTTON = { props: ['variant'], emits: ['click'], template: '<button type="button" :data-variant="variant" @click="$emit(\'click\')"><slot /><slot name="icon" /></button>' }

/**
 * @param {object} content The notice.
 * @param {object} [options] Extra props and provides.
 * @return {object} The mounted notice.
 */
function mountNotice(content, options = {}) {
	return mount(CnNoticeWidget, {
		props: { content, ...(options.props || {}) },
		global: { provide: { cnTranslate: (key) => key, ...(options.provide || {}) }, stubs: { CnIcon: ICON, NcButton: BUTTON } },
	})
}

describe('CnNoticeWidget as a card state banner', () => {
	it('is a status inside a card, an alert for an error, and stays a note as a widget', () => {
		expect(mountNotice({ variant: 'success', text: 'Taak afgerond.' }, { props: { inline: true } }).find('section').attributes('role')).toBe('status')
		expect(mountNotice({ variant: 'error', text: 'Geweigerd.' }, { props: { inline: true } }).find('section').attributes('role')).toBe('alert')
		expect(mountNotice({ variant: 'error', text: 'Geweigerd.' }).find('section').attributes('role')).toBe('note')
		expect(mountNotice({ variant: 'warning', role: 'alert', text: 'x' }, { props: { inline: true } }).find('section').attributes('role')).toBe('alert')
		expect(mountNotice({ text: 'x' }, { props: { inline: true } }).classes()).toContain('cn-notice-widget--inline')
	})

	it('stacks the title above the text with layout stacked', () => {
		const w = mountNotice({ variant: 'warning', layout: 'stacked', title: 'Adres zoeken is nu niet beschikbaar', text: 'Typ het adres zelf in.' })
		expect(w.classes()).toContain('cn-notice-widget--stacked')
		expect(w.find('.cn-notice-widget__line').text()).toBe('Typ het adres zelf in.')
		expect(w.find('[data-testid="cn-notice-widget-title"]').text()).toBe('Adres zoeken is nu niet beschikbaar')
	})

	it('dispatches a button through the page dispatcher with the record tokens', async () => {
		const dispatch = jest.fn()
		const w = mountNotice(
			{ variant: 'success', title: '2 zaken verplaatst.', text: 'Een zonder acties.', actions: [{ label: 'Mislukte acties bekijken', action: { type: 'open-modal', target: 'FailedActions', props: { caseId: '@objectId' } } }] },
			{ props: { inline: true, objectId: 'c-1' }, provide: { cnDispatchAction: dispatch } },
		)
		await w.find('[data-testid="cn-notice-widget-action-0"]').trigger('click')
		expect(dispatch).toHaveBeenCalledWith({ type: 'open-modal', target: 'FailedActions', props: { caseId: 'c-1' } }, expect.objectContaining({ tokenCtx: expect.any(Object) }))
		expect(w.emitted('action')).toHaveLength(1)
	})

	it('closes when dismissible, and fills {path} from the record', async () => {
		const w = mountNotice({ text: 'Zojuist bijgewerkt door {actor.name}.', dismissible: true }, { props: { objectData: { actor: { name: 'Anouk Bakker' } } } })
		expect(w.find('.cn-notice-widget__text').text()).toBe('Zojuist bijgewerkt door Anouk Bakker.')
		await w.find('[data-testid="cn-notice-widget-dismiss"]').trigger('click')
		expect(w.find('section').exists()).toBe(false)
		expect(w.emitted('dismiss')).toHaveLength(1)
		expect(fillNoticeText('{missing} x', {})).toBe(' x')
	})
})

describe('CnCardNotices', () => {
	it('shows each notice while its visibleWhen holds against the record', async () => {
		const w = mount(CnCardNotices, {
			props: {
				notices: [
					{ text: 'Altijd' },
					{ text: 'Alleen bij geweigerd', visibleWhen: { field: 'status', value: 'refused' } },
				],
				objectData: { status: 'open' },
			},
			global: { stubs: { CnIcon: ICON, NcButton: BUTTON } },
		})
		await flushPromises()
		expect(w.findAll('[data-testid="cn-notice-widget"]')).toHaveLength(1)
		await w.setProps({ objectData: { status: 'refused' } })
		await flushPromises()
		expect(w.findAll('[data-testid="cn-notice-widget"]')).toHaveLength(2)
	})

	it('drops a dismissed notice and says so', async () => {
		const w = mount(CnCardNotices, { props: { notices: [{ text: 'Weg ermee', dismissible: true }] }, global: { stubs: { CnIcon: ICON, NcButton: BUTTON } } })
		await flushPromises()
		await w.find('[data-testid="cn-notice-widget-dismiss"]').trigger('click')
		expect(w.find('[data-testid="cn-card-notices"]').exists()).toBe(false)
		expect(w.emitted('notice-dismiss')).toHaveLength(1)
	})
})

describe('cards and dialogs draw notices', () => {
	const stubs = { CnIcon: ICON, NcButton: BUTTON, CnActionsMenu: true }

	it('CnWidgetWrapper draws its own notices and the host-provided ones at the top of the body', async () => {
		const dismiss = jest.fn()
		const provided = computed(() => ({ list: [{ text: 'Van de host', dismissible: true }], object: {}, objectId: '1', dismiss }))
		const w = mount(CnWidgetWrapper, {
			props: { title: 'Taken', notices: [{ variant: 'success', text: 'Eigen' }] },
			global: { stubs, provide: { [WIDGET_NOTICES]: provided } },
		})
		await flushPromises()
		const texts = w.findAll('.cn-widget-wrapper__content [data-testid="cn-notice-widget"]').map((n) => n.text())
		expect(texts).toEqual(['Eigen', 'Van de host'])
		await w.findAll('[data-testid="cn-notice-widget-dismiss"]')[0].trigger('click')
		expect(dismiss).toHaveBeenCalledWith({ text: 'Van de host', dismissible: true })
	})

	it('CnDetailCard draws notices above its body', async () => {
		const w = mount(CnDetailCard, { props: { title: 'Adviezen', notices: [{ variant: 'error', text: 'Negatief advies' }] }, slots: { default: '<p class="body">rij</p>' }, global: { stubs } })
		await flushPromises()
		const html = w.find('.cn-detail-card__content').html()
		expect(html.indexOf('Negatief advies')).toBeLessThan(html.indexOf('rij'))
	})

	it('CnDialog draws notices under the header, or above the footer with placement bottom', async () => {
		const dialogStub = { template: '<div class="nc-dialog"><slot /><slot name="actions" /></div>' }
		const mountDialog = (noticesPlacement) => mount(CnDialog, {
			props: { name: 'Bericht versturen', notices: [{ variant: 'error', layout: 'stacked', title: 'Niet verstuurd', text: 'Geen koppeling.' }], noticesPlacement },
			slots: { default: '<form class="form" />' },
			global: { stubs: { ...stubs, NcDialog: dialogStub } },
		})
		const top = mountDialog(undefined)
		await flushPromises()
		expect(top.find('.cn-dialog__notices--top [role="alert"]').exists()).toBe(true)
		const bottom = mountDialog('bottom')
		await flushPromises()
		expect(bottom.find('.cn-dialog__notices--top').exists()).toBe(false)
		const html = bottom.html()
		expect(html.indexOf('class="form"')).toBeLessThan(html.indexOf('cn-dialog__notices--bottom'))
	})
})
