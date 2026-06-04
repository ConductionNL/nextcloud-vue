<!--
  CnEmailPicker — multi-step modal for picking an existing NC Mail
  message to link to the parent OR object.

  Flow (three steps + confirm):
    1. Choose an account  — GET /api/integrations/email/accounts
    2. Choose a mailbox   — GET /api/integrations/email/accounts/{id}/mailboxes
    3. Browse messages    — GET /api/integrations/email/accounts/{id}/messages?mailbox=
                            (cursor pagination + client-side search filter)
    4. Confirm            — emit `link` with `{ mailAccountId, messageId, messageUid }`

  All API calls are wrapped in best-effort try/catch so a transient
  Mail failure surfaces a user-visible inline error rather than a modal
  crash. The modal stays open across errors so the user can retry
  without losing context.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnEmailPicker/`. Picker UX is dialog-shaped so this
  variant uses NcDialog (matches CnDeckCardPicker).

  ADR-019: drives the `email` integration leaf's "link existing"
  surface; emits `link` so the parent (CnEmailTab) can POST the
  selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-email-picker"
		@closing="onClose">
		<div class="cn-email-picker">
			<ol class="cn-email-picker__steps">
				<li :class="stepClass(1)">
					{{ t('nextcloud-vue', '1. Account') }}
				</li>
				<li :class="stepClass(2)">
					{{ t('nextcloud-vue', '2. Mailbox') }}
				</li>
				<li :class="stepClass(3)">
					{{ t('nextcloud-vue', '3. Message') }}
				</li>
			</ol>

			<NcNoteCard v-if="error" type="error" class="cn-email-picker__error">
				{{ error }}
			</NcNoteCard>

			<section v-if="step === 1" class="cn-email-picker__panel">
				<NcLoadingIcon v-if="loading" />
				<NcEmptyContent
					v-else-if="accounts.length === 0"
					:name="t('nextcloud-vue', 'No mail accounts')"
					:description="t('nextcloud-vue', 'NC Mail has no accounts configured for you yet.')" />
				<ul v-else class="cn-email-picker__list">
					<li
						v-for="account in accounts"
						:key="account.id"
						class="cn-email-picker__row"
						:class="{ 'cn-email-picker__row--selected': selectedAccountId === account.id }">
						<button type="button" class="cn-email-picker__row-button" @click="pickAccount(account)">
							<EmailOutline :size="20" />
							<span class="cn-email-picker__row-label">
								<span class="cn-email-picker__row-primary">{{ account.label }}</span>
								<span v-if="account.email && account.email !== account.label" class="cn-email-picker__row-secondary">{{ account.email }}</span>
							</span>
						</button>
					</li>
				</ul>
			</section>

			<section v-else-if="step === 2" class="cn-email-picker__panel">
				<NcLoadingIcon v-if="loading" />
				<NcEmptyContent
					v-else-if="mailboxes.length === 0"
					:name="t('nextcloud-vue', 'No mailboxes')"
					:description="t('nextcloud-vue', 'This account has no mailboxes to browse.')" />
				<ul v-else class="cn-email-picker__list">
					<li
						v-for="mb in mailboxes"
						:key="mb.id"
						class="cn-email-picker__row"
						:class="{ 'cn-email-picker__row--selected': selectedMailbox === mb.name }">
						<button type="button" class="cn-email-picker__row-button" @click="pickMailbox(mb)">
							<FolderOutline :size="20" />
							<span class="cn-email-picker__row-label">
								<span class="cn-email-picker__row-primary">{{ mb.displayName }}</span>
								<span v-if="mb.name !== mb.displayName" class="cn-email-picker__row-secondary">{{ mb.name }}</span>
							</span>
						</button>
					</li>
				</ul>
			</section>

			<section v-else-if="step === 3" class="cn-email-picker__panel">
				<NcTextField
					v-model="filterText"
					:label="t('nextcloud-vue', 'Filter messages')"
					class="cn-email-picker__filter" />

				<NcLoadingIcon v-if="loading && messages.length === 0" />
				<NcEmptyContent
					v-else-if="filteredMessages.length === 0"
					:name="t('nextcloud-vue', 'No messages')"
					:description="t('nextcloud-vue', 'This mailbox has no messages matching your filter.')" />
				<ul v-else class="cn-email-picker__list cn-email-picker__list--messages">
					<li
						v-for="msg in filteredMessages"
						:key="msg.id"
						class="cn-email-picker__row"
						:class="{ 'cn-email-picker__row--selected': selectedMessageId === msg.id }">
						<button type="button" class="cn-email-picker__row-button cn-email-picker__row-button--message" @click="pickMessage(msg)">
							<EmailOutline :size="18" />
							<span class="cn-email-picker__message">
								<span class="cn-email-picker__message-subject">{{ msg.subject || t('nextcloud-vue', '(no subject)') }}</span>
								<span class="cn-email-picker__message-meta">
									<span class="cn-email-picker__message-sender">{{ msg.sender || t('nextcloud-vue', 'Unknown sender') }}</span>
									<span v-if="msg.date" class="cn-email-picker__message-date">{{ formatDate(msg.date) }}</span>
								</span>
							</span>
						</button>
					</li>
				</ul>

				<NcButton
					v-if="nextCursor !== null"
					variant="tertiary"
					:disabled="loadingMore"
					class="cn-email-picker__load-more"
					@click="loadMoreMessages">
					<template v-if="loadingMore" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Load more') }}
				</NcButton>
			</section>
		</div>

		<template #actions>
			<NcButton v-if="step > 1" @click="goBack">
				{{ t('nextcloud-vue', 'Back') }}
			</NcButton>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				v-if="step === 3"
				variant="primary"
				:disabled="!selectedMessageId"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link message') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnEmailPicker — pick an existing Mail message via account, mailbox,
 * message. Emits `link` with `{ mailAccountId, messageId, messageUid }`.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import EmailOutline from 'vue-material-design-icons/EmailOutline.vue'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnEmailPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField, EmailOutline, FolderOutline },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing email') },
		/** Page size for the message list (load-more pagination). */
		pageSize: { type: Number, default: 50 },
	},

	emits: ['close', 'link'],

	data() {
		return {
			step: 1,
			loading: false,
			loadingMore: false,
			error: '',
			accounts: [],
			mailboxes: [],
			messages: [],
			selectedAccountId: null,
			selectedMailbox: null,
			selectedMessageId: null,
			selectedMessageUid: null,
			nextCursor: null,
			filterText: '',
		}
	},

	computed: {
		filteredMessages() {
			const needle = this.filterText.trim().toLowerCase()
			if (needle === '') {
				return this.messages
			}
			return this.messages.filter((msg) => {
				const subj = (msg.subject || '').toLowerCase()
				const sender = (msg.sender || '').toLowerCase()
				return subj.includes(needle) || sender.includes(needle)
			})
		},
	},

	mounted() {
		this.fetchAccounts()
	},

	methods: {
		t,

		stepClass(step) {
			return {
				'cn-email-picker__step': true,
				'cn-email-picker__step--active': this.step === step,
				'cn-email-picker__step--done': this.step > step,
			}
		},

		async fetchAccounts() {
			this.loading = true
			this.error = ''
			try {
				const response = await fetch(`${this.apiBase}/integrations/email/accounts`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.accounts = data.results || []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'Nextcloud Mail is not installed.')
				} else {
					this.error = t('nextcloud-vue', 'Could not load mail accounts.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnEmailPicker] fetch accounts failed', err)
				this.error = t('nextcloud-vue', 'Could not load mail accounts.')
			} finally {
				this.loading = false
			}
		},

		async fetchMailboxes(accountId) {
			this.loading = true
			this.error = ''
			try {
				const response = await fetch(`${this.apiBase}/integrations/email/accounts/${accountId}/mailboxes`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.mailboxes = data.results || []
				} else {
					this.error = t('nextcloud-vue', 'Could not load mailboxes.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnEmailPicker] fetch mailboxes failed', err)
				this.error = t('nextcloud-vue', 'Could not load mailboxes.')
			} finally {
				this.loading = false
			}
		},

		async fetchMessages(accountId, mailbox, append = false) {
			if (append === true) {
				this.loadingMore = true
			} else {
				this.loading = true
				this.messages = []
				this.nextCursor = null
			}
			this.error = ''
			try {
				const params = new URLSearchParams({
					mailbox,
					limit: String(this.pageSize),
				})
				if (append === true && this.nextCursor !== null) {
					params.set('cursor', String(this.nextCursor))
				}
				const response = await fetch(
					`${this.apiBase}/integrations/email/accounts/${accountId}/messages?${params.toString()}`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					const items = Array.isArray(data.items) ? data.items : []
					this.messages = append === true ? [...this.messages, ...items] : items
					this.nextCursor = data.nextCursor !== undefined ? data.nextCursor : null
				} else {
					this.error = t('nextcloud-vue', 'Could not load messages.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnEmailPicker] fetch messages failed', err)
				this.error = t('nextcloud-vue', 'Could not load messages.')
			} finally {
				this.loading = false
				this.loadingMore = false
			}
		},

		pickAccount(account) {
			this.selectedAccountId = account.id
			this.selectedMailbox = null
			this.selectedMessageId = null
			this.selectedMessageUid = null
			this.mailboxes = []
			this.messages = []
			this.step = 2
			this.fetchMailboxes(account.id)
		},

		pickMailbox(mailbox) {
			this.selectedMailbox = mailbox.name
			this.selectedMessageId = null
			this.selectedMessageUid = null
			this.messages = []
			this.filterText = ''
			this.step = 3
			this.fetchMessages(this.selectedAccountId, mailbox.name)
		},

		pickMessage(msg) {
			this.selectedMessageId = msg.id
			this.selectedMessageUid = msg.uid || ''
		},

		loadMoreMessages() {
			if (this.nextCursor === null || this.selectedAccountId === null || this.selectedMailbox === null) {
				return
			}
			this.fetchMessages(this.selectedAccountId, this.selectedMailbox, true)
		},

		goBack() {
			if (this.step === 3) {
				this.selectedMessageId = null
				this.selectedMessageUid = null
				this.messages = []
				this.nextCursor = null
				this.filterText = ''
				this.step = 2
				return
			}
			if (this.step === 2) {
				this.selectedMailbox = null
				this.mailboxes = []
				this.step = 1
			}
		},

		/**
		 * Dismiss the dialog.
		 *
		 * @return {void}
		 */
		onClose() {
			/**
			 * @event close Emitted when the dialog should be closed (cancel or close button).
			 */
			this.$emit('close')
		},

		confirm() {
			if (this.selectedMessageId === null || this.selectedAccountId === null) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ mailAccountId, messageId, messageUid }`.
			 */
			this.$emit('link', {
				mailAccountId: this.selectedAccountId,
				messageId: String(this.selectedMessageId),
				messageUid: String(this.selectedMessageUid || ''),
			})
		},

		formatDate(raw) {
			if (!raw) {
				return ''
			}
			const d = new Date(raw)
			if (Number.isNaN(d.getTime())) {
				return String(raw)
			}
			return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
		},
	},
}
</script>

<style scoped>
.cn-email-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-email-picker__steps {
	display: flex;
	gap: 16px;
	list-style: none;
	margin: 0;
	padding: 0 4px 8px;
	border-bottom: 1px solid var(--color-border);
}

.cn-email-picker__step {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-email-picker__step--active {
	color: var(--color-main-text);
	font-weight: 600;
}

.cn-email-picker__step--done {
	color: var(--color-success, #46ba61);
}

.cn-email-picker__error {
	margin: 4px 0;
}

.cn-email-picker__panel {
	min-height: 180px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-email-picker__filter {
	width: 100%;
}

.cn-email-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
	max-height: 360px;
	overflow-y: auto;
}

.cn-email-picker__list--messages {
	max-height: 320px;
}

.cn-email-picker__row {
	border-radius: var(--border-radius);
}

.cn-email-picker__row--selected {
	background: var(--color-primary-element-light);
}

.cn-email-picker__row-button {
	display: flex;
	width: 100%;
	align-items: center;
	gap: 10px;
	padding: 8px 10px;
	background: transparent;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	cursor: pointer;
	text-align: left;
}

.cn-email-picker__row-button:hover {
	background: var(--color-background-hover);
}

.cn-email-picker__row--selected .cn-email-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-email-picker__row-button--message {
	align-items: flex-start;
}

.cn-email-picker__row-label {
	display: flex;
	flex-direction: column;
	gap: 2px;
	flex: 1 1 auto;
	overflow: hidden;
}

.cn-email-picker__row-primary {
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-email-picker__row-secondary {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-email-picker__message {
	display: flex;
	flex-direction: column;
	gap: 2px;
	flex: 1 1 auto;
	overflow: hidden;
}

.cn-email-picker__message-subject {
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-email-picker__message-meta {
	display: flex;
	gap: 8px;
	justify-content: space-between;
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}

.cn-email-picker__message-sender {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-email-picker__message-date {
	flex-shrink: 0;
}

.cn-email-picker__load-more {
	margin-top: 4px;
}
</style>
