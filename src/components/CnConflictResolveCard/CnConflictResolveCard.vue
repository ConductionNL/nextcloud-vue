<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div v-if="cards.length > 0 || error" class="cn-conflict-resolve" data-testid="cn-conflict-resolve">
		<p v-if="error"
			class="cn-conflict-resolve__refusal"
			role="alert"
			data-testid="cn-conflict-resolve-error">
			{{ error }}
		</p>
		<section v-for="card in cards"
			:key="card.id"
			class="cn-conflict-resolve__card"
			:aria-labelledby="`${uid}-title-${card.id}`"
			:data-testid="`cn-conflict-resolve-card-${card.id}`">
			<strong :id="`${uid}-title-${card.id}`" class="cn-conflict-resolve__title">{{ titleText }}</strong>
			<template v-for="field in card.fields" :key="field.path">
				<span v-if="card.fields.length > 1" class="cn-conflict-resolve__field">{{ fieldLabel(field.path) }}</span>
				<span class="cn-conflict-resolve__line" data-testid="cn-conflict-resolve-local">{{ line(content.localText, t('nextcloud-vue', 'On this device: "{value}"'), field.local) }}</span>
				<span class="cn-conflict-resolve__line" data-testid="cn-conflict-resolve-office">{{ line(content.officeText, t('nextcloud-vue', 'On the server: "{value}"'), field.office) }}</span>
			</template>
			<div class="cn-conflict-resolve__actions">
				<NcButton v-for="choice in choices"
					:key="choice.key"
					variant="secondary"
					:disabled="!available || busy[card.id] === true"
					:aria-describedby="available ? undefined : `${uid}-unavailable`"
					:data-testid="`cn-conflict-resolve-${choice.key}-${card.id}`"
					@click="resolve(card, choice)">
					{{ choice.label }}
				</NcButton>
			</div>
			<p v-if="refusals[card.id]" class="cn-conflict-resolve__refusal" role="alert">
				{{ refusals[card.id] }}
			</p>
		</section>
		<span v-if="!available" :id="`${uid}-unavailable`" class="hidden-visually">{{ unavailableText }}</span>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { getCapabilities } from '@nextcloud/capabilities'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton } from '@nextcloud/vue'
import { conflictFields } from '../../utils/conflictFields.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

let instanceCounter = 0

/**
 * The OpenRegister list query for a source: filter operators as `key[op]`.
 *
 * @param {object} source The source (`filter`, `sort`, `limit`).
 * @return {object} The query params.
 */
function listParams(source) {
	const params = { _limit: Number(source.limit) > 0 ? Number(source.limit) : 5 }
	if (source.sort && source.sort.field) {
		params[`_order[${source.sort.field}]`] = source.sort.dir === 'desc' ? 'desc' : 'asc'
	}
	for (const [key, value] of Object.entries(resolveFilterTokens(source.filter || {}))) {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			for (const [op, operand] of Object.entries(value)) {
				params[`${key}[${op}]`] = operand
			}
		} else if (value !== '' && value !== null && value !== undefined) {
			params[key] = value
		}
	}
	return params
}

/**
 * CnConflictResolveCard - the `conflict-resolve` widget: one card per open
 * conflict record, showing for each differing field the value written on this
 * device and the value stored elsewhere, with one button per version (board
 * DqInspectie, "Conflict: welke tekst houdt u?", "Deze houden" / "Die van
 * kantoor"). Choosing sends the choice to the configured endpoint, which
 * writes the chosen value and marks the record resolved; the card then leaves.
 *
 * `content`:
 * - `source`: `{ register, schema, filter?, sort?, limit? }` of the conflict records.
 * - `localPath` / `officePath` (default `clientVersion` / `serverVersion`): the two snapshots.
 * - `fieldsPath` (default `conflictFields`) or `fields`: the field paths to compare.
 * - `fieldLabels`: `{ path: label }`, shown above a field when several differ.
 * - `title`, `localText`, `officeText` (`{value}` is the value), `keepLocalLabel`, `keepOfficeLabel`, `unavailableText`, `errorText`: texts.
 * - `resolve`: `{ url, method?, capability?, resolutions? }`. `url` is a template
 *   filled from the record (`{id}`); the body is `{ resolution }`, from
 *   `resolutions` (default `{ local: "client_wins", office: "server_wins" }`).
 *   With `capability` (a dot path into the Nextcloud capabilities) the buttons
 *   stay disabled until the server announces it.
 *
 * Texts go through the host translate.
 */
export default {
	name: 'CnConflictResolveCard',
	components: { NcButton },
	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget's configuration (see the component docs).
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['resolved'],
	data() {
		instanceCounter += 1
		return {
			uid: `cn-conflict-resolve-${instanceCounter}`,
			records: [],
			error: '',
			busy: {},
			refusals: {},
		}
	},

	computed: {
		/** @return {object} The resolve config. */
		resolveConfig() {
			return this.content.resolve && typeof this.content.resolve === 'object' ? this.content.resolve : {}
		},

		/**
		 * Whether a choice can be sent: an endpoint, and its capability when one is named.
		 *
		 * @spec openspec/changes/conflict-resolve-card/specs/conflict-resolve-card/spec.md#requirement-choosing-stays-off-until-the-server-offers-it
		 * @return {boolean}
		 */
		available() {
			if (!this.resolveConfig.url) {
				return false
			}
			const capability = this.resolveConfig.capability
			if (!capability) {
				return true
			}
			try {
				return Boolean(readPath(getCapabilities() || {}, capability))
			} catch {
				return false
			}
		},

		/** @return {Array<{key: string, label: string, resolution: string}>} The two buttons. */
		choices() {
			const resolutions = { local: 'client_wins', office: 'server_wins', ...(this.resolveConfig.resolutions || {}) }
			return [
				{ key: 'local', label: this.text(this.content.keepLocalLabel) || t('nextcloud-vue', 'Keep this one'), resolution: resolutions.local },
				{ key: 'office', label: this.text(this.content.keepOfficeLabel) || t('nextcloud-vue', 'Keep the server one'), resolution: resolutions.office },
			]
		},

		/**
		 * One card per record that still has a differing field.
		 *
		 * @spec openspec/changes/conflict-resolve-card/specs/conflict-resolve-card/spec.md#requirement-a-card-shows-both-versions-of-each-differing-field
		 * @return {Array<{id: string, record: object, fields: Array<object>}>}
		 */
		cards() {
			const options = { localPath: this.content.localPath, officePath: this.content.officePath, fieldsPath: this.content.fieldsPath, fields: this.content.fields }
			return this.records
				.map((record) => ({ id: String(readPath(record, 'id') ?? readPath(record, '@self.id') ?? ''), record, fields: conflictFields(record, options) }))
				.filter((card) => card.id !== '' && card.fields.length > 0)
		},

		/** @return {string} The card title. */
		titleText() {
			return this.text(this.content.title) || t('nextcloud-vue', 'Conflict: which version do you keep?')
		},

		/** @return {string} Why the buttons are off. */
		unavailableText() {
			return this.text(this.content.unavailableText) || t('nextcloud-vue', 'Choosing a version is not possible here yet.')
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,
		/**
		 * A config text through the host translate.
		 *
		 * @param {unknown} value The text.
		 * @return {string}
		 */
		text(value) {
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : ''
		},

		/**
		 * One version's line.
		 *
		 * @param {unknown} template The configured template.
		 * @param {string} fallback The library's translated template.
		 * @param {string} value The value.
		 * @return {string}
		 */
		line(template, fallback, value) {
			return (this.text(template) || fallback).replace('{value}', value)
		},

		/**
		 * @param {string} path The field path.
		 * @return {string} The field's label, or its path.
		 */
		fieldLabel(path) {
			const labels = this.content.fieldLabels || {}
			return this.text(labels[path]) || path
		},

		/**
		 * Read the open conflict records; a failure is said, never an empty card.
		 *
		 * @spec openspec/changes/conflict-resolve-card/specs/conflict-resolve-card/spec.md#requirement-a-card-shows-both-versions-of-each-differing-field
		 * @return {Promise<void>}
		 */
		async load() {
			const source = this.content.source || {}
			if (!source.register || !source.schema) {
				return
			}
			try {
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: source.register, schema: source.schema })
				const { data } = await axios.get(url, { params: listParams(source) })
				const list = Array.isArray(data) ? data : (data && data.results) || []
				this.records = list.filter((record) => record && typeof record === 'object' && !record.resolution)
				this.error = ''
			} catch {
				this.error = this.text(this.content.errorText) || t('nextcloud-vue', 'The conflicts could not be read.')
			}
		},

		/**
		 * Send one choice; the card leaves once the server took it.
		 *
		 * @spec openspec/changes/conflict-resolve-card/specs/conflict-resolve-card/spec.md#requirement-choosing-a-version-sends-it-and-the-card-leaves
		 * @param {{id: string, record: object}} card The card.
		 * @param {{resolution: string}} choice The chosen version.
		 * @return {Promise<void>}
		 */
		async resolve(card, choice) {
			if (!this.available || this.busy[card.id]) {
				return
			}
			this.busy = { ...this.busy, [card.id]: true }
			this.refusals = { ...this.refusals, [card.id]: '' }
			try {
				const url = fillTemplate(this.resolveConfig.url, card.record)
				if (url === '') {
					throw new Error('unresolved url')
				}
				const method = ['put', 'patch'].includes(String(this.resolveConfig.method || '').toLowerCase()) ? this.resolveConfig.method.toLowerCase() : 'post'
				await axios[method](generateUrl(url), { resolution: choice.resolution })
				this.records = this.records.filter((record) => record !== card.record)
				/** @event resolved A conflict was settled. Payload: `{ id, resolution }`. */
				this.$emit('resolved', { id: card.id, resolution: choice.resolution })
			} catch (failure) {
				const body = failure && failure.response && failure.response.data
				this.refusals = { ...this.refusals, [card.id]: String((body && (body.message || body.error)) || t('nextcloud-vue', 'This choice was not saved.')) }
			} finally {
				this.busy = { ...this.busy, [card.id]: false }
			}
		},
	},
}
</script>

<style scoped>
.cn-conflict-resolve {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-conflict-resolve__card {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px 14px;
	border: 1px solid var(--color-border);
	border-radius: 12px;
	background: var(--color-main-background);
}

.cn-conflict-resolve__title {
	font-size: 15px;
}

.cn-conflict-resolve__line {
	font-size: 14px;
}

.cn-conflict-resolve__field {
	font-size: 13px;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
}

.cn-conflict-resolve__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-conflict-resolve__refusal {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}
</style>
