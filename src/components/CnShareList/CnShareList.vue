<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-share-list" data-testid="cn-share-list">
		<p v-if="loadError"
			class="cn-share-list__error"
			role="alert"
			data-testid="cn-share-list-error">
			{{ loadError }}
		</p>
		<p v-else-if="loaded && rows.length === 0" class="cn-share-list__empty" data-testid="cn-share-list-empty">
			{{ emptyText }}
		</p>
		<ul v-else class="cn-share-list__rows" :aria-label="listLabel">
			<li v-for="row in rows"
				:key="row.id"
				class="cn-share-list__row"
				data-testid="cn-share-list-row">
				<CnIcon class="cn-share-list__kind"
					:name="row.icon"
					:size="20"
					aria-hidden="true" />
				<span class="cn-share-list__text">
					<strong class="cn-share-list__title">{{ row.title }}</strong>
					<span v-if="row.meta" class="cn-share-list__meta">{{ row.meta }}</span>
				</span>
				<span v-if="row.statusLabel"
					class="cn-share-list__status"
					:class="`cn-share-list__status--${row.tone}`"
					data-testid="cn-share-list-status">{{ row.statusLabel }}</span>
				<span class="cn-share-list__actions">
					<NcButton v-if="row.link"
						variant="secondary"
						:aria-label="`${copyText}: ${row.title}`"
						data-testid="cn-share-list-copy"
						@click="copy(row)">
						{{ copyText }}
					</NcButton>
					<NcButton v-if="revokeUrl && row.revocable"
						variant="secondary"
						:disabled="busyId === row.id"
						:aria-label="`${revokeText}: ${row.title}`"
						data-testid="cn-share-list-revoke"
						@click="revoke(row)">
						{{ revokeText }}
					</NcButton>
				</span>
			</li>
		</ul>
		<p class="cn-share-list__live" aria-live="polite" data-testid="cn-share-list-live">
			{{ liveText }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton } from '@nextcloud/vue'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { cnFetchJson } from '../../utils/cnFetch.js'
import { readVisibleWhenPath } from '../../utils/visibleWhen.js'
import { CnIcon } from '../CnIcon/index.js'

/** The icon per share kind. */
const KIND_ICONS = Object.freeze({ case: 'BriefcaseOutline', file: 'FileOutline', mail: 'EmailOutline', folder: 'FolderOutline' })

/** The tone per share status; anything else is neutral. */
const STATUS_TONES = Object.freeze({ active: 'success', expired: 'neutral', revoked: 'neutral', pending: 'warning' })

/**
 * Fill `{field}` placeholders in a URL from a row.
 *
 * @param {string} url The URL template.
 * @param {object} row The row.
 * @return {string} The URL with every placeholder filled, URL-encoded.
 */
function fillUrl(url, row) {
	return String(url).replace(/\{([\w.]+)\}/g, (match, path) => {
		const value = readVisibleWhenPath(row, path)
		return value === undefined || value === null ? '' : encodeURIComponent(String(value))
	})
}

/**
 * CnShareList, widget type `share-list`: the shares of a record with people
 * outside the organisation, one row per share (DqZaakBetrokkenen "Delen
 * buiten de organisatie"): its kind (case, file, mail), title, a meta line,
 * a status pill, and the buttons Copy link and Revoke.
 *
 * Revoke runs as an `api-call` through the page dispatcher with
 * `noticeInline: 'error'`, so a refusal shows in the card in the server's words
 * ("Intrekken geweigerd door OpenRegister: ...") and the row stays; a revoke
 * that lands reads the list again. A new share is the card's own
 * `headerActions` entry (an open-modal on the app's share dialog).
 *
 * `content`:
 * - `url`: the list endpoint (app-relative, `{objectId}` filled), answering an
 *   array or `{ results: [] }`.
 * - `fields`: `{ id?, title?, meta?, status?, link?, kind?, revocable? }`, the
 *   row paths (defaults `id`, `title`, `meta`, `status`, `url`, `kind`,
 *   `revocable`). A row without the `revocable` field can be revoked.
 * - `statusLabels`: `{ active: 'Active', ... }`, through the host translate.
 * - `revoke`: `{ url, method? }`, `{field}` placeholders from the row
 *   (method default `DELETE`). Without it there is no Revoke button.
 * - `copyLabel`, `revokeLabel`, `emptyText`, `listLabel`: texts, translated.
 */
export default {
	name: 'CnShareList',

	components: { CnIcon, NcButton },

	inject: {
		cnTranslate: { default: () => (key) => key },
		cnDispatchAction: { default: null },
	},

	props: {
		/**
		 * The widget content, see the component description.
		 *
		 * @type {{url?: string, fields?: object, statusLabels?: object, revoke?: {url: string, method?: string}, copyLabel?: string, revokeLabel?: string, emptyText?: string, listLabel?: string}}
		 */
		content: { type: Object, default: () => ({}) },
		/** The page's record id, for `{objectId}` in the list URL. */
		objectId: { type: [String, Number], default: '' },
	},

	data() {
		return {
			raw: [],
			loaded: false,
			loadError: '',
			busyId: null,
			liveText: '',
		}
	},

	computed: {
		/**
		 * @return {object} The row paths.
		 *
		 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		fields() {
			return { id: 'id', title: 'title', meta: 'meta', status: 'status', link: 'url', kind: 'kind', revocable: 'revocable', ...(this.content.fields || {}) }
		},

		/**
		 * @return {string} The list endpoint, '' without one.
		 *
		* @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		listUrl() {
			const url = this.content.url
			return typeof url === 'string' && url !== '' ? url.replace(/\{objectId\}/g, encodeURIComponent(String(this.objectId))) : ''
		},

		/**
		 * @return {string} The revoke endpoint template, '' without one.
		 *
		 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		revokeUrl() {
			const revoke = this.content.revoke
			return revoke && typeof revoke.url === 'string' ? revoke.url : ''
		},

		/**
		 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		copyText() {
			return this.tr(this.content.copyLabel) || t('nextcloud-vue', 'Copy link')
		},

		/**
		 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		revokeText() {
			return this.tr(this.content.revokeLabel) || t('nextcloud-vue', 'Revoke')
		},

		/**
		 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		emptyText() {
			return this.tr(this.content.emptyText) || t('nextcloud-vue', 'Nothing is shared outside the organisation.')
		},

		/**
		 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		listLabel() {
			return this.tr(this.content.listLabel) || t('nextcloud-vue', 'Shares')
		},

		/**
		 * The rows as drawn.
		 *
		 * @return {Array<object>} The rows.
		 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		rows() {
			const f = this.fields
			const labels = this.content.statusLabels || {}
			return this.raw.map((row, index) => {
				const status = String(readVisibleWhenPath(row, f.status) ?? '')
				const kind = String(readVisibleWhenPath(row, f.kind) ?? '')
				const revocable = readVisibleWhenPath(row, f.revocable)
				return {
					raw: row,
					id: String(readVisibleWhenPath(row, f.id) ?? index),
					title: this.tr(String(readVisibleWhenPath(row, f.title) ?? '')),
					meta: String(readVisibleWhenPath(row, f.meta) ?? ''),
					link: String(readVisibleWhenPath(row, f.link) ?? ''),
					icon: KIND_ICONS[kind] || 'ShareVariantOutline',
					statusLabel: status ? (this.tr(labels[status]) || status) : '',
					tone: STATUS_TONES[status] || 'neutral',
					revocable: revocable !== false && status !== 'revoked',
				}
			})
		},
	},

	watch: {
		/**
		* @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		listUrl() {
			this.load()
		},
	},

	created() {
		this.load()
	},

	methods: {
		/**
		 * @param {unknown} key A manifest text.
		 * @return {string} Its translation.
		 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		tr(key) {
			return typeof key === 'string' && key !== '' ? this.cnTranslate(key) : ''
		},

		/**
		 * Read the shares.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		async load() {
			if (!this.listUrl) {
				this.raw = []
				this.loaded = true
				return
			}
			try {
				const body = await cnFetchJson(/^https?:\/\//.test(this.listUrl) ? this.listUrl : generateUrl(this.listUrl))
				this.raw = Array.isArray(body) ? body : (body && Array.isArray(body.results) ? body.results : [])
				this.loadError = ''
			} catch {
				this.loadError = t('nextcloud-vue', 'The shares could not be read.')
			}
			this.loaded = true
		},

		/**
		 * Copy a share's link and say so.
		 *
		 * @param {object} row The row.
		 * @return {Promise<void>}
		 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record
		 */
		async copy(row) {
			try {
				await navigator.clipboard.writeText(row.link)
				this.liveText = t('nextcloud-vue', 'Link copied')
			} catch {
				this.liveText = t('nextcloud-vue', 'The link could not be copied.')
			}
		},

		/**
		 * Revoke a share through the page dispatcher; a refusal stays in the
		 * card as a notice, a revoke that lands reads the list again.
		 *
		 * @param {object} row The row.
		 * @return {Promise<void>}
		 * @spec openspec/changes/share-list/specs/share-list/spec.md#requirement-revoking-a-share-says-a-refusal-in-the-card
		 */
		async revoke(row) {
			const action = {
				type: 'api-call',
				url: fillUrl(this.revokeUrl, row.raw),
				method: (this.content.revoke && this.content.revoke.method) || 'DELETE',
				noticeInline: 'error',
				refresh: false,
				successMessage: this.content.revoke && this.content.revoke.successMessage,
			}
			this.busyId = row.id
			try {
				const result = typeof this.cnDispatchAction === 'function'
					? await this.cnDispatchAction(action)
					: await dispatchAction(action, { router: this.$router || null })
				if (result && result.ok) {
					await this.load()
				}
			} finally {
				this.busyId = null
			}
		},
	},
}
</script>

<style scoped>
.cn-share-list__rows {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-share-list__row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 12px;
	padding: 12px 0;
	border-top: 1px solid var(--color-border);
}

.cn-share-list__row:first-child {
	border-top: 0;
}

.cn-share-list__kind {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
}

.cn-share-list__text {
	display: flex;
	flex: 1 1 260px;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-share-list__title {
	font-weight: 600;
}

.cn-share-list__meta,
.cn-share-list__empty {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-share-list__status {
	padding: 3px 10px;
	border-radius: var(--border-radius-pill, 12px);
	background: var(--color-background-dark);
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
}

.cn-share-list__status--success {
	background: var(--cn-board-success-tint, var(--color-success-light, #e7f3ea));
	color: var(--cn-board-success-ink, var(--color-success-text, #1e6b2a));
}

.cn-share-list__status--warning {
	background: var(--cn-board-notice-bg, var(--color-warning-light, #fff4de));
	color: var(--cn-board-notice-ink, var(--color-warning-text, #7a4f00));
}

.cn-share-list__actions {
	display: flex;
	gap: 8px;
}

.cn-share-list__error {
	color: var(--color-error-text, var(--color-error));
}

.cn-share-list__live {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
