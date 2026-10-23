<template>
	<span class="cn-cell-renderer" :class="cellClass">
		<!-- OpenRegister's withheld marker ({ "@withheld": true, reason }),
		     before every other path: a lock and "Withheld", the reason as the
		     tooltip. The icon is decoration; the text carries the meaning. -->
		<span v-if="withheld"
			class="cn-cell-renderer__withheld"
			:title="withheldHint"
			data-testid="cn-cell-withheld">
			<Lock :size="14" class="cn-cell-renderer__withheld-icon" aria-hidden="true" />
			<span class="cn-cell-renderer__withheld-text">{{ withheldText }}</span>
		</span>

		<!-- Consumer-registered cell widget (cnCellWidgets[column.widget]) -->
		<component
			:is="widgetComponent"
			v-else-if="widgetComponent"
			:value="value"
			:row="row"
			:property="property"
			:formatted="formattedValue"
			v-bind="widgetProps" />

		<!-- Built-in "group" widget: a Nextcloud group id (or a list of them)
		     shown as the group's display name, cached per id. Used on its own
		     for a property marked `referenceType: nextcloud-group` /
		     `format: nc-group` unless the column has a formatter. -->
		<template v-else-if="isGroupCell">
			<span v-if="!groupIds.length" class="cn-cell-renderer__dash">—</span>
			<span v-else class="cn-cell-renderer__groups">
				<template v-for="(gid, i) in groupIds" :key="gid">
					<span v-if="i > 0">, </span>
					<CnGroupNameCell :gid="gid" />
				</template>
			</span>
		</template>

		<!-- Built-in "actions" widget: row actions as inline buttons ("Aan zaak
		     koppelen", "Nieuwe zaak"). The page resolves the buttons
		     (widgetProps.items) and runs a click (widgetProps.run). -->
		<template v-else-if="widget === 'actions'">
			<span class="cn-cell-renderer__actions" data-testid="cn-cell-actions">
				<NcButton
					v-for="item in actionItems"
					:key="item.key"
					:variant="item.variant"
					size="small"
					:disabled="item.disabled"
					:data-testid="`cn-cell-action-${item.key}`"
					@click.stop="runAction(item)">
					{{ item.label }}
				</NcButton>
			</span>
		</template>

		<!-- Built-in "badge" widget: renders the value as a status pill. An enum
		     value shows its label (x-enum-labels, translated) unless a formatter
		     shapes it; the colour stays keyed on the raw value. -->
		<template v-else-if="widget === 'badge'">
			<CnStatusBadge v-if="hasValue"
				:label="labelledValue"
				:variant="badgeVariant"
				:colorMap="badgeColorMap"
				:colorKey="badgeColorKey"
				:title="badgeTitle">
				<template v-if="badgeLook.icon" #icon>
					<CnIcon :name="badgeLook.icon" :size="14" class="cn-cell-renderer__badge-icon" />
				</template>
			</CnStatusBadge>
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Built-in "fkResolve" widget — resolves a reference uuid to the related
		     object's display label via the object store (per-schema caching).
		     Config: widgetProps { register, schema, labelField, matchField?,
		     refField?, labelTemplate?, labelPath? }, or schemaFrom { field,
		     map } to read the schema off the row. -->
		<template v-else-if="widget === 'fkResolve'">
			<CnFkResolveCell
				v-if="hasValue || fkRefValue !== null"
				:value="value"
				:register="(widgetProps && widgetProps.register) || ''"
				:schema="fkSchema"
				:labelField="(widgetProps && widgetProps.labelField) || 'name'"
				:matchField="(widgetProps && widgetProps.matchField) || ''"
				:refValue="fkRefValue"
				:labelTemplate="(widgetProps && widgetProps.labelTemplate) || ''"
				:labelPath="(widgetProps && widgetProps.labelPath) || ''" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Built-in "refLabel" widget — shows the label of the referenced object(s)
		     from the batch CnIndexPage resolved for the column
		     (widgetProps { labels: { id: label|null }, route? }). An id that is not
		     in `labels` yet shows a placeholder; one that resolved to null shows the
		     id in mono. With widgetProps.route (a manifest page id) each label links
		     to that page for the referenced id. -->
		<template v-else-if="widget === 'refLabel'">
			<span v-if="!refLabelItems.length" class="cn-cell-renderer__dash">—</span>
			<span v-else class="cn-cell-renderer__ref-labels" data-testid="cn-cell-ref-labels">
				<template v-for="(item, i) in refLabelItems" :key="item.id">
					<span v-if="i > 0">, </span>
					<component
						:is="item.to ? 'router-link' : 'span'"
						:to="item.to || undefined"
						:class="[item.to ? 'cn-cell-renderer__link' : '', item.state === 'missing' ? 'cn-cell-renderer__mono' : '']"
						:title="item.state === 'label' ? item.id : undefined">
						{{ item.text }}
					</component>
				</template>
			</span>
		</template>

		<!-- Built-in "link" widget — renders the (possibly formatter-shaped) value
		     as a router-link (when widgetProps.route is a manifest page id, or
		     widgetProps.routeMap picks one per row by widgetProps.routeField) or
		     an external anchor (when widgetProps.href is set). Falls back to
		     plain text + a once-per-session console.warn when neither resolves. -->
		<template v-else-if="widget === 'link'">
			<router-link
				v-if="linkRoute"
				:to="linkRoute"
				class="cn-cell-renderer__link">
				{{ labelledValue }}
			</router-link>
			<a
				v-else-if="linkHref"
				:href="linkHref"
				target="_blank"
				rel="noopener"
				class="cn-cell-renderer__link">
				{{ labelledValue }}
			</a>
			<span v-else :title="rawTitle">{{ labelledValue }}</span>
		</template>

		<!-- Built-in "avatar" widget: a person as an avatar with the name beside
		     it. A user id (widgetProps.userField, or widgetProps.user for a cell
		     that holds the id itself) gets the Nextcloud avatar; a free name
		     gets its initials. The picture is decoration: the name is the text. -->
		<!-- The avatar of a REFERENCED object (widgetProps.resolve
		     { register, schema, labelField }): the cell holds a uuid, the name
		     is resolved as an fkResolve cell resolves it, and its initials sit
		     beside it. -->
		<template v-else-if="widget === 'avatar' && avatarResolve">
			<CnFkResolveCell
				v-if="hasValue && typeof value !== 'object'"
				v-slot="{ label, resolved }"
				:value="value"
				:register="avatarResolve.register"
				:schema="avatarResolve.schema"
				:labelField="avatarResolve.labelField || 'name'">
				<span class="cn-cell-renderer__avatar" data-testid="cn-cell-avatar-resolved">
					<span
						class="cn-cell-renderer__avatar-initials"
						:style="{ width: avatarSize + 'px', height: avatarSize + 'px' }"
						aria-hidden="true">{{ resolved ? initialsOf(label) : '' }}</span>
					<span class="cn-cell-renderer__avatar-text">
						<span class="cn-cell-renderer__avatar-name" :title="label">{{ label }}</span>
						<span
							v-if="secondary"
							class="cn-cell-renderer__avatar-secondary"
							data-testid="cn-cell-secondary">{{ secondary }}</span>
					</span>
				</span>
			</CnFkResolveCell>
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>
		<template v-else-if="widget === 'avatar'">
			<span v-if="avatarName || avatarUserId" class="cn-cell-renderer__avatar">
				<span v-if="avatarUserId" class="cn-cell-renderer__avatar-picture" aria-hidden="true">
					<NcAvatar
						:user="avatarUserId"
						:displayName="avatarName || avatarUserId"
						:size="avatarSize"
						:disableMenu="true"
						:disableTooltip="true" />
				</span>
				<span
					v-else
					class="cn-cell-renderer__avatar-initials"
					:style="{ width: avatarSize + 'px', height: avatarSize + 'px' }"
					aria-hidden="true">{{ avatarInitials }}</span>
				<span class="cn-cell-renderer__avatar-text">
					<span class="cn-cell-renderer__avatar-name" :title="avatarName || avatarUserId">{{ avatarName || avatarUserId }}</span>
					<!-- The column's secondary line (e-mail), under the name and beside the picture. -->
					<span
						v-if="secondary"
						class="cn-cell-renderer__avatar-secondary"
						data-testid="cn-cell-secondary">{{ secondary }}</span>
				</span>
			</span>
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Built-in "age" widget: how long something has waited ("4 uur",
		     "3 dagen"), coloured by widgetProps.variantWhen rules on the days
		     the cell shows. The full date is the tooltip. -->
		<template v-else-if="widget === 'age'">
			<time
				v-if="dateTimestamp"
				class="cn-cell-renderer__age"
				:class="ageVariant ? 'cn-cell-renderer__age--' + ageVariant : null"
				:datetime="dateTimestamp.toISOString()"
				:title="absoluteDateLabel">{{ ageLabel }}</time>
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Built-in "date" widget: a date whose colour follows
		     widgetProps.variantWhen, rules on the number of days until it
		     (0 = today, negative = overdue). -->
		<template v-else-if="widget === 'date'">
			<!-- `widgetProps.due`: the due text with its tone ("3 dagen te laat",
			     "Vandaag", the date, or the empty text). -->
			<template v-if="dueResult">
				<time
					v-if="dateTimestamp"
					class="cn-cell-renderer__date"
					:class="dueClass"
					:datetime="dateTimestamp.toISOString()"
					:title="absoluteDateLabel"
					data-testid="cn-cell-renderer-due">{{ dueResult.text }}</time>
				<span v-else class="cn-cell-renderer__date cn-cell-renderer__due--empty" data-testid="cn-cell-renderer-due">{{ dueResult.text }}</span>
			</template>
			<!-- `widgetProps.layout: "block"`: a date tile (day over short month)
			     beside the weekday and the time range to `widgetProps.endField`. -->
			<time
				v-else-if="dateTimestamp && dateBlock"
				class="cn-cell-renderer__date-block"
				:datetime="dateTimestamp.toISOString()"
				:title="absoluteDateLabel"
				data-testid="cn-cell-date-block">
				<span class="cn-cell-renderer__date-tile">
					<strong class="cn-cell-renderer__date-day">{{ dateBlock.day }}</strong>
					<span class="cn-cell-renderer__date-month">{{ dateBlock.month }}</span>
				</span>
				<span class="cn-cell-renderer__date-lines">
					<span class="cn-cell-renderer__date-weekday">{{ dateBlock.weekday }}</span>
					<span v-if="dateBlock.time" class="cn-cell-renderer__date-time">{{ dateBlock.time }}</span>
				</span>
			</time>
			<time
				v-else-if="dateTimestamp"
				class="cn-cell-renderer__date"
				:class="dateVariant ? 'cn-cell-renderer__date--' + dateVariant : null"
				:datetime="dateTimestamp.toISOString()"
				:title="isRelativeDate ? absoluteDateLabel : rawTitle">{{ dateLabel }}</time>
			<span v-else-if="!dateStateText" class="cn-cell-renderer__dash">—</span>
			<!-- `widgetProps.pastText` / `otherText`: a state beside the date ("Ended", "Active"). -->
			<span v-if="dateStateText"
				class="cn-cell-renderer__date-state"
				:class="{ 'cn-cell-renderer__date-state--past': dateIsPast }"
				data-testid="cn-cell-date-state">{{ dateStateText }}</span>
		</template>

		<!-- Built-in "number" widget: the value with its unit
		     (widgetProps.unit { one, other }) and, when widgetProps.flagWhen
		     holds on the row, a chip with text beside it. An empty value is an
		     empty cell, never 0. -->
		<template v-else-if="widget === 'number'">
			<span v-if="numberLabel !== ''"
				class="cn-cell-renderer__number"
				:class="numberFlag ? 'cn-cell-renderer__number--' + numberFlag.variant : null"
				data-testid="cn-cell-number">
				{{ numberLabel }}
				<CnStatusBadge v-if="numberFlag"
					class="cn-cell-renderer__number-flag"
					:label="numberFlag.text"
					:variant="numberFlag.variant"
					size="small"
					data-testid="cn-cell-number-flag" />
			</span>
		</template>

		<!-- Built-in "progress" widget: a bar with the percentage beside it,
		     toned by widgetProps.thresholds, and an optional age badge
		     ("Out of date 12 days") from widgetProps.badge. -->
		<template v-else-if="widget === 'progress'">
			<span v-if="progressPercent === null" class="cn-cell-renderer__dash">—</span>
			<span v-else class="cn-cell-renderer__progress">
				<span class="cn-cell-renderer__progress-line">
					<span class="cn-cell-renderer__progress-bar" aria-hidden="true">
						<span
							class="cn-cell-renderer__progress-fill"
							:class="'cn-cell-renderer__progress-fill--' + progressTone"
							:style="{ width: progressPercent + '%' }" />
					</span>
					<strong
						class="cn-cell-renderer__progress-value"
						:class="'cn-cell-renderer__progress-value--' + progressTone">{{ progressPercent }}%</strong>
				</span>
				<span
					v-if="progressBadge"
					class="cn-cell-renderer__progress-badge"
					:class="'cn-cell-renderer__progress-badge--' + progressBadge.tone">{{ progressBadge.label }}</span>
			</span>
		</template>

		<!-- Built-in "switch" widget: an on/off switch with the value as its
		     label. widgetProps { checked(row) => boolean, onToggle(row, on) =>
		     Promise }. The switch shows the new state at once and returns to
		     the old one when onToggle rejects. Clicks stay in the cell, so
		     toggling never opens the row. -->
		<template v-else-if="widget === 'switch'">
			<span class="cn-cell-renderer__switch"
				data-testid="cn-cell-switch"
				@click.stop
				@keydown.stop>
				<NcCheckboxRadioSwitch
					type="switch"
					:modelValue="switchChecked"
					:disabled="switchBusy || typeof (widgetProps && widgetProps.onToggle) !== 'function'"
					@update:modelValue="onSwitchToggle">
					{{ hasValue ? labelledValue : '' }}
				</NcCheckboxRadioSwitch>
			</span>
		</template>

		<!-- Built-in "iconLabel" widget: an icon before the value. widgetProps
		     { icon }: a component or an icon name, or a function of the row
		     returning one. The icon is decorative; the text carries the meaning. -->
		<template v-else-if="widget === 'iconLabel'">
			<span class="cn-cell-renderer__icon-label" data-testid="cn-cell-icon-label">
				<CnIcon v-if="typeof iconLabelIcon === 'string' && iconLabelIcon"
					:name="iconLabelIcon"
					:size="16"
					aria-hidden="true" />
				<component :is="iconLabelIcon"
					v-else-if="iconLabelIcon"
					:size="16"
					aria-hidden="true" />
				<span v-if="hasValue">{{ labelledValue }}</span>
				<span v-else class="cn-cell-renderer__dash">—</span>
			</span>
		</template>

		<!-- Explicit column formatter — overrides the type-aware paths below -->
		<template v-else-if="hasFormatter">
			<span :title="rawTitle">{{ formattedValue }}</span>
		</template>

		<!-- Declarative swatch — a colour dot (from a sibling row field) + text -->
		<template v-else-if="isSwatch">
			<span class="cn-cell-renderer__swatch-wrap">
				<span
					v-if="swatchColor"
					class="cn-cell-renderer__swatch-dot"
					:style="{ backgroundColor: swatchColor }"
					aria-hidden="true" />
				<span v-if="hasValue" :title="rawTitle">{{ labelledValue }}</span>
				<span v-else class="cn-cell-renderer__dash">—</span>
			</span>
		</template>

		<!-- Declarative built-in format (currency / duration / number / percent) -->
		<template v-else-if="hasBuiltinFormat">
			<span :title="rawTitle" class="cn-cell-renderer--number">{{ formattedValue }}</span>
		</template>

		<!-- Date / date-time: dynamic NcDateTime (relative time, absolute on hover) -->
		<template v-else-if="isDate">
			<time
				v-if="dateTimestamp && isBoardLook"
				class="cn-cell-renderer__date"
				:datetime="dateTimestamp.toISOString()"
				:title="absoluteDateLabel">{{ boardDateLabel }}</time>
			<NcDateTime v-else-if="dateTimestamp" :timestamp="dateTimestamp" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- URI / URL: external link -->
		<template v-else-if="isUri">
			<a
				v-if="uriHref"
				:href="uriHref"
				target="_blank"
				rel="noopener"
				class="cn-cell-renderer__link">
				{{ formattedValue }}
			</a>
			<span v-else-if="hasValue" :title="rawTitle">{{ formattedValue }}</span>
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Boolean: icon -->
		<template v-else-if="propertyType === 'boolean'">
			<CheckBold v-if="value" :size="16" class="cn-cell-renderer__icon cn-cell-renderer__icon--success" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Enum: status badge (auto-coloured from the property's optional colorMap) -->
		<template v-else-if="isEnum">
			<CnStatusBadge v-if="value"
				:label="enumLabel"
				:colorKey="String(value)"
				:colorMap="enumColorMap" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Array: comma-joined or count -->
		<template v-else-if="propertyType === 'array'">
			<span v-if="!value || !value.length" class="cn-cell-renderer__dash">—</span>
			<span v-else :title="Array.isArray(value) ? value.join(', ') : ''">
				{{ formattedValue }}
			</span>
		</template>

		<!-- Default: formatted text -->
		<template v-else>
			<span :title="rawTitle">{{ formattedValue }}</span>
		</template>
	</span>
</template>

<script>
import { getCanonicalLocale, translate as t } from '@nextcloud/l10n'
import { NcAvatar, NcButton, NcCheckboxRadioSwitch, NcDateTime } from '@nextcloud/vue'
import CheckBold from 'vue-material-design-icons/CheckBold.vue'
import Lock from 'vue-material-design-icons/Lock.vue'
import CnFkResolveCell from '../CnFkResolveCell/CnFkResolveCell.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnGroupNameCell from './CnGroupNameCell.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { ageInDays, boardDateLocale, formatAge, formatBoardDate, formatRelativeDate, formatTimeOfDay, resolveAgeVariant } from '../../utils/boardDate.js'
import { daysUntil, parseDateValue, resolveDateVariant } from '../../utils/dateVariant.js'
import { pillLook } from '../../utils/detailActionModel.js'
import { resolveDue } from '../../utils/dueText.js'
import { formatMoney } from '../../utils/formatMetric.js'
import { objectFieldValue } from '../../utils/objectName.js'
import { readPath } from '../../utils/readPath.js'
import { indicatorApplies } from '../../utils/rowIndicators.js'
import { safeHref } from '../../utils/safeHref.js'
import { formatValue, isGroupProp } from '../../utils/schema.js'
import { userDisplayName } from '../../utils/userDisplayName.js'
import { isWithheld, withheldReason } from '../../utils/withheldValue.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

/** A uuid in any version, the shape OpenRegister ids take. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Module-level set of column keys already warned about for a
 * `widget:"link"` declaration with no resolvable target — guarantees
 * one warning per (page, column-key) rather than per row × render.
 */
const WARNED_LINK_KEYS = new Set()

/**
 * CnCellRenderer — Type-aware cell renderer for schema-driven tables.
 *
 * Renders a single cell value based on its schema property definition.
 * Booleans render as icons, enums as status badges, dates as formatted strings,
 * and everything else as truncated text via `formatValue()`.
 *
 * ```vue
 * <CnCellRenderer :value="row.status" :property="schema.properties.status" />
 * ```
 */
export default {
	name: 'CnCellRenderer',

	components: {
		CnIcon,
		CnStatusBadge,
		NcCheckboxRadioSwitch,
		CnFkResolveCell,
		CnGroupNameCell,
		CheckBold,
		Lock,
		NcAvatar,
		NcButton,
		NcDateTime,
	},

	inject: {
		/**
		 * Cell-formatter registry, provided by CnAppRoot (`cnFormatters`).
		 * Map of formatter-id → `(value, row, property) => string|number`.
		 * Defaults to an empty object so standalone use (no CnAppRoot
		 * ancestor) is unaffected.
		 */
		cnFormatters: { default: () => ({}) },
		/**
		 * Cell-widget registry, provided by CnAppRoot (`cnCellWidgets`).
		 * Map of widget-id → Vue component. Resolves a column's `widget` id;
		 * the built-in `"badge"` is handled inline (no registry entry needed).
		 * Defaults to an empty object.
		 */
		cnCellWidgets: { default: () => ({}) },
		/**
		 * Display-layer translation function, provided by CnAppRoot
		 * (`cnTranslate: this.translate`, bound to the host app's id). Applied
		 * to the enum badge label only — the underlying value is untouched.
		 * Defaults to identity so standalone use is unaffected.
		 */
		cnTranslate: { default: () => (key) => key },
		/**
		 * The look the app is drawn in, provided by CnAppRoot (or a page with
		 * `config.look`). Under `board` a date cell reads the board's short
		 * form ("5 okt"). Defaults to `nextcloud`, which renders as before.
		 */
		cnLook: { default: 'nextcloud' },
	},

	props: {
		/**
		 * The raw cell value. String precedes Boolean: with Boolean first Vue
		 * casts an empty string to `true`, and an empty cell drew a check mark.
		 */
		value: {
			// eslint-disable-next-line vue/prefer-prop-type-boolean-first -- an empty string must stay a string
			type: [String, Number, Boolean, Array, Object],
			default: null,
		},

		/** Schema property definition: { type, format, enum, items, title } */
		property: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Optional cell-formatter id (e.g. `currency`, `automationTrigger`).
		 * When set and resolvable in the injected `cnFormatters` registry,
		 * the cell renders `cnFormatters[formatter](value, row, property,
		 * formatterOptions)` as text — an explicit override of the type-aware
		 * rendering below.
		 */
		formatter: {
			type: String,
			default: null,
		},

		/**
		 * Declarative options map passed as the formatter's fourth argument
		 * (e.g. `{ currency: 'USD' }` for the built-in `currency` formatter,
		 * or `{ negative, zero, positive }` phrases for `conditionalPhrase`).
		 * Undefined-safe: three-argument formatters simply ignore it.
		 */
		formatterOptions: {
			type: Object,
			default: null,
		},

		/**
		 * Optional cell-widget id (e.g. `badge`, or a consumer-registered
		 * name). When it resolves in `cnCellWidgets` the cell renders that
		 * component with `{ value, row, property, formatted, ...widgetProps }`;
		 * the built-in id `"badge"` renders `CnStatusBadge` and the built-in
		 * id `"fkResolve"` renders `CnFkResolveCell` (uuid → related object
		 * label, config via `widgetProps { register, schema, labelField }`),
		 * and the built-in id `"refLabel"` shows labels already resolved in a
		 * batch (`widgetProps { labels, route? }`, set by CnIndexPage for a
		 * column with `labelField`).
		 * The built-in id `"avatar"` renders a person as an avatar with the
		 * name beside it (`widgetProps { userField?, user?, nameField?, size? }`;
		 * a free name gets its initials), and the built-in id `"date"` renders
		 * a date whose colour follows `widgetProps.variantWhen`, rules on the
		 * number of days until the date (`[{ op: "lt", value: 0, variant:
		 * "error" }, { op: "lte", value: 5, variant: "warning" }]`).
		 * The built-in id `"age"` renders how long the row has waited since
		 * the date ("4 hours", "3 days"), coloured by `widgetProps.variantWhen`
		 * rules on the days it shows (`[{ op: "gte", value: 3, variant:
		 * "error" }]`).
		 * The built-in id `"group"` shows a Nextcloud group id (or a list of
		 * them) as the group's display name; a column whose property is
		 * marked `referenceType: "nextcloud-group"` gets it without asking.
		 * Takes precedence over `formatter`/the type-aware rendering, but the
		 * value handed to the widget is the formatter-shaped `formatted` when
		 * `formatter` is also set.
		 */
		widget: {
			type: String,
			default: null,
		},

		/**
		 * Extra props spread onto the resolved cell-widget component. The
		 * built-in `"link"` reads its target from here: `route` (a manifest
		 * page id), `params` (route param to row field), `href` (URL with
		 * `{field}` placeholders), and `routeField` + `routeMap` to pick the
		 * page per row from a sibling field (`{ person: 'ContactDetail' }`),
		 * with `route` as the fallback for a value the map does not hold.
		 */
		widgetProps: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The column's secondary line (a muted second line under the value).
		 * The `avatar` widget draws it under the name, beside the picture;
		 * other cells ignore it, because the table draws it under the cell.
		 */
		secondary: {
			type: String,
			default: '',
		},

		/**
		 * Optional declarative cell-format spec — a no-code alternative to a
		 * registry `formatter`. Recognised `style` values:
		 *
		 * - `'currency'` → `Intl.NumberFormat` currency (e.g. `€ 1.234,56`),
		 *   honouring `currency` (ISO code, default `'EUR'`) and `decimals`
		 *   (default 2).
		 * - `'number'` / `'percent'` → localized number (percent appends `%`),
		 *   honouring `decimals` (default 0).
		 * - `'duration'` → a seconds value rendered compact (`1u 23m`, `45m 10s`,
		 *   `12s`); pass `unit: 'milliseconds'` / `'minutes'` / `'hours'` when the
		 *   raw value is not in seconds. Sub-second millisecond values render as
		 *   `245ms` rather than rounding down to `0s`.
		 * - `'swatch'` → a colour dot read from a sibling row field named by
		 *   `colorField` (the value renders as the cell text beside it).
		 *
		 * `prefix` / `suffix` are prepended/appended to the numeric styles.
		 * Resolved AFTER `formatter` / `widget` (those win), but BEFORE the
		 * type-aware rendering, so a manifest column can opt into currency or a
		 * colour swatch without registering a function.
		 *
		 * @type {{style?: 'currency'|'number'|'percent'|'duration'|'swatch', currency?: string, decimals?: number, unit?: 'milliseconds'|'seconds'|'minutes'|'hours', prefix?: string, suffix?: string, colorField?: string}}
		 */
		format: {
			type: Object,
			default: null,
		},

		/**
		 * The full row object — passed so a formatter can be a function of
		 * the whole record (e.g. "days since `@self.updated`"), not just
		 * this one cell value.
		 */
		row: {
			type: Object,
			default: () => ({}),
		},

		/** Maximum string length before truncation */
		truncate: {
			type: Number,
			default: 100,
		},

		/**
		 * Row identifier field — used by the built-in `widget:"link"` when
		 * the manifest doesn't specify an explicit `widgetProps.params`
		 * map. Defaults to `'id'` so router-link param resolution works
		 * with the manifest convention (`/x/:id`).
		 */
		rowKey: {
			type: String,
			default: 'id',
		},
	},

	data() {
		return {
			// The switch's state while its onToggle is in flight, or null.
			switchPending: null,
		}
	},

	computed: {
		/**
		 * The schema an `fkResolve` cell reads: `widgetProps.schema`, or the one
		 * `widgetProps.schemaFrom` (`{ field, map }`) names for this row, for a
		 * reference that points at objects of more than one schema.
		 *
		 * @return {string}
		 */
		fkSchema() {
			const props = this.widgetProps || {}
			const from = props.schemaFrom
			if (from && typeof from === 'object' && from.field && this.row) {
				const mapped = (from.map || {})[String(this.row[from.field])]
				if (mapped) {
					return mapped
				}
			}
			return props.schema || ''
		},

		/**
		 * The `actions` widget's buttons for this row: the page's resolved
		 * `widgetProps.items` (a list, or a function of the row returning
		 * one), each `{ key, label, variant?, disabled? }`.
		 *
		 * @return {Array<{key: string, label: string, variant: string, disabled: boolean}>}
		 * @spec openspec/changes/table-actions-column/specs/index-page/spec.md#requirement-a-column-can-show-row-actions-as-buttons
		 */
		actionItems() {
			const raw = typeof this.widgetProps?.items === 'function' ? this.widgetProps.items(this.row) : this.widgetProps?.items
			const items = Array.isArray(raw) ? raw : []
			return items.map((item) => ({
				...item,
				variant: item.variant || 'secondary',
				disabled: item.disabled === true,
			}))
		},

		/**
		 * Whether the "switch" widget is on: the pending state while a toggle
		 * is in flight, else `widgetProps.checked(row)`, else the value.
		 *
		 * @return {boolean} The switch state.
		 */
		switchChecked() {
			if (this.switchPending !== null) {
				return this.switchPending
			}
			const checked = this.widgetProps && this.widgetProps.checked
			if (typeof checked === 'function') {
				return checked(this.row) === true
			}
			return this.value === true
		},

		/**
		 * @return {boolean} Whether a toggle is in flight.
		 */
		switchBusy() {
			return this.switchPending !== null
		},

		/**
		 * The "iconLabel" widget's icon, resolved against the row.
		 *
		 * @return {object|string|null} A component, an icon name, or null.
		 */
		iconLabelIcon() {
			const icon = this.widgetProps && this.widgetProps.icon
			const resolved = typeof icon === 'function' ? icon(this.row) : icon
			return resolved || null
		},

		propertyType() {
			return this.property?.type || (typeof this.value)
		},

		isEnum() {
			return !!(this.property?.enum && this.property.enum.length > 0)
		},

		/**
		 * Badge text for an enum cell. Schema enum values are English source
		 * codes, so a Dutch session otherwise reads `submitted` in a table whose
		 * headers are Dutch. Only the label is translated — the cell's value,
		 * sorting and filtering keep using the raw code.
		 */
		enumLabel() {
			const raw = String(this.value)
			const labels = (this.property && (this.property.enumLabels || this.property['x-enum-labels'])) || {}
			return this.cnTranslate(labels[raw] || raw)
		},

		/** True when the property is a date / date-time (rendered via NcDateTime). */
		isDate() {
			return this.property?.format === 'date-time' || this.property?.format === 'date'
		},

		/**
		 * The cell value as a Date for NcDateTime, or `null` when absent or
		 * unparseable (the cell then falls back to a dash / plain text).
		 *
		 * @return {Date|null}
		 */
		dateTimestamp() {
			if (!this.hasValue) {
				return null
			}
			const date = new Date(this.value)
			return Number.isNaN(date.getTime()) ? null : date
		},

		/**
		 * `avatar` widget: the Nextcloud user id whose avatar to show, or ''
		 * for a free name. Read from the row field `widgetProps.userField`,
		 * or from the cell value itself when `widgetProps.user` is true.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-avatar-and-date-cells
		 */
		avatarUserId() {
			const props = this.widgetProps || {}
			let id = ''
			if (typeof props.userField === 'string' && props.userField !== '') {
				id = objectFieldValue(this.row, props.userField)
			} else if (props.user === true) {
				id = this.value
			}
			return (typeof id === 'string' || typeof id === 'number') ? String(id) : ''
		},

		/**
		 * `avatar` widget: the name shown beside the picture. Read from the
		 * row field `widgetProps.nameField` when set; a cell holding a user id
		 * (`widgetProps.user`) shows that user's display name once it is
		 * known; else the cell value.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-avatar-and-date-cells
		 * @spec openspec/changes/avatar-cell-user-display-name/specs/data-table/spec.md#requirement-an-avatar-cell-holding-a-user-id-shows-the-users-display-name
		 */
		avatarName() {
			const props = this.widgetProps || {}
			if (typeof props.nameField === 'string' && props.nameField !== '') {
				const name = objectFieldValue(this.row, props.nameField)
				if (typeof name === 'string' && name !== '') {
					return name
				}
			}
			if (props.user === true && this.avatarUserId !== '') {
				const displayName = userDisplayName(this.avatarUserId)
				if (displayName !== '') {
					return displayName
				}
			}
			if (!this.hasValue || typeof this.value === 'object') {
				return ''
			}
			return String(this.hasFormatter ? this.formattedValue : this.value)
		},

		/**
		 * `avatar` widget: the initials of a free name, at most two letters
		 * (first and last word).
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-avatar-and-date-cells
		 */
		avatarInitials() {
			return this.initialsOf(this.avatarName)
		},

		/**
		 * `avatar` widget: where a REFERENCED person's name comes from
		 * (`widgetProps.resolve`, `{ register, schema, labelField? }`, the
		 * shape the facts widget's `resolve` takes), or null when the cell
		 * holds the name or user id itself.
		 *
		 * @return {{register: string, schema: string, labelField?: string}|null}
		 * @spec openspec/changes/screens-avatar-cell-resolve/specs/data-table/spec.md
		 */
		avatarResolve() {
			const resolve = this.widgetProps && this.widgetProps.resolve
			if (!resolve || typeof resolve !== 'object') {
				return null
			}
			if (typeof resolve.register !== 'string' || resolve.register === '' || typeof resolve.schema !== 'string' || resolve.schema === '') {
				return null
			}
			return resolve
		},

		/**
		 * `avatar` widget: the picture size in pixels (`widgetProps.size`, default 24,
		 * 32 under the board look).
		 *
		 * @return {number}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-avatar-and-date-cells
		 */
		avatarSize() {
			const size = Number(this.widgetProps && this.widgetProps.size)
			return Number.isFinite(size) && size > 0 ? size : (this.isBoardLook ? 32 : 24)
		},

		/**
		 * `date` widget with `widgetProps.due`: the colour class. The
		 * `variantWhen` rules win when they match; else an overdue date reads
		 * as an error and a soon one (`due.soonWithin`) as a warning.
		 *
		 * @return {string|null} The class, or null for the plain colour.
		 * @spec openspec/changes/due-text-soon/specs/due-text-soon/spec.md#requirement-a-due-date-within-a-few-days-reads-as-soon
		 */
		dueClass() {
			if (this.dateVariant) {
				return 'cn-cell-renderer__date--' + this.dateVariant
			}
			if (this.dueResult && this.dueResult.tone === 'danger') {
				return 'cn-cell-renderer__date--error'
			}
			if (this.dueResult && this.dueResult.tone === 'muted') {
				return 'cn-cell-renderer__date--muted'
			}
			return this.dueResult && this.dueResult.soon ? 'cn-cell-renderer__date--warning' : null
		},

		/**
		 * `date` widget: whether the date lies before today.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/object-list-by-field/specs/object-list-widget/spec.md#requirement-a-date-cell-can-say-its-state-and-groups-keep-a-set-order
		 */
		dateIsPast() {
			const days = daysUntil(this.value)
			return days !== null && days < 0
		},

		/**
		 * `date` widget: `widgetProps.pastText` for a past date, else
		 * `widgetProps.otherText` (also for an empty one), translated; '' without either.
		 *
		 * @return {string}
		 * @spec openspec/changes/object-list-by-field/specs/object-list-widget/spec.md#requirement-a-date-cell-can-say-its-state-and-groups-keep-a-set-order
		 */
		dateStateText() {
			const props = this.widgetProps || {}
			const text = this.dateIsPast ? props.pastText : props.otherText
			return typeof text === 'string' && text !== '' ? this.cnTranslate(text) : ''
		},

		/**
		 * `date` widget: the variant of the first `widgetProps.variantWhen`
		 * rule the date matches, or '' for none.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-avatar-and-date-cells
		 */
		dateVariant() {
			const rules = this.widgetProps && this.widgetProps.variantWhen
			const variant = resolveDateVariant(this.value, rules)
			return variant === 'default' ? '' : variant
		},

		/**
		 * Whether the app takes the board look (`cnLook` is `board`).
		 *
		 * @return {boolean}
		 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-a-board-date-cell-reads-day-and-short-month-in-the-user-language
		 */
		isBoardLook() {
			return normalizeLook(this.cnLook) === 'board'
		},

		/**
		 * The board's short date ("5 okt", "14 feb 2024" outside this year).
		 *
		 * @return {string}
		 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-a-board-date-cell-reads-day-and-short-month-in-the-user-language
		 */
		boardDateLabel() {
			return formatBoardDate(this.value)
		},

		/**
		 * The full date for a tooltip: day, month and year in the user's
		 * locale, with the time for a date-time value.
		 *
		 * @return {string|undefined}
		 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-an-age-cell-says-how-long-something-has-waited
		 */
		absoluteDateLabel() {
			const date = parseDateValue(this.value)
			if (date === null) {
				return undefined
			}
			const withTime = this.property?.format === 'date-time' || this.widget === 'age' || (this.widget === 'date' && this.widgetProps?.showTime === true)
			const options = { day: 'numeric', month: 'long', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }
			try {
				return new Intl.DateTimeFormat(getCanonicalLocale() || undefined, options).format(date)
			} catch {
				return new Intl.DateTimeFormat(undefined, options).format(date)
			}
		},

		/**
		 * `date` widget with `widgetProps.due`: the due text and its tone.
		 * Null without the key, or when the field is empty and no `emptyText`.
		 *
		 * @return {{text: string, tone: string}|null}
		 * @spec openspec/changes/screens-due-text/specs/due-text/spec.md#requirement-a-due-date-reads-as-text-with-a-tone
		 */
		dueResult() {
			const due = this.widgetProps && this.widgetProps.due
			if (this.widget !== 'date' || !due || typeof due !== 'object') {
				return null
			}
			return resolveDue(this.value, due, (text) => this.cnTranslate(text), new Date(), this.row)
		},

		/**
		 * Whether the `date` widget reads relatively (`widgetProps.relative`).
		 *
		 * @return {boolean}
		 * @spec openspec/changes/screens-relative-dates/specs/relative-dates/spec.md#requirement-a-relative-date-reads-today-yesterday-then-a-short-date
		 */
		isRelativeDate() {
			return this.widgetProps?.relative === true
		},

		/**
		 * `age` widget: how long the row has waited ("4 uur", "3 dagen").
		 *
		 * @return {string}
		 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-an-age-cell-says-how-long-something-has-waited
		 */
		ageLabel() {
			return formatAge(this.value)
		},

		/**
		 * `progress` widget: the value as a whole percentage of
		 * `widgetProps.max` (default 100), clamped to 0..100. An empty value
		 * falls back to the first `widgetProps.fallbackFields` row field that
		 * holds a number. Null when nothing holds one.
		 *
		 * @return {number|null}
		 * @spec openspec/changes/abstract-progress-cell/specs/progress-cell/spec.md#requirement-a-progress-cell-draws-a-toned-bar-with-its-percentage
		 */
		progressPercent() {
			const props = this.widgetProps || {}
			const fallbacks = Array.isArray(props.fallbackFields) ? props.fallbackFields : []
			const candidates = [this.value, ...fallbacks.map((field) => readPath(this.row || {}, field))]
			const raw = candidates.find((v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v)))
			if (raw === undefined) {
				return null
			}
			const max = Number(props.max) > 0 ? Number(props.max) : 100
			return Math.max(0, Math.min(100, Math.round((Number(raw) / max) * 100)))
		},

		/**
		 * `progress` widget: the tone. `widgetProps.thresholds`
		 * `{ good: 60, warn: 30 }` (the defaults): at or above `good` is
		 * success, at or above `warn` is warning, below is error. With
		 * `widgetProps.lowerIsBetter` the scale turns around.
		 *
		 * @return {'success'|'warning'|'error'}
		 * @spec openspec/changes/abstract-progress-cell/specs/progress-cell/spec.md#requirement-a-progress-cell-draws-a-toned-bar-with-its-percentage
		 */
		progressTone() {
			const props = this.widgetProps || {}
			const thresholds = props.thresholds || {}
			const good = Number.isFinite(Number(thresholds.good)) ? Number(thresholds.good) : 60
			const warn = Number.isFinite(Number(thresholds.warn)) ? Number(thresholds.warn) : 30
			const value = props.lowerIsBetter === true ? 100 - this.progressPercent : this.progressPercent
			if (value >= good) {
				return 'success'
			}
			return value >= warn ? 'warning' : 'error'
		},

		/**
		 * `progress` widget: the age badge, or null. `widgetProps.badge`
		 * `{ label, dateField, afterDays, when?, tone? }`: shown when the row's
		 * `dateField` (default `@self.updated`) lies `afterDays` or more days
		 * back and every `when` field equals its value. `label` is translated
		 * and takes `{days}`.
		 *
		 * @return {{label: string, tone: string}|null}
		 * @spec openspec/changes/abstract-progress-cell/specs/progress-cell/spec.md#requirement-a-progress-cell-can-carry-an-age-badge
		 */
		progressBadge() {
			const badge = this.widgetProps && this.widgetProps.badge
			if (!badge || typeof badge !== 'object' || !badge.label) {
				return null
			}
			const row = this.row || {}
			const when = badge.when && typeof badge.when === 'object' ? badge.when : {}
			for (const [field, expected] of Object.entries(when)) {
				const actual = readPath(row, field)
				if (actual !== undefined && actual !== null && actual !== '' && String(actual) !== String(expected)) {
					return null
				}
			}
			const days = ageInDays(readPath(row, badge.dateField || '@self.updated'))
			const after = Number(badge.afterDays)
			if (days === null || !Number.isFinite(after) || days < after) {
				return null
			}
			const label = this.cnTranslate(badge.label)
			return {
				label: String(label).replace(/\{days\}/g, String(days)),
				tone: ['error', 'warning', 'success'].includes(badge.tone) ? badge.tone : 'error',
			}
		},

		/**
		 * `age` widget: the variant of the first `widgetProps.variantWhen`
		 * rule the shown days match, or '' for none.
		 *
		 * @return {string}
		 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-an-age-cell-turns-red-past-its-threshold
		 */
		ageVariant() {
			const variant = resolveAgeVariant(this.value, this.widgetProps && this.widgetProps.variantWhen)
			return variant === 'default' ? '' : variant
		},

		/**
		 * `date` widget: the date written out in the user's locale.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-avatar-and-date-cells
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-small-opt-ins-from-the-decidiq-and-learniq-lanes
		 */
		/**
		 * `date` widget with `widgetProps.layout: "block"`: the parts of the
		 * date tile (day number, short month), the weekday and the time range
		 * ("09.30 tot 12.00 uur") to the row field `widgetProps.endField`.
		 * Null for any other cell.
		 *
		 * @return {{day: string, month: string, weekday: string, time: string}|null}
		 * @spec openspec/changes/screens-date-tile-cell/specs/data-table/spec.md
		 */
		dateBlock() {
			const props = this.widgetProps || {}
			if (this.widget !== 'date' || props.layout !== 'block' || !this.dateTimestamp) {
				return null
			}
			const start = this.dateTimestamp
			const format = (options) => {
				try {
					return new Intl.DateTimeFormat(boardDateLocale(), options).format(start)
				} catch {
					return new Intl.DateTimeFormat(undefined, options).format(start)
				}
			}
			// A date without a time of day (format `date`, or a bare
			// YYYY-MM-DD) draws no time line.
			const dateOnly = this.property?.format === 'date' || (typeof this.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(this.value))
			let time = ''
			if (!dateOnly) {
				const startTime = formatTimeOfDay(start)
				let end = null
				if (typeof props.endField === 'string' && props.endField !== '') {
					const raw = objectFieldValue(this.row, props.endField)
					const parsed = (raw === null || raw === undefined || raw === '') ? null : new Date(raw)
					end = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
				}
				time = end
					? t('nextcloud-vue', '{start} to {end}', { start: startTime, end: formatTimeOfDay(end) })
					: startTime
			}
			return {
				day: format({ day: 'numeric' }),
				// "okt." in Dutch: the board draws the month without the dot.
				month: format({ month: 'short' }).replace(/\.$/, ''),
				weekday: format({ weekday: 'long' }),
				time,
			}
		},

		dateLabel() {
			const date = parseDateValue(this.value)
			if (date === null) {
				return ''
			}
			// `widgetProps.showTime: true` adds the time of day ("5 Oct 2026,
			// 08:30"); `widgetProps.timeOnly: true` shows just the time
			// ("08:30"), for a timetable row. Default: the date alone.
			const props = this.widgetProps || {}
			// `widgetProps.relative: true` says "today" and "yesterday" and then
			// the short date ("vandaag, 09.42" with `showTime`), in any look.
			if (props.relative === true) {
				return formatRelativeDate(date, { withTime: props.showTime === true })
			}
			// The board look writes a plain date in its short form ("5 okt");
			// a time of day keeps the full form below.
			if (this.isBoardLook && props.timeOnly !== true && props.showTime !== true) {
				return formatBoardDate(date)
			}
			const options = props.timeOnly === true
				? { hour: '2-digit', minute: '2-digit' }
				: { day: 'numeric', month: 'short', year: 'numeric', ...(props.showTime === true ? { hour: '2-digit', minute: '2-digit' } : {}) }
			let locale
			try {
				locale = getCanonicalLocale()
			} catch {
				locale = undefined
			}
			try {
				return new Intl.DateTimeFormat(locale || undefined, options).format(date)
			} catch {
				return new Intl.DateTimeFormat(undefined, options).format(date)
			}
		},

		/** True when the property is a URI / URL (rendered as an external link). */
		isUri() {
			return this.property?.format === 'uri' || this.property?.format === 'url'
		},

		/**
		 * Safe external href for a URI/URL cell, or `null` when the value is
		 * absent or fails `safeHref` validation (e.g. an unsafe scheme).
		 *
		 * @return {string|null}
		 */
		uriHref() {
			if (!this.hasValue) {
				return null
			}
			return safeHref(String(this.value))
		},

		/** True when the cell has a renderable value (not null/undefined/empty string). */
		hasValue() {
			return this.value !== null && this.value !== undefined && this.value !== ''
		},

		/**
		 * The row's own reference for an `fkResolve` cell (`widgetProps.refField`),
		 * or null when the row has none.
		 *
		 * @return {string|number|Array|null}
		 * @spec openspec/changes/fk-resolve-lookup/specs/fk-resolve-lookup/spec.md#requirement-a-reference-cell-can-look-its-record-up-by-a-property
		 */
		fkRefValue() {
			const field = this.widgetProps && this.widgetProps.refField
			if (!field || !this.row) {
				return null
			}
			const ref = readPath(this.row, field)
			const empty = ref === null || ref === undefined || ref === '' || (Array.isArray(ref) && ref.length === 0)
			return empty || (typeof ref === 'object' && !Array.isArray(ref)) ? null : ref
		},

		/**
		 * Whether the value is OpenRegister's withheld marker, which every
		 * other path would stringify to `[object Object]`.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-withheld-value-reads-as-withheld
		 */
		withheld() {
			return isWithheld(this.value)
		},

		/**
		 * The text a withheld value reads as.
		 *
		 * @return {string}
		 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-withheld-value-reads-as-withheld
		 */
		withheldText() {
			return t('nextcloud-vue', 'Withheld')
		},

		/**
		 * Why a value is withheld, as the cell's tooltip.
		 *
		 * @return {string}
		 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-withheld-value-reads-as-withheld
		 */
		withheldHint() {
			return withheldReason(this.value) === 'access'
				? t('nextcloud-vue', 'You may not open the linked object, so its value is not shown.')
				: t('nextcloud-vue', 'This value is not shown.')
		},

		/**
		 * `number` widget: the value with `widgetProps.unit` (`{ one, other }`
		 * with `{count}`, through the app's translate), else the number in the
		 * user's locale. '' for an empty or unreadable value.
		 *
		 * @return {string}
		 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-number-cell-reads-with-its-unit-and-a-flag
		 */
		numberLabel() {
			if (!this.hasValue || typeof this.value === 'object' || typeof this.value === 'boolean') {
				return ''
			}
			const count = Number(this.value)
			if (!Number.isFinite(count)) {
				return ''
			}
			const unit = this.widgetProps && this.widgetProps.unit
			if (unit && typeof unit === 'object' && (unit.one || unit.other)) {
				const template = this.cnTranslate((count === 1 ? unit.one : unit.other) || unit.other || unit.one)
				return template.replace(/\{count\}/g, String(count))
			}
			return count.toLocaleString(getCanonicalLocale() || undefined)
		},

		/**
		 * `number` widget: the chip `widgetProps.flagWhen` asks for on this
		 * row (`{ field, equals | in, text, variant }`), or null.
		 *
		 * @return {{text: string, variant: string}|null}
		 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-number-cell-reads-with-its-unit-and-a-flag
		 */
		numberFlag() {
			const flag = this.widgetProps && this.widgetProps.flagWhen
			if (!flag || typeof flag !== 'object' || typeof flag.text !== 'string' || flag.text === '' || !indicatorApplies(flag, this.row || {})) {
				return null
			}
			return { text: this.cnTranslate(flag.text), variant: isBadgeVariant(flag.variant) ? flag.variant : 'warning' }
		},

		/**
		 * Built-in `badge`: the tooltip `widgetProps.titleWhen`
		 * (`{ field, equals | in, text }`) asks for on this row, or undefined.
		 *
		 * @return {string|undefined}
		 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-badge-cell-can-carry-a-tooltip
		 */
		badgeTitle() {
			const when = this.widgetProps && this.widgetProps.titleWhen
			if (!when || typeof when !== 'object' || typeof when.text !== 'string' || when.text === '' || !indicatorApplies(when, this.row || {})) {
				return undefined
			}
			return this.cnTranslate(when.text)
		},

		/**
		 * Resolved cell-widget component for this column, or `null`. A column's
		 * `widget` id resolves against the injected `cnCellWidgets` registry;
		 * the built-in `"badge"` is NOT resolved here (handled inline in the
		 * template) so apps can still override `"badge"` via the registry.
		 *
		 * @return {import('vue').Component|null}
		 */
		widgetComponent() {
			if (!this.widget) {
				return null
			}
			const c = this.cnCellWidgets && this.cnCellWidgets[this.widget]
			return c || null
		},

		/**
		 * Whether this cell shows Nextcloud group names: the column asks for
		 * `widget: "group"`, or it names no widget and no formatter and its
		 * property is a group (or a list of groups).
		 *
		 * @spec openspec/changes/nextcloud-group-surfaces/specs/data-display/spec.md#requirement-a-group-cell-shows-the-groups-display-name
		 * @return {boolean}
		 */
		isGroupCell() {
			if (this.widget === 'group') {
				return true
			}
			if (this.widget || this.hasFormatter) {
				return false
			}
			const p = this.property
			if (!p || typeof p !== 'object') {
				return false
			}
			return isGroupProp(p) || (p.type === 'array' && isGroupProp(p.items))
		},

		/**
		 * The group ids in this cell, empty ones dropped.
		 *
		 * @spec openspec/changes/nextcloud-group-surfaces/specs/data-display/spec.md#requirement-a-group-cell-shows-the-groups-display-name
		 * @return {string[]}
		 */
		groupIds() {
			const raw = this.value
			const list = Array.isArray(raw) ? raw : [raw]
			return list
				.filter((gid) => (typeof gid === 'string' && gid !== '') || typeof gid === 'number')
				.map((gid) => String(gid))
		},

		/**
		 * The text a built-in widget (`badge`, `link`) or a swatch shows. An
		 * enum value reads its label the way the plain enum cell does
		 * (`enumLabel`: `x-enum-labels`, translated), so a list says "Active"
		 * where the detail page does, not the stored "active". A column
		 * formatter still wins: an app that shapes the value itself gets
		 * exactly what its formatter returns.
		 *
		 * @return {string}
		 * @spec openspec/changes/cell-labels-and-draft-indicator/specs/cell-labels-and-draft-indicator/spec.md#requirement-a-built-in-cell-widget-shows-an-enum-value-by-its-label
		 */
		labelledValue() {
			if (!this.hasFormatter && this.isEnum && this.hasValue && typeof this.value !== 'object') {
				return this.enumLabel
			}
			return String(this.formattedValue)
		},

		/**
		 * The key the built-in `badge` looks its colour up by: the raw value
		 * when `widgetProps.colorMap` has an entry for it (case-insensitive),
		 * so a translated label keeps the colour the manifest keyed on the
		 * stored code. Otherwise '' and the badge looks up its label, as before,
		 * which keeps a map keyed on a formatter's output working.
		 *
		 * @return {string}
		 * @spec openspec/changes/cell-labels-and-draft-indicator/specs/cell-labels-and-draft-indicator/spec.md#requirement-a-built-in-cell-widget-shows-an-enum-value-by-its-label
		 */
		badgeColorKey() {
			const map = this.badgeColorMap
			if (!map || !this.hasValue || typeof this.value === 'object') {
				return ''
			}
			const raw = String(this.value).toLowerCase()
			return Object.keys(map).some((key) => key.toLowerCase() === raw) ? String(this.value) : ''
		},

		/**
		 * What the built-in `badge` widget takes from the record its value
		 * points at (`widgetProps.looks`, filled by CnIndexPage from
		 * `widgetProps.resolve`): a tone and an icon, or nothing.
		 *
		 * @return {{variant?: string, colorMap?: null, icon?: string}}
		 * @spec openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-badge-cell-takes-its-tone-and-icon-from-the-referenced-record
		 */
		badgeLook() {
			const looks = this.widgetProps && this.widgetProps.looks
			if (!looks || typeof looks !== 'object' || !this.hasValue || typeof this.value === 'object') {
				return {}
			}
			return pillLook(looks[String(this.value)])
		},

		/** Variant for the built-in `badge` widget: the referenced record's tone, else `widgetProps.variant`, else `'default'`. */
		badgeVariant() {
			return this.badgeLook.variant || (this.widgetProps && this.widgetProps.variant) || 'default'
		},

		/**
		 * Color map for the built-in `badge` widget — `widgetProps.colorMap`,
		 * a `{ value: variant }` map (e.g. `{ placed: 'primary', delivered: 'success' }`)
		 * that CnStatusBadge resolves per label. Null when unset (falls back to
		 * `badgeVariant`). Lets a manifest colour a status column without code.
		 * A column-level `colorMap` (it reaches the cell as the property's
		 * `colorMap`) works too, so `{ widget: 'badge', colorMap }` and
		 * `{ widget: 'badge', widgetProps: { colorMap } }` read the same.
		 *
		 * @return {object|null}
		 */
		badgeColorMap() {
			if (this.badgeLook.variant) {
				return null
			}
			return (this.widgetProps && this.widgetProps.colorMap) || this.enumColorMap || null
		},

		/**
		 * Color map for the auto-rendered enum badge — read from the schema
		 * property's optional `colorMap` (or `x-color-map`). Null when unset, so
		 * enum cells stay the default grey unless the schema opts into colours.
		 *
		 * @return {object|null}
		 */
		enumColorMap() {
			return (this.property && (this.property.colorMap || this.property['x-color-map'])) || null
		},

		/**
		 * The manifest page id the built-in `widget:"link"` routes this row
		 * to, or null.
		 *
		 * `widgetProps.routeField` names a sibling field on the row, and
		 * `widgetProps.routeMap` maps that field's values to page ids, so one
		 * column can link a person to `ContactDetail` and an organisation to
		 * `OrganisationDetail` off `initiatorType`. A row whose value has no
		 * entry in the map falls back to the fixed `widgetProps.route`, and
		 * without one the cell renders as text. The map is the whole
		 * vocabulary: a row value is only ever used as a KEY into it, never
		 * as a route name itself, so row data cannot send a link to a page
		 * the manifest did not name.
		 *
		 * @return {string|null} The page id, or null when none resolves.
		 */
		linkRouteName() {
			const wp = this.widgetProps || {}
			const map = wp.routeMap
			if (typeof wp.routeField === 'string' && wp.routeField !== '' && map && typeof map === 'object') {
				const key = this.row ? this.row[wp.routeField] : undefined
				if (key !== undefined && key !== null && Object.hasOwn(map, String(key))) {
					const mapped = map[String(key)]
					if (typeof mapped === 'string' && mapped !== '') {
						return mapped
					}
				}
			}
			return (typeof wp.route === 'string' && wp.route !== '') ? wp.route : null
		},

		/**
		 * Items of the built-in `widget:"refLabel"`: one per referenced id with
		 * its text, state (`label`, `loading` or `missing`) and optional link.
		 *
		 * @return {Array<{id: string, text: string, state: string, to: (object|null)}>}
		 */
		refLabelItems() {
			if (this.widget !== 'refLabel') {
				return []
			}
			const wp = this.widgetProps || {}
			const labels = wp.labels || {}
			const raw = this.value
			const list = Array.isArray(raw) ? raw : [raw]
			return list
				.filter((id) => id !== null && id !== undefined && id !== '')
				.map((id) => {
					const key = String(id)
					const known = Object.hasOwn(labels, key)
					const label = known ? labels[key] : undefined
					const state = !known ? 'loading' : (label ? 'label' : 'missing')
					return {
						id: key,
						state,
						text: state === 'label' ? label : (state === 'loading' ? '…' : key),
						to: (state === 'label' && typeof wp.route === 'string' && wp.route !== '') ? { name: wp.route, params: { id: key } } : null,
					}
				})
		},

		/**
		 * Resolved router-link target for the built-in `widget:"link"`. When
		 * a page id resolves (`widgetProps.route`, or the row's entry in
		 * `widgetProps.routeMap`, see `linkRouteName`), returns
		 * `{ name: route, params }`. Param map is `widgetProps.params`
		 * (a map of route-param-name → row-field-name); when omitted,
		 * defaults to `{ id: row[rowKey] }`. Returns null when no page id
		 * resolves (the template falls through to `linkHref` or plain
		 * text).
		 *
		 * @return {object|null}
		 */
		linkRoute() {
			if (this.widget !== 'link') {
				return null
			}
			const route = this.linkRouteName
			if (!route) {
				return null
			}
			const paramMap = (this.widgetProps && this.widgetProps.params)
				|| { id: this.rowKey || 'id' }
			const params = {}
			for (const [routeParam, rowField] of Object.entries(paramMap)) {
				params[routeParam] = this.row && this.row[rowField]
			}
			return { name: route, params }
		},

		/**
		 * Resolved external href for the built-in `widget:"link"` when
		 * `widgetProps.href` is set. `{key}` placeholders in the href
		 * are substituted from the row (`"/x/{id}"` + `row.id === "42"`
		 * → `"/x/42"`). The final computed value is validated with
		 * `safeHref` so row-injected values cannot introduce unsafe
		 * schemes: a `javascript:` or `data:` result renders as plain text
		 * instead of a link. Returns null when `href` isn't set.
		 *
		 * @return {string|null}
		 */
		linkHref() {
			if (this.widget !== 'link') {
				return null
			}
			const href = this.widgetProps && this.widgetProps.href
			if (!href) {
				return null
			}
			const resolved = String(href).replace(/\{(\w+)\}/g, (_, key) => this.row && this.row[key] !== null && this.row[key] !== undefined ? String(this.row[key]) : '')
			// The safeHref retrofit (18700fd94) put this check here and a later
			// lint pass (e5ea00d51) dropped it, leaving the docblock above
			// promising a check the code no longer made: a template of `{url}`
			// put a row's `javascript:` value straight into `:href`. safeHref
			// answers '#' for anything unsafe; that is not a link worth
			// rendering, so fall through to plain text.
			const safe = safeHref(resolved)
			return safe === '#' ? null : safe
		},

		/**
		 * Resolved formatter function for this cell, or `null`. A column's
		 * `formatter` id resolves against the injected `cnFormatters` registry.
		 *
		 * @return {((value: unknown, row: object, property: object, options: object) => unknown)|null}
		 */
		formatterFn() {
			const fn = this.formatter && this.cnFormatters && this.cnFormatters[this.formatter]
			return typeof fn === 'function' ? fn : null
		},

		/** True when an explicit formatter is in play for this cell. */
		hasFormatter() {
			return this.formatterFn !== null
		},

		/**
		 * The declarative format `style`, or null when no (recognised) `format`
		 * spec is set. Drives the built-in currency / duration / number / percent
		 * / swatch rendering paths.
		 *
		 * @return {string|null}
		 */
		formatStyle() {
			const s = this.format && this.format.style
			return typeof s === 'string' ? s : null
		},

		/** True when a built-in NUMERIC format (currency/number/percent/duration) applies. */
		hasBuiltinFormat() {
			return ['currency', 'number', 'percent', 'duration'].includes(this.formatStyle)
		},

		/** True when this cell renders as a colour swatch (`format.style:"swatch"`). */
		isSwatch() {
			return this.formatStyle === 'swatch'
		},

		/**
		 * The swatch colour — read from the sibling row field named by
		 * `format.colorField` (default `'color'`). Returns null when no usable
		 * colour string is present (the dot is then omitted).
		 *
		 * @return {string|null}
		 */
		swatchColor() {
			if (!this.isSwatch) {
				return null
			}
			const field = (this.format && this.format.colorField) || 'color'
			const c = this.row && this.row[field]
			return (typeof c === 'string' && c.trim() !== '') ? c : null
		},

		formattedValue() {
			if (this.formatterFn) {
				try {
					return this.formatterFn(this.value, this.row, this.property, this.formatterOptions || undefined)
				} catch (e) {
					// eslint-disable-next-line no-console
					console.warn(`[CnCellRenderer] formatter "${this.formatter}" threw; falling back`, e)
				}
			}
			if (this.hasBuiltinFormat) {
				return this.applyBuiltinFormat()
			}
			return formatValue(this.value, this.property, { truncate: this.truncate })
		},

		rawTitle() {
			// Show full value on hover if it was truncated
			const raw = this.value
			if (typeof raw === 'string' && raw.length > this.truncate) {
				return raw
			}
			return undefined
		},

		/**
		 * Whether the cell draws a uuid, and so takes the monospace uuid
		 * style. The property's `format: "uuid"` alone used to decide this,
		 * so a reference that a formatter or a widget had resolved to its
		 * name was still drawn as code. Now the value has to be a uuid AND
		 * nothing resolves it: a resolving widget or formatter, or a value
		 * that is not a uuid, renders in the normal text style.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-resolved-reference-is-not-drawn-as-a-uuid
		 * @return {boolean}
		 */
		showsUuid() {
			if (this.property?.format !== 'uuid') {
				return false
			}
			if (this.widgetComponent || this.widget || this.hasFormatter) {
				return false
			}
			return typeof this.value === 'string' && UUID_PATTERN.test(this.value)
		},

		cellClass() {
			const classes = []
			if (this.propertyType === 'boolean') {
				classes.push('cn-cell-renderer--boolean')
			}
			if (this.isEnum) {
				classes.push('cn-cell-renderer--enum')
			}
			if (this.property?.format === 'date-time' || this.property?.format === 'date') {
				classes.push('cn-cell-renderer--date')
			}
			if (this.showsUuid) {
				classes.push('cn-cell-renderer--uuid')
			}
			if (this.propertyType === 'integer' || this.propertyType === 'number') {
				classes.push('cn-cell-renderer--number')
			}
			return classes
		},
	},

	mounted() {
		// Warn once per column-property-name when `widget:"link"` resolves
		// to neither a `route` nor an `href` — silent fallback hides
		// manifest mistakes, an every-row warn is too noisy.
		// A column with a `routeMap` has declared its targets; a row whose
		// value is not in the map (an empty requester, say) is data, not a
		// manifest mistake, so it renders as text without the warning. The
		// same holds for a declared `href` whose resolved value safeHref
		// refused: the manifest is fine, the row value is not.
		if (
			this.widget === 'link'
			&& !this.linkRoute
			&& !this.widgetProps?.href
			&& this.widgetProps?.fallback !== 'silent'
			&& !(this.widgetProps?.routeMap && typeof this.widgetProps.routeMap === 'object')
		) {
			const key = this.property?.title || String(this.value).slice(0, 20)
			if (!WARNED_LINK_KEYS.has(key)) {
				WARNED_LINK_KEYS.add(key)
				// eslint-disable-next-line no-console
				console.warn(`[CnCellRenderer] widget:"link" on "${key}" has no resolvable target — set widgetProps.route (page id) or widgetProps.href (URL with optional {field} placeholders); cell falls back to plain text.`)
			}
		}
	},

	methods: {
		/**
		 * Run an `actions` widget button for this row through the page.
		 *
		 * @param {{key: string}} item The button.
		 * @return {void}
		 * @spec openspec/changes/table-actions-column/specs/index-page/spec.md#requirement-a-column-can-show-row-actions-as-buttons
		 */
		runAction(item) {
			if (typeof this.widgetProps?.run === 'function') {
				this.widgetProps.run(item.key, this.row)
			}
		},

		/**
		 * The "switch" widget was flipped: show the new state and hand it to
		 * `widgetProps.onToggle(row, on)`. A rejection puts the switch back.
		 *
		 * @param {boolean} on The new state.
		 * @return {Promise<void>}
		 */
		async onSwitchToggle(on) {
			const toggle = this.widgetProps && this.widgetProps.onToggle
			if (typeof toggle !== 'function' || this.switchPending !== null) {
				return
			}
			this.switchPending = on === true
			try {
				await toggle(this.row, on === true)
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error('[CnCellRenderer] switch toggle failed', error)
			} finally {
				this.switchPending = null
			}
		},

		/**
		 * The initials of a name, at most two letters (first and last word).
		 *
		 * @param {string} name The name.
		 * @return {string} The initials, upper case, or ''.
		 * @spec openspec/changes/screens-avatar-cell-resolve/specs/data-table/spec.md
		 */
		initialsOf(name) {
			const words = String(name || '').trim().split(/\s+/).filter((word) => word !== '')
			if (words.length === 0) {
				return ''
			}
			const first = Array.from(words[0])[0] || ''
			const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] || '') : ''
			return (first + last).toLocaleUpperCase()
		},

		/**
		 * Render the cell value per the declarative `format` spec (currency /
		 * number / percent / duration). Mirrors CnStatWidget's formatting so a
		 * KPI tile and a table column read identically. Non-numeric values fall
		 * back to `formatValue`; an empty value renders an em-dash.
		 *
		 * @return {string}
		 */
		applyBuiltinFormat() {
			if (!this.hasValue) {
				return '—'
			}
			const fmt = this.format || {}
			if (fmt.style === 'duration') {
				return this.formatDuration()
			}
			const num = Number(this.value)
			if (!Number.isFinite(num)) {
				return formatValue(this.value, this.property, { truncate: this.truncate })
			}
			const decimals = Number.isFinite(fmt.decimals)
				? fmt.decimals
				: (fmt.style === 'currency' ? 2 : 0)
			let body
			if (fmt.style === 'currency') {
				// `format.currencyField` reads the code from the row's own field.
				body = formatMoney(num, { currency: fmt.currency, currencyField: fmt.currencyField, decimals }, this.row)
			} else if (fmt.style === 'percent') {
				// Values are stored as the literal percent (83.3), not a 0–1 ratio.
				body = new Intl.NumberFormat(undefined, {
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals,
				}).format(num) + '%'
			} else {
				body = new Intl.NumberFormat(undefined, {
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals,
				}).format(num)
			}
			return `${fmt.prefix || ''}${body}${fmt.suffix || ''}`
		},

		/**
		 * Render a numeric duration compactly (`1u 23m`, `45m 10s`, `12s`). The
		 * raw value is seconds unless `format.unit` is `'milliseconds'` /
		 * `'minutes'` / `'hours'`. The hour suffix is `u` (uur) to read naturally
		 * under NL theming while staying digit-led for other locales.
		 *
		 * @return {string}
		 */
		formatDuration() {
			const fmt = this.format || {}
			let secs = Number(this.value)
			if (!Number.isFinite(secs)) {
				return formatValue(this.value, this.property, { truncate: this.truncate })
			}
			if (fmt.unit === 'milliseconds') {
				// Sub-second durations are the common case for a millisecond
				// field (request/step timings), and they would all collapse to
				// the `0s` floor below — so render them in ms directly.
				const ms = Math.round(secs)
				if (Math.abs(ms) < 1000) {
					return `${fmt.prefix || ''}${ms}ms${fmt.suffix || ''}`
				}
				secs = ms / 1000
			} else if (fmt.unit === 'minutes') {
				secs *= 60
			} else if (fmt.unit === 'hours') {
				secs *= 3600
			}
			secs = Math.round(secs)
			const sign = secs < 0 ? '-' : ''
			secs = Math.abs(secs)
			const h = Math.floor(secs / 3600)
			const m = Math.floor((secs % 3600) / 60)
			const s = secs % 60
			const parts = []
			if (h > 0) {
				parts.push(`${h}u`)
			}
			if (m > 0) {
				parts.push(`${m}m`)
			}
			if (s > 0 && h === 0) {
				parts.push(`${s}s`)
			}
			if (parts.length === 0) {
				parts.push('0s')
			}
			return `${fmt.prefix || ''}${sign}${parts.join(' ')}${fmt.suffix || ''}`
		},
	},
}
</script>

<style scoped>
.cn-cell-renderer__actions {
	display: inline-flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-cell-renderer__icon-label {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-weight: 600;
}

.cn-cell-renderer__switch {
	display: inline-flex;
}

.cn-cell-renderer__mono {
	font-family: monospace;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-cell-renderer--uuid {
	font-family: monospace;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-cell-renderer--number {
	font-variant-numeric: tabular-nums;
}

.cn-cell-renderer--date {
	white-space: nowrap;
}

.cn-cell-renderer__date-state {
	margin-inline-start: 8px;
	color: var(--color-success-text, var(--color-main-text));
}

.cn-cell-renderer__date-state--past {
	color: var(--color-text-maxcontrast);
}

.cn-cell-renderer__dash {
	color: var(--color-text-maxcontrast);
}

.cn-cell-renderer__avatar {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	max-width: 100%;
	vertical-align: middle;
}

.cn-cell-renderer__avatar-picture {
	display: inline-flex;
	flex: none;
}

.cn-cell-renderer__date-block {
	display: inline-flex;
	align-items: center;
	gap: 12px;
	white-space: nowrap;
}

.cn-cell-renderer__date-tile {
	display: flex;
	flex: 0 0 46px;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 5px 0;
	border-radius: 8px;
	background-color: var(--color-background-dark);
}

.cn-cell-renderer__date-day {
	font-size: 17px;
	line-height: 1;
}

.cn-cell-renderer__date-month,
.cn-cell-renderer__date-time {
	color: var(--color-text-maxcontrast);
}

.cn-cell-renderer__date-month {
	font-size: 12px;
}

.cn-cell-renderer__date-lines {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-cell-renderer__date-weekday {
	font-weight: 600;
}

.cn-cell-renderer__avatar-initials {
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background-color: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
	font-size: 0.75em;
	font-weight: 700;
	line-height: 1;
}

.cn-cell-renderer__avatar-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.cn-cell-renderer__avatar-name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	/* The name is the cell's text: it keeps the weight, size and colour the
	   cell sets, as a plain value does. */
	font: inherit;
	color: inherit;
}

.cn-cell-renderer__avatar-secondary {
	min-width: 0;
	overflow: hidden;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	font-weight: 400;
	line-height: 1.35;
	text-overflow: ellipsis;
	text-decoration: none;
	white-space: nowrap;
}

/* A date that matched a rule is also set in a heavier weight, so the signal
   does not rest on colour alone. */
.cn-cell-renderer__date--success,
.cn-cell-renderer__date--warning,
.cn-cell-renderer__date--error,
.cn-cell-renderer__age--success,
.cn-cell-renderer__age--warning,
.cn-cell-renderer__age--error {
	font-weight: 600;
}

.cn-cell-renderer__age {
	white-space: nowrap;
}

/* The progress cell (abstract-progress-cell): a 56 x 8 bar, the percentage
   8px beside it in the bar's tone, and an optional age badge after them, as
   PqLeads' Winkans column. The value is bold, so the tone is not the only signal. */
.cn-cell-renderer__progress {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px 8px;
}

.cn-cell-renderer__progress-line {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	white-space: nowrap;
}

.cn-cell-renderer__progress-bar {
	display: inline-block;
	width: 56px;
	height: 8px;
	border-radius: 4px;
	background: var(--color-background-dark);
	overflow: hidden;
}

.cn-cell-renderer__progress-fill {
	display: block;
	height: 100%;
}

.cn-cell-renderer__progress-fill--success {
	background: var(--color-element-success, var(--color-success));
}

.cn-cell-renderer__progress-fill--warning {
	background: var(--color-element-warning, var(--color-warning));
}

.cn-cell-renderer__progress-fill--error {
	background: var(--color-element-error, var(--color-error));
}

.cn-cell-renderer__progress-value {
	font-size: 14px;
	font-weight: 700;
}

.cn-cell-renderer__progress-value--success {
	color: var(--color-text-success, var(--color-success-text));
}

.cn-cell-renderer__progress-value--warning {
	color: var(--color-text-warning, var(--color-warning-text));
}

.cn-cell-renderer__progress-value--error {
	color: var(--color-text-error, var(--color-error-text));
}

.cn-cell-renderer__progress-badge {
	display: inline-block;
	padding: 3px 10px;
	border-radius: 12px;
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
}

.cn-cell-renderer__progress-badge--error {
	color: var(--color-text-error, var(--color-error-text));
	background: var(--color-error-hover, var(--color-background-dark));
	background: color-mix(in srgb, var(--color-error) 12%, transparent);
}

.cn-cell-renderer__progress-badge--warning {
	color: var(--color-text-warning, var(--color-warning-text));
	background: color-mix(in srgb, var(--color-warning) 14%, transparent);
}

.cn-cell-renderer__progress-badge--success {
	color: var(--color-text-success, var(--color-success-text));
	background: color-mix(in srgb, var(--color-success) 12%, transparent);
}

.cn-cell-renderer__age--success {
	color: var(--color-text-success, var(--color-success-text));
}

.cn-cell-renderer__age--warning {
	color: var(--color-text-warning, var(--color-warning-text));
}

.cn-cell-renderer__age--error {
	color: var(--color-text-error, var(--color-error-text));
}

.cn-cell-renderer__due--empty {
	color: var(--color-text-maxcontrast);
}

/* A withheld value: the lock and the word in the muted text colour. */
.cn-cell-renderer__withheld {
	display: inline-flex;
	gap: 4px;
	align-items: center;
	color: var(--color-text-maxcontrast);
}

.cn-cell-renderer__withheld-icon {
	flex: 0 0 auto;
}

.cn-cell-renderer__withheld-text {
	font-style: italic;
}

/* A number cell: the flagged number reads in its variant's text colour, with
   the chip saying why (never colour alone). */
.cn-cell-renderer__number {
	display: inline-flex;
	gap: 4px;
	align-items: center;
	white-space: nowrap;
}

.cn-cell-renderer__number--warning {
	color: var(--color-text-warning, var(--color-warning-text));
	font-weight: 600;
}

.cn-cell-renderer__number--error {
	color: var(--color-text-error, var(--color-error-text));
	font-weight: 600;
}

.cn-cell-renderer__date--success {
	color: var(--color-text-success, var(--color-success-text));
}

.cn-cell-renderer__date--warning {
	color: var(--color-text-warning, var(--color-warning-text));
}

.cn-cell-renderer__date--error {
	color: var(--color-text-error, var(--color-error-text));
}

.cn-cell-renderer__date--muted {
	color: var(--color-text-maxcontrast);
}

/* The text variant, not the fill: from Nextcloud 32 `--color-success` is a
   background colour and too pale for a 16px glyph on a light theme. */
.cn-cell-renderer__icon--success {
	color: var(--color-text-success, var(--color-success-text, var(--color-success)));
}

.cn-cell-renderer__swatch-wrap {
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

.cn-cell-renderer__swatch-dot {
	display: inline-block;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	flex-shrink: 0;
	border: 1px solid var(--color-border-dark);
}
</style>
