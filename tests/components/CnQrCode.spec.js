import axios from '@nextcloud/axios'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnQrCode: what the drawn code says, and a code that changes on a timer.
 *
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import { TextDecoder, TextEncoder } from 'node:util'
import CnQrCode from '../../src/components/CnQrCode/CnQrCode.vue'
import { decodeQr } from '../support/qrDecode.js'

globalThis.TextEncoder ??= TextEncoder
globalThis.TextDecoder ??= TextDecoder

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

/**
 * Read the modules of the drawn SVG back from its path.
 *
 * @param {object} wrapper The mounted component.
 * @return {boolean[][]} The modules.
 */
function modulesOf(wrapper) {
	const svg = wrapper.find('svg')
	const side = Number(svg.attributes('viewBox').split(' ')[2]) - 8
	const modules = Array.from({ length: side }, () => new Array(side).fill(false))
	for (const [, x, y, run] of svg.find('path').attributes('d').matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
		for (let i = 0; i < Number(run); i++) {
			modules[Number(y) - 4][Number(x) - 4 + i] = true
		}
	}
	return modules
}

const countdown = (w) => w.find('[data-testid="cn-qr-countdown"]')

describe('CnQrCode', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		axios.get.mockReset()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('draws a code that reads back as the value', () => {
		const offer = 'openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fissuer.example%2Foffers%2F8f2c1d'
		const w = mount(CnQrCode, { props: { value: offer } })
		const decoded = decodeQr(modulesOf(w))
		expect(decoded.text).toBe(offer)
		expect(decoded.blocksHold).toBe(true)
	})

	it('is black on white with a quiet zone, whatever the theme', () => {
		const w = mount(CnQrCode, { props: { value: 'x' } })
		expect(w.find('rect').attributes('fill')).toBe('#fff')
		expect(w.find('path').attributes('fill')).toBe('#000')
		expect(w.find('svg').attributes('viewBox')).toBe('0 0 29 29')
	})

	it('names the image by what the code does', () => {
		const w = mount(CnQrCode, { props: { value: 'x', label: 'Check in' } })
		expect(w.find('svg').attributes('role')).toBe('img')
		expect(w.find('svg').attributes('aria-label')).toBe('QR code for: Check in')
		expect(mount(CnQrCode, { props: { value: 'x' } }).find('svg').attributes('aria-label')).toBe('QR code')
	})

	it('shows the typed code alone when there is no value', () => {
		const w = mount(CnQrCode, { props: { code: 'K7QM4RTA' } })
		expect(w.find('svg').exists()).toBe(false)
		expect(w.find('[data-testid="cn-qr-too-long"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-qr-code-text"]').text()).toBe('K7QM4RTA')
		expect(w.find('[data-testid="cn-qr-code-text"]').attributes('aria-live')).toBe('polite')
	})

	it('says so when the value is too long, and draws nothing', () => {
		const w = mount(CnQrCode, { props: { value: 'x'.repeat(667) } })
		expect(w.find('svg').exists()).toBe(false)
		expect(w.find('[data-testid="cn-qr-too-long"]').attributes('role')).toBe('alert')
	})

	it('has no countdown and reads nothing without refreshSeconds', async () => {
		const w = mount(CnQrCode, { props: { value: 'x', refreshUrl: '/code' } })
		await flushPromises()
		expect(axios.get).not.toHaveBeenCalled()
		expect(countdown(w).exists()).toBe(false)
	})

	describe('with refreshUrl', () => {
		it('reads on mount, shows the answer and passes the whole response on', async () => {
			axios.get.mockResolvedValue({ data: { value: 'one', code: 'AAA', secondsLeft: 18, count: 14 } })
			const w = mount(CnQrCode, { props: { refreshUrl: '/code', refreshSeconds: 30 } })
			await flushPromises()
			expect(axios.get).toHaveBeenCalledWith('/code')
			expect(decodeQr(modulesOf(w)).text).toBe('one')
			expect(w.find('[data-testid="cn-qr-code-text"]').text()).toBe('AAA')
			expect(countdown(w).text()).toBe('Changes in 18 s')
			expect(w.emitted('refreshed')[0][0].count).toBe(14)
		})

		it('counts down from the clock, so a throttled tab stays right', async () => {
			axios.get.mockResolvedValue({ data: { value: 'one', secondsLeft: 30 } })
			const w = mount(CnQrCode, { props: { refreshUrl: '/code', refreshSeconds: 30 } })
			await flushPromises()
			jest.setSystemTime(Date.now() + 12000)
			jest.advanceTimersByTime(1000)
			await w.vm.$nextTick()
			expect(countdown(w).text()).toBe('Changes in 17 s')
		})

		it('reads again when secondsLeft runs out before refreshSeconds', async () => {
			axios.get.mockResolvedValueOnce({ data: { value: 'one', secondsLeft: 3 } })
			axios.get.mockResolvedValue({ data: { value: 'two', secondsLeft: 30 } })
			const w = mount(CnQrCode, { props: { refreshUrl: '/code', refreshSeconds: 30 } })
			await flushPromises()
			jest.advanceTimersByTime(2000)
			expect(axios.get).toHaveBeenCalledTimes(1)
			jest.advanceTimersByTime(1000)
			await flushPromises()
			expect(axios.get).toHaveBeenCalledTimes(2)
			expect(decodeQr(modulesOf(w)).text).toBe('two')
		})

		it('polls at refreshSeconds while the code stays longer, so a count stays fresh', async () => {
			axios.get.mockResolvedValue({ data: { value: 'one', secondsLeft: 30 } })
			mount(CnQrCode, { props: { refreshUrl: '/code', refreshSeconds: 5 } })
			await flushPromises()
			jest.advanceTimersByTime(5000)
			await flushPromises()
			expect(axios.get).toHaveBeenCalledTimes(2)
		})

		it('keeps the last code and says so on a failed read, then recovers', async () => {
			axios.get.mockResolvedValueOnce({ data: { value: 'one', code: 'AAA', secondsLeft: 2 } })
			axios.get.mockRejectedValueOnce(new Error('offline'))
			axios.get.mockResolvedValue({ data: { value: 'two', code: 'BBB', secondsLeft: 30 } })
			const w = mount(CnQrCode, { props: { refreshUrl: '/code', refreshSeconds: 4 } })
			await flushPromises()
			jest.advanceTimersByTime(2000)
			await flushPromises()
			expect(w.find('[data-testid="cn-qr-failed"]').attributes('role')).toBe('alert')
			expect(w.find('[data-testid="cn-qr-code-text"]').text()).toBe('AAA')
			expect(countdown(w).exists()).toBe(false)
			expect(w.emitted('refresh-error')).toHaveLength(1)
			jest.advanceTimersByTime(4000)
			await flushPromises()
			expect(w.find('[data-testid="cn-qr-failed"]').exists()).toBe(false)
			expect(w.find('[data-testid="cn-qr-code-text"]').text()).toBe('BBB')
		})

		it('maps another response onto its fields', async () => {
			axios.get.mockResolvedValue({ data: { url: 'https://a.example/x', pin: 'CCC' } })
			const w = mount(CnQrCode, {
				props: {
					refreshUrl: '/code',
					refreshSeconds: 30,
					mapResponse: ({ url, pin }) => ({ value: url, code: pin }),
				},
			})
			await flushPromises()
			expect(decodeQr(modulesOf(w)).text).toBe('https://a.example/x')
			expect(w.find('[data-testid="cn-qr-code-text"]').text()).toBe('CCC')
		})

		it('stops reading after unmount, and drops an answer that arrives late', async () => {
			let answer
			axios.get.mockReturnValue(new Promise((resolve) => {
				answer = resolve
			}))
			const w = mount(CnQrCode, { props: { refreshUrl: '/code', refreshSeconds: 5 } })
			const events = w.emitted()
			w.unmount()
			answer({ data: { value: 'late' } })
			await flushPromises()
			jest.advanceTimersByTime(20000)
			expect(axios.get).toHaveBeenCalledTimes(1)
			expect(events.refreshed).toBeUndefined()
		})
	})

	describe('without refreshUrl', () => {
		it('says expired once, and starts over on a new value', async () => {
			const w = mount(CnQrCode, { props: { value: 'one', refreshSeconds: 3 } })
			jest.advanceTimersByTime(3000)
			jest.advanceTimersByTime(3000)
			expect(w.emitted('expired')).toHaveLength(1)
			await w.setProps({ value: 'two' })
			expect(countdown(w).text()).toBe('Changes in 3 s')
			jest.advanceTimersByTime(3000)
			expect(w.emitted('expired')).toHaveLength(2)
		})

		it('reads the countdown from its template', async () => {
			const w = mount(CnQrCode, { props: { value: 'one', refreshSeconds: 18, countdownTemplate: 'verandert over {seconds} s' } })
			await w.vm.$nextTick()
			expect(countdown(w).text()).toBe('verandert over 18 s')
		})
	})
})
