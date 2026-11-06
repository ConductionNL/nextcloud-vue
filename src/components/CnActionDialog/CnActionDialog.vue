<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:name="text(config.title) || t('nextcloud-vue', 'Confirm')"
		:eyebrow="eyebrowText"
		:subtitle="text(config.subtitle)"
		width="form"
		:noClose="busy"
		data-testid="cn-action-dialog"
		@closing="close">
		<div v-if="!done" class="cn-action-dialog" :style="partsGap">
			<!-- The record the action is about: its title, a meta line, a badge. -->
			<div v-if="summary" class="cn-action-dialog__summary" data-testid="cn-action-dialog-summary">
				<span class="cn-action-dialog__summary-icon">
					<CnIcon :name="config.summary.icon || 'FolderOutline'" :size="20" />
				</span>
				<span class="cn-action-dialog__summary-text">
					<strong>{{ summary.title }}</strong>
					<span v-if="summary.meta" class="cn-action-dialog__muted">{{ summary.meta }}</span>
				</span>
				<span
					v-if="summary.badge"
					class="cn-action-dialog__badge"
					:class="summary.badgeVariant ? 'cn-status-badge--' + summary.badgeVariant : ''">{{ summary.badge }}</span>
			</div>

			<!-- Facts about the record, in titled groups ("Retention under the case type"). -->
			<section v-for="(section, index) in factSections"
				:key="`facts-${index}`"
				class="cn-action-dialog__section"
				data-testid="cn-action-dialog-facts">
				<h3 v-if="section.title" class="cn-action-dialog__title">
					{{ section.title }}
				</h3>
				<dl class="cn-action-dialog__facts">
					<div v-for="fact in section.facts" :key="fact.label" class="cn-action-dialog__fact">
						<dt>{{ fact.label }}</dt>
						<dd>{{ fact.value }}</dd>
					</div>
				</dl>
			</section>

			<!-- The checklist, read from an endpoint: each item met, not met or
			     unknown. Items named in `required` decide whether the action may
			     run; the others inform. -->
			<section v-if="config.checklist" class="cn-action-dialog__section" data-testid="cn-action-dialog-checklist">
				<h3 v-if="config.checklist.title" class="cn-action-dialog__title">
					{{ text(config.checklist.title) }}
				</h3>
				<p v-if="checklistError" class="cn-action-dialog__muted" role="status">
					{{ checklistError }}
				</p>
				<ul class="cn-action-dialog__checks">
					<li v-for="item in checklist"
						:key="item.id"
						class="cn-action-dialog__check"
						:data-testid="`cn-action-dialog-check-${item.id}`"
						:data-met="String(item.met)">
						<CheckCircle v-if="item.met === true" :size="20" class="cn-action-dialog__check-icon cn-action-dialog__check-icon--met" />
						<HelpCircleOutline v-else-if="item.met === null" :size="20" class="cn-action-dialog__check-icon" />
						<CircleOutline v-else :size="20" class="cn-action-dialog__check-icon" />
						<strong class="cn-action-dialog__check-label">{{ item.label }}</strong>
						<span v-if="item.detail" class="cn-action-dialog__muted">{{ item.detail }}</span>
					</li>
				</ul>
			</section>

			<!-- The fields, the reason and the note, in the order `bodyParts`
			     gives: the fields first, or after the note with
			     `fieldsAfterNote` (DqArchiveren's "let the requester know"). -->
			<template v-for="part in bodyParts" :key="part">
				<template v-if="part === 'fields'">
					<!-- Fields the action asks for, sent beside the reason. -->
					<div v-for="field in shownFields"
						:key="field.field"
						class="cn-action-dialog__field"
						:data-testid="`cn-action-dialog-field-${field.field}`">
						<!-- A checkbox field: a tinted box, the label filled from the
						     record, a hint under it (DqArchiveren "Sanne de Vries laten
						     weten..."). -->
						<NcCheckboxRadioSwitch v-if="field.type === 'checkbox'"
							class="cn-action-dialog__checkbox"
							:class="{ 'cn-action-dialog__checkbox--plain': field.look === 'plain' }"
							:modelValue="checkboxValue(field)"
							type="checkbox"
							@update:modelValue="(on) => setChecked(field.field, on)">
							<span class="cn-action-dialog__checkbox-text">
								<strong class="cn-action-dialog__checkbox-label">{{ fill(field.label) || field.field }}</strong>
								<span v-if="field.hint" class="cn-action-dialog__muted">{{ fill(field.hint) }}</span>
							</span>
						</NcCheckboxRadioSwitch>
						<!-- A search field: records of `source` found as the reader
						     types (DqZaakKoppelen "Zaak koppelen"). -->
						<CnSearchSelect v-else-if="field.type === 'search'"
							:modelValue="values[field.field] || null"
							:options="searchOptions[field.field] || []"
							:inputLabel="fill(field.label) || field.field"
							:labelOutside="true"
							:loading="searching === field.field"
							:filterable="false"
							:placeholder="fill(field.placeholder)"
							@search="(typed) => onSearch(field, typed)"
							@update:modelValue="(value) => setValue(field.field, value && typeof value === 'object' ? value.id : value)" />
						<!-- Several items to tick, listed from the record or the config
						     (DqZaakDialogen "Documenten die meegaan"). -->
						<fieldset v-else-if="field.type === 'checks'"
							class="cn-action-dialog__check-field"
							:data-testid="`cn-action-dialog-checks-${field.field}`">
							<legend class="cn-action-dialog__checks-legend">
								{{ fill(field.label) || field.field }}
							</legend>
							<!-- Several ticks per item, one per column ("moves" or "on both"). -->
							<template v-if="hasColumns(field)">
								<div class="cn-action-dialog__columns cn-action-dialog__columns--head" aria-hidden="true">
									<span />
									<span v-for="column in field.columns" :key="column.field">{{ text(column.label) || column.field }}</span>
								</div>
								<div v-for="item in checkItems(field)"
									:key="item.value"
									class="cn-action-dialog__columns"
									:data-testid="`cn-action-dialog-columns-${field.field}-${item.value}`">
									<span class="cn-action-dialog__checkbox-text">
										<strong class="cn-action-dialog__checkbox-label">{{ item.label }}</strong>
										<span v-if="item.secondary" class="cn-action-dialog__muted">{{ item.secondary }}</span>
									</span>
									<NcCheckboxRadioSwitch v-for="column in field.columns"
										:key="column.field"
										:modelValue="columnValue(column).includes(item.value)"
										type="checkbox"
										:ariaLabel="`${item.label}: ${text(column.label) || column.field}`"
										@update:modelValue="(on) => setCheck(column, item.value, on)" />
								</div>
							</template>
							<NcCheckboxRadioSwitch v-for="item in (hasColumns(field) ? [] : checkItems(field))"
								:key="item.value"
								:modelValue="checksValue(field).includes(item.value)"
								type="checkbox"
								@update:modelValue="(on) => setCheck(field, item.value, on)">
								<span class="cn-action-dialog__checkbox-text">
									<strong class="cn-action-dialog__checkbox-label">{{ item.label }}</strong>
									<span v-if="item.secondary" class="cn-action-dialog__muted">{{ item.secondary }}</span>
								</span>
							</NcCheckboxRadioSwitch>
							<span v-if="checkItems(field).length === 0" class="cn-action-dialog__muted">
								{{ text(field.emptyText) || t('nextcloud-vue', 'Nothing to choose from.') }}
							</span>
							<span v-if="conflicts(field).length > 0"
								class="cn-action-dialog__error"
								role="alert"
								:data-testid="`cn-action-dialog-conflict-${field.field}`">
								{{ text(field.exclusiveText) || t('nextcloud-vue', 'An item cannot be ticked in more than one column.') }}
							</span>
						</fieldset>
						<!-- One choice out of a few explained options (DqZaakSamenwerken
						     "Delen" or "Overdragen"). -->
						<CnChoiceCards v-else-if="field.type === 'cards'"
							:modelValue="cardsValue(field)"
							:options="cardOptions(field)"
							:label="fill(field.label) || field.field"
							:layout="field.layout === 'rows' ? 'rows' : 'cards'"
							:columns="typeof field.columns === 'number' ? field.columns : 0"
							:hideLabel="field.hideLabel === true"
							@update:modelValue="(value) => setValue(field.field, value)" />
						<!-- An optional select or text field: its label above the control,
						     "(optional)" in grey after it (DqUwWachtrij "Sjabloon (niet
						     verplicht)"). -->
						<CnFormField v-if="labelsOutside(field)"
							:controlId="controlId(field)"
							:text="fill(field.label) || field.field"
							:optional="true" />
						<NcSelect v-if="field.type === 'select'"
							:modelValue="selectedOption(field)"
							:options="optionsOf(field)"
							:inputId="controlId(field)"
							:inputLabel="fill(field.label) || field.field"
							:labelOutside="labelsOutside(field)"
							:placeholder="fill(field.placeholder)"
							:clearable="field.required === false"
							:filterable="!searchesRemotely(field)"
							:loading="loadingOptions === field.field"
							@search="(typed) => onOptionsSearch(field, typed)"
							@update:modelValue="(option) => pick(field, option)" />
						<NcTextField v-else-if="field.type === 'secret'"
							:modelValue="values[field.field] || ''"
							type="password"
							autocomplete="new-password"
							:label="text(field.label) || field.field"
							:placeholder="secretStored(field) ? t('nextcloud-vue', 'Stored. Type a new value to replace it.') : ''"
							@update:modelValue="(value) => setValue(field.field, value)" />
						<NcTextField v-else-if="!['checkbox', 'search', 'checks', 'cards'].includes(field.type)"
							:id="controlId(field)"
							:modelValue="values[field.field] || ''"
							:type="field.type === 'datetime' ? 'datetime-local' : (field.type === 'date' ? 'date' : 'text')"
							:label="fill(field.label) || field.field"
							:labelOutside="labelsOutside(field)"
							@update:modelValue="(value) => setValue(field.field, value)" />
						<span v-if="field.hint && field.type !== 'checkbox'" class="cn-action-dialog__muted">{{ fill(field.hint) }}</span>
						<span v-if="optionsErrors[field.field]"
							class="cn-action-dialog__error"
							role="alert"
							:data-testid="`cn-action-dialog-options-error-${field.field}`">{{ optionsErrors[field.field] }}</span>
					</div>

				</template>
				<template v-else-if="part === 'reason'">
					<div v-if="config.reason" class="cn-action-dialog__field cn-action-dialog__reason">
						<NcTextArea
							:id="reasonId"
							v-model="reason"
							:label="reasonLabel"
							:labelOutside="false"
							:rows="config.reason.rows || 2"
							resize="vertical"
							data-testid="cn-action-dialog-reason" />
						<span v-if="config.reason.hint" class="cn-action-dialog__muted cn-action-dialog__hint">{{ text(config.reason.hint) }}</span>
					</div>

				</template>
				<template v-else>
					<NcNoteCard v-if="config.note && noteShown"
						:type="noteType"
						:heading="text(config.note.title)"
						data-testid="cn-action-dialog-note">
						<template v-if="config.note.icon" #icon>
							<CnIcon class="cn-action-dialog__note-icon" :name="config.note.icon" :size="20" />
						</template>
						{{ noteText }}
					</NcNoteCard>
				</template>
			</template>

			<p v-if="refusal"
				class="cn-action-dialog__error"
				role="alert"
				data-testid="cn-action-dialog-refusal">
				{{ refusal }}
			</p>
		</div>

		<p v-else role="status" data-testid="cn-action-dialog-done">
			{{ doneMessage }}
		</p>

		<template #actions>
			<NcButton :disabled="busy" data-testid="cn-action-dialog-cancel" @click="close">
				{{ done ? t('nextcloud-vue', 'Close') : t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton v-if="!done"
				variant="primary"
				:disabled="!canConfirm"
				data-testid="cn-action-dialog-confirm"
				@click="confirm">
				<template v-if="confirmIcon" #icon>
					<CnIcon :name="confirmIcon" :size="20" />
				</template>
				{{ confirmText }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import axios from '@nextcloud/axios'
import { showSuccess } from '@nextcloud/dialogs'
import { emit } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcCheckboxRadioSwitch, NcNoteCard, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'
import CheckCircle from 'vue-material-design-icons/CheckCircle.vue'
import CircleOutline from 'vue-material-design-icons/CircleOutline.vue'
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import CnFormField from '../CnFormField/CnFormField.vue'
import { fetchEndpointSource, interpolateUrlTokens } from '../../composables/useEndpointSource.js'
import { bodyValue, checksSent, chosenRequest, isFilled, isShown, matchingRows, optionsRead, pickCase, tickedTwice } from '../../utils/actionDialogForm.js'
import { BUILT_IN_FORMATTERS } from '../../utils/builtInFormatters.js'
import { fillTemplate, firstFilled } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { CnChoiceCards } from '../CnChoiceCards/index.js'
import { CnDialog } from '../CnDialog/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnSearchSelect } from '../CnSearchSelect/index.js'

/** How long typing rests before a search field searches, in ms. */
const SEARCH_DELAY = 250

/** The page refresh channel the built-in widgets listen on. */
const PAGE_REFRESH = 'cn:page:refresh'

/** Gives each dialog's reason field its own id. */
let reasonSeq = 0

/**
 * CnActionDialog — the generic "summary, checklist, reason, confirm" dialog
 * for an act on a record, configured from the manifest (an `open-modal`
 * action's props), so an app does not hand-build each one. dossiq's archive
 * dialog (board DqArchiveren) is the first: the case, what its case type
 * keeps, a readiness checklist read from an endpoint, a reason, a read-only
 * note and Archive it.
 *
 * `config`:
 * - `title`, `subtitle`, `doneText`: texts, through the host translate;
 *   `eyebrow` a template filled from the record ("Close off · {identifier}").
 * - `summary`: `{ source?, title, meta?, badge?, badgeVariant?, badgeColorMap?, icon? }`: templates filled from
 *   the record (`source` an endpointSource to read it from, else `object`).
 * - `facts`: `[{ title?, items: [{ label, value }] }]`, `value` a template; a
 *   `{path|<formatter>}` token reads through the built-in and app formatters.
 * - `checklist`: `{ title?, source, itemsPath?, labels?, required? }`: items
 *   `{ id, met, label?, detail? }` read from `source`; `labels[id]` gives an
 *   item's `{ label, detail?, unmetDetail? }`; the ids in `required` must be
 *   met before the action can run. `met: null` reads as unknown.
 * - `permission`: `{ source, listPath?, match?, allowedPath, reasonPath? }`:
 *   the action runs only while `allowedPath` reads true; `reasonPath` says
 *   why not. With `listPath` the paths read the entry of that list whose
 *   fields equal `match` (`{ act: "archive" }`).
 * - `fields`: `[{ field, type?: "text"|"date"|"datetime"|"select"|"checkbox", label?,
 *   required?, options?: [{ value, label, fills? }], hint?, default? }]`: inputs
 *   sent beside the reason, required by default; a select option's `fills`
 *   sets other fields that are still empty. A `checkbox` is sent as a boolean,
 *   starts at `default` (false), fills its `label` and `hint` from the record,
 *   and is optional unless `required: true` (then it must be ticked). A
 *   `search` field finds records of `source: { register, schema }` as the
 *   reader types, shows each as `optionLabel` with `optionSecondary` under
 *   it (templates on the found record), leaves the record in hand out with
 *   `excludeSelf`, and sends the chosen record's id. Every field's `label`,
 *   `hint` and `placeholder` (search and select) are templates filled from the record.
 *   An optional select or text field (`required: false`) draws its label above
 *   the control with "(optional)" after it. A `checks` field ticks several
 *   items, listed in `options` or read off the record at `itemsPath`
 *   (`optionValue`, `optionLabel` and `optionSecondary` name their parts),
 *   starts on `default` (a list, or "all") and sends the ticked values as a
 *   list; required means at least one. A `cards` field is one choice out of
 *   `options` `[{ value, label, description? }]` drawn as cards, starting on
 *   `default`.
 * - `reason`: `{ label?, hint?, required?, field?, rows? }`: a text area; required by
 *   default; sent as `field` (default `reason`). `rows` is its height in lines
 *   (default 2; board DqBesluit draws 4).
 * - `note`: `{ variant?, title?, text, icon? }`: a read-only note; `icon` an
 *   icon name in place of the variant's own ("LockOutline").
 * - `fieldsAfterNote`: true draws the fields after the reason and the note
 *   instead of before them (DqArchiveren's checkbox at the end).
 * - `confirm`: `{ label, icon?, request?: { method?, url, body?, answerPath? }, action? }`.
 *   `request` posts itself (`body` templates filled with the record and
 *   `{reason}`); `action` dispatches a manifest action through the page.
 *   `answerPath` shows the text at that path of the answer once the act ran,
 *   in place of `doneText` (a lookup that says what it found).
 *
 * - `source`: an endpointSource the record is read from, beside or in place
 *   of `summary.source` (a policy a field's `visibleWhen` reads).
 * - A field's `visibleWhen`: `{ field | path, equals? | in? | includes? | filled? }`
 *   shows the field only while another field's value (`field`) or a value of
 *   the record (`path`) matches; a hidden field is not required and not sent.
 *   The note takes `visibleWhen` too, and `note.textsBy: { field, cases }`
 *   gives its text per chosen value.
 * - A select or checks field's `optionsSource`: an endpointSource (`url`,
 *   `params`, `responsePath`) its options are read from, `match` keeping the
 *   entries whose fields equal it, `search: true` reading again as the reader
 *   types (the term under `searchParam`, default `_search`) and `errorText`
 *   saying a failed read. `optionValue` (default `id`) and `optionLabel` (a
 *   template, or a list of them, the first that fills) name each option.
 * - A checks field's `sendUnticked: true` sends the items left unticked, and
 *   any field's `sendAs` sends its value under another key ("ticked means
 *   shared" posted as `fieldExclusions`). `hideWhenEmpty` hides a checks field
 *   with no items. `columns: [{ field, label }]` ticks each item once per
 *   column, each column sent as its own list; `exclusive: true` refuses an
 *   item ticked in two columns (`exclusiveText`).
 * - `requireOneOf`: field names of which at least one must hold a value.
 * - `confirm.requestsBy: { field, cases: { <value>: request } }` posts the
 *   request of the chosen act, each with its own `url`, `method`, `body` and
 *   optional `label`, `icon` and `doneText`. A body value that is one whole
 *   token (`"{fields.permission}"`) sends the value as it is; `{fields.<key>}`
 *   reads a sent value by the key it is sent under. `fieldsInBody: false`
 *   sends only the body.
 * - `{chosen.<field>.<path>}` reads the entry a select field's
 *   `optionsSource` gave for the chosen option, and `{objectId}` the record's
 *   id, in a body and in `doneText`; `doneText` also reads `{fields.<key>}`.
 * - `closeOnDone: true` says the done text as a toast and closes the dialog
 *   rather than showing it in the dialog. `errorText` on the request or on
 *   `confirm` words a failure the server gives no message for.
 * - `gap`: the room between the dialog's parts in px (default 18). A cards
 *   field takes `layout` (`rows`), `columns` and `hideLabel` as
 *   `CnChoiceCards` does; a checkbox field with `look: 'plain'` is a plain
 *   checkbox and label, without the tinted box.
 *
 * Tokens (`@objectId`, `@object.<field>`) resolve in every url.
 */
export default {
	name: 'CnActionDialog',

	components: { CheckCircle, CircleOutline, CnChoiceCards, CnDialog, CnFormField, CnIcon, CnSearchSelect, HelpCircleOutline, NcButton, NcCheckboxRadioSwitch, NcNoteCard, NcSelect, NcTextArea, NcTextField },

	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
		/** The page's pre-bound action dispatcher (CnPageRenderer), for `confirm.action`. */
		cnDispatchAction: { default: null },
		/** The app's named formatters (CnAppRoot), for `{path|<formatter>}` in a template. */
		cnFormatters: { default: () => ({}) },
	},

	props: {
		/**
		 * The dialog's configuration (see the component docs).
		 *
		 * @type {object}
		 */
		config: {
			type: Object,
			default: () => ({}),
		},

		/** The record's id, for the `@objectId` token. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/**
		 * The record, when the host has it: the summary and facts read it.
		 *
		 * @type {object|null}
		 */
		object: {
			type: Object,
			default: null,
		},
	},

	emits: ['close', 'done'],

	data() {
		return {
			record: this.object,
			items: [],
			checklistError: '',
			allowed: true,
			reason: '',
			values: {},
			/** A search field's found options, by field name. */
			searchOptions: {},
			/** The search field whose search runs, or ''. */
			searching: '',
			/** The entries an `optionsSource` gave, by field name. */
			remoteOptions: {},
			/** A failed `optionsSource` read in words, by field name. */
			optionsErrors: {},
			/** The field whose options are being read, or ''. */
			loadingOptions: '',
			busy: false,
			refusal: '',
			done: false,
			answerText: '',
			reasonId: `cn-action-dialog-reason-${++reasonSeq}`,
			fieldIdPrefix: `cn-action-dialog-field-${reasonSeq}`,
		}
	},

	computed: {
		/** @return {object} The token context. */
		tokenCtx() {
			return { objectId: this.recordId, object: this.record || {} }
		},

		/**
		 * The record's id: `objectId`, or the route's `id` when the prop is
		 * empty or a token the opener could not resolve.
		 *
		 * @return {string|number}
		 */
		recordId() {
			const given = this.objectId
			if (given !== '' && given !== null && given !== undefined && !String(given).startsWith('@')) {
				return given
			}
			return (this.$route && this.$route.params && this.$route.params.id) || ''
		},

		/** @return {object} The confirm config. */
		confirmConfig() {
			return this.config.confirm && typeof this.config.confirm === 'object' ? this.config.confirm : {}
		},

		/**
		 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-each-act-posts-to-its-own-endpoint
		 * @return {object|null} The request the chosen act posts.
		 */
		request() {
			return chosenRequest(this.confirmConfig, this.fieldValues)
		},

		/** @return {string} The confirm button's text: the chosen act's, else the config's. */
		confirmText() {
			return this.text(this.request?.label) || this.text(this.confirmConfig.label) || t('nextcloud-vue', 'Confirm')
		},

		/** @return {string} The confirm button's icon name, or ''. */
		confirmIcon() {
			return this.request?.icon || this.confirmConfig.icon || ''
		},

		/** @return {string} The done text: the chosen act's, else the config's. */
		doneTextOf() {
			return this.request?.doneText || this.config.doneText
		},

		/**
		 * What the dialog says once the act ran: the answer, else the done text
		 * filled from the sent values, the chosen entries and the record.
		 *
		 * @spec openspec/changes/action-dialog-share-look-and-outcome/specs/action-dialog/spec.md#requirement-the-done-text-names-what-was-chosen
		 * @return {string}
		 */
		doneMessage() {
			return this.answerText || this.fill(this.doneTextOf, this.templateContext('')) || this.text(this.doneTextOf) || t('nextcloud-vue', 'Done')
		},

		/** @return {object|null} The room between the parts, when `gap` sets it. */
		partsGap() {
			return Number.isFinite(this.config.gap) ? { gap: `${this.config.gap}px` } : null
		},

		/**
		 * The entry each select field's `optionsSource` gave for its chosen
		 * option, by field name (null when nothing is chosen).
		 *
		 * @spec openspec/changes/action-dialog-share-look-and-outcome/specs/action-dialog/spec.md#requirement-the-done-text-names-what-was-chosen
		 * @return {object}
		 */
		chosenRows() {
			const out = {}
			for (const field of this.fields.filter((f) => f.type === 'select' && f.optionsSource)) {
				const value = String(this.plainValue(field))
				out[field.field] = (this.remoteOptions[field.field] || []).find((row) => String(readPath(row, field.optionValue || 'id')) === value) || null
			}
			return out
		},

		/** @return {{values: object, record: (object|null)}} What a `visibleWhen` reads. */
		shownState() {
			return { values: this.fieldValues, record: this.record }
		},

		/**
		 * The fields that show: their `visibleWhen` holds, and a checks field
		 * with `hideWhenEmpty` has items.
		 *
		 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-field-shows-only-when-another-value-says-so
		 * @return {Array<object>}
		 */
		shownFields() {
			return this.fields.filter((field) => this.fieldShown(field, 0) && !(field.hideWhenEmpty === true && this.checkItems(field).length === 0))
		},

		/** @return {boolean} Whether the note shows. */
		noteShown() {
			return isShown(this.config.note, this.shownState)
		},

		/** @return {string} The note's text: the case of `textsBy` the chosen value names, else `text`. */
		noteText() {
			const picked = pickCase(this.config.note && this.config.note.textsBy, this.fieldValues)
			return this.text(typeof picked === 'string' ? picked : this.config.note.text)
		},

		/**
		 * The values sent: the shown fields only, each under its `sendAs`, a
		 * checks field with `sendUnticked` as the items left unticked and one
		 * with `columns` as a list per column.
		 *
		 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-ticked-can-mean-left-out
		 * @return {object}
		 */
		sentValues() {
			const out = {}
			for (const field of this.shownFields) {
				Object.assign(out, this.sentOf(field))
			}
			return out
		},

		/**
		 * The summary row, or null without one or before the record is known.
		 *
		 * @spec openspec/changes/action-dialog/specs/action-dialog/spec.md#requirement-a-manifest-configures-an-action-dialog
		 * @return {{title: string, meta: string, badge: string}|null}
		 */
		summary() {
			const def = this.config.summary
			if (!def || !this.record) {
				return null
			}
			const title = this.fill(def.title)
			const badge = this.fill(def.badge)
			const variants = ['default', 'success', 'warning', 'error', 'info', 'purple', 'teal']
			const mapped = def.badgeColorMap && typeof def.badgeColorMap === 'object' ? def.badgeColorMap[badge] : undefined
			const wanted = mapped || def.badgeVariant
			const badgeVariant = variants.includes(wanted) ? wanted : ''
			return title ? { title, meta: this.fill(def.meta), badge, badgeVariant } : null
		},

		/** @return {Array<string>} The order of the fields, the reason and the note. */
		bodyParts() {
			return this.config.fieldsAfterNote === true ? ['reason', 'note', 'fields'] : ['fields', 'reason', 'note']
		},

		/** @return {Array<{title: string, facts: Array<{label: string, value: string}>}>} The fact groups. */
		factSections() {
			if (!Array.isArray(this.config.facts) || !this.record) {
				return []
			}
			const empty = t('nextcloud-vue', 'Not set')
			return this.config.facts.map((section) => ({
				title: this.text(section.title),
				facts: (Array.isArray(section.items) ? section.items : []).map((fact) => ({ label: this.text(fact.label), value: this.fill(fact.value) || empty })),
			}))
		},

		/**
		 * The checklist rows: label and detail from `labels` by id, else the item's own.
		 *
		 * @spec openspec/changes/action-dialog/specs/action-dialog/spec.md#requirement-a-manifest-configures-an-action-dialog
		 * @return {Array<{id: string, met: (boolean|null), label: string, detail: string}>}
		 */
		checklist() {
			const labels = (this.config.checklist && this.config.checklist.labels) || {}
			return this.items.map((item) => {
				const met = item.met === null || item.met === undefined ? null : item.met === true
				const own = labels[item.id] || {}
				const detail = met === false && own.unmetDetail ? own.unmetDetail : (own.detail || item.detail || '')
				return {
					id: String(item.id),
					met,
					label: this.fill(own.label || item.label || String(item.id), item),
					detail: met === null && !item.detail ? t('nextcloud-vue', 'Could not be read') : this.fill(detail, item),
				}
			})
		},

		/** @return {boolean} Whether every required item is met. */
		requiredMet() {
			const required = (this.config.checklist && Array.isArray(this.config.checklist.required)) ? this.config.checklist.required.map(String) : []
			return required.every((id) => this.items.some((item) => String(item.id) === id && item.met === true))
		},

		/** @return {boolean} Whether a reason is asked and needed. */
		reasonNeeded() {
			return Boolean(this.config.reason) && this.config.reason.required !== false
		},

		/** @return {string} The reason field's label. */
		reasonLabel() {
			return this.text(this.config.reason && this.config.reason.label) || t('nextcloud-vue', 'Reason')
		},

		/** @return {string} The note's NcNoteCard type. */
		noteType() {
			const variant = this.config.note && this.config.note.variant
			return ['info', 'warning', 'error', 'success'].includes(variant) ? variant : 'info'
		},

		/**
		 * Whether the action may run: allowed, required items met, a reason
		 * when one is needed, and nothing in flight.
		 *
		 * @spec openspec/changes/action-dialog/specs/action-dialog/spec.md#requirement-a-manifest-configures-an-action-dialog
		 * @return {boolean}
		 */
		canConfirm() {
			return !this.busy && this.allowed && this.requiredMet && this.fieldsFilled && (!this.reasonNeeded || this.reason.trim() !== '')
		},

		/** @return {string} The eyebrow, filled from the record once it is known. */
		eyebrowText() {
			return this.record ? this.fill(this.config.eyebrow) || this.text(this.config.eyebrow) : this.text(this.config.eyebrow)
		},

		/**
		 * The value of every field as sent: a checkbox as a boolean, the
		 * others as entered ('' when empty).
		 *
		 * @return {object} Values by field name.
		 */
		fieldValues() {
			const out = { ...this.values }
			for (const field of this.fields) {
				Object.assign(out, this.heldValues(field))
			}
			return out
		},

		/** @return {Array<object>} The fields with a name. */
		fields() {
			return (Array.isArray(this.config.fields) ? this.config.fields : []).filter((f) => f && f.field)
		},

		/**
		 * Whether every required field has a value.
		 *
		 * @spec openspec/changes/action-dialog-fields-and-acts/specs/action-dialog/spec.md#requirement-an-action-dialog-asks-for-fields-and-reads-a-permission-from-a-list
		 * @return {boolean}
		 */
		fieldsFilled() {
			return this.oneOfFilled && this.shownFields.every((f) => this.conflicts(f).length === 0 && this.fieldFilled(f))
		},

		/**
		 * Whether one of the fields `requireOneOf` names holds a value.
		 *
		 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-checks-field-can-tick-in-columns-that-exclude-each-other
		 * @return {boolean}
		 */
		oneOfFilled() {
			const names = Array.isArray(this.config.requireOneOf) ? this.config.requireOneOf : []
			return names.length === 0 || names.some((name) => isFilled(this.sentValues[name]))
		},
	},

	watch: {
		record: {
			handler() {
				this.startValues()
			},

			immediate: true,
		},
	},

	async mounted() {
		await Promise.all([this.loadRecord(), this.loadChecklist(), this.loadPermission(), ...this.fields.map((field) => this.loadOptions(field, ''))])
	},

	beforeUnmount() {
		clearTimeout(this.searchTimer)
		clearTimeout(this.optionsTimer)
	},

	methods: {
		/**
		 * Whether a field's label sits above its control with "(optional)" after
		 * it: a select or a text field the action does not require.
		 *
		 * @spec openspec/changes/action-dialog-optional-fields/specs/action-dialog/spec.md#requirement-an-optional-field-says-so-beside-its-label
		 * @param {object} field The field.
		 * @return {boolean}
		 */
		labelsOutside(field) {
			return field.required === false && !['checkbox', 'search', 'secret', 'checks', 'cards'].includes(field.type)
		},

		/**
		 * The id of a field's control, which its outside label points at.
		 *
		 * @param {object} field The field.
		 * @return {string}
		 */
		controlId(field) {
			return `${this.fieldIdPrefix}-${field.field}`
		},

		t,

		/**
		 * A config text through the host translate, '' for anything else.
		 *
		 * @param {unknown} value The text.
		 * @return {string}
		 */
		/**
		 * Search a search field's records once typing rests.
		 *
		 * @param {object} field The field.
		 * @param {string} typed What the reader typed.
		 * @return {void}
		 * @spec openspec/changes/action-dialog-search-field/specs/action-dialog-search-field/spec.md#requirement-an-action-dialog-field-can-search-records
		 */
		onSearch(field, typed) {
			clearTimeout(this.searchTimer)
			this.searchTimer = setTimeout(() => this.searchRecords(field, String(typed || '').trim()), SEARCH_DELAY)
		},

		/**
		 * Read the records of a search field's `source` that match the term.
		 *
		 * @param {object} field The field.
		 * @param {string} term The term.
		 * @return {Promise<void>}
		 */
		async searchRecords(field, term) {
			const source = field.source || {}
			if (!term || !source.register || !source.schema) {
				this.searchOptions = { ...this.searchOptions, [field.field]: [] }
				return
			}
			this.searching = field.field
			try {
				const url = generateUrl(`/apps/openregister/api/objects/${encodeURIComponent(source.register)}/${encodeURIComponent(source.schema)}`)
				const { data } = await axios.get(url, { params: { _search: term, _limit: 10 } })
				const rows = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : [])
				const self = String(this.recordId || '')
				const options = rows
					.map((row) => ({ row, id: String(row.id || (row['@self'] && row['@self'].id) || '') }))
					.filter(({ id }) => id !== '' && !(field.excludeSelf && id === self))
					.map(({ row, id }) => {
						const option = { id, label: this.fill(field.optionLabel || '{title}', row) || id }
						const secondary = this.fill(field.optionSecondary, row)
						return secondary ? { ...option, secondary } : option
					})
				this.searchOptions = { ...this.searchOptions, [field.field]: options }
			} catch {
				this.searchOptions = { ...this.searchOptions, [field.field]: [] }
			} finally {
				this.searching = ''
			}
		},

		/**
		 * The items of a checks field, from `options` or the record's `itemsPath`.
		 *
		 * @spec openspec/changes/action-dialog-checks-cards/specs/action-dialog-checks-cards/spec.md#requirement-a-field-ticks-several-items
		 * @param {object} field The field.
		 * @return {Array<{value: string, label: string, secondary: string}>}
		 */
		checkItems(field) {
			const listed = field.optionsSource ? this.remoteOptions[field.field] : (Array.isArray(field.options) ? field.options : readPath(this.record || {}, field.itemsPath || ''))
			return (Array.isArray(listed) ? listed : []).map((item) => {
				if (item === null || typeof item !== 'object') {
					return { value: String(item), label: String(item), secondary: '' }
				}
				return {
					value: String(readPath(item, field.optionValue || 'value') ?? item.id ?? ''),
					label: firstFilled(field.optionLabel || ['{label}', '{name}', '{title}'], item),
					secondary: field.optionSecondary ? fillTemplate(field.optionSecondary, item) : '',
				}
			}).filter((item) => item.value !== '')
		},

		/**
		 * The ticked values of a checks field: what the reader ticked, else its
		 * `default`, a list or "all".
		 *
		 * @spec openspec/changes/action-dialog-checks-cards/specs/action-dialog-checks-cards/spec.md#requirement-a-field-ticks-several-items
		 * @param {object} field The field.
		 * @return {Array<string>}
		 */
		checksValue(field) {
			if (Array.isArray(this.values[field.field])) {
				return this.values[field.field]
			}
			if (field.default === 'all') {
				return this.checkItems(field).map((item) => item.value)
			}
			return Array.isArray(field.default) ? field.default.map(String) : []
		},

		/**
		 * Tick or untick one item of a checks field.
		 *
		 * @param {object} field The field.
		 * @param {string} value The item's value.
		 * @param {boolean} on Ticked.
		 * @return {void}
		 */
		setCheck(field, value, on) {
			const others = this.checksValue(field).filter((held) => held !== value)
			this.values = { ...this.values, [field.field]: on ? [...others, value] : others }
		},

		/**
		 * The options of a cards field, through the host translate.
		 *
		 * @spec openspec/changes/action-dialog-checks-cards/specs/action-dialog-checks-cards/spec.md#requirement-a-field-offers-one-choice-as-cards
		 * @param {object} field The field.
		 * @return {Array<object>}
		 */
		cardOptions(field) {
			return (Array.isArray(field.options) ? field.options : []).map((option) => ({
				...option,
				label: this.text(option.label) || String(option.value),
				description: this.text(option.description),
			}))
		},

		/**
		 * The value of a cards field: what the reader chose, else its `default`.
		 *
		 * @param {object} field The field.
		 * @return {string}
		 */
		cardsValue(field) {
			return this.values[field.field] ?? field.default ?? ''
		},

		/**
		 * A checkbox field's state: what was ticked, else its `default`.
		 *
		 * @param {object} field The field.
		 * @return {boolean}
		 * @spec openspec/changes/action-dialog-checkbox-field/specs/action-dialog-checkbox-field/spec.md#requirement-an-action-dialog-field-can-be-a-checkbox
		 */
		checkboxValue(field) {
			return field.field in this.values ? this.values[field.field] === true : field.default === true
		},

		/**
		 * Tick or untick a checkbox field.
		 *
		 * @param {string} name The field.
		 * @param {boolean} on Ticked.
		 * @return {void}
		 */
		setChecked(name, on) {
			this.values = { ...this.values, [name]: on === true }
		},

		text(value) {
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : ''
		},

		/**
		 * A template filled from a row (the record by default), translated first.
		 *
		 * @param {unknown} template The template.
		 * @param {object} [row] The row.
		 * @return {string}
		 */
		fill(template, row) {
			if (typeof template !== 'string' || template === '') {
				return ''
			}
			const formatters = { ...BUILT_IN_FORMATTERS, ...(this.cnFormatters || {}) }
			return fillTemplate(this.cnTranslate(template), row || this.record || {}, new Date(), { formatters }).trim()
		},

		/**
		 * Read an endpoint, fresh.
		 *
		 * @param {object} source An endpointSource block.
		 * @return {Promise<unknown>}
		 */
		read(source) {
			return fetchEndpointSource(source, this.tokenCtx, { fresh: true })
		},

		/** @return {Promise<void>} */
		async loadRecord() {
			const source = this.config.source || (this.config.summary && this.config.summary.source)
			if (!source || !source.url) {
				return
			}
			try {
				const data = await this.read(source)
				this.record = data && typeof data === 'object' ? data : this.record
			} catch {
				// The summary stays empty; the checklist and the action still work.
			}
		},

		/** @return {Promise<void>} */
		async loadChecklist() {
			const def = this.config.checklist
			if (!def || !def.source || !def.source.url) {
				return
			}
			try {
				const data = await this.read(def.source)
				const list = def.itemsPath ? readPath(data, def.itemsPath) : data
				this.items = Array.isArray(list) ? list.filter((item) => item && item.id !== undefined) : []
			} catch {
				this.items = []
				this.checklistError = t('nextcloud-vue', 'Whether this is ready could not be read.')
			}
		},

		/**
		 * The entry of a list whose fields equal `match`, or null.
		 *
		 * @param {unknown} list The list.
		 * @param {object} [match] The fields to match.
		 * @return {object|null}
		 */
		matchIn(list, match) {
			const wanted = Object.entries(match || {})
			return (Array.isArray(list) ? list : []).find((entry) => entry && wanted.every(([key, value]) => String(entry[key]) === String(value))) || null
		},

		/**
		 * A select field's options, labels translated.
		 *
		 * @param {object} field The field.
		 * @return {Array<{id: string, label: string, fills?: object}>}
		 */
		optionsOf(field) {
			if (field.optionsSource) {
				return this.remoteOptionsOf(field)
			}
			return (Array.isArray(field.options) ? field.options : []).map((o) => ({ id: String(o.value), label: this.text(o.label) || String(o.value), fills: o.fills }))
		},

		/**
		 * A select field's options read from its `optionsSource`: each entry's
		 * `optionValue` (default `id`) and the first `optionLabel` that fills.
		 *
		 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-field-reads-its-options-from-an-endpoint
		 * @param {object} field The field.
		 * @return {Array<{id: string, label: string}>}
		 */
		remoteOptionsOf(field) {
			const labels = field.optionLabel || ['{label}', '{name}', '{title}']
			return (this.remoteOptions[field.field] || [])
				.map((row) => ({ id: String(readPath(row, field.optionValue || 'id') ?? ''), row }))
				.filter((option) => option.id !== '')
				.map(({ id, row }) => ({ id, label: firstFilled(labels, row, this.cnTranslate) || id }))
		},

		/**
		 * Whether a field's `visibleWhen` holds, and the field it reads (if any)
		 * shows too, so hiding one field hides the fields that depend on it.
		 *
		 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-field-shows-only-when-another-value-says-so
		 * @param {object} field The field.
		 * @param {number} depth How many fields deep the check is, to stop a loop.
		 * @return {boolean}
		 */
		fieldShown(field, depth) {
			if (!isShown(field, this.shownState)) {
				return false
			}
			const parent = this.parentOf(field)
			return !parent || (depth < 8 && this.fieldShown(parent, depth + 1))
		},

		/**
		 * The field another field's `visibleWhen` reads, or null.
		 *
		 * @param {object} field The field.
		 * @return {object|null}
		 */
		parentOf(field) {
			const name = field.visibleWhen && field.visibleWhen.field
			return typeof name === 'string' ? (this.fields.find((other) => other.field === name) || null) : null
		},

		/**
		 * A field's value by key: a checkbox as a boolean, a checks field as a
		 * list (one per column with `columns`), the others as entered.
		 *
		 * @param {object} field The field.
		 * @return {object}
		 */
		heldValues(field) {
			if (this.hasColumns(field)) {
				return Object.fromEntries(field.columns.map((column) => [column.field, this.columnValue(column)]))
			}
			const read = { checks: this.checksValue, cards: this.cardsValue, checkbox: this.checkboxValue }[field.type] || this.plainValue
			return { [field.field]: read(field) }
		},

		/**
		 * Whether a shown field holds what it needs: a checkbox is ticked when
		 * `required: true`; any other field has a value unless `required: false`
		 * or a secret is stored.
		 *
		 * @spec openspec/changes/action-dialog-fields-and-acts/specs/action-dialog/spec.md#requirement-an-action-dialog-asks-for-fields-and-reads-a-permission-from-a-list
		 * @param {object} field The field.
		 * @return {boolean}
		 */
		fieldFilled(field) {
			if (field.type === 'checkbox') {
				return field.required !== true || this.checkboxValue(field)
			}
			if (field.required === false || this.secretStored(field)) {
				return true
			}
			const held = Object.values(this.heldValues(field))
			return this.hasColumns(field) ? held.some(isFilled) : isFilled(held[0])
		},

		/**
		 * A select or text field's value: what was entered, else its `default`.
		 *
		 * @param {object} field The field.
		 * @return {string}
		 */
		plainValue(field) {
			if (field.field in this.values) {
				return this.values[field.field] ?? ''
			}
			return field.type === 'select' && field.default !== undefined ? String(field.default) : ''
		},

		/**
		 * Whether a select field reads its options again as the reader types.
		 *
		 * @param {object} field The field.
		 * @return {boolean}
		 */
		searchesRemotely(field) {
			return Boolean(field.optionsSource && field.optionsSource.search === true)
		},

		/**
		 * Read a searching select field's options again once typing rests.
		 *
		 * @param {object} field The field.
		 * @param {string} typed What the reader typed.
		 * @return {void}
		 */
		onOptionsSearch(field, typed) {
			if (!this.searchesRemotely(field)) {
				return
			}
			clearTimeout(this.optionsTimer)
			this.optionsTimer = setTimeout(() => this.loadOptions(field, String(typed || '').trim()), SEARCH_DELAY)
		},

		/**
		 * Read a field's `optionsSource`, keep the entries `match` allows, and
		 * say so when the read fails rather than offer an empty list.
		 *
		 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-field-reads-its-options-from-an-endpoint
		 * @param {object} field The field.
		 * @param {string} term What the reader typed, or ''.
		 * @return {Promise<void>}
		 */
		async loadOptions(field, term) {
			const source = field.optionsSource
			if (!source || !source.url) {
				return
			}
			this.loadingOptions = field.field
			try {
				const rows = matchingRows(await this.read(optionsRead(source, term)), source.match)
				this.remoteOptions = { ...this.remoteOptions, [field.field]: rows }
				this.optionsErrors = { ...this.optionsErrors, [field.field]: '' }
			} catch {
				this.optionsErrors = { ...this.optionsErrors, [field.field]: this.text(source.errorText) || t('nextcloud-vue', 'The options could not be read.') }
			} finally {
				this.loadingOptions = ''
			}
		},

		/**
		 * Whether a checks field ticks per column.
		 *
		 * @param {object} field The field.
		 * @return {boolean}
		 */
		hasColumns(field) {
			return field.type === 'checks' && Array.isArray(field.columns) && field.columns.length > 0
		},

		/**
		 * The values ticked in one column of a checks field; nothing is ticked
		 * at the start.
		 *
		 * @param {{field: string}} column The column.
		 * @return {Array<string>}
		 */
		columnValue(column) {
			return Array.isArray(this.values[column.field]) ? this.values[column.field] : []
		},

		/**
		 * The items of an `exclusive` checks field ticked in more than one column.
		 *
		 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-checks-field-can-tick-in-columns-that-exclude-each-other
		 * @param {object} field The field.
		 * @return {Array<string>}
		 */
		conflicts(field) {
			return this.hasColumns(field) && field.exclusive === true ? tickedTwice(field.columns, this.values) : []
		},

		/**
		 * What one shown field sends, by key.
		 *
		 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-ticked-can-mean-left-out
		 * @param {object} field The field.
		 * @return {object}
		 */
		sentOf(field) {
			if (this.hasColumns(field)) {
				return this.heldValues(field)
			}
			if (field.type === 'secret' && String(this.values[field.field] ?? '') === '') {
				return {}
			}
			const value = field.type === 'checks'
				? checksSent(field, { ticked: this.checksValue(field), items: this.checkItems(field) })
				: this.fieldValues[field.field]
			return { [field.sendAs || field.field]: value }
		},

		/**
		 * A select field's chosen option.
		 *
		 * @param {object} field The field.
		 * @return {object|null}
		 */
		selectedOption(field) {
			return this.optionsOf(field).find((o) => o.id === String(this.plainValue(field))) || null
		},

		/**
		 * Set a field's value.
		 *
		 * @param {string} name The field.
		 * @param {unknown} value The value.
		 */
		setValue(name, value) {
			this.values = { ...this.values, [name]: value === null || value === undefined ? '' : String(value) }
		},

		/**
		 * Choose a select option; its `fills` set the fields still empty.
		 *
		 * @param {object} field The select field.
		 * @param {{id: string, fills?: object}|null} option The option.
		 */
		pick(field, option) {
			this.setValue(field.field, option ? option.id : '')
			for (const [name, value] of Object.entries((option && option.fills) || {})) {
				if (String(this.values[name] ?? '').trim() === '') {
					this.setValue(name, this.text(value) || value)
				}
			}
		},

		/** @return {Promise<void>} */
		async loadPermission() {
			const def = this.config.permission
			if (!def || !def.source || !def.source.url) {
				return
			}
			try {
				const data = await this.read(def.source)
				const entry = def.listPath ? this.matchIn(readPath(data, def.listPath), def.match) : data
				this.allowed = readPath(entry, def.allowedPath || 'allowed') === true
				this.refusal = this.allowed || !def.reasonPath ? '' : String(readPath(entry, def.reasonPath) || '')
			} catch {
				this.allowed = false
			}
		},

		/**
		 * Run the action once: post `confirm.request`, or dispatch
		 * `confirm.action`, then show the done text and refresh the page.
		 *
		 * @spec openspec/changes/action-dialog/specs/action-dialog/spec.md#requirement-a-manifest-configures-an-action-dialog
		 * @return {Promise<void>}
		 */
		async confirm() {
			if (!this.canConfirm) {
				return
			}
			this.busy = true
			this.refusal = ''
			try {
				await this.runAct(this.reason.trim())
				this.finish()
			} catch (failure) {
				this.refusal = this.refusalOf(failure)
			} finally {
				this.busy = false
			}
		},

		/**
		 * After the act: refresh the page, report `done`, and show the done
		 * text, or with `closeOnDone` say it as a toast and close.
		 *
		 * @spec openspec/changes/action-dialog-share-look-and-outcome/specs/action-dialog/spec.md#requirement-the-dialog-can-close-once-the-act-ran
		 * @return {void}
		 */
		finish() {
			const closing = this.config.closeOnDone === true
			this.done = !closing
			emit(PAGE_REFRESH, {})
			/** @event done The action ran. Payload: the sent field values and `reason`. */
			this.$emit('done', { ...this.sentValues, reason: this.reason.trim() })
			if (closing) {
				showSuccess(this.doneMessage)
				this.$emit('close')
			}
		},

		/**
		 * A failed act in words: the server's message, else the configured
		 * `errorText`, else the library's sentence.
		 *
		 * @param {unknown} failure The error axios threw.
		 * @return {string}
		 */
		refusalOf(failure) {
			const data = failure && failure.response && failure.response.data
			const said = data && (data.message || data.error)
			return String(said || this.text(this.request?.errorText || this.confirmConfig.errorText) || t('nextcloud-vue', 'The action could not be completed.'))
		},

		/**
		 * What a body or done text template reads: the sent values under
		 * `fields`, the record, the reason, the chosen entries under `chosen`
		 * and the record's id as `objectId`.
		 *
		 * @param {string} reason The reason given.
		 * @return {object}
		 */
		templateContext(reason) {
			return { fields: this.sentValues, ...(this.record || {}), reason, chosen: this.chosenRows, objectId: this.recordId }
		},

		/**
		 * Post the chosen act's request, or dispatch `confirm.action`.
		 *
		 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-each-act-posts-to-its-own-endpoint
		 * @param {string} reason The reason given.
		 * @return {Promise<void>}
		 */
		async runAct(reason) {
			const request = this.request
			if (request && request.url) {
				await this.post(request, reason)
			} else if (this.confirmConfig.action && typeof this.cnDispatchAction === 'function') {
				await this.cnDispatchAction({ ...this.confirmConfig.action, args: [...(this.confirmConfig.action.args || []), { ...this.sentValues, reason }] })
			}
		},

		/**
		 * Send one request and keep the text at its `answerPath`.
		 *
		 * @param {object} request The request.
		 * @param {string} reason The reason given.
		 * @return {Promise<void>}
		 */
		async post(request, reason) {
			const url = interpolateUrlTokens(request.url, this.tokenCtx)
			const method = String(request.method || 'POST').toLowerCase()
			const send = axios[['post', 'put', 'patch', 'delete'].includes(method) ? method : 'post']
			const answer = await send(/^https?:\/\//i.test(url) ? url : generateUrl(url), this.requestBody(request, reason))
			if (request.answerPath) {
				const said = readPath(answer?.data, request.answerPath)
				this.answerText = said === null || said === undefined ? '' : String(said)
			}
		},

		/**
		 * A request's body: its `body` templates filled from the record, the
		 * reason and `fields`, then the reason and the sent field values unless
		 * `fieldsInBody` is false.
		 *
		 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-each-act-posts-to-its-own-endpoint
		 * @param {object} request The request.
		 * @param {string} reason The reason given.
		 * @return {object}
		 */
		requestBody(request, reason) {
			const filler = { context: this.templateContext(reason), fill: (value, context) => fillTemplate(value, context) }
			const body = {}
			for (const [key, value] of Object.entries(request.body || {})) {
				body[key] = bodyValue(value, filler)
			}
			if (request.fieldsInBody === false) {
				return body
			}
			if (this.config.reason) {
				body[this.config.reason.field || 'reason'] = reason
			}
			return Object.assign(body, this.sentValues)
		},

		/**
		 * Start each field with `valuePath` from the record, unless it was
		 * already edited.
		 *
		 * @spec openspec/changes/action-dialog-secret-field/specs/action-dialog/spec.md#requirement-a-field-can-start-from-the-record-and-a-secret-is-write-only
		 * @return {void}
		 */
		startValues() {
			if (!this.record) {
				return
			}
			const values = { ...this.values }
			for (const field of this.fields) {
				if (field.valuePath && !['secret', 'checks'].includes(field.type) && !(field.field in values)) {
					const value = readPath(this.record, field.valuePath)
					if (value !== null && value !== undefined) {
						values[field.field] = String(value)
					}
				}
			}
			this.values = values
		},

		/**
		 * Whether a secret field has a value stored: `storedPath` reads true on the record.
		 *
		 * @param {object} field The field.
		 * @return {boolean}
		 */
		secretStored(field) {
			return field.type === 'secret' && Boolean(field.storedPath && this.record && readPath(this.record, field.storedPath))
		},

		/** Close the dialog, unless the action is running. */
		close() {
			if (this.busy) {
				return
			}
			/** @event close The dialog was closed. */
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
/* The parts stand 18px apart, as the board draws the dialog (DqArchiveren). */
.cn-action-dialog {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.cn-action-dialog__summary {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 14px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 10px);
}

/* The record's icon on a tinted tile (DqArchiveren). */
.cn-action-dialog__summary-icon {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 8px;
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
}

.cn-action-dialog__summary-text strong {
	font-size: 15px;
	font-weight: 600;
	line-height: 1.2;
}

.cn-action-dialog__summary-text .cn-action-dialog__muted {
	font-size: 13px;
}

.cn-action-dialog__summary-text {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-width: 0;
}

.cn-action-dialog__badge {
	padding: 3px 10px;
	border-radius: 12px;
	font-size: 13px;
	font-weight: 600;
	line-height: normal;
	white-space: nowrap;
}

/* Without a tone (`badgeVariant`, `badgeColorMap`) the badge is neutral. */
.cn-action-dialog__badge:not([class*='cn-status-badge--']) {
	background: var(--color-background-dark);
}

.cn-action-dialog__title {
	margin: 0 0 8px;
	font-size: 14px;
	font-weight: 600;
	line-height: normal;
}

/* Facts in columns of at least 200px, each a label over its value above a
   hairline, both on the font's normal line (DqArchiveren "Bewaring volgens
   het zaaktype", rows 59px). */
.cn-action-dialog__facts {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 12px 24px;
	margin: 0;
	/* The server pads every dl 12px. */
	padding: 0;
}

.cn-action-dialog__fact {
	display: flex;
	flex-direction: column;
	gap: 3px;
	padding-bottom: 10px;
	border-bottom: 1px solid var(--color-border);
}

/* The server draws every dt as a 130px right-aligned inline block and pads
   dt and dd 12px; a fact is a label over its value. */
.cn-action-dialog__facts dt,
.cn-action-dialog__facts dd {
	display: block;
	width: auto;
	white-space: normal;
	text-align: start;
}

.cn-action-dialog__facts dt {
	margin: 0;
	padding: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	line-height: normal;
}

.cn-action-dialog__facts dd {
	margin: 0;
	padding: 0;
	font-size: 15px;
	font-weight: 500;
	line-height: normal;
}

/* Checklist rows divided by hairlines, the detail at the row's end
   (DqArchiveren "Klaar om te archiveren"). */
.cn-action-dialog__checks {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-action-dialog__check {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 2px 12px;
	padding: 10px 0;
	border-top: 1px solid var(--color-border);
	font-size: 15px;
}

.cn-action-dialog__check-label {
	flex: 1 1 auto;
	font-weight: 600;
}

.cn-action-dialog__check-icon {
	color: var(--color-text-maxcontrast);
}

.cn-action-dialog__check-icon--met {
	color: var(--color-success-text, var(--color-success));
}

.cn-action-dialog__muted {
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}

/* A checkbox field is a tinted box with a 2px edge, its label bold and its
   hint under it (DqArchiveren). */
/* A note's own icon stands on the heading's line, as the variant's icon
   does (NcNoteCard centres a slotted icon on the whole note). */
.cn-action-dialog__note-icon {
	align-self: flex-start;
	margin-top: 1px;
}

/* Two classes: the switch root's own `padding: 0` weighs the same and is
   injected again by every bundle that ships NcCheckboxRadioSwitch. */
.cn-action-dialog__checkbox.checkbox-radio-switch {
	padding: 12px 14px;
}

.cn-action-dialog__checkbox {
	border: 2px solid var(--color-primary-element);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-main-background);
}

/* The box sits at the card's inset, 12px before the label, the label on
   its first line (DqArchiveren "Sanne de Vries laten weten ..."):
   NcCheckboxRadioSwitch pads its row and centres a 34px target. */
.cn-action-dialog__checkbox :deep(.checkbox-content) {
	padding: 0;
	gap: 12px;
	align-items: flex-start;
	min-height: 0;
}

.cn-action-dialog__checkbox :deep(.checkbox-content__icon) {
	margin: 0;
}

.cn-action-dialog__checkbox :deep(.checkbox-radio-switch__input) {
	min-height: 0;
}

.cn-action-dialog__checkbox-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-action-dialog__checkbox-label {
	font-size: 15px;
	font-weight: 600;
	line-height: 1.2;
}

.cn-action-dialog__checkbox .cn-action-dialog__muted {
	font-size: 13px;
}

/* A plain checkbox: the box and its label on one line, no tinted card
   (DqZaakSamenwerken "Alleen een deel van de zaakvelden delen"). */
.cn-action-dialog__checkbox--plain.checkbox-radio-switch {
	padding: 0;
}

.cn-action-dialog__checkbox--plain {
	border: 0;
	background: transparent;
}

.cn-action-dialog__checkbox--plain :deep(.checkbox-content) {
	gap: 10px;
	align-items: center;
}

.cn-action-dialog__checkbox--plain .cn-action-dialog__checkbox-label {
	font-size: 14px;
}

.cn-action-dialog__check-field {
	border: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin: 0;
	padding: 0;
}

.cn-action-dialog__checks-legend {
	font-weight: 600;
	margin-bottom: 4px;
	padding: 0;
}

.cn-action-dialog__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

/* The reason's help line is 13px on the normal line, right under the text
   area: the inline text area left a descender gap and NcTextArea's 2px
   ring room came on top (DqArchiveren "Komt in de historie ..."). */
.cn-action-dialog__hint {
	font-size: 13px;
	line-height: normal;
}

.cn-action-dialog__reason :deep(.textarea__input) {
	vertical-align: top;
}

.cn-action-dialog__reason :deep(.textarea) {
	margin-block-end: -2px;
}

.cn-action-dialog__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}
</style>
