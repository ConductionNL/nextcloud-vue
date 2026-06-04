<!--
  CnEmailTab — sidebar tab for the `email` integration.

  Renders the full list of Nextcloud Mail messages linked to an OR
  object. Backed by `EmailService` via the registry endpoint
  (`/integrations/email`). Paged via load-more; rows deep-link into the
  NC Mail app per AD-2 (Mail owns compose, OR owns the link).

  Visual fidelity: mirrors the real NC Mail message list — a sender
  avatar, a bold subject, a "sender · date" subline, a one-line snippet
  preview, and an unread indicator (accent dot + bold subject) when the
  message has not been read.

  Storage strategy: link-table (`openregister_email_links`). Per design
  AD-1 the tab does NOT compose — users open Mail, send, return and
  link via the "Link existing" picker (compose UI tracked separately).
-->
<template>
	<div class="cn-sidebar-tab cn-email-tab">
		<div class="cn-email-tab__actions">
			<NcButton variant="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ linkExistingLabel }}
			</NcButton>
			<NcButton variant="primary" @click="openComposeInMail">
				<template #icon>
					<EmailEditOutline :size="18" />
				</template>
				{{ composeLabel }}
			</NcButton>
		</div>

		<div v-if="loading" class="cn-sidebar-tab__loading">
			<NcLoadingIcon />
		</div>
		<div v-else-if="errored === true" class="cn-sidebar-tab__empty cn-sidebar-tab__empty--error">
			{{ errorLabel }}
		</div>
		<div v-else-if="messages.length === 0" class="cn-sidebar-tab__empty">
			{{ noMessagesLabel }}
		</div>
		<ul v-else class="cn-email-tab__list">
			<li
				v-for="row in rows"
				:key="row.id"
				class="cn-email-tab__row"
				:class="{ 'cn-email-tab__row--unread': row.unread }"
				@click="openInMail(row.message)">
				<span class="cn-email-tab__unread-dot" :class="{ 'is-shown': row.unread }" />
				<NcAvatar
					class="cn-email-tab__avatar"
					:size="36"
					:display-name="row.avatarName"
					:user="row.avatarUser"
					:is-no-user="true" />
				<div class="cn-email-tab__body">
					<div class="cn-email-tab__line">
						<span class="cn-email-tab__subject" :title="row.subject">{{ row.subject }}</span>
						<span class="cn-email-tab__date">
							<NcDateTime
								v-if="row.dateValid"
								:timestamp="row.dateMs"
								:relative-time="'short'" />
							<template v-else>{{ row.dateRaw }}</template>
						</span>
					</div>
					<div class="cn-email-tab__sender" :title="row.sender">{{ row.sender }}</div>
					<div v-if="row.snippet" class="cn-email-tab__snippet" :title="row.snippet">
						{{ row.snippet }}
					</div>
				</div>
			</li>
		</ul>
		<NcButton
			v-if="hasMore === true"
			variant="tertiary"
			:wide="true"
			:disabled="loadingMore"
			class="cn-sidebar-tab__load-more"
			@click="loadMore">
			<template v-if="loadingMore" #icon>
				<NcLoadingIcon :size="20" />
			</template>
			{{ loadMoreLabel }}
		</NcButton>

		<CnEmailPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			@close="pickerOpen = false"
			@link="onLinkPick" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcAvatar, NcButton, NcDateTime, NcLoadingIcon } from '@nextcloud/vue'
import EmailEditOutline from 'vue-material-design-icons/EmailEditOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import CnEmailPicker from '../../../components/CnEmailPicker/CnEmailPicker.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnEmailTab — sidebar tab rendering the full list of Nextcloud Mail
 * messages linked to an OpenRegister object.
 *
 * Basic usage
 * ```vue
 * <CnEmailTab
 *   :object-id="objectId"
 *   :register="registerId"
 *   :schema="schemaId" />
 * ```
 */
export default {
	name: 'CnEmailTab',

	components: {
		NcAvatar,
		NcButton,
		NcDateTime,
		NcLoadingIcon,
		EmailEditOutline,
		LinkVariant,
		CnEmailPicker,
	},

	props: {
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Page size for paged fetches. */
		pageSize: { type: Number, default: 25 },
		/** Pre-translated empty label. */
		noMessagesLabel: { type: String, default: () => t('nextcloud-vue', 'No linked emails yet') },
		/** Pre-translated error label. */
		errorLabel: { type: String, default: () => t('nextcloud-vue', 'Could not load emails') },
		/** Pre-translated load-more label. */
		loadMoreLabel: { type: String, default: () => t('nextcloud-vue', 'Load more') },
		/** Pre-translated fallback subject label. */
		noSubjectLabel: { type: String, default: () => t('nextcloud-vue', '(no subject)') },
		/** Pre-translated fallback sender label. */
		unknownSenderLabel: { type: String, default: () => t('nextcloud-vue', 'Unknown sender') },
		/** Pre-translated link-existing CTA label. */
		linkExistingLabel: { type: String, default: () => t('nextcloud-vue', 'Link existing email') },
		/** Pre-translated compose-in-Mail CTA label. */
		composeLabel: { type: String, default: () => t('nextcloud-vue', 'Compose in Mail') },
		/** Base path for the Mail app (for the compose deep-link). */
		mailAppPath: { type: String, default: '/index.php/apps/mail' },
	},

	data() {
		return {
			messages: [],
			total: 0,
			nextCursor: null,
			loading: false,
			loadingMore: false,
			errored: false,
			pickerOpen: false,
		}
	},

	computed: {
		/**
		 * Whether a further page is available.
		 *
		 * Prefers the backend's `nextCursor` (Tier-3 standardized
		 * `{items, total, nextCursor}` envelope from the generic
		 * integrations endpoint). Falls back to the count comparison
		 * for any backend that still omits the cursor.
		 *
		 * @return {boolean} True when more messages can be loaded.
		 */
		hasMore() {
			if (this.nextCursor !== null) {
				return true
			}
			return this.messages.length < this.total
		},

		/**
		 * Pre-computed, template-safe view rows mirroring NC Mail.
		 *
		 * All optional-chaining / nullish logic lives here (in JS) so the
		 * buble-compiled Vue 2 template stays free of `?.` / `??`.
		 *
		 * @return {object[]} One descriptor per message.
		 */
		rows() {
			return this.messages.map((message) => {
				const dateRaw = this.rawWhen(message)
				const d = dateRaw === '' ? null : new Date(dateRaw)
				const dateValid = d !== null && Number.isNaN(d.getTime()) === false
				const sender = this.formatSender(message)
				return {
					id: message.id,
					message,
					subject: this.formatSubject(message),
					sender,
					snippet: this.formatSnippet(message),
					unread: this.isUnread(message),
					dateValid,
					dateMs: dateValid ? d.getTime() : 0,
					dateRaw: String(dateRaw),
					avatarName: sender,
					avatarUser: this.senderEmail(message),
				}
			})
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) {
				if (id) {
					this.reset()
					this.fetchMessages()
				}
			},
		},
	},

	methods: {
		reset() {
			this.messages = []
			this.total = 0
			this.nextCursor = null
			this.errored = false
		},

		async fetchMessages(append = false) {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			if (append === true) {
				this.loadingMore = true
			} else {
				this.loading = true
			}
			this.errored = false
			try {
				const params = new URLSearchParams({ _limit: String(this.pageSize) })
				// The Tier-3 envelope's `nextCursor` is the next zero-indexed
				// page number consumed by `_page`; walk it on append.
				if (append === true && this.nextCursor !== null) {
					params.set('_page', String(this.nextCursor))
				} else {
					params.set('_page', '0')
				}
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/email?${params.toString()}`,
					{ headers: buildHeaders() },
				)
				if (response.ok === true) {
					const data = await response.json()
					const list = data.items || data.results || (Array.isArray(data) ? data : []) || []
					const items = Array.isArray(list) === true ? list : []
					this.messages = append === true ? [...this.messages, ...items] : items
					this.total = typeof data.total === 'number' ? data.total : this.messages.length
					const next = data.nextCursor
					this.nextCursor = (next === null || next === undefined) ? null : next
				} else {
					this.errored = true
					if (append !== true) {
						this.messages = []
					}
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnEmailTab] failed to fetch linked emails', err)
				this.errored = true
				if (append !== true) {
					this.messages = []
				}
			} finally {
				this.loading = false
				this.loadingMore = false
			}
		},

		loadMore() {
			if (this.nextCursor === null && this.messages.length >= this.total) {
				return
			}
			this.fetchMessages(true)
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

		/**
		 * Best-effort bare email address for the NcAvatar `user` seed so
		 * gravatar/initials are stable per correspondent.
		 *
		 * @param {object} message The message record.
		 * @return {string} An email-ish identifier, or '' when unknown.
		 */
		senderEmail(message) {
			const candidate = message.senderEmail || message.fromEmail || message.sender || message.from
			if (typeof candidate === 'string' && candidate.indexOf('@') !== -1) {
				return candidate.trim()
			}
			return ''
		},

		/**
		 * One-line preview snippet, mirroring NC Mail's message list.
		 *
		 * @param {object} message The message record.
		 * @return {string} A trimmed snippet, or '' when none is available.
		 */
		formatSnippet(message) {
			const raw = message.preview || message.snippet || message.summary || message.bodyPreview
			if (typeof raw === 'string' && raw.trim() !== '') {
				return raw.trim()
			}
			return ''
		},

		/**
		 * Whether the message is unread, tolerant of the several shapes
		 * the backend may report read-state in.
		 *
		 * @param {object} message The message record.
		 * @return {boolean} True when the message has not been read.
		 */
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

		rawWhen(message) {
			const raw = message.mailDate || message.date || message.linkedAt
			if (raw === undefined || raw === null || raw === '') {
				return ''
			}
			return raw
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

		openPicker() {
			this.pickerOpen = true
		},

		/**
		 * Deep-link into NC Mail's new-message composer.
		 *
		 * AD-2 (Mail owns compose / OR owns the link): we do NOT
		 * implement an in-app composer. Clicking "Compose in Mail"
		 * opens NC Mail in a new tab with the new-message view; once
		 * the user has sent, they return to OR and link the sent
		 * message via the picker.
		 *
		 * @return {void}
		 */
		openComposeInMail() {
			const composeUrl = (typeof OC !== 'undefined' && typeof OC.generateUrl === 'function')
				? OC.generateUrl('/apps/mail/box/draft')
				: `${this.mailAppPath}/box/draft`
			if (typeof window !== 'undefined') {
				window.open(composeUrl, '_blank', 'noopener')
			}
		},

		async onLinkPick(payload) {
			this.pickerOpen = false
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			try {
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/emails`,
					{
						method: 'POST',
						headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
						body: JSON.stringify(payload),
					},
				)
				if (response.ok === true || response.status === 409) {
					// 409 = already-linked; treated as success since the row
					// already exists for this object.
					this.reset()
					await this.fetchMessages()
				} else {
					this.errored = true
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnEmailTab] link failed', err)
				this.errored = true
			}
		},
	},
}
</script>

<style scoped>
.cn-sidebar-tab {
	padding: 12px;
	overflow-x: hidden;
}

.cn-sidebar-tab__loading {
	display: flex;
	justify-content: center;
	padding: 24px 0;
}

.cn-sidebar-tab__empty {
	text-align: center;
	padding: 24px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-sidebar-tab__empty--error {
	color: var(--color-error);
}

.cn-sidebar-tab__load-more {
	margin-top: 8px;
}

.cn-email-tab__actions {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	margin-bottom: 8px;
}

/* NC-Mail-style message list */
.cn-email-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
}

.cn-email-tab__row {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 8px 6px;
	border-radius: var(--border-radius-large, 8px);
	cursor: pointer;
	position: relative;
}

.cn-email-tab__row:hover {
	background-color: var(--color-background-hover);
}

.cn-email-tab__unread-dot {
	flex: 0 0 auto;
	width: 8px;
	align-self: center;
	visibility: hidden;
}

.cn-email-tab__unread-dot.is-shown {
	visibility: visible;
}

.cn-email-tab__unread-dot.is-shown::before {
	content: '';
	display: block;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background-color: var(--cn-email-accent, var(--color-primary-element));
}

.cn-email-tab__avatar {
	flex: 0 0 auto;
}

.cn-email-tab__body {
	flex: 1 1 auto;
	min-width: 0;
}

.cn-email-tab__line {
	display: flex;
	align-items: baseline;
	gap: 8px;
}

.cn-email-tab__subject {
	flex: 1 1 auto;
	min-width: 0;
	color: var(--color-main-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-email-tab__row--unread .cn-email-tab__subject {
	font-weight: bold;
}

.cn-email-tab__date {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
	font-size: 0.8em;
	white-space: nowrap;
}

.cn-email-tab__sender {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-email-tab__snippet {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	margin-top: 1px;
}
</style>
