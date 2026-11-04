<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<Teleport to="body" :disabled="!overlay">
		<NcThemeProvider :dark="dark" :class="rootClasses" data-testid="cn-display-screen">
			<component :is="overlay ? 'section' : 'main'"
				ref="screen"
				class="cn-display-screen__page"
				:role="overlay ? 'dialog' : undefined"
				:aria-modal="overlay ? 'true' : undefined"
				:aria-label="overlay ? title : undefined"
				:tabindex="overlay ? -1 : undefined"
				@keydown.esc="onEscape">
				<header class="cn-display-screen__header">
					<div class="cn-display-screen__titles">
						<span v-if="subtitle" class="cn-display-screen__muted" data-testid="cn-display-subtitle">{{ subtitle }}</span>
						<h1 class="cn-display-screen__title">
							{{ title }}
						</h1>
					</div>
					<div v-if="clock || updatedText" class="cn-display-screen__time">
						<span v-if="clock" class="cn-display-screen__clock" data-testid="cn-display-clock">{{ clockText }}</span>
						<span v-if="updatedText" class="cn-display-screen__muted" data-testid="cn-display-updated">{{ updatedText }}</span>
					</div>
				</header>

				<p v-if="stale"
					class="cn-display-screen__stale"
					role="status"
					data-testid="cn-display-stale">
					{{ staleMessage }}
				</p>

				<div class="cn-display-screen__body">
					<!-- @slot default The rows of the screen. -->
					<slot />
				</div>

				<footer v-if="footer || $slots.footer || $slots.actions" class="cn-display-screen__footer">
					<!-- @slot footer The bottom line of the screen; replaces `footer`. -->
					<slot name="footer">
						<span class="cn-display-screen__muted" data-testid="cn-display-footer">{{ footer }}</span>
					</slot>
					<span v-if="$slots.actions" class="cn-display-screen__actions">
						<!-- @slot actions Buttons at the end of the bottom line. -->
						<slot name="actions" />
					</span>
				</footer>
			</component>
		</NcThemeProvider>
	</Teleport>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcThemeProvider } from '@nextcloud/vue'
import { formatTimeOfDay } from '../../utils/boardDate.js'
import { parseDateValue } from '../../utils/dateVariant.js'

const TICK_MS = 1000

/**
 * CnDisplayScreen: a full page without a menu, read from a distance on a hall
 * screen or a classroom board (boards LqInfoscherm "Infoscherm bij de aula", LqLes
 * "Zelf inchecken, op het bord").
 *
 * A title, a clock, when the content was last updated, the host's rows and a
 * bottom line. The host owns the content and its refresh, and sets `stale` when a
 * refresh failed. With `overlay` the screen covers the whole app: the rest of the
 * page goes inert, Escape emits `close`, and focus returns on unmount.
 *
 * ```vue
 * <CnDisplayScreen title="Today" clock dark footer="No names, no reasons." :updated-at="updatedAt" :stale="failed">
 *   <CnDataTable :rows="rows" />
 * </CnDisplayScreen>
 * ```
 *
 * @event close The user pressed Escape on an overlay.
 * @spec openspec/changes/display-screen/specs/display-screen/spec.md
 */
export default {
	name: 'CnDisplayScreen',

	components: { NcThemeProvider },

	props: {
		/** The heading, already translated. */
		title: { type: String, required: true },
		/** A line over the title, already translated. */
		subtitle: { type: String, default: '' },
		/** Show a clock that keeps time. */
		clock: { type: Boolean, default: false },
		/** When the content was last updated: an ISO string, a Date or a timestamp. */
		updatedAt: { type: [String, Number, Date], default: '' },
		/** The update line, already translated, with `{time}`. */
		updatedTemplate: { type: String, default: '' },
		/** The content could not be refreshed and shows what it last had. */
		stale: { type: Boolean, default: false },
		/** Says the content is old, already translated, with `{time}`. */
		staleText: { type: String, default: '' },
		/** The bottom line, already translated. */
		footer: { type: String, default: '' },
		/** Use the dark theme, whatever the user's theme is. */
		dark: { type: Boolean, default: false },
		/** Cover the whole app. */
		overlay: { type: Boolean, default: false },
	},

	emits: ['close'],

	data() {
		return {
			now: new Date(),
			timer: null,
			inerted: [],
			returnFocusTo: null,
		}
	},

	computed: {
		/** @return {object} The classes of the outer element. */
		rootClasses() {
			return { 'cn-display-screen': true, 'cn-display-screen--overlay': this.overlay }
		},

		/** @return {string} The clock. */
		clockText() {
			return formatTimeOfDay(this.now)
		},

		/** @return {string} The time of the last update, or '' without one. */
		updatedTime() {
			const date = parseDateValue(this.updatedAt)
			return date ? formatTimeOfDay(date) : ''
		},

		/** @return {string} The update line. */
		updatedText() {
			if (!this.updatedTime) {
				return ''
			}
			if (this.updatedTemplate) {
				return this.updatedTemplate.replace('{time}', this.updatedTime)
			}
			return t('nextcloud-vue', 'updated at {time}', { time: this.updatedTime })
		},

		/** @return {string} What the stale line says. */
		staleMessage() {
			if (this.staleText) {
				return this.staleText.replace('{time}', this.updatedTime)
			}
			return this.updatedTime
				? t('nextcloud-vue', 'Cannot reach the server. This shows what it knew at {time}.', { time: this.updatedTime })
				: t('nextcloud-vue', 'Cannot reach the server. This may be out of date.')
		},
	},

	watch: {
		clock() {
			this.startClock()
		},

		overlay(on) {
			if (on) {
				this.$nextTick(this.enterOverlay)
			} else {
				this.leaveOverlay()
			}
		},
	},

	mounted() {
		this.startClock()
		if (this.overlay) {
			this.enterOverlay()
		}
	},

	beforeUnmount() {
		clearInterval(this.timer)
		this.leaveOverlay()
	},

	methods: {
		/** Keep the clock on time while it shows. */
		startClock() {
			clearInterval(this.timer)
			this.timer = null
			if (this.clock) {
				this.now = new Date()
				this.timer = setInterval(() => {
					this.now = new Date()
				}, TICK_MS)
			}
		},

		/** Make the rest of the page inert and take focus. */
		enterOverlay() {
			const root = this.$refs.screen?.closest('.cn-display-screen')
			this.returnFocusTo = document.activeElement
			this.inerted = [...document.body.children].filter((element) => element !== root && !element.inert)
			this.inerted.forEach((element) => {
				element.inert = true
			})
			this.$refs.screen?.focus()
		},

		/** Give the rest of the page and the focus back. */
		leaveOverlay() {
			this.inerted.forEach((element) => {
				element.inert = false
			})
			this.inerted = []
			this.returnFocusTo?.focus?.()
			this.returnFocusTo = null
		},

		/** Ask the host to close an overlay. */
		onEscape() {
			if (this.overlay) {
				this.$emit('close')
			}
		},
	},
}
</script>

<style scoped>
.cn-display-screen {
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-display-screen--overlay {
	inset: 0;
	overflow: auto;
	position: fixed;
	z-index: 10000;
}

.cn-display-screen__page {
	display: flex;
	flex-direction: column;
	font-size: 1.6rem;
	gap: 16px;
	min-height: 100vh;
	outline: none;
	padding: 24px 32px;
}

.cn-display-screen__header,
.cn-display-screen__footer {
	align-items: flex-end;
	display: flex;
	flex-wrap: wrap;
	gap: 8px 24px;
	justify-content: space-between;
}

.cn-display-screen__titles,
.cn-display-screen__time {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-display-screen__time {
	align-items: flex-end;
}

.cn-display-screen__title {
	font-size: 1.6em;
	font-weight: 700;
	margin: 0;
}

.cn-display-screen__clock {
	font-size: 2.2em;
	font-variant-numeric: tabular-nums;
	font-weight: 700;
	line-height: 1;
}

.cn-display-screen__muted {
	color: var(--color-text-maxcontrast);
}

.cn-display-screen__stale {
	background: var(--color-background-hover);
	border-inline-start: 6px solid var(--color-warning);
	margin: 0;
	padding: 8px 12px;
}

.cn-display-screen__body {
	flex: 1 1 auto;
	min-height: 0;
}

.cn-display-screen__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
</style>
