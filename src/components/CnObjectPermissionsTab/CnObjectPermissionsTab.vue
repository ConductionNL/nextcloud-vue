<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnObjectPermissionsTab — who holds which right on one OpenRegister object, and
  where each grant came from. Read-only: it renders OpenRegister's answer and
  computes none of it. One row per rule; a deny is its own row beside the grant
  it removes. A failed read is named, never shown as an empty list.
-->
<template>
	<div class="cn-object-permissions-tab">
		<h3>{{ title || t('nextcloud-vue', 'Who holds which right') }}</h3>

		<div v-if="loading" class="cn-object-permissions-tab__loading">
			<NcLoadingIcon :size="20" />
			{{ t('nextcloud-vue', 'Reading the grants on this record') }}
		</div>

		<template v-else>
			<p v-if="reviewRefused" class="cn-object-permissions-tab__unreadable">
				{{ t('nextcloud-vue', 'You may open this record. You may not review who else can.') }}
			</p>

			<p v-else-if="unreadable.length > 0" class="cn-object-permissions-tab__unreadable">
				{{ t('nextcloud-vue', 'OpenRegister could not be asked for {sources}. This list is incomplete, not empty.', { sources: unreadable.join(', ') }) }}
			</p>

			<p v-if="enforcement" class="cn-object-permissions-tab__enforcement">
				{{ enforcementSentence }}
			</p>

			<p v-if="rows.length === 0" class="cn-object-permissions-tab__empty">
				{{ t('nextcloud-vue', 'OpenRegister reports no rule on this record.') }}
			</p>

			<table v-else class="cn-object-permissions-tab__table">
				<thead>
					<tr>
						<th scope="col">
							{{ t('nextcloud-vue', 'Holder') }}
						</th>
						<th scope="col">
							{{ t('nextcloud-vue', 'Right') }}
						</th>
						<th scope="col">
							{{ t('nextcloud-vue', 'Where it comes from') }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(row, index) in rows"
						:key="`${row.holder}-${row.right}-${row.source}-${index}`"
						class="cn-object-permissions-tab__row">
						<td>{{ row.holder || t('nextcloud-vue', 'Not named') }}</td>
						<td>
							<span class="cn-object-permissions-tab__right">{{ row.right }}</span>
							<span v-if="describe(row.right)" class="cn-object-permissions-tab__hint">{{ describe(row.right) }}</span>
							<span v-if="row.declared === false" class="cn-object-permissions-tab__hint">{{ t('nextcloud-vue', 'OpenRegister does not publish this right.') }}</span>
						</td>
						<td>
							<span class="cn-object-permissions-tab__source">{{ sourceLabel(row.source) }}</span>
							<span v-if="roleHint(row)" class="cn-object-permissions-tab__hint">{{ roleHint(row) }}</span>
							<span v-if="inheritedHint(row)" class="cn-object-permissions-tab__hint cn-object-permissions-tab__inherited">{{ inheritedHint(row) }}</span>
							<span v-if="row.until" class="cn-object-permissions-tab__hint">{{ endsHint(row) }}</span>
							<span v-if="areaHint(row)" class="cn-object-permissions-tab__hint">{{ areaHint(row) }}</span>
						</td>
					</tr>
				</tbody>
			</table>

			<section v-if="historyEnabled && historyReadable" class="cn-object-permissions-tab__history">
				<h4>{{ t('nextcloud-vue', 'Who held a right on a date') }}</h4>

				<label class="cn-object-permissions-tab__moment">
					<span>{{ t('nextcloud-vue', 'Report the rights as they stood on') }}</span>
					<input v-model="moment"
						type="date"
						:max="today"
						@change="loadMoment">
				</label>

				<p v-if="momentLoading" class="cn-object-permissions-tab__empty" role="status">
					{{ t('nextcloud-vue', 'Reading the trail for that date') }}
				</p>

				<template v-else-if="asOf">
					<p v-if="asOf.answered === false" class="cn-object-permissions-tab__empty">
						{{ t('nextcloud-vue', 'The trail does not reach {date}, so nobody can be reported for it.', { date: moment }) }}
					</p>

					<template v-else>
						<p class="cn-object-permissions-tab__enforcement">
							{{ setBySentence }}
						</p>
						<p v-if="asOf.changedAfterwardsBy" class="cn-object-permissions-tab__enforcement">
							{{ changedAfterwardsSentence }}
						</p>
						<table class="cn-object-permissions-tab__table">
							<thead>
								<tr>
									<th scope="col">
										{{ t('nextcloud-vue', 'Holder') }}
									</th>
									<th scope="col">
										{{ t('nextcloud-vue', 'Right') }}
									</th>
									<th scope="col">
										{{ t('nextcloud-vue', 'Where it came from') }}
									</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(row, index) in asOf.rows"
									:key="`asof-${row.holder}-${row.right}-${index}`"
									class="cn-object-permissions-tab__row">
									<td>{{ row.holder || t('nextcloud-vue', 'Not named') }}</td>
									<td>{{ row.right }}</td>
									<td>
										<span class="cn-object-permissions-tab__source">{{ sourceLabel(row.source) }}</span>
										<span v-if="roleHint(row)" class="cn-object-permissions-tab__hint">{{ roleHint(row) }}</span>
									</td>
								</tr>
							</tbody>
						</table>
					</template>
				</template>
			</section>

			<section v-if="fieldRows.length" class="cn-object-permissions-tab__fields">
				<h4>{{ t('nextcloud-vue', 'Which fields each role reads') }}</h4>
				<p class="cn-object-permissions-tab__hint">
					{{ t('nextcloud-vue', 'A field missing from this record is missing because of a rule below, not because it is empty.') }}
				</p>
				<table class="cn-object-permissions-tab__table">
					<thead>
						<tr>
							<th scope="col">
								{{ t('nextcloud-vue', 'Field') }}
							</th>
							<th scope="col">
								{{ t('nextcloud-vue', 'Rule') }}
							</th>
							<th scope="col">
								{{ t('nextcloud-vue', 'Who it affects') }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(row, index) in fieldRows"
							:key="`field-${row.field}-${row.rule}-${index}`"
							class="cn-object-permissions-tab__row">
							<td>{{ row.field }}</td>
							<td>
								{{ ruleLabels[row.rule] }}
								<span v-if="row.appliesToMe" class="cn-object-permissions-tab__source">{{ t('nextcloud-vue', 'applies to you') }}</span>
							</td>
							<td>
								{{ sentenceFor(row) }}
								<span v-if="row.reason" class="cn-object-permissions-tab__hint">{{ row.reason }}</span>
							</td>
						</tr>
					</tbody>
				</table>
			</section>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import {
	asOfRows,
	DEFAULT_API_BASE,
	fetchAccessHistory,
	fetchCallerScope,
	fetchDenyRules,
	fetchFieldRoleRules,
	fetchObjectGrants,
	fetchObjectPermissions,
	fetchPermissionCatalogue,
	fetchRoleGrants,
	fieldRoleRows,
	grantRows,
	roleRuleLabels,
	roleRuleSentence,
} from '../../utils/objectPermissions.js'

/** OpenRegister's answer to a reader who may open the object and not review it. */
const REVIEW_REFUSED = 403

export default {
	name: 'CnObjectPermissionsTab',
	components: { NcLoadingIcon },

	props: {
		/** The object uuid (injected by CnObjectSidebar). */
		objectId: { type: String, default: '' },
		/** Register slug or uuid (injected by CnObjectSidebar). */
		register: { type: String, default: '' },
		/** Schema slug or uuid (injected by CnObjectSidebar). */
		schema: { type: String, default: '' },
		/** OpenRegister API root. */
		apiBase: { type: String, default: DEFAULT_API_BASE },
		/** Offer "who held a right on a date" when OpenRegister answers the history read. */
		historyEnabled: { type: Boolean, default: true },
		/**
		 * Where the per-role field rules are declared:
		 * `{ typeField, typeSchema, declarationField? }`. The object's
		 * `typeField` references a `typeSchema` object in the same register
		 * whose `declarationField` (default `fieldRoleRules`) lists the rules.
		 * `null` leaves the field-rules section out.
		 */
		fieldRules: { type: Object, default: null },
		/** Heading; empty uses the translated default. */
		title: { type: String, default: '' },
		/**
		 * Labels per source key, overriding the defaults (e.g. `{ group: '…' }`).
		 * An unknown key renders as itself.
		 */
		sourceLabels: { type: Object, default: () => ({}) },
	},

	data() {
		return {
			loading: true,
			rows: [],
			catalogue: [],
			enforcement: '',
			unreadable: [],
			reviewRefused: false,
			historyReadable: false,
			fieldRows: [],
			moment: '',
			momentLoading: false,
			asOf: null,
		}
	},

	computed: {
		target() {
			return { register: this.register, schema: this.schema, apiBase: this.apiBase }
		},

		ruleLabels() {
			return roleRuleLabels()
		},

		/** Today, so nobody asks the trail about a date that has not happened. */
		today() {
			return new Date().toISOString().slice(0, 10)
		},

		setBySentence() {
			if (!this.asOf?.setBy) {
				return t('nextcloud-vue', 'These rights stood on that date. Nobody is named as setting them.')
			}
			return t('nextcloud-vue', '{who} set these rights.', { who: this.asOf.setBy })
		},

		changedAfterwardsSentence() {
			const change = this.asOf?.changedAfterwardsBy
			if (!change) {
				return ''
			}
			return t('nextcloud-vue', '{who} changed them afterwards, on {date}.', {
				who: change.by || t('nextcloud-vue', 'Somebody'),
				date: change.at || t('nextcloud-vue', 'a date the trail does not give'),
			})
		},

		enforcementSentence() {
			if (this.enforcement === 'enforcing') {
				return t('nextcloud-vue', 'A refusal below is in force now.')
			}
			if (this.enforcement === 'off') {
				return t('nextcloud-vue', 'Refusals are switched off, so no rule below removes a right.')
			}
			return t('nextcloud-vue', 'Refusals are staged: a rule below is recorded, and removes a right once it is switched on.')
		},
	},

	watch: {
		objectId() {
			this.asOf = null
			this.moment = ''
			this.load()
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,

		sentenceFor(row) {
			return roleRuleSentence(row)
		},

		/**
		 * Ask OpenRegister once and render what came back.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			const permissions = this.objectId
				? await fetchObjectPermissions(this.target, this.objectId)
				: { status: 0, set: null }

			// A 403 is OpenRegister answering "not you", not a failed read.
			this.reviewRefused = permissions.status === REVIEW_REFUSED
			this.historyReadable = permissions.set !== null
			const fallback = permissions.set === null

			const [catalogue, objectGrants, roleGrants, callerScope, denyRules, fieldRules] = await Promise.all([
				fetchPermissionCatalogue(this.target),
				fallback && this.objectId ? fetchObjectGrants(this.target, this.objectId) : null,
				fallback ? fetchRoleGrants(this.target) : null,
				fetchCallerScope(this.target),
				fallback ? fetchDenyRules(this.target) : null,
				this.fieldRules ? fetchFieldRoleRules(this.target, this.objectId, this.fieldRules) : { decided: null, declared: null },
			])

			this.fieldRows = fieldRoleRows(fieldRules.declared, fieldRules.decided)

			// Each failed read is named: an auditor reading a short list has to
			// know which source is missing from it.
			const missing = []
			if (catalogue === null) {
				missing.push(t('nextcloud-vue', 'the rights it publishes'))
			}
			if (permissions.set === null) {
				if (objectGrants === null) {
					missing.push(t('nextcloud-vue', 'the shares on this record'))
				}
				if (roleGrants === null) {
					missing.push(t('nextcloud-vue', 'the roles'))
				}
				if (denyRules === null) {
					missing.push(t('nextcloud-vue', 'the refusals'))
				}
			}
			if (callerScope === null) {
				missing.push(t('nextcloud-vue', 'your own rights'))
			}

			this.catalogue = catalogue?.permissions || []
			this.enforcement = permissions.set?.denyEnforcement || catalogue?.denyEnforcement || denyRules?.denyEnforcement || ''
			this.unreadable = this.reviewRefused ? [] : missing
			this.rows = grantRows({ objectPermissions: permissions.set, objectGrants, roleGrants, callerScope, denyRules })
			this.loading = false
		},

		/**
		 * Ask the trail who held a right at the end of the picked day.
		 *
		 * @return {Promise<void>}
		 */
		async loadMoment() {
			if (this.moment === '' || this.objectId === '') {
				this.asOf = null
				return
			}
			this.momentLoading = true
			// End of that day, so a grant written during it counts as standing on it.
			const { history } = await fetchAccessHistory(this.target, this.objectId, `${this.moment}T23:59:59`)
			this.asOf = asOfRows(history)
			this.momentLoading = false
		},

		roleHint(row) {
			if (!row?.role) {
				return row?.detail || ''
			}
			return t('nextcloud-vue', 'Through the role {role}', { role: row.role })
		},

		/**
		 * Which record handed this rule down, named inside a sentence, never bare.
		 *
		 * @param {object} row One row.
		 * @return {string} The sentence, or ''.
		 */
		inheritedHint(row) {
			if (!row?.inheritedFrom) {
				return ''
			}
			return t('nextcloud-vue', 'Granted on record {record}, which this one hangs under', { record: row.inheritedFrom })
		},

		/**
		 * The end as OpenRegister wrote it: printed, never judged against a clock.
		 *
		 * @param {object} row One row.
		 * @return {string} The sentence.
		 */
		endsHint(row) {
			return t('nextcloud-vue', 'Written to end on {date}', { date: row.until })
		},

		areaHint(row) {
			const named = [...(row?.scopedTo?.registers || []), ...(row?.scopedTo?.schemas || [])]
				.filter((name) => typeof name === 'string' && name !== '')
			if (named.length === 0) {
				return ''
			}
			return t('nextcloud-vue', 'Only in {areas}', { areas: named.join(', ') })
		},

		describe(right) {
			const entry = this.catalogue.find((permission) => permission?.action === right)
			return entry?.description || ''
		},

		sourceLabel(source) {
			if (this.sourceLabels && this.sourceLabels[source]) {
				return this.sourceLabels[source]
			}
			const labels = {
				share: t('nextcloud-vue', 'A share on this record'),
				role: t('nextcloud-vue', 'A role'),
				group: t('nextcloud-vue', 'A grant on a group of types'),
				object: t('nextcloud-vue', 'A rule on this record'),
				schema: t('nextcloud-vue', 'A rule on every record of this type'),
				register: t('nextcloud-vue', 'A rule on the register'),
				deny: t('nextcloud-vue', 'A rule that refuses'),
				'staged-deny': t('nextcloud-vue', 'A rule that will refuse'),
				'default-open': t('nextcloud-vue', 'No rule, so it is open'),
				none: t('nextcloud-vue', 'No rule grants it'),
				inherited: t('nextcloud-vue', 'A grant on a record this one hangs under'),
			}
			return labels[source] || source
		},
	},
}
</script>

<style scoped>
.cn-object-permissions-tab {
	padding: 12px;
}

.cn-object-permissions-tab__loading {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-object-permissions-tab__table {
	width: 100%;
	border-collapse: collapse;
}

.cn-object-permissions-tab__table th,
.cn-object-permissions-tab__table td {
	text-align: start;
	padding: 4px 8px;
	border-bottom: 1px solid var(--color-border);
	vertical-align: top;
}

.cn-object-permissions-tab__right,
.cn-object-permissions-tab__source {
	display: block;
}

.cn-object-permissions-tab__hint {
	display: block;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

.cn-object-permissions-tab__unreadable {
	color: var(--color-warning-text, var(--color-main-text));
}

.cn-object-permissions-tab__enforcement,
.cn-object-permissions-tab__empty {
	color: var(--color-text-maxcontrast);
}

.cn-object-permissions-tab__history,
.cn-object-permissions-tab__fields {
	margin-block-start: 24px;
	border-top: 1px solid var(--color-border);
	padding-block-start: 12px;
}

.cn-object-permissions-tab__moment {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	margin-block-end: 8px;
}
</style>
