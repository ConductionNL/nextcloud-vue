<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-qr-code" data-testid="cn-qr-code">
		<!-- A scanner needs dark on light, so the modules stay black on white in every theme. -->
		<svg v-if="symbol"
			class="cn-qr-code__image"
			role="img"
			:aria-label="imageName"
			:viewBox="`0 0 ${symbol.size + 8} ${symbol.size + 8}`"
			:width="size"
			:height="size"
			shape-rendering="crispEdges"
			data-testid="cn-qr-image">
			<rect :width="symbol.size + 8" :height="symbol.size + 8" fill="#fff" />
			<path :d="path" fill="#000" />
		</svg>
		<p v-else-if="currentValue"
			class="cn-qr-code__problem"
			role="alert"
			data-testid="cn-qr-too-long">
			{{ t('nextcloud-vue', 'This text is too long for a QR code.') }}
		</p>

		<p v-if="currentCode"
			class="cn-qr-code__code"
			role="status"
			aria-live="polite"
			data-testid="cn-qr-code-text">
			{{ currentCode }}
		</p>

		<p v-if="failed"
			class="cn-qr-code__problem"
			role="alert"
			data-testid="cn-qr-failed">
			{{ refreshFailedText || t('nextcloud-vue', 'This code could not be refreshed and may no longer work.') }}
		</p>
		<p v-else-if="counting" class="cn-qr-code__countdown" data-testid="cn-qr-countdown">
			{{ countdownText }}
		</p>

		<!-- @slot default Further lines under the code. -->
		<slot />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { encodeQr } from '../../utils/qr.js'

const TICK_MS = 1000

/**
 * CnQrCode: a QR code drawn in the browser, with an optional typed code and a
 * code that changes on a timer (boards LqLes "Zelf inchecken, op het bord",
 * LqLlCertificaat "In je wallet", PtZaaktypeWeergave).
 *
 * The encoder needs no library and sends nothing to a QR service, so a one-time
 * claim stays on the page. Time is counted from a deadline, not from ticks, so a
 * throttled tab stays right.
 *
 * With `refreshUrl` the component reads `{ value, code, secondsLeft }` every
 * `refreshSeconds`, sooner when `secondsLeft` runs out first. `mapResponse` turns
 * another response into that shape. Without `refreshUrl` the host sets `value`
 * and `code`, and hears `expired` when `refreshSeconds` has passed.
 *
 * ```vue
 * <CnQrCode :value="checkInUrl" :code="code" label="Check in" />
 * ```
 *
 * @event refreshed A refresh arrived, with the whole response.
 * @event refresh-error A refresh failed, with the error. The last code stays and the component tries again.
 * @event expired `refreshSeconds` passed without a new value, when there is no `refreshUrl`.
 * @spec openspec/changes/qr-code/specs/qr-code/spec.md
 */
export default {
	name: 'CnQrCode',

	props: {
		/** The text the code says, such as an address. Empty draws no code. */
		value: { type: String, default: '' },
		/** A code to type in, shown large under the image. */
		code: { type: String, default: '' },
		/** What the code does, for the image's accessible name, already translated. */
		label: { type: String, default: '' },
		/** Width and height in CSS pixels. */
		size: { type: Number, default: 160 },
		/** Where to read the current code. */
		refreshUrl: { type: String, default: '' },
		/** Seconds between reads, or until `expired` without `refreshUrl`. 0 is no timer. */
		refreshSeconds: { type: Number, default: 0 },
		/** Turns a response into `{ value, code, secondsLeft }`. */
		mapResponse: { type: Function, default: (data) => data },
		/** The countdown, already translated, with `{seconds}`. */
		countdownTemplate: { type: String, default: '' },
		/** Says a refresh failed, already translated. */
		refreshFailedText: { type: String, default: '' },
	},

	emits: ['refreshed', 'refresh-error', 'expired'],

	data() {
		return {
			currentValue: this.value,
			currentCode: this.code,
			secondsLeft: 0,
			deadline: 0,
			nextReadAt: 0,
			failed: false,
			reading: false,
			expiredSaid: false,
			timer: null,
			readNumber: 0,
		}
	},

	computed: {
		/** @return {{size: number, modules: boolean[][]}|null} The symbol, or null when the value does not encode. */
		symbol() {
			return encodeQr(this.currentValue)
		},

		/** @return {string} One path for all dark modules, one segment per run. */
		path() {
			const parts = []
			this.symbol.modules.forEach((row, r) => {
				let c = 0
				while (c < row.length) {
					if (!row[c]) {
						c++
						continue
					}
					const from = c
					while (c < row.length && row[c]) {
						c++
					}
					parts.push(`M${from + 4} ${r + 4}h${c - from}v1h-${c - from}z`)
				}
			})
			return parts.join('')
		},

		/** @return {string} The accessible name of the image. */
		imageName() {
			return this.label
				? t('nextcloud-vue', 'QR code for: {label}', { label: this.label })
				: t('nextcloud-vue', 'QR code')
		},

		/** @return {boolean} Whether a countdown applies. */
		counting() {
			return this.refreshSeconds > 0 && this.deadline > 0
		},

		/** @return {string} The countdown in words. */
		countdownText() {
			if (this.countdownTemplate) {
				return this.countdownTemplate.replace('{seconds}', String(this.secondsLeft))
			}
			return t('nextcloud-vue', 'Changes in {seconds} s', { seconds: String(this.secondsLeft) })
		},
	},

	watch: {
		value(next) {
			this.currentValue = next
			this.restartCountdown()
		},

		code(next) {
			this.currentCode = next
		},

		refreshUrl() {
			this.start()
		},

		refreshSeconds() {
			this.start()
		},
	},

	mounted() {
		this.start()
	},

	beforeUnmount() {
		this.stop()
		this.readNumber += 1
	},

	methods: {
		t,

		/** Start the timer and, with a URL, the first read. */
		start() {
			this.stop()
			this.readNumber += 1
			this.reading = false
			this.failed = false
			if (!(this.refreshSeconds > 0)) {
				this.deadline = 0
				return
			}
			this.timer = setInterval(this.tick, TICK_MS)
			if (this.refreshUrl) {
				this.read()
			} else {
				this.restartCountdown()
			}
		},

		/** Stop the timer. */
		stop() {
			clearInterval(this.timer)
			this.timer = null
		},

		/**
		 * Start the countdown over.
		 *
		 * @param {number} [seconds] How long it runs; `refreshSeconds` by default.
		 */
		restartCountdown(seconds = this.refreshSeconds) {
			this.deadline = Date.now() + seconds * 1000
			this.secondsLeft = seconds
			this.expiredSaid = false
		},

		/** Bring the countdown up to date, and read or expire when it is time. */
		tick() {
			const now = Date.now()
			this.secondsLeft = Math.max(0, Math.ceil((this.deadline - now) / 1000))
			if (this.refreshUrl) {
				if (now >= this.nextReadAt) {
					this.read()
				}
			} else if (this.secondsLeft === 0 && !this.expiredSaid) {
				this.expiredSaid = true
				this.$emit('expired')
			}
		},

		/**
		 * Read the current code. On a failure the last code stays, and the next read
		 * comes after `refreshSeconds`. A read that a newer start overtook is dropped.
		 *
		 * @return {Promise<void>}
		 */
		async read() {
			if (this.reading) {
				return
			}
			this.reading = true
			const number = this.readNumber
			try {
				const { data } = await axios.get(this.refreshUrl)
				if (number !== this.readNumber) {
					return
				}
				const mapped = this.mapResponse(data) ?? {}
				this.currentValue = mapped.value ?? this.currentValue
				this.currentCode = mapped.code ?? this.currentCode
				this.failed = false
				const left = Number(mapped.secondsLeft ?? this.refreshSeconds)
				this.restartCountdown(left)
				this.nextReadAt = Date.now() + Math.min(Math.max(left, 1), this.refreshSeconds) * 1000
				this.$emit('refreshed', data)
			} catch (error) {
				if (number !== this.readNumber) {
					return
				}
				this.failed = true
				this.nextReadAt = Date.now() + this.refreshSeconds * 1000
				this.$emit('refresh-error', error)
			} finally {
				if (number === this.readNumber) {
					this.reading = false
				}
			}
		},
	},
}
</script>

<style scoped>
.cn-qr-code {
	align-items: center;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-qr-code__image {
	display: block;
	max-width: 100%;
}

.cn-qr-code__code {
	font-family: var(--font-face-monospace, monospace);
	font-size: 2em;
	font-weight: bold;
	letter-spacing: 0.1em;
	margin: 0;
}

.cn-qr-code__countdown {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-qr-code__problem {
	color: var(--color-error-text);
	margin: 0;
}
</style>
