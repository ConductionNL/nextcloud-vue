<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-shipped-configuration" data-testid="cn-shipped-configuration">
		<p v-if="description" class="cn-shipped-configuration__intro">
			{{ text(description) }}
		</p>

		<template v-if="setsUrl">
			<NcNoteCard v-if="setResult"
				:type="setResult.ok ? 'success' : 'error'"
				:role="setResult.ok ? 'status' : 'alert'"
				data-testid="cn-shipped-set-result">
				{{ setResult.text }}
			</NcNoteCard>
			<NcNoteCard v-if="setsError" type="error" data-testid="cn-shipped-sets-error">
				{{ setsError }}
			</NcNoteCard>
			<p v-else-if="sets.length === 0" class="cn-shipped-configuration__muted" data-testid="cn-shipped-sets-empty">
				{{ t('nextcloud-vue', 'No shipped set is loaded.') }}
			</p>
			<ul v-else class="cn-shipped-configuration__sets">
				<li v-for="set in sets"
					:key="set.id"
					class="cn-shipped-configuration__set"
					:data-testid="'cn-shipped-set-' + set.id">
					<span>{{ text(set.label) }}</span>
					<NcButton v-if="removeSetUrl"
						variant="error"
						:disabled="removingSet !== ''"
						:aria-label="t('nextcloud-vue', 'Remove the set {set}', { set: text(set.label) })"
						:data-testid="'cn-shipped-remove-' + set.id"
						@click="removeSet(set)">
						{{ removingSet === set.id ? t('nextcloud-vue', 'Removing…') : t('nextcloud-vue', 'Remove') }}
					</NcButton>
				</li>
			</ul>
		</template>

		<NcSelect v-if="schemas.length > 1"
			v-model="schemaOption"
			class="cn-shipped-configuration__picker"
			:options="schemaOptions"
			:inputLabel="t('nextcloud-vue', 'Show')"
			:clearable="false"
			data-testid="cn-shipped-schema" />

		<table v-if="endpoint" class="cn-shipped-configuration__table" data-testid="cn-shipped-configuration-table">
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
import { showConfirmation, showSuccess } from '@nextcloud/dialogs'
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
 * With `setsUrl` it also lists the loaded sets (`{ sets: [{ id, label }] }`),
 * and with `removeSetUrl` each has a Remove button that asks first, posts to
 * that path with `{id}` filled in, and shows the answer's `message` (an error
 * when `success` is not true). Either part can be used on its own.
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
		/** The app path of the shipped ledger (`/apps/<app>/api/starter/shipped`); empty shows no ledger. */
		endpoint: { type: String, default: '' },
		/**
		 * An app path that lists the loaded sets, `{ sets: [{ id, label }] }`
		 * (`/apps/<app>/api/setup/example-sets`); empty shows no list.
		 */
		setsUrl: { type: String, default: '' },
		/**
		 * The app path that removes one set, `{id}` filled in, posted after a
		 * confirm and answering `{ success, message }`. Empty shows no Remove button.
		 */
		removeSetUrl: { type: String, default: '' },
		/** The question asked before a removal, `{set}` filled in. Defaults to a sentence on what goes. */
		removeSetQuestion: { type: String, default: '' },
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
			sets: [],
			setsError: '',
			setResult: null,
			removingSet: '',
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
		this.reloadSets()
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
			if (!this.schema || !this.endpoint) {
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
		 * Read the loaded sets, keeping entries with a usable id and label.
		 *
		 * @return {Promise<void>}
		 */
		async reloadSets() {
			if (!this.setsUrl) {
				return
			}
			try {
				const { data } = await axios.get(generateUrl(this.setsUrl))
				const list = Array.isArray(data && data.sets) ? data.sets : []
				this.sets = list.filter((set) => set && typeof set.id === 'string' && /^[a-z0-9-]+$/.test(set.id) && typeof set.label === 'string')
				this.setsError = ''
			} catch {
				this.sets = []
				this.setsError = t('nextcloud-vue', 'Could not read the loaded sets.')
			}
		},

		/**
		 * Ask, remove one set, say what the server said, and read the sets again.
		 * Closing the question is a no.
		 *
		 * @param {{id: string, label: string}} set The set.
		 * @return {Promise<void>}
		 */
		async removeSet(set) {
			const label = this.text(set.label)
			const confirmed = await showConfirmation({
				name: t('nextcloud-vue', 'Remove the set {set}', { set: label }),
				text: this.removeSetQuestion
					? this.text(this.removeSetQuestion).replace('{set}', label)
					: t('nextcloud-vue', 'Remove the set "{set}"? Its objects move to the trash, where you can restore them. Anything you made yourself stays.', { set: label }),
				labelConfirm: t('nextcloud-vue', 'Remove'),
				labelReject: t('nextcloud-vue', 'Cancel'),
			}).then((answer) => answer === true, () => false)
			if (!confirmed) {
				return
			}
			this.removingSet = set.id
			this.setResult = null
			try {
				const { data } = await axios.post(generateUrl(this.removeSetUrl.replace('{id}', encodeURIComponent(set.id))))
				const ok = Boolean(data && data.success === true)
				const said = data && typeof data.message === 'string' && data.message !== '' ? data.message : ''
				this.setResult = {
					ok,
					text: said || (ok
						? t('nextcloud-vue', 'The set "{set}" was removed.', { set: label })
						: t('nextcloud-vue', 'The set "{set}" was not removed.', { set: label })),
				}
				await this.reloadSets()
			} catch (error) {
				const data = error && error.response && error.response.data
				const said = data && typeof (data.message || data.reason) === 'string' ? (data.message || data.reason) : ''
				this.setResult = { ok: false, text: said || t('nextcloud-vue', 'The set "{set}" was not removed.', { set: label }) }
			} finally {
				this.removingSet = ''
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

.cn-shipped-configuration__sets {
	list-style: none;
	margin: 0 0 12px;
	padding: 0;
}

.cn-shipped-configuration__set {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
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
