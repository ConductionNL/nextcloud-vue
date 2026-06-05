<!--
  CnEmailCard — compact email widget for the integration registry.

  Surface-aware shell around the `email` integration (NC Mail link-only
  per AD-2). Fetches linked email messages for an OR object via the
  registry endpoint and renders them in a `CnDetailCard`. Per umbrella
  change `pluggable-integration-registry` AD-19 (surface fallback) one
  component handles all four surfaces — `surface` is forwarded so the
  component can branch internally.

  Storage strategy: link-table (`openregister_email_links`). Backend
  pages results; the card itself only shows the first `maxDisplay`
  entries and emits `show-all` for the full sidebar view.
-->
<template>
	<CnDetailCard :title="resolvedTitle" :icon="Email" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />
		<div v-else-if="errored === true" class="cn-email-card__empty">
			{{ errorLabel }}
		</div>
		<div v-else-if="messages.length === 0" class="cn-email-card__empty">
			{{ noMessagesLabel }}
		</div>
		<ul v-else class="cn-email-card__list">
			<li
				v-for="row in displayedRows"
				:key="row.id"
				class="cn-email-card__row"
				:class="{ 'cn-email-card__row--unread': row.unread }">
				<button
					class="cn-email-card__open"
					:title="openInMailLabel"
					@click="openInMail(row.message)">
					<NcAvatar
						class="cn-email-card__avatar"
						:size="32"
						:display-name="row.sender"
						:user="row.avatarUser"
						:is-no-user="true" />
					<div class="cn-email-card__text">
						<div class="cn-email-card__row-head">
							<strong class="cn-email-card__subject">{{ row.subject }}</strong>
							<span class="cn-email-card__when">{{ row.when }}</span>
						</div>
						<div class="cn-email-card__row-body">
							<span class="cn-email-card__sender">{{ row.sender }}</span>
						</div>
						<div v-if="row.snippet" class="cn-email-card__snippet">
							{{ row.snippet }}
						</div>
					</div>
				</button>
			</li>
		</ul>
		<template v-if="messages.length > maxDisplay" #footer>
			<button class="cn-email-card__show-all" @click="$emit('show-all')">
				{{ showAllLabel }} ({{ total || messages.length }})
			</button>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcAvatar, NcLoadingIcon } from '@nextcloud/vue'
import Email from 'vue-material-design-icons/Email.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnEmailCard — compact widget for the `email` integration leaf.
 *
 * Backed by OpenRegister's `EmailService` via the registry's
 * `/integrations/email` endpoint. Renders the latest linked Nextcloud
 * Mail messages with subject + sender + date. Clicking a row deep-links
 * into the NC Mail app.
 *
 * Basic usage
 * ```vue
 * <CnEmailCard
 *   :register="registerId"
 *   :schema="schemaId"
 *   :object-id="objectId"
 *   surface="detail-page" />
 * ```
 *
 * @event show-all Emitted when the user clicks the "Show all" overflow
 * control — parents typically open the Emails sidebar tab.
 */
export default {
	name: 'CnEmailCard',

	components: { CnDetailCard, NcAvatar, NcLoadingIcon },

	props: {
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/**
		 * Rendering surface — passed for AD-19 surface fallback consumers.
		 * `single-entity` shows only the most-recent message; the other
		 * three surfaces render a list up to `maxDisplay`.
		 */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (value) => ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity'].includes(value),
		},
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Maximum rows to render. */
		maxDisplay: { type: Number, default: 5 },
		/** Whether the card collapses. */
		collapsible: { type: Boolean, default: false },
		/** Override the card title (defaults to the translated label). */
		title: { type: String, default: '' },
		/** Pre-translated empty label. */
		noMessagesLabel: { type: String, default: () => t('nextcloud-vue', 'No linked emails yet') },
		/** Pre-translated error label. */
		errorLabel: { type: String, default: () => t('nextcloud-vue', 'Could not load emails') },
		/** Pre-translated overflow label. */
		showAllLabel: { type: String, default: () => t('nextcloud-vue', 'Show all') },
		/** Pre-translated row tooltip / aria label. */
		openInMailLabel: { type: String, default: () => t('nextcloud-vue', 'Open in Mail') },
		/** Pre-translated fallback subject label. */
		noSubjectLabel: { type: String, default: () => t('nextcloud-vue', '(no subject)') },
		/** Pre-translated fallback sender label. */
		unknownSenderLabel: { type: String, default: () => t('nextcloud-vue', 'Unknown sender') },
	},

	emits: ['show-all'],

	data() {
		return {
			Email,
			messages: [],
			total: 0,
			loading: false,
			errored: false,
		}
	},

	computed: {
		resolvedTitle() {
			return this.title || t('nextcloud-vue', 'Emails')
		},
		effectiveMax() {
			return this.surface === 'single-entity' ? 1 : this.maxDisplay
		},
		displayedMessages() {
			return this.messages.slice(0, this.effectiveMax)
		},
		/**
		 * Template-safe view rows; keeps `?.`/`??` out of the buble template.
		 *
		 * @return {object[]} One descriptor per displayed message.
		 */
		displayedRows() {
			return this.displayedMessages.map((message) => ({
				id: message.id,
				message,
				subject: this.formatSubject(message),
				sender: this.formatSender(message),
				snippet: this.formatSnippet(message),
				when: this.formatWhen(message),
				unread: this.isUnread(message),
				avatarUser: this.senderEmail(message),
			}))
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) { if (id) { this.fetchMessages() } },
		},
	},

	methods: {
		async fetchMessages() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.errored = false
			try {
				const params = new URLSearchParams({ _limit: String(this.effectiveMax) })
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/email?${params.toString()}`,
					{ headers: buildHeaders() },
				)
				if (response.ok === true) {
					const data = await response.json()
					const list = data.results || data.items || (Array.isArray(data) ? data : []) || []
					this.messages = Array.isArray(list) === true ? list : []
					this.total = typeof data.total === 'number' ? data.total : this.messages.length
				} else {
					this.errored = true
					this.messages = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnEmailCard] failed to fetch linked emails', err)
				this.errored = true
				this.messages = []
			} finally {
				this.loading = false
			}
		},

		formatSubject(message) {
			const raw = message.subject
			if (typeof raw === 'string' && raw.trim() !== '') {
				return raw
			}
			return this.noSubjectLabel
		},

		formatSender(message) {
			const raw = message.senderName || message.fromName || message.sender || message.from
			if (typeof raw === 'string' && raw.trim() !== '') {
				return raw
			}
			return this.unknownSenderLabel
		},

		senderEmail(message) {
			const candidate = message.senderEmail || message.fromEmail || message.sender || message.from
			if (typeof candidate === 'string' && candidate.indexOf('@') !== -1) {
				return candidate.trim()
			}
			return ''
		},

		formatSnippet(message) {
			const raw = message.preview || message.snippet || message.summary || message.bodyPreview
			if (typeof raw === 'string' && raw.trim() !== '') {
				return raw.trim()
			}
			return ''
		},

		isUnread(message) {
			if (typeof message.unread === 'boolean') {
				return message.unread
			}
			if (typeof message.isRead === 'boolean') {
				return message.isRead === false
			}
			if (typeof message.seen === 'boolean') {
				return message.seen === false
			}
			if (Array.isArray(message.flags)) {
				return message.flags.indexOf('seen') === -1 && message.flags.indexOf('\\Seen') === -1
			}
			return false
		},

		formatWhen(message) {
			const raw = message.mailDate || message.date || message.linkedAt
			if (raw === undefined || raw === null || raw === '') {
				return ''
			}
			const d = new Date(raw)
			if (Number.isNaN(d.getTime()) === true) {
				return String(raw)
			}
			return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
		},

		openInMail(message) {
			const accountId = message.mailAccountId
			const messageId = message.mailMessageId
			if (accountId === undefined || accountId === null || messageId === undefined || messageId === null) {
				return
			}
			const base = (typeof OC !== 'undefined' && typeof OC.generateUrl === 'function')
				? OC.generateUrl(`/apps/mail/box/${accountId}/thread/${messageId}`)
				: `/index.php/apps/mail/box/${accountId}/thread/${messageId}`
			if (typeof window !== 'undefined' && window.location) {
				window.open(base, '_blank', 'noopener')
			}
		},
	},
}
</script>

<style scoped>
.cn-email-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-email-card__row {
	padding: 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-email-card__row:last-child {
	border-bottom: none;
}

.cn-email-card__open {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	width: 100%;
	background: none;
	border: none;
	padding: 6px 0;
	cursor: pointer;
	text-align: left;
	color: inherit;
	font: inherit;
}

.cn-email-card__open:hover .cn-email-card__subject {
	color: var(--color-primary-element);
}

.cn-email-card__avatar {
	flex: 0 0 auto;
}

.cn-email-card__text {
	flex: 1 1 auto;
	min-width: 0;
}

.cn-email-card__row-head {
	display: flex;
	justify-content: space-between;
	gap: 8px;
}

.cn-email-card__subject {
	color: var(--color-main-text);
	font-weight: normal;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-email-card__row--unread .cn-email-card__subject {
	font-weight: bold;
}

.cn-email-card__snippet {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-email-card__when {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	white-space: nowrap;
}

.cn-email-card__row-body {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-email-card__empty {
	color: var(--color-text-maxcontrast);
	text-align: center;
	padding: 12px 0;
}

.cn-email-card__show-all {
	background: none;
	border: none;
	color: var(--color-primary-element);
	cursor: pointer;
	padding: 4px 0;
	font: inherit;
}

.cn-email-card__show-all:hover {
	text-decoration: underline;
}
</style>
