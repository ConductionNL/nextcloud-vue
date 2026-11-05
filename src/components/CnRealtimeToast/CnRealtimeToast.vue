<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="current"
		class="cn-realtime-toast"
		role="status"
		aria-live="polite"
		data-testid="cn-realtime-toast">
		<CnIcon class="cn-realtime-toast__icon"
			name="Sync"
			:size="20"
			aria-hidden="true" />
		<span class="cn-realtime-toast__body">
			<strong class="cn-realtime-toast__title" data-testid="cn-realtime-toast-title">{{ current.title }}</strong>
			<span v-if="current.text" class="cn-realtime-toast__text">{{ current.text }}</span>
		</span>
		<button type="button"
			class="cn-realtime-toast__close"
			:aria-label="closeLabel"
			:title="closeLabel"
			data-testid="cn-realtime-toast-close"
			@click="current = null">
			<CnIcon name="Close" :size="18" aria-hidden="true" />
		</button>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { emit, subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { cnFetchJson } from '../../utils/cnFetch.js'
import { readVisibleWhenPath } from '../../utils/visibleWhen.js'
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnRealtimeToast: "Just updated by Anouk Bakker" when someone else changes
 * what this page shows (DqWerkbord: "Zojuist bijgewerkt door Anouk Bakker ...
 * Sluiten"). One dark toast at the bottom of the page, `role="status"`, a
 * close button; a newer change replaces it. Each change also emits `change`
 * and, unless `refreshOnChange` is false, the page refresh signal, so the
 * lists on the page read again.
 *
 * Changes come from polling `source.url` (`GET <url>?since=<now>` answering
 * `{ changes: [{ id, actor, actorId, text, at }], now }`; the first poll only
 * learns `now`) or from an event-bus `channel` whose payload is one change.
 * A change by the current user is ignored.
 */
export default {
	name: 'CnRealtimeToast',

	components: { CnIcon },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Poll this endpoint: `{ url, interval?, sinceParam? }`. `url` is
		 * app-relative; `interval` in ms (default 15000, at least 2000).
		 *
		 * @type {{url: string, interval?: number, sinceParam?: string}|null}
		 */
		source: { type: Object, default: null },
		/** Or listen on this event-bus channel; each payload is one change. */
		channel: { type: String, default: '' },
		/** The title, `{actor}` filled in, through the host translate. Default "Just updated by {actor}". */
		titleTemplate: { type: String, default: '' },
		/** The change's text path (default `text`). */
		textField: { type: String, default: 'text' },
		/** The change's actor name path (default `actor`). */
		actorField: { type: String, default: 'actor' },
		/** Emit the page refresh signal on a change. */
		refreshOnChange: { type: Boolean, default: true },
	},

	emits: ['change'],

	data() {
		return {
			current: null,
			since: null,
			timer: null,
		}
	},

	computed: {
		/**
		 * @spec openspec/changes/realtime-toast/specs/realtime-toast/spec.md#requirement-a-change-by-someone-else-shows-a-toast
		 */
		closeLabel() {
			return t('nextcloud-vue', 'Close')
		},

		/**
		 * @return {number} The poll interval in ms.
		 *
		 * @spec openspec/changes/realtime-toast/specs/realtime-toast/spec.md#requirement-a-change-by-someone-else-shows-a-toast
		 */
		interval() {
			const value = Number(this.source && this.source.interval)
			return Number.isFinite(value) && value >= 2000 ? value : 15000
		},
	},

	/**
	 * @spec openspec/changes/realtime-toast/specs/realtime-toast/spec.md#requirement-a-change-by-someone-else-shows-a-toast
	 */
	mounted() {
		if (this.channel) {
			subscribe(this.channel, this.receive)
		}
		if (this.source && this.source.url) {
			this.poll()
			this.timer = setInterval(() => this.poll(), this.interval)
		}
	},

	/**
	 * @spec openspec/changes/realtime-toast/specs/realtime-toast/spec.md#requirement-a-change-by-someone-else-shows-a-toast
	 */
	beforeUnmount() {
		if (this.channel) {
			unsubscribe(this.channel, this.receive)
		}
		if (this.timer) {
			clearInterval(this.timer)
			this.timer = null
		}
	},

	methods: {
		/**
		 * Ask the endpoint for the changes since the last answer.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/realtime-toast/specs/realtime-toast/spec.md#requirement-a-change-by-someone-else-shows-a-toast
		 */
		async poll() {
			const url = this.source.url
			const base = /^https?:\/\//.test(url) ? url : generateUrl(url)
			const param = this.source.sinceParam || 'since'
			const target = this.since ? `${base}${base.includes('?') ? '&' : '?'}${param}=${encodeURIComponent(this.since)}` : base
			let body
			try {
				body = await cnFetchJson(target)
			} catch {
				return
			}
			const first = this.since === null
			if (body && typeof body.now === 'string') {
				this.since = body.now
			}
			if (!first && body && Array.isArray(body.changes)) {
				body.changes.forEach((change) => this.receive(change))
			}
		},

		/**
		 * Show one change, unless the current user made it.
		 *
		 * @param {object} change The change.
		 * @spec openspec/changes/realtime-toast/specs/realtime-toast/spec.md#requirement-a-change-by-someone-else-shows-a-toast
		 */
		receive(change) {
			if (!change || typeof change !== 'object') {
				return
			}
			const me = getCurrentUser()
			if (me && change.actorId && change.actorId === me.uid) {
				return
			}
			const actor = String(readVisibleWhenPath(change, this.actorField) ?? '')
			const template = this.titleTemplate ? this.cnTranslate(this.titleTemplate) : t('nextcloud-vue', 'Just updated by {actor}')
			this.current = {
				title: template.replace('{actor}', actor),
				text: String(readVisibleWhenPath(change, this.textField) ?? ''),
			}
			this.$emit('change', change)
			if (this.refreshOnChange) {
				emit('cn:page:refresh', {})
			}
		},
	},
}
</script>

<style scoped>
.cn-realtime-toast {
	position: fixed;
	z-index: 10000;
	bottom: 24px;
	inset-inline-start: calc(var(--cn-realtime-toast-offset, 0px) + 24px);
	display: flex;
	align-items: flex-start;
	gap: 12px;
	box-sizing: border-box;
	width: 420px;
	max-width: calc(100vw - 48px);
	padding: 14px 16px;
	border-radius: var(--cn-board-card-radius, 12px);
	background: var(--color-main-text);
	color: var(--color-main-background);
	box-shadow: 0 12px 32px var(--color-box-shadow);
	font-size: 14px;
	line-height: 1.4;
}

.cn-realtime-toast__icon {
	flex: 0 0 auto;
	color: var(--color-primary-element-light);
}

.cn-realtime-toast__body {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}

.cn-realtime-toast__title {
	font-weight: 600;
}

.cn-realtime-toast__close {
	display: inline-flex;
	flex: 0 0 auto;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	min-height: 28px;
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: 14px;
	background: transparent;
	color: inherit;
	cursor: pointer;
}

.cn-realtime-toast__close:hover,
.cn-realtime-toast__close:focus-visible {
	background: color-mix(in srgb, var(--color-main-background) 16%, transparent);
}
</style>
