<!--
  CnEmailTab — sidebar tab for the `email` integration.

  Renders the full list of Nextcloud Mail messages linked to an OR
  object. Backed by `EmailService` via the registry endpoint
  (`/integrations/email`). Paged via load-more; rows deep-link into the
  NC Mail app per AD-2 (Mail owns compose, OR owns the link).

  Storage strategy: link-table (`openregister_email_links`). Per design
  AD-1 the tab does NOT compose — users open Mail, send, return and
  link via the "Link existing" picker (compose UI tracked separately).
-->
<template>
	<div class="cn-sidebar-tab cn-email-tab">
		<div class="cn-email-tab__actions">
			<NcButton type="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ linkExistingLabel }}
			</NcButton>
			<NcButton type="primary" @click="openComposeInMail">
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
		<div v-else class="cn-sidebar-tab__list">
			<NcListItem
				v-for="message in messages"
				:key="message.id"
				:name="formatSubject(message)"
				:bold="false"
				:force-display-actions="false"
				@click="openInMail(message)">
				<template #icon>
					<EmailOutline :size="32" />
				</template>
				<template #subname>
					{{ formatSender(message) }}
				</template>
				<template #details>
					{{ formatWhen(message) }}
				</template>
			</NcListItem>
		</div>
		<NcButton
			v-if="hasMore === true"
			type="tertiary"
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
import { NcButton, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import EmailOutline from 'vue-material-design-icons/EmailOutline.vue'
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
		NcButton,
		NcListItem,
		NcLoadingIcon,
		EmailOutline,
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
			page: 0,
			loading: false,
			loadingMore: false,
			errored: false,
			pickerOpen: false,
		}
	},

	computed: {
		hasMore() {
			return this.messages.length < this.total
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
			this.page = 0
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
				const params = new URLSearchParams({
					_limit: String(this.pageSize),
					_page: String(this.page),
				})
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/email?${params.toString()}`,
					{ headers: buildHeaders() },
				)
				if (response.ok === true) {
					const data = await response.json()
					const list = data.results || data.items || (Array.isArray(data) ? data : []) || []
					const items = Array.isArray(list) === true ? list : []
					this.messages = append === true ? [...this.messages, ...items] : items
					this.total = typeof data.total === 'number' ? data.total : this.messages.length
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
			this.page += 1
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
			const raw = message.sender
			if (typeof raw === 'string' && raw.trim() !== '') {
				return raw
			}
			return this.unknownSenderLabel
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

.cn-sidebar-tab__list {
	display: flex;
	flex-direction: column;
	gap: 2px;
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
</style>
