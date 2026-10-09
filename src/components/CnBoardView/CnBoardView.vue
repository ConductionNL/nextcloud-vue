<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-board-view"
		:class="{ 'cn-board-view--board': isBoardLook }"
		data-testid="cn-board-view">
		<p v-if="!usable" class="cn-board-view__unusable" data-testid="cn-board-unusable">
			{{ unusableText }}
		</p>

		<div
			v-for="lane in lanes"
			v-else
			:key="`lane-${lane.key}`"
			class="cn-board-view__lane"
			data-testid="cn-board-lane"
			:data-lane="lane.key">
			<button
				v-if="lane.key !== ''"
				class="cn-board-view__lane-header"
				data-testid="cn-board-lane-header"
				:aria-expanded="String(!isCollapsed(lane.key))"
				@click="toggleLane(lane.key)">
				{{ lane.label }} ({{ lane.count }})
			</button>

			<div
				v-show="!isCollapsed(lane.key)"
				class="cn-board-view__columns"
				role="list"
				:aria-label="lane.key === '' ? boardLabel : lane.label">
				<section
					v-for="column in lane.columns"
					:key="`col-${lane.key}-${column.key}`"
					class="cn-board-view__column"
					role="listitem"
					data-testid="cn-board-column"
					:data-column="column.key"
					@dragover.prevent
					@drop="onDrop(column, $event)">
					<!-- Board look: a dot, the label and a white count badge, with an
					     optional sum line under it (screens-kanban-parity). -->
					<div v-if="isBoardLook" class="cn-board-view__column-head">
						<h2 class="cn-board-view__column-header cn-board-view__column-header--board">
							<span
								class="cn-board-view__dot"
								data-testid="cn-board-dot"
								:style="{ background: dotColor(column) }"
								aria-hidden="true" />
							<span class="cn-board-view__column-title">{{ column.label }}</span>
							<span class="cn-board-view__badge" data-testid="cn-board-count">
								{{ column.count }}<span v-if="paged" class="hidden-visually"> {{ t('nextcloud-vue', 'on this page') }}</span>
							</span>
						</h2>
						<span
							v-if="columnSum(column) !== ''"
							class="cn-board-view__sum"
							data-testid="cn-board-sum">
							{{ columnSum(column) }}
						</span>
					</div>
					<h3 v-else class="cn-board-view__column-header">
						{{ column.label }}
						<span class="cn-board-view__count" data-testid="cn-board-count">
							{{ countLabel(column) }}
						</span>
					</h3>

					<!--
						A list of its own, so a reader is told how many cards
						this column holds. The column is a listitem of the
						board's list of columns; the cards are a list inside
						it, not more items of that same list.
					-->
					<div
						v-if="column.cards.length > 0"
						class="cn-board-view__cards"
						role="list"
						:aria-label="column.label">
						<!--
							The card is a CONTAINER, and every action on it is
							its own control. It carries the drag and nothing
							else: no tabindex, no click, no key handler, and
							never role="button".

							🔴 role="button" HERE WOULD BREAK THE MOVE. An
							element with that role has presentational children,
							so the <select> below would be an interactive
							control inside a button. That is invalid, and it
							takes away the only way a keyboard user can move a
							card. It would also collapse every field on the
							card into one button label. See
							openspec/changes/board-card-role-and-keyboard.

							Measured rather than argued: putting role="button"
							here makes axe report nested-interactive (serious,
							"Interactive controls must not be nested") and
							aria-required-children (critical), and four tests
							in tests/a11y/CnBoardView.a11y.spec.js go red.
							Gate 32 suggests exactly this change. The gate is a
							mechanical floor, not the standard.
						-->
						<article
							v-for="card in visibleCards(lane, column)"
							:key="`card-${cardKey(card)}`"
							class="cn-board-view__card"
							:class="[
								cardDueState(card) ? `cn-board-view__card--${cardDueState(card)}` : null,
								{ 'cn-board-view__card--board': isBoardLook },
							]"
							role="listitem"
							data-testid="cn-board-card"
							:data-card-id="cardKey(card)"
							:draggable="canMove"
							@dragstart="onDragStart(card, column, $event)"
							@keydown="onCardKeydown(card, column, lane, $event)">
							<!-- Board look: title link, sub line, pill, footer, and a
							     menu button instead of the Move to select. -->
							<template v-if="isBoardLook">
								<div class="cn-board-view__card-head">
									<a
										href="#"
										class="cn-board-view__card-title"
										data-testid="cn-board-card-open"
										:data-card-id="cardKey(card)"
										:aria-label="cardLabel(card, column)"
										@click.prevent="openCard(card, $event)"
										@mousedown="preventMiddleClickAutoscroll"
										@auxclick="onCardAuxClick(card, $event)">
										{{ roleText(card, roles.title) || cardKey(card) }}
									</a>
									<span class="cn-board-view__menu-wrap">
										<button
											type="button"
											class="cn-board-view__menu-button"
											data-testid="cn-board-card-menu"
											:data-card-id="cardKey(card)"
											aria-haspopup="menu"
											:aria-expanded="String(isMenuOpen(card))"
											:aria-label="menuButtonLabel(card)"
											@click="toggleMenu(card)">
											<span class="cn-board-view__menu-dots" aria-hidden="true">&#8943;</span>
										</button>
										<div
											v-if="isMenuOpen(card)"
											class="cn-board-view__menu"
											role="menu"
											data-testid="cn-board-card-menu-list"
											:aria-label="menuButtonLabel(card)"
											@keydown="onMenuKeydown(card, $event)">
											<div
												v-if="canMove"
												role="group"
												:aria-label="moveLabel">
												<span class="cn-board-view__menu-heading" aria-hidden="true">{{ moveLabel }}</span>
												<button
													v-for="target in moveTargets(lane, column)"
													:key="`m-${cardKey(card)}-${target.key}`"
													type="button"
													role="menuitem"
													class="cn-board-view__menu-item"
													data-testid="cn-board-menu-move"
													:data-target="target.key"
													@click="onMenuMove(card, column, target)">
													{{ target.label }}
												</button>
											</div>
											<button
												type="button"
												role="menuitem"
												class="cn-board-view__menu-item"
												data-testid="cn-board-menu-new-tab"
												@click="onMenuOpenNewTab(card)">
												{{ openInNewTabLabel }}
											</button>
										</div>
									</span>
								</div>
								<span
									v-if="roleText(card, roles.sub) !== ''"
									class="cn-board-view__card-sub"
									data-testid="cn-board-card-sub">
									{{ roleText(card, roles.sub) }}
								</span>
								<span
									v-if="roleText(card, roles.pill) !== ''"
									class="cn-board-view__card-pills">
									<CnStatusBadge
										class="cn-board-view__pill"
										data-testid="cn-board-card-pill"
										:label="roleText(card, roles.pill)"
										:variant="pillVariant(card)" />
								</span>
								<span
									v-if="dueText(card) !== '' || ownerName(card) !== ''"
									class="cn-board-view__card-footer"
									data-testid="cn-board-card-footer">
									<span
										class="cn-board-view__due-text"
										:class="cardDueState(card) ? `cn-board-view__due-text--${cardDueState(card)}` : null"
										data-testid="cn-board-card-due">
										{{ dueText(card) }}
									</span>
									<span
										v-if="ownerName(card) !== ''"
										class="cn-board-view__avatar"
										data-testid="cn-board-card-owner"
										:title="ownerName(card)"
										role="img"
										:aria-label="ownerName(card)">
										<span aria-hidden="true">{{ ownerInitials(card) }}</span>
									</span>
								</span>
							</template>
							<template v-else>
								<span
									v-if="dueLabel(card)"
									class="cn-board-view__due"
									:class="`cn-board-view__due--${dueState(card)}`"
									data-testid="cn-board-due">
									{{ dueLabel(card) }}
								</span>
								<span
									v-for="field in cardFields"
									:key="`f-${cardKey(card)}-${field}`"
									class="cn-board-view__card-field">
									{{ card[field] }}
								</span>

								<!--
								Opening the card. A native button, so Enter and
								Space both work: the old markup handled Enter
								only, and Space is what most people try on
								something that looks like a button.
							-->
								<button
									type="button"
									class="cn-board-view__card-open"
									data-testid="cn-board-card-open"
									:data-card-id="cardKey(card)"
									:aria-label="cardLabel(card, column)"
									@click="openCard(card, $event)"
									@mousedown="preventMiddleClickAutoscroll"
									@auxclick="onCardAuxClick(card, $event)">
									{{ openLabel }}
								</button>

								<!--
								The keyboard's way to do what a drag does. A board
								whose only move is a drag is a board a keyboard
								user cannot use at all, and "drag the card" is not
								an instruction you can follow with a keyboard.
							-->
								<label v-if="canMove" class="cn-board-view__move">
									<span class="cn-board-view__move-label">{{ moveLabel }}</span>
									<select
										data-testid="cn-board-move"
										:data-card-id="cardKey(card)"
										:value="column.key"
										@change="onMoveTo(card, column, $event)">
										<option
											v-for="target in lane.columns"
											:key="`t-${cardKey(card)}-${target.key}`"
											:value="target.key">
											{{ target.label }}
										</option>
									</select>
								</label>
							</template>
						</article>
					</div>

					<p
						v-else
						class="cn-board-view__empty"
						data-testid="cn-board-column-empty">
						{{ emptyColumnText }}
					</p>

					<!-- A column cut by `columnLimit`: the rest behind one dashed
					     button. The badge keeps showing the column's total. -->
					<button
						v-if="hiddenCount(lane, column) > 0"
						type="button"
						class="cn-board-view__show-more"
						data-testid="cn-board-show-more"
						@click="showMore(lane, column)">
						{{ showMoreLabel(hiddenCount(lane, column)) }}
					</button>
				</section>
			</div>
		</div>

		<p
			v-if="refusal"
			class="cn-board-view__refusal"
			data-testid="cn-board-refusal"
			role="alert">
			{{ refusal }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { buildBoardColumns, resolveStageColor } from '../../utils/boardColumns.js'
import { buildSwimlanes } from '../../utils/boardSwimlanes.js'
import { DROP_OUTCOMES, runBoardDrop } from '../../utils/boardTransition.js'
import { daysUntil, dueStateForRow } from '../../utils/dueRule.js'
import { formatMetricValue } from '../../utils/formatMetric.js'
import { readPath } from '../../utils/readPath.js'
import { isRowMiddleClick, preventMiddleClickAutoscroll } from '../../utils/rowAuxClick.js'

import '../../css/board.css'

/**
 * CnBoardView — the index page's rows as a board, one column per stage.
 *
 * THE COLUMNS ARE THE SCHEMA'S, NOT THE DATA'S. `buildBoardColumns` decides
 * them and is tested on its own; this renders what it returns. A board that
 * built its columns from the values present would lose the stage nothing is
 * in, which is the one you drag a card into.
 *
 * 🔴 A MOVE GOES THROUGH THE HOST'S TRANSITION AND NEVER WRITES THE STATUS
 * FIELD. Writing it here would skip every guard, side effect and audit entry
 * the transition carries, and the board would become a way to move a case past
 * a rule the case page enforces. `runBoardDrop` owns that contract; this
 * component owns the gestures that reach it.
 *
 * 🔴 THERE ARE TWO GESTURES, ALWAYS. A board whose only move is a drag is a
 * board a keyboard user cannot use, and "drag the card" is not an instruction
 * anybody can follow with a keyboard. Move to on the card runs the identical
 * call.
 *
 * @event {object} card-click — A card was opened. Payload: the row.
 * @event {object} moved — A card moved. Payload: `{ card, toKey }`.
 * @event {object} refused — A move was refused. Payload: `{ card, message }`.
 * @event {object} stale — The card had already moved. Payload: `{ card }`.
 */
export default {
	name: 'CnBoardView',

	components: { CnStatusBadge },

	inject: {
		/**
		 * The look the app is drawn in, provided by CnAppRoot. The board look
		 * draws the screens' board anatomy (screens-kanban-parity).
		 */
		cnLook: { default: 'nextcloud' },
	},

	props: {
		/** The rows the list holds. */
		rows: {
			type: Array,
			default: () => [],
		},

		/** The status field's schema: its enum or its lifecycle states. */
		statusFieldSchema: {
			type: Object,
			default: null,
		},

		/** The property a row's status lives on. */
		statusField: {
			type: String,
			default: 'status',
		},

		/** The fields a card shows. */
		cardFields: {
			type: Array,
			default: () => [],
		},

		/** A second field to group the board into rows by. */
		swimlaneField: {
			type: String,
			default: '',
		},

		/** The row key, so a card is identifiable. */
		rowKey: {
			type: String,
			default: 'id',
		},

		/**
		 * The host's transition. Absent, the board is read-only: no drag, no
		 * Move to, because a gesture that cannot do anything is worse than no
		 * gesture at all.
		 */
		runTransition: {
			type: Function,
			default: null,
		},

		/** Re-read one card, to check it has not moved under the dragger. */
		reread: {
			type: Function,
			default: null,
		},

		/**
		 * Whether the counts are of one page. A count of a page shown as
		 * though it were the total is a number somebody quotes in a meeting.
		 */
		paged: {
			type: Boolean,
			default: false,
		},

		/**
		 * Marks late cards: `{ field, soonDays? }`. `field` is the dot-path to
		 * a card's due date. A date before today gets an error edge and the
		 * label "Overdue"; a date within `soonDays` (default 3) gets "Due
		 * soon" in the warning colour. `null` (the default) marks nothing.
		 *
		 * The same rule shape the table's date cell uses, so a list and its
		 * board agree on what late means.
		 *
		 * @type {{field: string, soonDays?: number}|null}
		 */
		dueRule: {
			type: Object,
			default: null,
		},

		/**
		 * The board look's card roles (manifest `config.board.card`):
		 * `{ title, sub, pill, due, owner, pillColors? }`. `sub` is a field or
		 * a list of fields joined by a middle dot; `pillColors` maps a pill
		 * value to a badge variant. Missing, the first of `cardFields` is the
		 * title and the rest form the sub line. The Nextcloud look ignores it.
		 *
		 * @type {{title?: string, sub?: string|Array<string>, pill?: string, due?: string, owner?: string, pillColors?: object}|null}
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-card-anatomy
		 */
		cardRoles: {
			type: Object,
			default: null,
		},

		/**
		 * The field on a column's state that holds its dot colour (manifest
		 * `config.board.colorField`). Empty, the lifecycle state's declared
		 * `color` is used, else the secondary text colour.
		 *
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-column-header
		 */
		colorField: {
			type: String,
			default: '',
		},

		/**
		 * A numeric field whose sum each column shows under its heading
		 * (manifest `config.board.sumField`). Empty shows no sum line.
		 *
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-column-header
		 */
		sumField: {
			type: String,
			default: '',
		},

		/**
		 * How the sum is formatted, the metric format shape:
		 * `{ style: 'currency', currency: 'EUR', decimals: 2 }`.
		 *
		 * @type {{style?: string, currency?: string, decimals?: number}|null}
		 */
		sumFormat: {
			type: Object,
			default: null,
		},

		/**
		 * How many cards a column draws before a "Show N more" button
		 * (manifest `config.board.columnLimit`). 0 (the default) draws every
		 * card.
		 *
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-a-long-column-is-cut-with-a-show-more-button
		 */
		columnLimit: {
			type: Number,
			default: 0,
		},
	},

	emits: ['card-click', 'card-aux-click', 'moved', 'refused', 'stale', 'load-more'],

	data() {
		return {
			/** Lanes the reader has collapsed, for as long as they are here. */
			collapsed: [],
			/** The guard's own words, when it refused the last move. */
			refusal: '',
			/** The card being dragged, and where from. */
			dragging: null,
			/** The day late marking measures from. */
			today: new Date(),
			/** Columns the reader has expanded past `columnLimit` (lane::column). */
			expanded: [],
			/** The card whose menu is open (board look), by card key. */
			openMenuKey: null,
		}
	},

	computed: {
		/** @return {boolean} Whether the status field can back a board at all. */
		usable() {
			return this.board.usable
		},

		/** @return {object} The columns, from the schema. */
		board() {
			return buildBoardColumns({
				field: this.statusFieldSchema,
				rows: this.rows,
				statusField: this.statusField,
				offBoardLabel: t('nextcloud-vue', 'Elsewhere'),
				colorField: this.colorField,
			})
		},

		/** @return {boolean} Whether the app takes the board look. */
		isBoardLook() {
			return normalizeLook(this.cnLook) === 'board'
		},

		/**
		 * The card's roles: `cardRoles`, else the first of `cardFields` as the
		 * title and the rest as the sub line.
		 *
		 * @return {{title: string, sub: Array<string>, pill: string, due: string, owner: string, pillColors: object}} The roles.
		 */
		roles() {
			const given = this.cardRoles && typeof this.cardRoles === 'object' ? this.cardRoles : null
			const fields = Array.isArray(this.cardFields) ? this.cardFields : []
			const sub = given && given.sub !== undefined
				? (Array.isArray(given.sub) ? given.sub : [given.sub])
				: (given ? [] : fields.slice(1))
			return {
				title: (given && given.title) || fields[0] || '',
				sub: sub.filter(Boolean),
				pill: (given && given.pill) || '',
				due: (given && given.due) || '',
				owner: (given && given.owner) || '',
				pillColors: (given && given.pillColors) || {},
			}
		},

		/** @return {string} The Open in new tab menu item. */
		openInNewTabLabel() {
			return t('nextcloud-vue', 'Open in new tab')
		},

		/** @return {Array<object>} The board as rows of columns. */
		lanes() {
			return buildSwimlanes({
				columns: this.board.columns,
				swimlaneField: this.swimlaneField,
				unassignedLabel: t('nextcloud-vue', 'Unassigned'),
			})
		},

		/** @return {boolean} Whether a move is possible at all. */
		canMove() {
			return typeof this.runTransition === 'function'
		},

		/** @return {string} What to say when the field cannot back a board. */
		unusableText() {
			return t('nextcloud-vue', 'This list has no status field with stages, so it cannot be shown as a board.')
		},

		/** @return {string} The board's accessible name. */
		boardLabel() {
			return t('nextcloud-vue', 'Board')
		},

		/** @return {string} The Move to control's label. */
		moveLabel() {
			return t('nextcloud-vue', 'Move to')
		},

		/**
		 * The visible text on a card's opening control.
		 *
		 * Short, because it repeats on every card. Which card it opens is
		 * said by the control's `aria-label`, so a reader hearing a list of
		 * buttons hears the card's own name rather than "Open" nine times.
		 *
		 * @return {string} The label.
		 */
		openLabel() {
			return t('nextcloud-vue', 'Open')
		},

		/** @return {string} What an empty column says. */
		emptyColumnText() {
			return t('nextcloud-vue', 'Nothing here')
		},
	},

	methods: {
		t,

		preventMiddleClickAutoscroll,

		/**
		 * A card's due state under `dueRule`.
		 *
		 * @param {object} card The card's row.
		 * @return {'overdue'|'soon'|'ok'|null} The state, or null when no rule applies.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-late-marking-on-board-cards
		 */
		dueState(card) {
			return dueStateForRow(card, this.dueRule, this.today)
		},

		/**
		 * The due state of a card: in the board look from the card's `due`
		 * role (under `dueRule` when given), else from `dueRule` as before.
		 *
		 * @param {object} card The card's row.
		 * @return {'overdue'|'soon'|'ok'|null} The state.
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-card-anatomy
		 */
		cardDueState(card) {
			if (this.isBoardLook && this.roles.due !== '') {
				const rule = { ...(this.dueRule || {}), field: this.roles.due }
				return dueStateForRow(card, rule, this.today)
			}
			return this.dueState(card)
		},

		/**
		 * The text of one role on a card: a field's value, or a list of
		 * fields joined by a middle dot. An empty value drops out together
		 * with its separator.
		 *
		 * @param {object} card The card's row.
		 * @param {string|Array<string>} role The field or fields.
		 * @return {string} The text, '' when every value is empty.
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-card-anatomy
		 */
		roleText(card, role) {
			const fields = Array.isArray(role) ? role : [role]
			return fields
				.filter((field) => typeof field === 'string' && field !== '')
				.map((field) => this.textOf(readPath(card, field)))
				.filter((value) => value !== '')
				.join(' \u00b7 ')
		},

		/**
		 * A value as text: a string or number as is, an object by its label.
		 *
		 * @param {unknown} value The raw value.
		 * @return {string} The text.
		 */
		textOf(value) {
			if (value === null || value === undefined) {
				return ''
			}
			if (typeof value === 'object') {
				const named = value.displayName ?? value.name ?? value.label ?? value.title ?? ''
				return String(named).trim()
			}
			return String(value).trim()
		},

		/**
		 * The pill's badge variant, from `cardRoles.pillColors`.
		 *
		 * @param {object} card The card's row.
		 * @return {string} A CnStatusBadge variant.
		 */
		pillVariant(card) {
			const raw = this.textOf(readPath(card, this.roles.pill))
			const variant = this.roles.pillColors[raw] ?? this.roles.pillColors[raw.toLowerCase()]
			return ['default', 'primary', 'success', 'warning', 'error', 'info'].includes(variant) ? variant : 'default'
		},

		/**
		 * The footer's due text: "Due today", "Due 2 Nov", or "Overdue 2 Nov"
		 * for a date in the past. Words, so the late tone is not colour alone.
		 *
		 * @param {object} card The card's row.
		 * @return {string} The text, '' without a readable date.
		 */
		dueText(card) {
			if (this.roles.due === '') {
				return ''
			}
			const value = readPath(card, this.roles.due)
			const days = daysUntil(value, this.today)
			if (days === null) {
				return ''
			}
			if (days === 0) {
				return t('nextcloud-vue', 'Due today')
			}
			const date = new Date(value)
			const shown = Number.isNaN(date.getTime())
				? String(value)
				: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
			return days < 0
				? t('nextcloud-vue', 'Overdue {date}', { date: shown })
				: t('nextcloud-vue', 'Due {date}', { date: shown })
		},

		/**
		 * The owner's name.
		 *
		 * @param {object} card The card's row.
		 * @return {string} The name, '' when there is none.
		 */
		ownerName(card) {
			return this.roles.owner === '' ? '' : this.textOf(readPath(card, this.roles.owner))
		},

		/**
		 * The owner's initials: the first letters of the first two words.
		 *
		 * @param {object} card The card's row.
		 * @return {string} Up to two capital letters.
		 */
		ownerInitials(card) {
			return this.ownerName(card)
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((word) => word.charAt(0).toUpperCase())
				.join('')
		},

		/**
		 * The colour of a column's dot.
		 *
		 * @param {object} column The column.
		 * @return {string} A CSS colour or variable.
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-column-header
		 */
		dotColor(column) {
			return resolveStageColor(column.color)
		},

		/**
		 * The sum of `sumField` over a column's cards, formatted.
		 *
		 * @param {object} column The column.
		 * @return {string} The sum, '' when no `sumField` is set.
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-column-header
		 */
		columnSum(column) {
			if (!this.sumField) {
				return ''
			}
			const total = column.cards.reduce((sum, card) => {
				const n = Number(readPath(card, this.sumField))
				return Number.isFinite(n) ? sum + n : sum
			}, 0)
			return formatMetricValue(total, this.sumFormat || { style: 'decimal', decimals: 0 }, {})
		},

		/**
		 * The cards a column draws: all of them, or the first `columnLimit`
		 * until the reader shows the rest.
		 *
		 * @param {object} lane The lane.
		 * @param {object} column The column.
		 * @return {Array<object>} The cards.
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-a-long-column-is-cut-with-a-show-more-button
		 */
		visibleCards(lane, column) {
			const limit = Number(this.columnLimit)
			if (!(limit > 0) || this.expanded.includes(this.expandKey(lane, column))) {
				return column.cards
			}
			return column.cards.slice(0, limit)
		},

		/**
		 * How many cards of a column are cut.
		 *
		 * @param {object} lane The lane.
		 * @param {object} column The column.
		 * @return {number} The hidden count.
		 */
		hiddenCount(lane, column) {
			return column.cards.length - this.visibleCards(lane, column).length
		},

		/**
		 * @param {object} lane The lane.
		 * @param {object} column The column.
		 * @return {string} The key `expanded` holds.
		 */
		expandKey(lane, column) {
			return `${lane.key}::${column.key}`
		},

		/**
		 * The show-more button's text.
		 *
		 * @param {number} count The hidden count.
		 * @return {string} "Show N more".
		 */
		showMoreLabel(count) {
			return t('nextcloud-vue', 'Show {count} more', { count })
		},

		/**
		 * Show the rest of one column. With `paged` the host is also asked
		 * for the column's next page (`load-more`), and the column is
		 * expanded so the rows that arrive show.
		 *
		 * @param {object} lane The lane.
		 * @param {object} column The column.
		 * @return {void}
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-a-long-column-is-cut-with-a-show-more-button
		 */
		showMore(lane, column) {
			if (this.paged) {
				/**
				 * @event load-more Emitted when the reader presses "Show N more" on a paged board. Payload: `{ columnKey }`; the host loads that column's next page.
				 */
				this.$emit('load-more', { columnKey: column.key })
			}
			this.expanded = [...this.expanded, this.expandKey(lane, column)]
		},

		/**
		 * The columns a card can move to: every other column of its lane.
		 *
		 * @param {object} lane The lane.
		 * @param {object} column The card's own column.
		 * @return {Array<object>} The targets.
		 */
		moveTargets(lane, column) {
			return lane.columns.filter((target) => target.key !== column.key)
		},

		/**
		 * @param {object} card The card.
		 * @return {boolean} Whether its menu is open.
		 */
		isMenuOpen(card) {
			return this.openMenuKey === this.cardKey(card)
		},

		/**
		 * @param {object} card The card.
		 * @return {string} The menu button's accessible name.
		 */
		menuButtonLabel(card) {
			const name = this.roleText(card, this.roles.title) || this.cardKey(card)
			return t('nextcloud-vue', 'Actions for {name}', { name })
		},

		/**
		 * Open or close a card's menu, and put focus on its first item.
		 *
		 * @param {object} card The card.
		 * @return {void}
		 */
		toggleMenu(card) {
			const key = this.cardKey(card)
			this.openMenuKey = this.openMenuKey === key ? null : key
			if (this.openMenuKey !== null) {
				this.focusMenuItem(card, 0)
			}
		},

		/**
		 * Close the open menu, optionally returning focus to its button.
		 *
		 * @param {object} [card] The card whose button gets focus back.
		 * @return {void}
		 */
		closeMenu(card) {
			this.openMenuKey = null
			if (card && this.$el && typeof this.$el.querySelector === 'function') {
				this.$nextTick(() => {
					const button = this.$el.querySelector(`[data-testid="cn-board-card-menu"][data-card-id="${this.cardKey(card)}"]`)
					button?.focus?.()
				})
			}
		},

		/**
		 * Focus the menu item at an index (opened menus only).
		 *
		 * @param {object} card The card.
		 * @param {number} index The item's position.
		 * @return {void}
		 */
		focusMenuItem(card, index) {
			this.$nextTick(() => {
				const items = this.menuItems(card)
				const item = items[((index % items.length) + items.length) % items.length]
				item?.focus?.()
			})
		},

		/**
		 * @param {object} card The card.
		 * @return {Array<HTMLElement>} The open menu's items.
		 */
		menuItems(card) {
			const article = this.$el?.querySelector?.(`[data-testid="cn-board-card"][data-card-id="${this.cardKey(card)}"]`)
			return article ? Array.from(article.querySelectorAll('[role="menuitem"]')) : []
		},

		/**
		 * Keys inside the open menu: arrows move, Escape closes.
		 *
		 * @param {object} card The card.
		 * @param {KeyboardEvent} event The key press.
		 * @return {void}
		 */
		onMenuKeydown(card, event) {
			const items = this.menuItems(card)
			const at = items.indexOf(document.activeElement)
			if (event.key === 'Escape') {
				event.preventDefault()
				event.stopPropagation()
				this.closeMenu(card)
			} else if (event.key === 'ArrowDown') {
				event.preventDefault()
				this.focusMenuItem(card, at + 1)
			} else if (event.key === 'ArrowUp') {
				event.preventDefault()
				this.focusMenuItem(card, at - 1)
			} else if (event.key === 'Tab') {
				this.closeMenu()
			}
		},

		/**
		 * M on a card, or a control inside it, opens its menu. Only in the
		 * board look and only when the card can move.
		 *
		 * @param {object} card The card.
		 * @param {object} column Its column.
		 * @param {object} lane Its lane.
		 * @param {KeyboardEvent} event The key press.
		 * @return {void}
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-card-shows-no-form-controls-at-rest
		 */
		onCardKeydown(card, column, lane, event) {
			if (!this.isBoardLook || !this.canMove) {
				return
			}
			if ((event.key === 'm' || event.key === 'M') && !event.ctrlKey && !event.metaKey && !event.altKey) {
				event.preventDefault()
				if (!this.isMenuOpen(card)) {
					this.openMenuKey = this.cardKey(card)
					this.focusMenuItem(card, 0)
				}
			}
		},

		/**
		 * Choose a column from the card's menu: the identical call a drop runs.
		 *
		 * @param {object} card The card.
		 * @param {object} column Its column.
		 * @param {object} target The column chosen.
		 * @return {Promise<void>} Nothing.
		 */
		async onMenuMove(card, column, target) {
			this.closeMenu(card)
			await this.move(card, column.key, target.key)
		},

		/**
		 * Open the card in a new tab: the same event a ctrl-click emits.
		 *
		 * @param {object} card The card.
		 * @return {void}
		 */
		onMenuOpenNewTab(card) {
			this.closeMenu(card)
			this.openCard(card, new MouseEvent('click', { ctrlKey: true, bubbles: true }))
		},

		/**
		 * The words a late card carries. Colour alone would not reach a reader
		 * who cannot see it, or cannot tell red from amber.
		 *
		 * @param {object} card The card's row.
		 * @return {string} "Overdue", "Due soon", or '' for a card that is fine.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-late-marking-on-board-cards
		 */
		dueLabel(card) {
			const state = this.dueState(card)
			if (state === 'overdue') {
				return t('nextcloud-vue', 'Overdue')
			}
			return state === 'soon' ? t('nextcloud-vue', 'Due soon') : ''
		},

		/**
		 * Open one card. The pointer and the keyboard both come through here,
		 * so a reader on Enter reaches the same record as a reader on click.
		 *
		 * @param {object} card The card the reader picked.
		 * @param {MouseEvent|KeyboardEvent} [event] The originating event.
		 * @return {void} Nothing.
		 */
		openCard(card, event) {
			/**
			 * @event card-click Emitted when a reader opens a card, by click or Enter. Payload: `(card, event)` — the card row and the native event, so the host can open it in a new tab on a ctrl/cmd/shift click. A middle click emits `card-aux-click` instead.
			 */
			this.$emit('card-click', card, event)
		},

		/**
		 * Middle click on a card's open button: emits `card-aux-click`, not
		 * `card-click`, so an existing listener that navigates never moves the
		 * current tab away.
		 *
		 * @param {object} card The card the reader picked.
		 * @param {MouseEvent} event The auxclick event.
		 * @return {void} Nothing.
		 */
		onCardAuxClick(card, event) {
			if (isRowMiddleClick(event)) {
				/**
				 * @event card-aux-click Emitted when a reader middle-clicks a card, for opening it in a new tab (see `openRowTarget`). Payload: `(card, event)` — the card row and the native auxclick event.
				 */
				this.$emit('card-aux-click', card, event)
			}
		},

		/**
		 * A card's identity.
		 *
		 * @param {object} card The row.
		 * @return {string} Its key.
		 */
		cardKey(card) {
			return String(card?.[this.rowKey] ?? '')
		},

		/**
		 * A column's count, said as a page count when that is what it is.
		 *
		 * @param {object} column The column.
		 * @return {string} The count.
		 */
		countLabel(column) {
			return this.paged
				? t('nextcloud-vue', '{count} on this page', { count: column.count })
				: String(column.count)
		},

		/**
		 * What a card is called to somebody who cannot see which column it is in.
		 *
		 * @param {object} card The row.
		 * @param {object} column Its column.
		 * @return {string} The accessible name.
		 */
		cardLabel(card, column) {
			const name = this.cardFields.map((field) => card?.[field]).filter(Boolean).join(', ')
			return t('nextcloud-vue', '{name}, in {column}', { name: name || this.cardKey(card), column: column.label })
		},

		/**
		 * Whether a lane is collapsed.
		 *
		 * @param {string} key The lane.
		 * @return {boolean} True when collapsed.
		 */
		isCollapsed(key) {
			return this.collapsed.includes(key)
		},

		/**
		 * Collapse a lane, or open it again.
		 *
		 * Held in the component for as long as the reader is on the view, and
		 * deliberately not persisted: a collapsed lane somebody forgot they
		 * collapsed is work that has gone missing for them.
		 *
		 * @param {string} key The lane.
		 */
		toggleLane(key) {
			this.collapsed = this.isCollapsed(key)
				? this.collapsed.filter((entry) => entry !== key)
				: [...this.collapsed, key]
		},

		/**
		 * Remember which card is being dragged and where from.
		 *
		 * @param {object} card The row.
		 * @param {object} column Its column.
		 * @param {DragEvent} event The event.
		 */
		onDragStart(card, column, event) {
			this.dragging = { card, fromKey: column.key }
			// Firefox drops a drag that carries no data.
			event?.dataTransfer?.setData?.('text/plain', this.cardKey(card))
		},

		/**
		 * A drop on a column.
		 *
		 * @param {object} column The column dropped on.
		 * @return {Promise<void>} Nothing.
		 */
		async onDrop(column) {
			if (!this.dragging) {
				return
			}
			const { card, fromKey } = this.dragging
			this.dragging = null
			await this.move(card, fromKey, column.key)
		},

		/**
		 * Move to, from the card's own menu.
		 *
		 * @param {object} card The row.
		 * @param {object} column Its column.
		 * @param {Event} event The change event.
		 * @return {Promise<void>} Nothing.
		 */
		async onMoveTo(card, column, event) {
			await this.move(card, column.key, event?.target?.value ?? '')
		},

		/**
		 * The one move, whichever gesture asked for it.
		 *
		 * @param {object} card The row.
		 * @param {string} fromKey Where it was.
		 * @param {string} toKey Where it is going.
		 * @return {Promise<void>} Nothing.
		 */
		async move(card, fromKey, toKey) {
			this.refusal = ''

			const result = await runBoardDrop({
				card,
				fromKey,
				toKey,
				statusField: this.statusField,
				runTransition: this.runTransition,
				reread: this.reread,
			})

			if (result.outcome === DROP_OUTCOMES.MOVED) {
				/**
				 * @event moved Emitted when the host's transition accepted the move and the card now sits in the new lane. Payload: `{ card, toKey }`.
				 */
				this.$emit('moved', { card: result.card, toKey })
				return
			}

			if (result.outcome === DROP_OUTCOMES.REFUSED) {
				// The guard's own sentence when it gave one. Our own only when
				// it did not, so the two are never confused.
				this.refusal = result.message || t('nextcloud-vue', 'That move was refused.')
				/**
				 * @event refused Emitted when the guard turned the move down. Payload: `{ card, message }`, the message being the guard's own sentence when it gave one.
				 */
				this.$emit('refused', { card: result.card, message: this.refusal })
				return
			}

			if (result.outcome === DROP_OUTCOMES.STALE) {
				this.refusal = t('nextcloud-vue', 'Somebody else moved this card. It is shown where it is now.')
				/**
				 * @event stale Emitted when somebody else moved the card first, so the board shows it where it is now. Payload: `{ card }`.
				 */
				this.$emit('stale', { card: result.card })
			}
		},
	},
}
</script>

<style scoped lang="scss">
.cn-board-view__columns {
	display: flex;
	gap: 12px;
	overflow-x: auto;
	align-items: flex-start;
}

.cn-board-view__column {
	flex: 0 0 260px;
	background-color: var(--color-background-hover);
	border-radius: var(--border-radius-large);
	padding: 8px;
}

.cn-board-view__column-header {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 1rem;
	margin: 0 0 8px;
}

.cn-board-view__count,
.cn-board-view__empty,
.cn-board-view__unusable {
	color: var(--color-text-maxcontrast);
}

.cn-board-view__card {
	display: block;
	background-color: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px;
	margin-bottom: 8px;
}

.cn-board-view__card-field {
	display: block;
}

/* A late card: an edge in the error colour, drawn as an inset shadow so the
   card keeps its size and its rounded corners. The label below carries the
   meaning; the edge only helps a sighted reader find it. */
.cn-board-view__card--overdue {
	border-color: var(--color-error);
	box-shadow: inset 3px 0 0 var(--color-error);
}

.cn-board-view__due {
	display: block;
	font-size: 0.85em;
	font-weight: 700;
}

.cn-board-view__due--overdue {
	color: var(--color-error-text, var(--color-error));
}

.cn-board-view__due--soon {
	color: var(--color-warning-text, var(--color-main-text));
	font-weight: 600;
}

/*
 * The card's opening control. The cursor and the focus ring live here now,
 * on the thing that actually does something, rather than on the box.
 */
.cn-board-view__card-open {
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	color: var(--color-primary-element);
	font-size: 0.8rem;
}

.cn-board-view__card-open:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-board-view__lane-header {
	background: none;
	border: none;
	font-weight: bold;
	padding: 8px 0;
	cursor: pointer;
	color: var(--color-main-text);
}

.cn-board-view__move-label {
	color: var(--color-text-maxcontrast);
	font-size: 0.8rem;
}

.cn-board-view__refusal {
	color: var(--color-error);
}
</style>
