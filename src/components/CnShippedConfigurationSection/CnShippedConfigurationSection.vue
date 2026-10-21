<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-shipped-configuration" data-testid="cn-shipped-configuration">
		<p v-if="description" class="cn-shipped-configuration__intro">
			{{ text(description) }}
		</p>

		<NcSelect v-if="schemas.length > 1"
			v-model="schemaOption"
			class="cn-shipped-configuration__picker"
			:options="schemaOptions"
			:inputLabel="t('nextcloud-vue', 'Show')"
			:clearable="false"
			data-testid="cn-shipped-schema" />

		<table class="cn-shipped-configuration__table" data-testid="cn-shipped-configuration-table">
			<thead>
				<tr>
					<th scope="col">
						{{ t('nextcloud-vue', 'Name') }}
					</th>
					<th scope="col">
						{{ t('nextcloud-vue', 'State') }}
					</th>
					<th scope="col">
						{{ t('nextcloud-vue', 'Shipped set') }}
					</th>
					<th scope="col">
						{{ t('nextcloud-vue', 'Version') }}
					</th>
					<th scope="col">
						{{ t('nextcloud-vue', 'Newer version') }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="row in rows" :key="row.targetObject">
					<td>{{ row.title || row.targetObject }}</td>
					<td :data-testid="'cn-shipped-state-' + row.targetObject">
						{{ stateLabel(row) }}
					</td>
					<td>{{ row.set }}</td>
					<td>{{ row.setVersion }}</td>
					<td>
						<NcButton v-if="updatable(row)"
							:data-testid="'cn-shipped-adopt-' + row.targetObject"
							:disabled="adopting === row.targetObject"
							@click="adopt(row)">
							{{ adoptLabel(row) }}
						</NcButton>
						<span v-else class="cn-shipped-configuration__muted">
							{{ t('nextcloud-vue', 'Up to date') }}
						</span>
					</td>
				</tr>
				<tr v-if="!rows.length">
					<td colspan="5"
						class="cn-shipped-configuration__muted"
						data-testid="cn-shipped-configuration-empty">
						{{ emptyLine }}
					</td>
				</tr>
			</tbody>
		</table>

		<NcNoteCard v-if="loadError" type="error" data-testid="cn-shipped-configuration-error">
			{{ loadError }}
		</NcNoteCard>
		<NcNoteCard v-if="adoptError" type="error" data-testid="cn-shipped-configuration-adopt-error">
			{{ adoptError }}
		</NcNoteCard>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { showSuccess } from '@nextcloud/dialogs'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcNoteCard, NcSelect } from '@nextcloud/vue'

/**
 * The states a seeded object can be in.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SHIPPED_STATES = Object.freeze({
	shipped: 'shipped',
	changed: 'changed',
	local: 'local',
	removed: 'removed',
})

/**
 * CnShippedConfigurationSection: what an app shipped, what this instance
 * changed, and what it authored. One row per seeded object with the set and
 * version it came from, its state, and the newer version offered per object.
 * Taking a newer version over a local change says so on the button, because
 * the change goes.
 *
 * The app's endpoint answers `GET {endpoint}/{schema}` with `{ items: [{
 * targetObject, title, state, set, setVersion, latestVersion, updateAvailable
 * }] }` and takes `POST {endpoint}/{schema}/{targetObject}/adopt` with `{ set,
 * acceptLocalChangeLoss }`, refusing with `{ reason }`. An empty ledger beside
 * a register that holds objects is said as such (`countUrl`), not as "nothing
 * seeded".
 *
 * @spec openspec/changes/shipped-configuration-section/specs/shipped-configuration-section/spec.md
 */
export default {
	name: 'CnShippedConfigurationSection',

	components: { NcButton, NcNoteCard, NcSelect },

	inject: {
		/** The host app's translate, for the texts the page declares. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The app path of the shipped ledger (`/apps/<app>/api/starter/shipped`). */
		endpoint: { type: String, required: true },
		/** The schemas to show, `[{ slug, label }]`; the first is shown first. */
		schemas: { type: Array, default: () => [] },
		/**
		 * An app path that counts a schema's objects, `{schema}` filled in
		 * (`/apps/openregister/api/objects/<register>/{schema}`), read with
		 * `_limit=1` for its `total`.
		 */
		countUrl: { type: String, default: '' },
		/** A line above the table. */
		description: { type: String, default: '' },
	},

	data() {
		return {
			schema: this.schemas.length > 0 ? String(this.schemas[0].slug) : '',
			rows: [],
			present: null,
			loadError: '',
			adoptError: '',
			adopting: '',
		}
	},

	computed: {
		/** @return {Array<{id: string, label: string}>} The picker's options. */
		schemaOptions() {
			return this.schemas.map((option) => ({ id: String(option.slug), label: this.text(option.label || option.slug) }))
		},

		schemaOption: {
			/** @return {object|null} The chosen schema. */
			get() {
				return this.schemaOptions.find((option) => option.id === this.schema) || null
			},

			/** @param {object|null} option The chosen schema. */
			set(option) {
				if (option) {
					this.schema = option.id
					this.reload()
				}
			},
		},

		/** @return {string} What the empty table says, which depends on what the register holds. */
		emptyLine() {
			if (typeof this.present === 'number' && this.present > 0) {
				return t('nextcloud-vue', 'The register holds {count} of these. None came from a shipped set, so there is no shipped version to compare with.', { count: this.present })
			}
			return t('nextcloud-vue', 'Nothing has been seeded yet.')
		},
	},

	mounted() {
		this.reload()
	},

	methods: {
		t,

		/**
		 * @param {string} value A declared text.
		 * @return {string} It, translated by the host.
		 */
		text(value) {
			return value ? String(this.cnTranslate(String(value))) : ''
		},

		/**
		 * Read what shipped for the shown schema. A failed read empties the
		 * table: rows left beside an error would read as the current state.
		 *
		 * @return {Promise<void>}
		 */
		async reload() {
			if (!this.schema) {
				return
			}
			try {
				const { data } = await axios.get(generateUrl(`${this.endpoint}/${encodeURIComponent(this.schema)}`))
				this.rows = Array.isArray(data && data.items) ? data.items : []
				this.loadError = ''
				this.present = null
				if (this.rows.length === 0) {
					this.present = await this.count()
				}
			} catch {
				this.rows = []
				this.present = null
				this.loadError = t('nextcloud-vue', 'Could not read the shipped configuration.')
			}
		},

		/**
		 * How many objects of the shown schema the register holds, whatever
		 * brought them.
		 *
		 * @return {Promise<number|null>} The count, or null when it cannot be read.
		 */
		async count() {
			if (!this.countUrl) {
				return null
			}
			try {
				const { data } = await axios.get(generateUrl(this.countUrl.replace('{schema}', encodeURIComponent(this.schema))), { params: { _limit: 1 } })
				const total = Number(data && data.total)
				return Number.isFinite(total) ? total : null
			} catch {
				return null
			}
		},

		/**
		 * @param {object} row A ledger row.
		 * @return {string} What an administrator reads beside the object.
		 */
		stateLabel(row) {
			const state = (row && row.state) || SHIPPED_STATES.local
			return {
				[SHIPPED_STATES.shipped]: t('nextcloud-vue', 'Shipped, unchanged'),
				[SHIPPED_STATES.changed]: t('nextcloud-vue', 'Shipped, changed here'),
				[SHIPPED_STATES.removed]: t('nextcloud-vue', 'Shipped, removed here'),
			}[state] || t('nextcloud-vue', 'Yours')
		},

		/**
		 * @param {object} row A ledger row.
		 * @return {boolean} Whether a newer shipped version can be taken.
		 */
		updatable(row) {
			return Boolean(row && row.updateAvailable && row.state !== SHIPPED_STATES.removed)
		},

		/**
		 * @param {object} row A ledger row.
		 * @return {boolean} Whether taking the newer version overwrites a local change.
		 */
		losesLocalChange(row) {
			return Boolean(row && row.state === SHIPPED_STATES.changed)
		},

		/**
		 * @param {object} row A ledger row.
		 * @return {string} The button's words, which say when a local change goes.
		 */
		adoptLabel(row) {
			return this.losesLocalChange(row)
				? t('nextcloud-vue', 'Take {version} and lose your change', { version: row.latestVersion })
				: t('nextcloud-vue', 'Take {version}', { version: row.latestVersion })
		},

		/**
		 * Take the newer shipped version of one object, then read the ledger again.
		 *
		 * @param {object} row A ledger row.
		 * @return {Promise<void>}
		 */
		async adopt(row) {
			this.adopting = row.targetObject
			this.adoptError = ''
			try {
				await axios.post(
					generateUrl(`${this.endpoint}/${encodeURIComponent(this.schema)}/${encodeURIComponent(row.targetObject)}/adopt`),
					{ set: row.set, acceptLocalChangeLoss: this.losesLocalChange(row) },
				)
				showSuccess(t('nextcloud-vue', 'The newer version was taken.'))
				await this.reload()
			} catch (error) {
				const data = error && error.response && error.response.data
				this.adoptError = String((data && (data.reason || data.message)) || t('nextcloud-vue', 'The newer version was not taken.'))
			} finally {
				this.adopting = ''
			}
		},
	},
}
</script>

<style scoped>
.cn-shipped-configuration__intro,
.cn-shipped-configuration__muted {
	color: var(--color-text-maxcontrast);
}

.cn-shipped-configuration__picker {
	max-width: 320px;
}

.cn-shipped-configuration__table {
	width: 100%;
	border-collapse: collapse;
	margin-top: 12px;
	/* Nextcloud sets `table { white-space: nowrap }`; a cell here can be a sentence. */
	white-space: normal;
}

.cn-shipped-configuration__table th,
.cn-shipped-configuration__table td {
	padding: 6px 8px;
	border-bottom: 1px solid var(--color-border);
	text-align: start;
}
</style>
