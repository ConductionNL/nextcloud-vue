<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnDialog
		v-if="dialog"
		:name="titleText"
		size="normal"
		data-testid="cn-secret-address-dialog"
		@closing="$emit('close')">
		<CnSecretAddressCard v-bind="cardProps" />
	</CnDialog>
	<div v-else class="cn-secret-address" data-testid="cn-secret-address">
		<p v-if="introText" class="cn-secret-address__intro">
			{{ introText }}
		</p>
		<NcLoadingIcon v-if="loading" :size="20" />
		<template v-else-if="address">
			<NcNoteCard type="warning" data-testid="cn-secret-address-once">
				{{ shownOnceText }}
			</NcNoteCard>
			<NcTextField
				:modelValue="address"
				:label="text('addressLabel', t('nextcloud-vue', 'Address'))"
				readonly
				data-testid="cn-secret-address-value" />
			<p v-if="hintText" class="cn-secret-address__hint">
				{{ hintText }}
			</p>
			<a
				v-for="link in links"
				:key="link.href"
				:href="link.href"
				class="cn-secret-address__link"
				data-testid="cn-secret-address-link">
				{{ link.label }}
			</a>
		</template>
		<p v-else-if="exists" class="cn-secret-address__exists" data-testid="cn-secret-address-exists">
			{{ existsText }}
		</p>
		<NcNoteCard v-if="revoked" type="success" data-testid="cn-secret-address-revoked">
			{{ revokedText }}
		</NcNoteCard>
		<NcNoteCard v-if="copied" type="success">
			{{ t('nextcloud-vue', 'The address is copied.') }}
		</NcNoteCard>
		<NcNoteCard v-if="error" type="error" data-testid="cn-secret-address-error">
			{{ error }}
		</NcNoteCard>

		<div v-if="confirmingRevoke"
			class="cn-secret-address__confirm"
			role="group"
			:aria-label="revokeLabel">
			<p>{{ revokeQuestion }}</p>
			<NcButton variant="error"
				:disabled="busy"
				data-testid="cn-secret-address-revoke-confirm"
				@click="revoke">
				{{ revokeLabel }}
			</NcButton>
			<NcButton variant="tertiary" :disabled="busy" @click="confirmingRevoke = false">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
		</div>
		<div v-else class="cn-secret-address__actions">
			<NcButton
				v-if="address"
				variant="secondary"
				data-testid="cn-secret-address-copy"
				@click="copy">
				{{ text('copyLabel', t('nextcloud-vue', 'Copy address')) }}
			</NcButton>
			<NcButton
				v-if="revokeUrl && (exists || address)"
				variant="tertiary"
				:disabled="busy"
				data-testid="cn-secret-address-revoke"
				@click="confirmingRevoke = true">
				{{ revokeLabel }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="busy || loading"
				data-testid="cn-secret-address-create"
				@click="create">
				{{ exists || address ? text('resetLabel', t('nextcloud-vue', 'Reset address')) : text('createLabel', t('nextcloud-vue', 'Make an address')) }}
			</NcButton>
		</div>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import CnDialog from '../CnDialog/CnDialog.vue'
import { readPath } from '../../utils/readPath.js'
import { safeHref } from '../../utils/safeHref.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

/**
 * CnSecretAddressCard makes, shows once, copies, resets and revokes a secret
 * address: a URL with a token that works without an account, such as a
 * personal calendar feed, a hall screen's page or a webhook URL. The server
 * keeps only a hash of the token, so the address is shown once, right after
 * it is made; resetting makes a new one and the old one stops working.
 *
 * Use it in a settings section, or with `dialog` as an `open-modal` target:
 * then it draws its own dialog named `title` and emits `close`.
 *
 * ```vue
 * <CnSecretAddressCard
 *   status-url="/apps/learniq/api/timetable/feed"
 *   create-url="/apps/learniq/api/timetable/feed"
 *   revoke-url="/apps/learniq/api/timetable/feed"
 *   address-path="url"
 *   :extra-links="[{ path: 'webcalUrl', label: 'Open in your calendar app' }]" />
 * ```
 *
 * @spec openspec/changes/secret-address-card/specs/secret-address-card/spec.md#requirement-a-secret-address-is-made-shown-once-reset-and-revoked
 */
export default {
	name: 'CnSecretAddressCard',

	components: { CnDialog, NcButton, NcLoadingIcon, NcNoteCard, NcTextField },

	inject: {
		/** Host translate function provided by CnAppRoot: `(text, vars) => string`. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** Draw the card in its own dialog named `title`, emitting `close`. */
		dialog: { type: Boolean, default: false },
		/** The dialog's name. */
		title: { type: String, default: '' },
		/** The id put in place of `{objectId}` in the urls. */
		objectId: { type: String, default: '' },
		/** GET: whether an address exists, read at `statusPath`. Without it the card does not know until a create. */
		statusUrl: { type: String, default: '' },
		/** Where the status answer says an address exists. */
		statusPath: { type: String, default: 'exists' },
		/** Makes a new address; an earlier one stops working. */
		createUrl: { type: String, required: true },
		/** `POST` (default) or `PUT`. */
		createMethod: { type: String, default: 'POST' },
		/** Where the create answer holds the address. */
		addressPath: { type: String, default: 'url' },
		/** Links read from the create answer: `[{ path, label }]`, such as a `webcal:` address. */
		extraLinks: { type: Array, default: () => [] },
		/** Removes the address; without it there is no remove button. */
		revokeUrl: { type: String, default: '' },
		/** `DELETE` (default) or `POST`. */
		revokeMethod: { type: String, default: 'DELETE' },
		/**
		 * Texts, each run through the host's translations: `intro`, `hint` (under the shown address),
		 * `exists`, `revoked`, `shownOnce`, `revokeQuestion`, and the labels `addressLabel`, `createLabel`,
		 * `resetLabel`, `revokeLabel`, `copyLabel`. Library defaults stand in for the ones left out.
		 */
		texts: { type: Object, default: () => ({}) },
	},

	emits: ['close'],

	data() {
		return {
			loading: false,
			busy: false,
			exists: false,
			address: '',
			links: [],
			revoked: false,
			copied: false,
			error: '',
			confirmingRevoke: false,
		}
	},

	computed: {
		cardProps() {
			const { dialog, title, ...rest } = this.$props
			return rest
		},

		titleText() {
			return this.tr(this.title) || t('nextcloud-vue', 'Secret address')
		},

		introText() {
			return this.text('intro', '')
		},

		hintText() {
			return this.text('hint', t('nextcloud-vue', 'Anyone with this address can open it. Keep it to yourself.'))
		},

		existsText() {
			return this.text('exists', t('nextcloud-vue', 'There is an address already. If it was lost or shared by mistake, reset it: the old address stops working.'))
		},

		revokedText() {
			return this.text('revoked', t('nextcloud-vue', 'The address is removed and stops working.'))
		},

		shownOnceText() {
			return this.text('shownOnce', t('nextcloud-vue', 'This address is shown once. Copy it now.'))
		},

		revokeLabel() {
			return this.text('revokeLabel', t('nextcloud-vue', 'Remove address'))
		},

		revokeQuestion() {
			return this.text('revokeQuestion', t('nextcloud-vue', 'Remove the address? It stops working at once.'))
		},
	},

	created() {
		if (!this.dialog) {
			this.loadStatus()
		}
	},

	methods: {
		t,

		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * A configurable text: the host's, translated, else the library default.
		 *
		 * @param {string} key The `texts` key.
		 * @param {string} fallback The translated default.
		 * @return {string}
		 */
		text(key, fallback) {
			return this.texts[key] ? this.tr(this.texts[key]) : fallback
		},

		url(template) {
			return generateUrl(String(template).replace('{objectId}', encodeURIComponent(this.objectId)))
		},

		/**
		 * Read whether an address exists.
		 *
		 * @return {Promise<void>}
		 */
		async loadStatus() {
			if (!this.statusUrl) {
				return
			}
			this.loading = true
			try {
				const { data } = await axios.get(this.url(this.statusUrl))
				this.exists = readPath(data || {}, this.statusPath) === true
			} catch {
				this.error = t('nextcloud-vue', 'The address could not be read.')
			} finally {
				this.loading = false
			}
		},

		/**
		 * Make a new address and show it once.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/secret-address-card/specs/secret-address-card/spec.md#requirement-a-secret-address-is-made-shown-once-reset-and-revoked
		 */
		async create() {
			this.busy = true
			this.error = ''
			this.copied = false
			try {
				const method = String(this.createMethod).toUpperCase() === 'PUT' ? 'put' : 'post'
				const { data } = await axios[method](this.url(this.createUrl))
				this.address = String(readPath(data || {}, this.addressPath) ?? '')
				this.links = this.extraLinks
					.map((link) => ({ href: this.linkHref(readPath(data || {}, link.path)), label: this.tr(link.label || '') }))
					.filter((link) => link.href !== '' && link.label !== '')
				this.exists = this.address !== ''
				this.revoked = false
			} catch (error) {
				this.error = this.serverWords(error) || t('nextcloud-vue', 'The address could not be made.')
			} finally {
				this.busy = false
			}
		},

		/**
		 * Remove the address after the confirm.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/secret-address-card/specs/secret-address-card/spec.md#requirement-a-secret-address-is-made-shown-once-reset-and-revoked
		 */
		async revoke() {
			this.busy = true
			this.error = ''
			try {
				const method = String(this.revokeMethod).toUpperCase() === 'POST' ? 'post' : 'delete'
				await axios[method](this.url(this.revokeUrl))
				this.exists = false
				this.address = ''
				this.links = []
				this.revoked = true
				this.confirmingRevoke = false
			} catch (error) {
				this.error = this.serverWords(error) || t('nextcloud-vue', 'The address could not be removed.')
			} finally {
				this.busy = false
			}
		},

		/**
		 * A link from the answer when its scheme is safe: http(s), mailto, a
		 * same-origin path, or webcal(s) for a calendar subscription.
		 *
		 * @param {unknown} value The answer's value.
		 * @return {string} The href, or '' when it is not safe.
		 */
		linkHref(value) {
			const raw = typeof value === 'string' ? value.trim() : ''
			if (/^webcals?:\/\/[^/]/i.test(raw)) {
				return raw
			}
			const href = safeHref(raw)
			return href === '#' ? '' : href
		},

		async copy() {
			this.error = ''
			try {
				await navigator.clipboard.writeText(this.address)
				this.copied = true
			} catch {
				this.error = t('nextcloud-vue', 'Copying did not work. Select the address and copy it yourself.')
			}
		},

		serverWords(error) {
			if (!error || !error.response) {
				return ''
			}
			const message = serverErrorMessage(error)
			return /^Request failed/.test(message) ? '' : message
		},
	},
}
</script>

<style scoped>
.cn-secret-address {
	display: flex;
	flex-direction: column;
	gap: calc(var(--default-grid-baseline, 4px) * 3);
}

.cn-secret-address__hint,
.cn-secret-address__intro {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-secret-address__link {
	color: var(--color-primary-element);
	text-decoration: underline;
}

.cn-secret-address__actions,
.cn-secret-address__confirm {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: calc(var(--default-grid-baseline, 4px) * 2);
}

.cn-secret-address__confirm p {
	flex-basis: 100%;
	margin: 0;
}
</style>
