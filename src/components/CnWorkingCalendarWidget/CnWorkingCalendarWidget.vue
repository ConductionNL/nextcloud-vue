<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-working-calendar" data-testid="cn-working-calendar">
		<p v-if="error"
			class="cn-working-calendar__error"
			role="alert"
			data-testid="cn-working-calendar-error">
			{{ error }}
		</p>
		<div v-else-if="loading && !calendar" class="cn-working-calendar__loading">
			<NcLoadingIcon :size="20" :name="loadingLabel" />
		</div>
		<template v-else-if="calendar">
			<div class="cn-working-calendar__head">
				<NcButton
					variant="tertiary"
					:aria-label="previousMonthLabel"
					data-testid="cn-working-calendar-previous"
					@click="shiftMonth(-1)">
					<template #icon>
						<ChevronLeft :size="20" />
					</template>
				</NcButton>
				<strong :id="`${uid}-title`" class="cn-working-calendar__title" data-testid="cn-working-calendar-title">{{ monthTitle }}</strong>
				<NcButton
					variant="tertiary"
					:aria-label="nextMonthLabel"
					data-testid="cn-working-calendar-next"
					@click="shiftMonth(1)">
					<template #icon>
						<ChevronRight :size="20" />
					</template>
				</NcButton>
				<NcButton
					v-if="editable && content.addButton !== false"
					class="cn-working-calendar__add"
					variant="secondary"
					data-testid="cn-working-calendar-add"
					@click="openAdd()">
					{{ addLabel }}
				</NcButton>
			</div>
			<p v-if="previewNote" class="cn-working-calendar__note" data-testid="cn-working-calendar-note">
				{{ previewNote }}
			</p>
			<span class="cn-working-calendar__live" aria-live="polite">{{ liveText }}</span>

			<div
				role="grid"
				class="cn-working-calendar__grid"
				:aria-labelledby="`${uid}-title`"
				data-testid="cn-working-calendar-grid"
				@keydown="onKeydown">
				<div role="row" class="cn-working-calendar__row">
					<span
						v-for="name in weekdayNames"
						:key="name.long"
						role="columnheader"
						class="cn-working-calendar__weekday"
						:aria-label="name.long">{{ name.short }}</span>
				</div>
				<div
					v-for="(week, w) in weeks"
					:key="w"
					role="row"
					class="cn-working-calendar__row">
					<template v-for="(slot, d) in week">
						<span v-if="!slot"
							:key="`empty-${w}-${d}`"
							role="gridcell"
							class="cn-working-calendar__blank" />
						<span
							v-else
							:key="slot.date"
							role="gridcell"
							class="cn-working-calendar__day"
							:class="{
								'cn-working-calendar__day--off': !slot.working && !slot.closure,
								'cn-working-calendar__day--closed': slot.closure,
								'cn-working-calendar__day--today': slot.today,
							}"
							:tabindex="slot.date === focusDate ? 0 : -1"
							:aria-label="dayLabel(slot)"
							:aria-current="slot.today ? 'date' : null"
							:title="slot.closure ? closureName(slot.closure) : null"
							:data-date="slot.date"
							data-testid="cn-working-calendar-day"
							@click="onDayClick(slot)"
							@focus="focusDate = slot.date">{{ slot.day }}</span>
					</template>
				</div>
			</div>
			<p v-if="content.footnote" class="cn-working-calendar__footnote" data-testid="cn-working-calendar-footnote">
				{{ cnTranslate(content.footnote) }}
			</p>

			<form
				v-if="adding"
				class="cn-working-calendar__form"
				data-testid="cn-working-calendar-form"
				@submit.prevent="saveDay">
				<label class="cn-working-calendar__field">
					{{ dateLabel }}
					<input
						ref="dateInput"
						v-model="newDate"
						type="date"
						required
						data-testid="cn-working-calendar-date">
				</label>
				<label class="cn-working-calendar__field">
					{{ nameLabel }}
					<input
						v-model="newName"
						type="text"
						data-testid="cn-working-calendar-name">
				</label>
				<div class="cn-working-calendar__form-actions">
					<NcButton variant="tertiary" data-testid="cn-working-calendar-cancel" @click="adding = false">
						{{ cancelLabel }}
					</NcButton>
					<NcButton
						variant="primary"
						type="submit"
						:disabled="saving || !newDate"
						data-testid="cn-working-calendar-save">
						{{ saveLabel }}
					</NcButton>
				</div>
				<p v-if="saveError"
					class="cn-working-calendar__error"
					role="alert"
					data-testid="cn-working-calendar-save-error">
					{{ saveError }}
				</p>
			</form>
		</template>
		<p v-else class="cn-working-calendar__note" data-testid="cn-working-calendar-empty">
			{{ emptyLabel }}
		</p>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import { fetchReferenceObjects } from '../../utils/boardReferenceColumns.js'
import { hasUnresolvedTokens, resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { userLocale } from '../../utils/userLocale.js'
import { buildMonth, isoDate, normaliseExceptions } from '../../utils/workingCalendarMonth.js'

const OBJECT_API = '/apps/openregister/api/objects'
const PREVIEW_URL = '/apps/openregister/api/flow-timers/calendars/preview'

let instanceCounter = 0

/**
 * The id of an object, wherever OpenRegister carries it.
 *
 * @param {object|null} object The object.
 * @return {string} The id, or ''.
 */
function idOf(object) {
	return String(object?.id ?? object?.['@self']?.id ?? object?.uuid ?? '')
}

/**
 * Today as `YYYY-MM-DD`, in local time.
 *
 * @return {string} The date.
 */
function todayIso() {
	const now = new Date()
	return isoDate(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * CnWorkingCalendarWidget — the `working-calendar` widget: one month of a
 * working calendar kept as an OpenRegister object (board
 * DqInstellingenAlgemeen, "Werkdagen en feestdagen").
 *
 * The grid runs Monday to Sunday. Weekdays the calendar does not work are
 * grey; the dates it is closed on are red, with their name on hover and in
 * the day's label. The closures are not computed here: the widget asks
 * OpenRegister's calendar preview (`/api/flow-timers/calendars/preview`) for
 * the year shown, which expands the calendar's rules and its exceptions.
 *
 * "Add day" appends `{ date, name }` to the object's `exceptions` with one
 * update through the object API, under the reader's own rights; it shows for
 * administrators, and the server decides. The preview is administrators-only
 * too; for anyone else the widget shows the stored exceptions and says the
 * holidays could not be read.
 *
 * ```json
 * {
 *   "type": "working-calendar",
 *   "content": {
 *     "calendar": { "register": "flow-timers", "schema": "working-calendar", "filter": { "slug": "default" } }
 *   }
 * }
 * ```
 *
 * Keyboard: the days form a grid with one tab stop; the arrow keys move a
 * day or a week, Home and End to the start and end of the week, Page Up and
 * Page Down a month. Enter on a day opens Add day for that date.
 */
export default {
	name: 'CnWorkingCalendarWidget',

	components: { ChevronLeft, ChevronRight, NcButton, NcLoadingIcon },

	inject: {
		/** The page's workspace values, for `@workspace.<key>` tokens in the filter. */
		cnWorkspaceContext: { default: null },
		/** The host's translate, for the manifest's texts. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget config: `{ calendar: { register, schema, id? | filter? },
		 * previewUrl?, editable?, addButton?, emptyText?, footnote? }`. `addButton: false` leaves the Add day button
		 * out, for a host that draws it in its own title row and calls `openAdd()`. `footnote` is a
		 * line under the month grid, through the host's translate: what the colours mean
		 * (DqInstellingenAlgemeen "Rood: feestdag of sluitingsdag.").
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The bound record's id, for `@objectId` in the filter. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The bound record, for `@object.<field>` in the filter. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	data() {
		instanceCounter += 1
		const now = new Date()
		return {
			uid: `cn-working-calendar-${instanceCounter}`,
			loading: false,
			error: '',
			calendar: null,
			previews: {},
			previewFailed: false,
			year: now.getFullYear(),
			month: now.getMonth(),
			focusDate: todayIso(),
			adding: false,
			newDate: '',
			newName: '',
			saving: false,
			saveError: '',
			liveText: '',
		}
	},

	computed: {
		/** @return {{register: string, schema: string, id: string, filter: (object|null)}|null} The calendar source, tokens resolved, or null while unresolved. */
		source() {
			const c = this.content?.calendar
			if (!c || !c.register || !c.schema) {
				return null
			}
			const unwrap = (v) => (v && typeof v === 'object' && 'value' in v ? v.value : v)
			const ctx = { objectId: this.objectId || null, object: this.objectData, workspace: unwrap(this.cnWorkspaceContext) || {} }
			const filter = c.filter && typeof c.filter === 'object' ? resolveFilterTokens(c.filter, ctx) : null
			if (filter && hasUnresolvedTokens(filter)) {
				return null
			}
			return { register: String(c.register), schema: String(c.schema), id: c.id ? String(c.id) : '', filter }
		},

		/** @return {string} A key of the source, to read it again when it changes. */
		sourceKey() {
			return this.source ? JSON.stringify(this.source) : ''
		},

		/** @return {boolean} Whether Add day shows: administrators, unless the manifest turns it off. */
		editable() {
			return this.content?.editable !== false && Boolean(getCurrentUser()?.isAdmin)
		},

		/** @return {number[]} The ISO weekdays that work. */
		workingWeekdays() {
			const days = this.calendar?.workingWeekdays
			return Array.isArray(days) ? days.map((d) => Number(d)) : [1, 2, 3, 4, 5]
		},

		/** @return {Array<{date: string, name: string}>} The stored exceptions. */
		exceptions() {
			return normaliseExceptions(this.calendar?.exceptions)
		},

		/**
		 * The closed dates of the year shown: the preview's, each marked as an
		 * exception when the calendar lists it, else as a holiday; without a
		 * preview, the stored exceptions.
		 *
		 * @return {Map<string, {name: string, kind: string}>}
		 * @spec openspec/changes/working-calendar-widget/specs/working-calendar-widget/spec.md#requirement-a-working-calendar-shows-a-month
		 */
		closures() {
			const own = new Set(this.exceptions.map((e) => e.date))
			const map = new Map()
			const preview = this.previews[this.year]
			for (const entry of Array.isArray(preview) ? preview : []) {
				if (entry && typeof entry.date === 'string') {
					map.set(entry.date, { name: String(entry.name || ''), kind: own.has(entry.date) ? 'exception' : 'holiday' })
				}
			}
			for (const e of this.exceptions) {
				if (!map.has(e.date)) {
					map.set(e.date, { name: e.name, kind: 'exception' })
				}
			}
			return map
		},

		/** @return {Array<Array<object|null>>} The weeks of the month shown. */
		weeks() {
			return buildMonth(this.year, this.month, { workingWeekdays: this.workingWeekdays, closures: this.closures, today: todayIso() })
		},

		/** @return {Array<{short: string, long: string}>} Monday to Sunday in the user's language. */
		weekdayNames() {
			const short = new Intl.DateTimeFormat(userLocale(), { weekday: 'short' })
			const long = new Intl.DateTimeFormat(userLocale(), { weekday: 'long' })
			return Array.from({ length: 7 }, (_v, i) => {
				const day = new Date(Date.UTC(2024, 0, 1 + i, 12))
				return { short: short.format(day).replace(/\.$/, ''), long: long.format(day) }
			})
		},

		/** @return {string} "December 2026" in the user's language. */
		monthTitle() {
			const text = new Intl.DateTimeFormat(userLocale(), { month: 'long', year: 'numeric' }).format(new Date(this.year, this.month, 15))
			return text.charAt(0).toUpperCase() + text.slice(1)
		},

		/** @return {string} Why holidays are missing, or ''. */
		previewNote() {
			return this.previewFailed ? t('nextcloud-vue', 'Holidays could not be read. Only the days added by hand are shown.') : ''
		},

		loadingLabel: () => t('nextcloud-vue', 'Loading …'),
		previousMonthLabel: () => t('nextcloud-vue', 'Previous month'),
		nextMonthLabel: () => t('nextcloud-vue', 'Next month'),
		addLabel: () => t('nextcloud-vue', 'Add day'),
		dateLabel: () => t('nextcloud-vue', 'Date'),
		nameLabel: () => t('nextcloud-vue', 'Name'),
		cancelLabel: () => t('nextcloud-vue', 'Cancel'),
		saveLabel: () => t('nextcloud-vue', 'Save'),

		/** @return {string} The empty-state text. */
		emptyLabel() {
			return this.content?.emptyText ? this.translate(this.content.emptyText) : t('nextcloud-vue', 'No working calendar found.')
		},
	},

	watch: {
		sourceKey: {
			handler() {
				this.load()
			},

			immediate: true,
		},

		year() {
			this.loadPreview()
		},
	},

	methods: {
		/**
		 * The host's translate, or the text unchanged.
		 *
		 * @param {string} text The text.
		 * @return {string} The translation.
		 */
		translate(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/** @return {string} The calendar object's API URL. */
		objectUrl() {
			const s = this.source
			const id = idOf(this.calendar) || s.id
			return generateUrl(`${OBJECT_API}/${encodeURIComponent(s.register)}/${encodeURIComponent(s.schema)}/${encodeURIComponent(id)}`)
		},

		/**
		 * Read the calendar object, then the closures of the year shown.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			const key = this.sourceKey
			if (key === '') {
				return
			}
			this.loading = true
			this.error = ''
			try {
				const s = this.source
				let calendar = null
				if (s.id) {
					const response = await axios.get(generateUrl(`${OBJECT_API}/${encodeURIComponent(s.register)}/${encodeURIComponent(s.schema)}/${encodeURIComponent(s.id)}`))
					calendar = response?.data || null
				} else {
					const found = await fetchReferenceObjects({ register: s.register, schema: s.schema, filter: s.filter || {}, limit: 1 })
					calendar = found[0] || null
				}
				if (key !== this.sourceKey) {
					return
				}
				this.calendar = calendar
				this.previews = {}
				if (calendar) {
					await this.loadPreview()
				}
			} catch {
				this.error = t('nextcloud-vue', 'The working calendar could not be loaded.')
			} finally {
				this.loading = false
			}
		},

		/**
		 * Ask the calendar preview for the closed dates of the year shown,
		 * once per year.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/working-calendar-widget/specs/working-calendar-widget/spec.md#requirement-a-working-calendar-shows-a-month
		 */
		async loadPreview() {
			const year = this.year
			if (!this.calendar || this.previews[year]) {
				return
			}
			try {
				const url = generateUrl(this.content?.previewUrl || PREVIEW_URL)
				const response = await axios.post(url, { calendar: this.calendar, year })
				const dates = Array.isArray(response?.data?.dates) ? response.data.dates : []
				this.previews = { ...this.previews, [year]: dates }
				this.previewFailed = false
			} catch {
				this.previewFailed = true
			}
		},

		/**
		 * Show another month, keeping focus on the same day where it exists.
		 *
		 * @param {number} delta Months to move.
		 * @return {void}
		 */
		shiftMonth(delta) {
			const date = new Date(this.year, this.month + delta, 1)
			this.year = date.getFullYear()
			this.month = date.getMonth()
			const day = Math.min(Number(this.focusDate.slice(8, 10)) || 1, new Date(this.year, this.month + 1, 0).getDate())
			this.focusDate = isoDate(this.year, this.month, day)
			this.liveText = this.monthTitle
		},

		/**
		 * A day's accessible label: the full date, whether it works, and the
		 * closure's name.
		 *
		 * @param {object} slot The day.
		 * @return {string} The label.
		 */
		dayLabel(slot) {
			const [y, m, d] = slot.date.split('-').map(Number)
			const date = new Intl.DateTimeFormat(userLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d))
			if (slot.closure) {
				const name = this.closureName(slot.closure)
				return name
					? t('nextcloud-vue', '{date}, closed: {name}', { date, name })
					: t('nextcloud-vue', '{date}, closed', { date })
			}
			return slot.working ? t('nextcloud-vue', '{date}, working day', { date }) : t('nextcloud-vue', '{date}, not a working day', { date })
		},

		/**
		 * A closure's name, with a fallback for an unnamed added day.
		 *
		 * @param {{name: string, kind: string}} closure The closure.
		 * @return {string} The name.
		 */
		closureName(closure) {
			if (closure.name) {
				return this.translate(closure.name)
			}
			return closure.kind === 'exception' ? t('nextcloud-vue', 'Day added by hand') : ''
		},

		/**
		 * Open Add day, with a date filled in.
		 *
		 * @param {string} [date] The date.
		 * @return {void}
		 */
		openAdd(date) {
			this.newDate = date || this.focusDate || ''
			this.newName = ''
			this.saveError = ''
			this.adding = true
			this.$nextTick(() => this.$refs.dateInput?.focus?.())
		},

		/**
		 * A click on a day: open Add day for it when the reader may edit.
		 *
		 * @param {object} slot The day.
		 * @return {void}
		 */
		onDayClick(slot) {
			this.focusDate = slot.date
			if (this.editable) {
				this.openAdd(slot.date)
			}
		},

		/**
		 * Append the new day to the calendar's exceptions with one update,
		 * under the reader's rights, then read the closures again.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/working-calendar-widget/specs/working-calendar-widget/spec.md#requirement-a-day-can-be-added-to-the-calendar
		 */
		async saveDay() {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(this.newDate) || !this.calendar) {
				return
			}
			this.saving = true
			this.saveError = ''
			try {
				const stored = Array.isArray(this.calendar.exceptions) ? this.calendar.exceptions : []
				const name = this.newName.trim()
				const exceptions = [...stored.filter((e) => (typeof e === 'string' ? e : e?.date) !== this.newDate), name ? { date: this.newDate, name } : { date: this.newDate }]
				const response = await axios.patch(this.objectUrl(), { exceptions })
				this.calendar = { ...this.calendar, ...(response?.data && typeof response.data === 'object' ? response.data : {}), exceptions }
				const year = Number(this.newDate.slice(0, 4))
				const { [year]: _stale, ...rest } = this.previews
				this.previews = rest
				const [y, m] = this.newDate.split('-').map(Number)
				this.year = y
				this.month = m - 1
				this.focusDate = this.newDate
				await this.loadPreview()
				this.adding = false
				this.liveText = t('nextcloud-vue', 'Day added.')
			} catch (e) {
				this.saveError = e?.response?.status === 403
					? t('nextcloud-vue', 'Only an administrator can change the working calendar.')
					: t('nextcloud-vue', 'The day could not be added. Try again.')
			} finally {
				this.saving = false
			}
		},

		/**
		 * Arrow keys, Home / End and Page Up / Down move focus across the days.
		 *
		 * @param {KeyboardEvent} event The key event.
		 * @return {void}
		 */
		onKeydown(event) {
			const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
			const [y, m, d] = (this.focusDate || todayIso()).split('-').map(Number)
			let target
			if (event.key in moves) {
				target = new Date(y, m - 1, d + moves[event.key])
			} else if (event.key === 'Home' || event.key === 'End') {
				const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7
				target = new Date(y, m - 1, d + (event.key === 'Home' ? -weekday : 6 - weekday))
			} else if (event.key === 'PageUp' || event.key === 'PageDown') {
				target = new Date(y, m - 1 + (event.key === 'PageUp' ? -1 : 1), 1)
				target.setDate(Math.min(d, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()))
			} else if ((event.key === 'Enter' || event.key === ' ') && this.editable) {
				event.preventDefault()
				this.openAdd(this.focusDate)
				return
			} else {
				return
			}
			event.preventDefault()
			this.focusDate = isoDate(target.getFullYear(), target.getMonth(), target.getDate())
			if (target.getFullYear() !== this.year || target.getMonth() !== this.month) {
				this.year = target.getFullYear()
				this.month = target.getMonth()
				this.liveText = this.monthTitle
			}
			this.$nextTick(() => this.$el.querySelector?.(`[data-date="${this.focusDate}"]`)?.focus?.())
		},
	},
}
</script>

<style scoped>
.cn-working-calendar {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-working-calendar__head {
	align-items: center;
	display: flex;
	gap: 4px;
}

.cn-working-calendar__title {
	font-size: 15px;
	min-width: 9em;
	text-align: center;
}

.cn-working-calendar__add {
	margin-inline-start: auto;
}

.cn-working-calendar__grid {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-working-calendar__row {
	display: grid;
	gap: 4px;
	grid-template-columns: repeat(7, minmax(0, 1fr));
}

.cn-working-calendar__weekday {
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	text-align: center;
}

.cn-working-calendar__day {
	align-items: center;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: 6px;
	cursor: default;
	display: flex;
	font-size: 13px;
	height: 34px;
	justify-content: center;
}

.cn-working-calendar__day:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 1px;
}

.cn-working-calendar__day--off {
	background: var(--color-background-dark);
}

.cn-working-calendar__day--closed {
	background: var(--color-error-light, color-mix(in srgb, var(--color-error) 12%, var(--color-main-background)));
	border-color: var(--color-error);
	color: var(--color-error-text, var(--color-main-text));
	font-weight: 600;
}

.cn-working-calendar__day--today {
	box-shadow: inset 0 0 0 2px var(--color-primary-element);
}

.cn-working-calendar__live {
	clip-path: inset(50%);
	height: 1px;
	overflow: hidden;
	position: absolute;
	white-space: nowrap;
	width: 1px;
}

.cn-working-calendar__note {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

/* @spec openspec/changes/working-calendar-footnote/specs/working-calendar-footnote/spec.md */
.cn-working-calendar__footnote {
	margin: 0;
	font-size: 13px;
	line-height: 1.3;
	color: var(--color-text-maxcontrast);
}

.cn-working-calendar__form {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 12px;
}

.cn-working-calendar__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-working-calendar__form-actions {
	align-items: flex-end;
	display: flex;
	gap: 8px;
}

.cn-working-calendar__error {
	color: var(--color-error-text, var(--color-error));
	margin: 0;
}
</style>
