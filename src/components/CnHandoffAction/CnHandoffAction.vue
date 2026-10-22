<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
  -
  - CnHandoffAction: hands one record to another app. An availability endpoint
  - says whether the action is offered; the action posts to an app endpoint; the
  - answer names a reference, a link and an outcome. Hidden, never disabled,
  - when the action is not offered and there is nothing to show.
  -->
<template>
	<div
		v-if="visible"
		class="cn-handoff-action"
		data-testid="cn-handoff-action">
		<NcLoadingIcon v-if="loading && !hasAvailability" :size="24" />

		<template v-else>
			<div v-if="showAction && fields.length > 0" class="cn-handoff-action__fields">
				<div
					v-for="field in fields"
					:key="field.key"
					class="cn-handoff-action__field">
					<label :for="fieldId(field)">{{ field.label ? tr(field.label) : field.key }}</label>
					<input
						:id="fieldId(field)"
						v-model="values[field.key]"
						:type="field.type === 'date' ? 'date' : 'text'"
						:required="field.required !== false"
						:data-testid="`cn-handoff-field-${field.key}`">
				</div>
			</div>

			<NcButton
				v-if="showAction"
				:variant="action.variant || 'primary'"
				:disabled="busy || !fieldsFilled"
				data-testid="cn-handoff-send"
				@click="send">
				<template v-if="busy" #icon>
					<NcLoadingIcon :size="16" />
				</template>
				{{ action.label ? tr(action.label) : t('nextcloud-vue', 'Send') }}
			</NcButton>
			<NcButton
				v-else-if="fallbackLink"
				variant="secondary"
				:href="fallbackLink"
				target="_blank"
				rel="noopener"
				data-testid="cn-handoff-fallback">
				{{ labels.fallbackLink ? tr(labels.fallbackLink) : t('nextcloud-vue', 'Open') }}
			</NcButton>

			<template v-if="isDone">
				<NcNoteCard v-if="labels.done" type="success">
					<span data-testid="cn-handoff-done">{{ tr(labels.done) }}</span>
				</NcNoteCard>
				<div
					v-if="reference"
					class="cn-handoff-action__reference"
					data-testid="cn-handoff-reference">
					<span class="cn-handoff-action__reference-label">{{ labels.reference ? tr(labels.reference) : t('nextcloud-vue', 'Reference') }}</span>
					<code class="cn-handoff-action__reference-value">{{ reference }}</code>
					<NcButton
						v-if="content.copyReference === true"
						variant="tertiary"
						data-testid="cn-handoff-copy"
						@click="copyReference">
						{{ labels.copy ? tr(labels.copy) : t('nextcloud-vue', 'Copy') }}
					</NcButton>
				</div>
				<a
					v-if="link"
					:href="link"
					class="cn-handoff-action__link"
					data-testid="cn-handoff-link">{{ labels.link ? tr(labels.link) : t('nextcloud-vue', 'Open') }}</a>
			</template>

			<NcNoteCard v-if="result" :type="result.type">
				<span data-testid="cn-handoff-result" :data-type="result.type">{{ result.text }}</span>
			</NcNoteCard>
			<NcNoteCard v-if="error" type="error">
				<span data-testid="cn-handoff-error">{{ error }}</span>
			</NcNoteCard>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { inject, ref } from 'vue'
import { getByPath, useEndpointSource } from '../../composables/useEndpointSource.js'
import { interpolateUrlTokens } from '../../utils/interpolateUrlTokens.js'
import { resolveFilterValue } from '../../utils/resolveFilterTokens.js'

let instanceCount = 0

/**
 * Unwrap a provided value that may be a ref.
 *
 * @param {unknown} value The provided value.
 * @return {unknown} The plain value.
 */
function unwrap(value) {
	return value && typeof value === 'object' && 'value' in value ? value.value : value
}

/**
 * A link that is safe to put in an href: root-relative or http(s).
 *
 * @param {unknown} value The candidate.
 * @return {string} The link, '' when unsafe or empty.
 */
function safeLink(value) {
	const text = typeof value === 'string' ? value.trim() : ''
	return /^(\/(?!\/)|https?:\/\/)/i.test(text) ? text : ''
}

/**
 * Fill `{path}` placeholders from an object; an unknown path fills ''.
 *
 * @param {string} text The text with placeholders.
 * @param {object} source The object to read.
 * @return {string} The filled text.
 */
function fill(text, source) {
	return String(text).replace(/\{([\w.]+)\}/g, (match, path) => {
		const value = getByPath(source || {}, path)
		return value === undefined || value === null ? '' : String(value)
	})
}

export default {
	name: 'CnHandoffAction',

	components: { NcButton, NcLoadingIcon, NcNoteCard },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The handoff declaration: `availability` (an endpoint source),
		 * `canPath`, `donePath` / `doneValue`, `repeatable`, `referencePath`,
		 * `linkPath`, `fallbackLinkPath`, `fields`, `action`, `labels`,
		 * `results`, `errors` and `copyReference`. See the docs page.
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The record's id, for the `@objectId` token. */
		objectId: {
			type: [String, Number],
			default: null,
		},

		/** The record, for `@object.<field>` tokens. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	emits: ['done'],

	setup(props) {
		const objectCtxRaw = inject('cnObjectContext', null)
		const refreshKey = ref(0)
		const ctx = () => {
			const injected = unwrap(objectCtxRaw) || {}
			return {
				...injected,
				objectId: props.objectId ?? injected.objectId ?? props.objectData?.id ?? null,
				object: props.objectData || injected.object || null,
			}
		}
		const { data, loading, refetch } = useEndpointSource(
			() => props.content?.availability || null,
			{ ctx, refreshKey },
		)
		return { availabilityData: data, loading, refetchAvailability: refetch, tokenContext: ctx }
	},

	data() {
		instanceCount += 1
		return {
			uid: instanceCount,
			busy: false,
			error: '',
			result: null,
			response: null,
			values: {},
		}
	},

	computed: {
		/** @return {object} The action declaration. */
		action() {
			return this.content?.action || {}
		},

		/** @return {object} The declared labels. */
		labels() {
			return this.content?.labels || {}
		},

		/** @return {Array<object>} The fields asked before sending. */
		fields() {
			const list = Array.isArray(this.content?.fields) ? this.content.fields : []
			return list.filter((field) => field && typeof field.key === 'string' && field.key !== '')
		},

		/** @return {object} The availability answer, {} before it arrives. */
		availability() {
			const value = this.availabilityData
			return value && typeof value === 'object' ? value : {}
		},

		/** @return {boolean} Whether the availability answer has arrived. */
		hasAvailability() {
			return this.availabilityData !== null && this.availabilityData !== undefined
		},

		/** @return {boolean} Whether every `canPath` is true. */
		isOffered() {
			const paths = [].concat(this.content?.canPath || 'available')
			return paths.every((path) => getByPath(this.availability, path) === true)
		},

		/** @return {string} The reference, from the last send or else the availability. */
		reference() {
			const path = this.content?.referencePath
			if (!path) {
				return ''
			}
			const fromResponse = getByPath(this.response || {}, path)
			if (fromResponse) {
				return String(fromResponse)
			}
			const stored = this.content?.repeatable === true ? '' : getByPath(this.availability, path)
			return stored ? String(stored) : ''
		},

		/** @return {string} The safe link to the result, '' for none. */
		link() {
			const path = this.content?.linkPath
			if (!path) {
				return ''
			}
			return safeLink(getByPath(this.response || {}, path)) || safeLink(getByPath(this.availability, path))
		},

		/** @return {boolean} Whether the record has been handed over. */
		isDone() {
			if (this.response !== null) {
				return true
			}
			const donePath = this.content?.donePath
			if (donePath && getByPath(this.availability, donePath) === (this.content?.doneValue ?? true)) {
				return true
			}
			return this.content?.repeatable !== true && this.reference !== ''
		},

		/** @return {boolean} Whether to draw the button. */
		showAction() {
			if (!this.isOffered) {
				return false
			}
			return this.content?.repeatable === true || !this.isDone
		},

		/** @return {string} The fallback link, shown when the action is not offered. */
		fallbackLink() {
			const path = this.content?.fallbackLinkPath
			return path ? safeLink(getByPath(this.availability, path)) : ''
		},

		/** @return {boolean} Whether every required field has a value. */
		fieldsFilled() {
			return this.fields.every((field) => field.required === false || String(this.values[field.key] ?? '') !== '')
		},

		/** @return {boolean} Whether anything shows. */
		visible() {
			if (this.loading && !this.hasAvailability) {
				return true
			}
			return this.showAction || this.isDone || this.fallbackLink !== '' || this.result !== null || this.error !== ''
		},
	},

	watch: {
		fields: {
			immediate: true,
			handler(fields) {
				const values = {}
				for (const field of fields) {
					const preset = field.default === undefined ? '' : resolveFilterValue(field.default, this.tokenContext())
					values[field.key] = typeof preset === 'string' && preset.charAt(0) === '@' ? '' : preset
				}
				this.values = values
			},
		},

		objectId() {
			this.response = null
			this.result = null
			this.error = ''
		},
	},

	methods: {
		t,

		/**
		 * Translate a declared text through the host app.
		 *
		 * @param {string} text The source text.
		 * @return {string} The translated text.
		 */
		tr(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * The DOM id of a field's input.
		 *
		 * @param {object} field The field.
		 * @return {string} The id.
		 */
		fieldId(field) {
			return `cn-handoff-${this.uid}-${field.key}`
		},

		/**
		 * Send the record and record what came back.
		 *
		 * @return {Promise<void>}
		 */
		async send() {
			const url = interpolateUrlTokens(this.action.url || '', this.tokenContext())
			if (this.busy || !url || !this.fieldsFilled) {
				return
			}
			this.busy = true
			this.error = ''
			this.result = null
			const body = {}
			for (const field of this.fields) {
				body[field.key] = this.values[field.key]
			}
			try {
				const [{ default: axios }, { generateUrl }, { showSuccess }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
					import('@nextcloud/dialogs'),
				])
				const target = /^https?:\/\//i.test(url) ? url : generateUrl(url)
				const method = String(this.action.method || 'POST').toLowerCase()
				const { data } = await axios[method === 'put' || method === 'patch' ? method : 'post'](target, body)
				this.response = data && typeof data === 'object' ? data : {}
				this.result = this.outcome(this.content?.results, this.response)
				if (this.labels.success) {
					showSuccess(this.tr(this.labels.success))
				}
				this.$emit('done', this.response)
				if (this.content?.repeatable !== true) {
					await this.refetchAvailability(true)
				}
			} catch (err) {
				const answer = (err && err.response && err.response.data) || {}
				const message = this.message(this.content?.errors, answer)
				this.error = message ? message.text : (answer.message || t('nextcloud-vue', 'The action failed.'))
				if (message && message.reload) {
					await this.refetchAvailability(true)
				}
			} finally {
				this.busy = false
			}
		},

		/**
		 * The note that names the outcome of a send.
		 *
		 * @param {object|undefined} results The `results` declaration.
		 * @param {object} answer The response body.
		 * @return {{type: string, text: string}|null} The note, null for none.
		 */
		outcome(results, answer) {
			const message = this.message(results, answer)
			return message ? { type: message.type || 'success', text: message.text } : null
		},

		/**
		 * The declared message for an answer: the entry its status maps to, else
		 * the default. An entry is a text, an object `{ text, textPath?, type?,
		 * reload?, whenPath? }`, or a list of objects of which the first whose
		 * `whenPath` holds (or that has none) counts.
		 *
		 * @param {object|undefined} declared A `results` or `errors` declaration.
		 * @param {object} answer The response body.
		 * @return {{text: string, type?: string, reload: boolean}|null} The message.
		 */
		message(declared, answer) {
			if (!declared || typeof declared !== 'object') {
				return null
			}
			const raw = (declared.map || {})[getByPath(answer, declared.path || 'status')] ?? declared.default
			const entry = [].concat(raw ?? []).map((item) => (typeof item === 'string' ? { text: item } : item))
				.find((item) => item && (!item.whenPath || Boolean(getByPath(answer, item.whenPath))))
			if (!entry) {
				return null
			}
			const fromAnswer = entry.textPath ? getByPath(answer, entry.textPath) : ''
			return {
				type: entry.type,
				reload: entry.reload === true,
				text: fromAnswer ? String(fromAnswer) : fill(this.tr(entry.text || ''), answer),
			}
		},

		/**
		 * Copy the reference to the clipboard.
		 *
		 * @return {Promise<void>}
		 */
		async copyReference() {
			const { showError, showSuccess } = await import('@nextcloud/dialogs')
			try {
				await navigator.clipboard.writeText(this.reference)
				showSuccess(this.labels.copied ? this.tr(this.labels.copied) : t('nextcloud-vue', 'Copied'))
			} catch {
				showError(this.labels.copyFailed ? this.tr(this.labels.copyFailed) : t('nextcloud-vue', 'Could not copy'))
			}
		},
	},
}
</script>

<style scoped>
.cn-handoff-action {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
}

.cn-handoff-action__fields {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.cn-handoff-action__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-handoff-action__reference {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-handoff-action__reference-label {
	color: var(--color-text-maxcontrast);
}

.cn-handoff-action__link {
	color: var(--color-primary-element);
	text-decoration: underline;
}
</style>
