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
		<div v-if="showActions" class="cn-email-tab__actions">
			<NcButton variant="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ linkExistingLabel }}
			</NcButton>
			<NcButton
				variant="primary"
				:href="composeUrl"
				target="_blank">
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
				class="cn-email-tab__item">
				<component
					:is="row.href ? 'a' : 'div'"
					class="cn-email-tab__row"
					:class="{ 'cn-email-tab__row--unread': row.unread }"
					v-bind="row.href ? { href: row.href, target: '_blank', rel: 'noopener noreferrer' } : {}">
					<span class="cn-email-tab__unread-dot" :class="{ 'is-shown': row.unread }" />
					<NcAvatar
						class="cn-email-tab__avatar"
						:class="{ 'cn-email-tab__avatar--outbound': row.outbound }"
						:size="36"
						:displayName="row.avatarName"
						:user="row.avatarUser"
						:isNoUser="true" />
					<div class="cn-email-tab__body">
						<div class="cn-email-tab__line">
							<span class="cn-email-tab__subject" :title="row.subject">{{ row.subject }}</span>
							<span v-if="!row.meta" class="cn-email-tab__date">
								<NcDateTime
									v-if="row.dateValid"
									:timestamp="row.dateMs"
									relativeTime="short" />
								<template v-else>{{ row.dateRaw }}</template>
							</span>
						</div>
						<div class="cn-email-tab__sender" :title="row.meta || row.sender">
							{{ row.meta || row.sender }}
						</div>
						<div v-if="row.snippet" class="cn-email-tab__snippet" :title="row.snippet">
							{{ row.snippet }}
						</div>
					</div>
				</component>
				<span
					v-if="row.pill"
					class="cn-email-tab__pill"
					:class="{ 'cn-email-tab__pill--archived': row.archived }">
					{{ row.pill }}
				</span>
				<NcActions
					class="cn-email-tab__menu"
					:ariaLabel="moreActionsLabel"
					:forceMenu="true">
					<NcActionLink
						v-if="row.href"
						:href="row.href"
						target="_blank"
						:closeAfterClick="true">
						<template #icon>
							<OpenInNew :size="20" />
						</template>
						{{ openInMailLabel }}
					</NcActionLink>
					<NcActionButton :closeAfterClick="true" @click="unlink(row)">
						<template #icon>
							<LinkVariantOff :size="20" />
						</template>
						{{ unlinkLabel }}
					</NcActionButton>
				</NcActions>
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
			:apiBase="apiBase"
			@close="pickerOpen = false"
			@link="onLinkPick" />
	</div>
</template>

<script>
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActionLink, NcActions, NcAvatar, NcButton, NcDateTime, NcLoadingIcon } from '@nextcloud/vue'
import EmailEditOutline from 'vue-material-design-icons/EmailEditOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import LinkVariantOff from 'vue-material-design-icons/LinkVariantOff.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import CnEmailPicker from '../../../components/CnEmailPicker/CnEmailPicker.vue'
import { ageInDays, formatBoardDate, formatTimeOfDay } from '../../../utils/boardDate.js'
import { buildHeaders, prefixUrl } from '../../../utils/index.js'
import { userDisplayName } from '../../../utils/userDisplayName.js'

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
		NcActionButton,
		NcActionLink,
		NcActions,
		NcAvatar,
		NcButton,
		NcDateTime,
		NcLoadingIcon,
		EmailEditOutline,
		LinkVariant,
		LinkVariantOff,
		OpenInNew,
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
		/** Pre-translated label of a mail's "more actions" menu. */
		moreActionsLabel: { type: String, default: () => t('nextcloud-vue', 'More actions for this mail') },
		/** Pre-translated label of the menu's open-in-Mail item. */
		openInMailLabel: { type: String, default: () => t('nextcloud-vue', 'Open in Mail') },
		/** Pre-translated label of the menu's unlink item. */
		unlinkLabel: { type: String, default: () => t('nextcloud-vue', 'Unlink mail') },
		/** Base path for the Mail app (for the compose deep-link). */
		mailAppPath: { type: String, default: '/index.php/apps/mail' },
		/**
		 * Whether the tab draws its own "Link existing email" and "Compose in
		 * Mail" buttons. Off when a host draws them (CnMailTab
		 * `headerActions`) and opens the picker through `openPicker()`.
		 */
		showActions: { type: Boolean, default: true },
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
		 * @spec openspec/changes/linked-mail-row-details/specs/linked-mail-row-details/spec.md#requirement-a-linked-mail-with-details-reads-as-the-boards-draw-it
		 */
		rows() {
			return this.messages.map((message) => {
				const dateRaw = this.rawWhen(message)
				const d = dateRaw === '' ? null : new Date(dateRaw)
				const dateValid = d !== null && Number.isNaN(d.getTime()) === false
				const sender = this.formatSender(message)
				const details = this.linkDetails(message)
				const archivedAs = details === null ? '' : this.text(details.archivedAs)
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
					href: this.threadUrl(message),
					meta: details === null ? '' : this.metaLine(message, details, dateValid ? d : null),
					outbound: details !== null && details.direction === 'outbound',
					pill: details === null ? '' : this.archiveLabel(archivedAs),
					archived: archivedAs !== '',
				}
			})
		},

		/**
		 * Deep-link into NC Mail's new-message composer.
		 *
		 * AD-2 (Mail owns compose / OR owns the link): we do NOT
		 * implement an in-app composer. "Compose in Mail" opens NC Mail
		 * in a new tab with the new-message view; once the user has
		 * sent, they return to OR and link the sent message via the
		 * picker.
		 *
		 * @return {string} The composer URL.
		 */
		/** @return {string} The record, register and schema the list is for. */
		bindingKey() {
			return [this.register, this.schema, this.objectId].join('/')
		},

		composeUrl() {
			return (typeof OC !== 'undefined' && typeof OC.generateUrl === 'function')
				? OC.generateUrl('/apps/mail/box/draft')
				: `${this.mailAppPath}/box/draft`
		},
	},

	watch: {
		/*
		 * The record, its register and its schema together: on a detail page
		 * the id is known first and the register and schema follow, and the
		 * list loads once all three are there.
		 */
		bindingKey: {
			immediate: true,
			handler() {
				if (this.register && this.schema && this.objectId) {
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
					prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/email?${params.toString()}`),
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

		/**
		 * The link's details (OpenRegister's EmailLink `details`), or null for
		 * a link without them, which keeps the plain sender line.
		 *
		 * @param {object} message The message record.
		 * @return {object|null} The details.
		 * @spec openspec/changes/linked-mail-row-details/specs/linked-mail-row-details/spec.md#requirement-a-linked-mail-with-details-reads-as-the-boards-draw-it
		 */
		linkDetails(message) {
			const details = message.details
			if (details === null || typeof details !== 'object') {
				return null
			}
			const filled = Object.keys(details).some((key) => details[key] !== null && details[key] !== undefined && details[key] !== '')
			return filled ? details : null
		},

		/**
		 * A trimmed string, or '' for anything that is not a filled string.
		 *
		 * @param {unknown} value The value.
		 * @return {string} The text.
		 * @spec openspec/changes/linked-mail-row-details/specs/linked-mail-row-details/spec.md#requirement-a-linked-mail-with-details-reads-as-the-boards-draw-it
		 */
		text(value) {
			return typeof value === 'string' ? value.trim() : ''
		},

		/**
		 * The line under the subject: who it is from or to, when, how many
		 * attachments, and how it was linked, joined by middle dots.
		 *
		 * @param {object} message The message record.
		 * @param {object} details The link details.
		 * @param {Date|null} date The mail's moment, or null when unknown.
		 * @return {string} The meta line.
		 * @spec openspec/changes/linked-mail-row-details/specs/linked-mail-row-details/spec.md#requirement-a-linked-mail-with-details-reads-as-the-boards-draw-it
		 */
		metaLine(message, details, date) {
			const parts = []
			const recipient = this.text(details.recipientName)
			if (details.direction === 'outbound' && recipient !== '') {
				parts.push(t('nextcloud-vue', 'To {name}', { name: recipient }))
			} else {
				parts.push(t('nextcloud-vue', 'From {name}', { name: this.formatSender(message) }))
			}
			if (date !== null) {
				parts.push(this.whenText(date))
			}
			const count = Number(details.attachmentCount)
			if (Number.isInteger(count) && count > 0) {
				parts.push(n('nextcloud-vue', '%n attachment', '%n attachments', count))
			}
			const linked = this.linkedText(message, details)
			if (linked !== '') {
				parts.push(linked)
			}
			return parts.join(' · ')
		},

		/**
		 * The mail's date as the boards write it: "5 okt 09.15" in the last
		 * week, "12 mrt" before that.
		 *
		 * @param {Date} date The mail's moment.
		 * @return {string} The date.
		 * @spec openspec/changes/linked-mail-row-details/specs/linked-mail-row-details/spec.md#requirement-a-linked-mail-with-details-reads-as-the-boards-draw-it
		 */
		whenText(date) {
			const day = formatBoardDate(date)
			const age = ageInDays(date)
			if (age !== null && age >= 0 && age <= 7) {
				return day + ' ' + formatTimeOfDay(date)
			}
			return day
		},

		/**
		 * How the mail was linked: automatically through a shared mailbox, from
		 * a saved mail file, or by a person.
		 *
		 * @param {object} message The message record.
		 * @param {object} details The link details.
		 * @return {string} The phrase, or '' when unknown.
		 * @spec openspec/changes/linked-mail-row-details/specs/linked-mail-row-details/spec.md#requirement-a-linked-mail-with-details-reads-as-the-boards-draw-it
		 */
		linkedText(message, details) {
			if (details.linkedVia === 'mailbox') {
				const mailbox = this.text(details.mailboxName)
				return mailbox === ''
					? t('nextcloud-vue', 'linked automatically')
					: t('nextcloud-vue', 'linked automatically via {mailbox}', { mailbox })
			}
			if (details.linkedVia === 'file') {
				return t('nextcloud-vue', 'from a saved mail file')
			}
			if (details.linkedVia === 'manual') {
				const name = userDisplayName(message.linkedBy)
				return name === '' ? '' : t('nextcloud-vue', 'linked by {name}', { name })
			}
			return ''
		},

		/**
		 * The pill beside a mail with details: its archive copy, or "Linked".
		 *
		 * @param {string} archivedAs The archive format, such as pdf, or ''.
		 * @return {string} The pill text.
		 * @spec openspec/changes/linked-mail-row-details/specs/linked-mail-row-details/spec.md#requirement-a-linked-mail-with-details-reads-as-the-boards-draw-it
		 */
		archiveLabel(archivedAs) {
			if (archivedAs === '') {
				return t('nextcloud-vue', 'Linked')
			}
			if (archivedAs.toLowerCase() === 'pdf') {
				return t('nextcloud-vue', 'Archived as PDF')
			}
			return t('nextcloud-vue', 'Archived as {format}', { format: archivedAs })
		},

		rawWhen(message) {
			const raw = message.mailDate || message.date || message.linkedAt
			if (raw === undefined || raw === null || raw === '') {
				return ''
			}
			return raw
		},

		// Thread deep-link into NC Mail; undefined when the row lacks ids.
		threadUrl(message) {
			const accountId = message.mailAccountId
			const messageId = message.mailMessageId
			if (accountId === undefined || accountId === null || messageId === undefined || messageId === null) {
				return undefined
			}
			return (typeof OC !== 'undefined' && typeof OC.generateUrl === 'function')
				? OC.generateUrl(`/apps/mail/box/${accountId}/thread/${messageId}`)
				: `/index.php/apps/mail/box/${accountId}/thread/${messageId}`
		},

		openPicker() {
			this.pickerOpen = true
		},

		/**
		 * Remove a mail's link to the record (the mail stays in Mail), then
		 * reload the list.
		 *
		 * @param {object} row A view row from `rows`.
		 * @spec openspec/changes/board-linked-mail-rows/specs/board-linked-mail-rows/spec.md#requirement-every-linked-mail-carries-a-more-actions-menu
		 */
		async unlink(row) {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			try {
				const response = await fetch(
					prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/emails/${encodeURIComponent(row.id)}`),
					{ method: 'DELETE', headers: buildHeaders() },
				)
				if (response.ok === true) {
					this.reset()
					await this.fetchMessages()
				} else {
					this.errored = true
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnEmailTab] unlink failed', err)
				this.errored = true
			}
		},

		async onLinkPick(payload) {
			this.pickerOpen = false
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			try {
				const response = await fetch(
					prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/emails`),
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

/* The row's link and its "more actions" menu, side by side. */
.cn-email-tab__item {
	display: flex;
	align-items: center;
	gap: 4px;
}

.cn-email-tab__row {
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 8px 6px;
	border-radius: var(--border-radius-large, 8px);
	color: inherit;
	text-decoration: none;
	position: relative;
}

/* Only a row with Mail ids is a link; the rest must not look clickable. */
a.cn-email-tab__row {
	cursor: pointer;
}

a.cn-email-tab__row:hover {
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

.cn-email-tab__pill {
	flex: none;
	padding: 2px 8px;
	border-radius: var(--border-radius-pill, 12px);
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
	font-size: 0.85em;
	white-space: nowrap;
}

.cn-email-tab__pill--archived {
	background: var(--color-success);
	color: var(--color-success-text);
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
