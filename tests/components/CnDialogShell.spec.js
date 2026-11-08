/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnDialog as the shell of a hand-built dialog: header and footer slots, the
 * loading / error / success state props and the built-in close and primary
 * buttons. Without these props the dialog renders as before.
 */

import { h } from 'vue'
import { mount } from '@vue/test-utils'
import CnDialog from '../../src/components/CnDialog/CnDialog.vue'

const close = (w) => w.find('[data-testid="cn-dialog-close"]')
const primary = (w) => w.find('[data-testid="cn-dialog-primary"]')
const errorCard = (w) => w.find('[data-testid="cn-dialog-error"]')
const successCard = (w) => w.find('[data-testid="cn-dialog-success"]')
const dialog = (w) => w.findComponent({ name: 'NcDialog' })

const mountShell = (props = {}, slots = {}) => mount(CnDialog, {
	props: { name: 'Lock object', ...props },
	slots: { default: () => h('p', { class: 'body' }, 'Body'), ...slots },
})

describe('CnDialog shell', () => {
	it('renders no state cards and no built-in buttons by default', () => {
		const w = mountShell()
		expect(w.find('.body').exists()).toBe(true)
		expect(errorCard(w).exists()).toBe(false)
		expect(successCard(w).exists()).toBe(false)
		expect(close(w).exists()).toBe(false)
		expect(primary(w).exists()).toBe(false)
		expect(dialog(w).attributes('noclose')).toBe('false')
	})

	it('draws the cancel and primary buttons and emits close and primary', async () => {
		const w = mountShell({ showClose: true, primaryLabel: 'Lock', primaryIcon: 'LockOutline' })
		expect(close(w).text()).toBe('Cancel')
		expect(primary(w).text()).toBe('Lock')
		expect(primary(w).attributes('variant')).toBe('primary')
		expect(w.findComponent({ name: 'CnIcon' }).props('name')).toBe('LockOutline')
		await close(w).trigger('click')
		await primary(w).trigger('click')
		expect(w.emitted('close')).toHaveLength(1)
		expect(w.emitted('primary')).toHaveLength(1)
	})

	it('uses the given labels and variant', () => {
		const w = mountShell({ showClose: true, cancelLabel: 'Back', primaryLabel: 'Delete', primaryVariant: 'error' })
		expect(close(w).text()).toBe('Back')
		expect(primary(w).attributes('variant')).toBe('error')
	})

	it('while loading disables both buttons, draws a named spinner and blocks closing', async () => {
		const w = mountShell({ loading: true, showClose: true, primaryLabel: 'Lock', primaryIcon: 'LockOutline' })
		expect(close(w).attributes('disabled')).toBeDefined()
		expect(primary(w).attributes('disabled')).toBeDefined()
		const spinner = w.findComponent({ name: 'NcLoadingIcon' })
		expect(spinner.exists()).toBe(true)
		expect(spinner.attributes('name')).toBe('Loading …')
		expect(w.findComponent({ name: 'CnIcon' }).exists()).toBe(false)
		expect(dialog(w).attributes('noclose')).toBe('true')
		await primary(w).trigger('click')
		expect(w.emitted('primary')).toBeUndefined()
	})

	it('primaryDisabled disables only the primary button', async () => {
		const w = mountShell({ showClose: true, primaryLabel: 'Lock', primaryDisabled: true })
		expect(primary(w).attributes('disabled')).toBeDefined()
		expect(close(w).attributes('disabled')).toBeUndefined()
		await primary(w).trigger('click')
		expect(w.emitted('primary')).toBeUndefined()
	})

	it('draws the error card above the body and keeps the body', () => {
		const w = mountShell({ error: 'It failed' })
		expect(errorCard(w).text()).toBe('It failed')
		expect(errorCard(w).attributes('type')).toBe('error')
		expect(w.find('.body').exists()).toBe(true)
	})

	it('on success draws the card, hides body and primary, and the cancel button reads Close', () => {
		const w = mountShell({ success: true, successText: 'Object locked', showClose: true, primaryLabel: 'Lock' })
		expect(successCard(w).text()).toBe('Object locked')
		expect(successCard(w).attributes('type')).toBe('success')
		expect(w.find('.body').exists()).toBe(false)
		expect(primary(w).exists()).toBe(false)
		expect(close(w).text()).toBe('Close')
	})

	it('a success string is its own message, and Done. is the fallback', () => {
		expect(successCard(mountShell({ success: 'Saved' })).text()).toBe('Saved')
		expect(successCard(mountShell({ success: true })).text()).toBe('Done.')
	})

	it('keepBodyOnSuccess keeps the body after success', () => {
		const w = mountShell({ success: true, keepBodyOnSuccess: true })
		expect(w.find('.body').exists()).toBe(true)
	})

	it('the actions slot draws before the built-in buttons', () => {
		const w = mountShell({ showClose: true, primaryLabel: 'Lock' }, {
			actions: () => h('button', { class: 'extra' }, 'Extra'),
		})
		const html = w.html()
		expect(w.find('.extra').exists()).toBe(true)
		expect(html.indexOf('class="extra"')).toBeLessThan(html.indexOf('cn-dialog-close'))
	})

	it('the footer slot replaces the whole footer', () => {
		const w = mountShell({ showClose: true, primaryLabel: 'Lock' }, {
			footer: () => h('button', { class: 'own-footer' }, 'Mine'),
			actions: () => h('button', { class: 'extra' }, 'Extra'),
		})
		expect(w.find('.own-footer').exists()).toBe(true)
		expect(w.find('.extra').exists()).toBe(false)
		expect(close(w).exists()).toBe(false)
		expect(primary(w).exists()).toBe(false)
	})

	it('the header slot renders above the body and replaces the board header', () => {
		const nc = mountShell({}, { header: () => h('div', { class: 'own-header' }, 'Head') })
		expect(nc.find('.own-header').exists()).toBe(true)

		const board = mount(CnDialog, {
			global: { provide: { cnLook: 'board' } },
			props: { name: 'Lock object' },
			slots: { header: () => h('div', { class: 'own-header' }, 'Head') },
		})
		expect(board.find('.own-header').exists()).toBe(true)
		expect(board.findComponent({ name: 'CnDialogHeader' }).exists()).toBe(false)
	})

	it('the board header blocks its close button while loading', () => {
		const board = mount(CnDialog, {
			global: { provide: { cnLook: 'board' } },
			props: { name: 'Lock object', loading: true },
		})
		expect(board.findComponent({ name: 'CnDialogHeader' }).props('noClose')).toBe(true)
	})
})
