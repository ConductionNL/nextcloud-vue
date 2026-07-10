<!--
  CnPageConfigModal — edit ONE page's full config in place (ADR-041 / ADR-004).

  Opened from an index page's edit-mode config cog (CnPageRenderer wires it to
  the current page). Edits the working manifest's `page` + `page.config` directly,
  then persists on Done via the shared manifest editor. It aims to expose the
  WHOLE CnIndexPage config surface across five tabs:

    • Display  — title/description/icon, type, route, show-title, view toggle,
                 available views (allow/disallow across table/cards/list/map),
                 default view, per-view toggle labels, map config (lat/lng/geo/
                 popup fields), empty/loading text, inline search + placeholder,
                 table filter/column menus, documentation link.
    • Data     — register, schema, row-key (unique id field).
    • Columns  — which columns to show, per-column transforms (label +
                 formatter/widget/number-format), and the default sort.
    • Actions  — Add (+ label), per-row + mass actions, selection, the built-in
                 vs advanced create/edit form, mass name-field, inline action count.
    • Advanced — JSON escape-hatch for the richer array/object options that have
                 no simple control yet (quick filters, base filter, form-field
                 include/exclude + overrides, export formats, import options).

  Isolated NcModal file per ADR-004; every NcSelect carries an inputLabel.
  CnIndexPage booleans default true EXCEPT showTitle/filterMenu/columnMenu — a
  toggle stores a value only when it DIFFERS from that per-key default and drops
  the key otherwise, keeping the persisted config minimal.
-->
<template>
	<NcModal size="normal" @close="$emit('close')">
		<div class="cn-page-config">
			<h2 class="cn-page-config__title">
				{{ t('nextcloud-vue', 'Page configuration') }}
			</h2>

			<div class="cn-page-config__tabs">
				<NcButton v-for="tab in tabs"
					:key="tab.id"
					:type="activeTab === tab.id ? 'primary' : 'tertiary'"
					@click="activeTab = tab.id">
					{{ tab.label }}
				</NcButton>
			</div>

			<!-- Display -->
			<div v-show="activeTab === 'display'" class="cn-page-config__section">
				<div class="cn-field">
					<NcTextField :value="page.title || ''"
						:label="t('nextcloud-vue', 'Title')"
						:label-visible="true"
						@update:value="(v) => $set(page, 'title', v)" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'The page heading and its label in the navigation menu.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcTextField :value="configValue('description')"
						:label="t('nextcloud-vue', 'Description')"
						:label-visible="true"
						:placeholder="t('nextcloud-vue', 'Optional subtitle under the title')"
						@update:value="(v) => setConfig('description', v)" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Optional subtitle shown beneath the title.') }}
					</p>
				</div>
				<div class="cn-field">
					<label class="cn-field__label">{{ t('nextcloud-vue', 'Icon') }}</label>
					<CnIconPicker :value="configValue('icon') || null"
						:clearable="true"
						@input="(v) => setConfig('icon', v)" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Icon shown next to the title. Pick None to show no icon.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcSelect class="cn-page-config__field"
						:value="selectedType"
						:options="pageTypeOptions"
						:input-label="t('nextcloud-vue', 'Type')"
						label="label"
						:clearable="false"
						@input="setType" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'What the page renders: a list of records, a single record, a dashboard, or a custom component.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcTextField :value="page.route || ''"
						:label="t('nextcloud-vue', 'Route')"
						:label-visible="true"
						:placeholder="'/example'"
						@update:value="(v) => $set(page, 'route', v)" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'The URL path that opens this page (e.g. /dogs).') }}
					</p>
				</div>
				<div class="cn-field">
					<NcCheckboxRadioSwitch :checked="boolVal('showTitle')" type="switch" @update:checked="(c) => setBool('showTitle', c)">
						{{ t('nextcloud-vue', 'Show page title') }}
					</NcCheckboxRadioSwitch>
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Render the title as a heading at the top of the page body.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcCheckboxRadioSwitch :checked="boolVal('showViewToggle')" type="switch" @update:checked="(c) => setBool('showViewToggle', c)">
						{{ t('nextcloud-vue', 'Show Cards / Table toggle') }}
					</NcCheckboxRadioSwitch>
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Let visitors switch between the table and card layouts.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcSelect class="cn-page-config__field"
						:value="selectedAvailableViews"
						:options="viewModeOptions"
						:input-label="t('nextcloud-vue', 'Available views')"
						label="label"
						:multiple="true"
						:close-on-select="false"
						:placeholder="t('nextcloud-vue', 'Cards, Table (default)')"
						@input="setAvailableViews" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Which layouts visitors may switch between. Leave empty for the default Cards + Table. Include Map to add the map segment (configure it below).') }}
					</p>
				</div>
				<div class="cn-field">
					<NcSelect class="cn-page-config__field"
						:value="selectedViewMode"
						:options="defaultViewOptions"
						:input-label="t('nextcloud-vue', 'Default view')"
						label="label"
						:clearable="false"
						@input="setViewMode" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Which layout is shown first when the page opens.') }}
					</p>
				</div>
				<div class="cn-page-config__row">
					<div class="cn-field">
						<NcTextField :value="configValue('tableLabel')"
							:label="t('nextcloud-vue', 'Table toggle label')"
							:label-visible="true"
							:placeholder="t('nextcloud-vue', 'Table')"
							@update:value="(v) => setConfig('tableLabel', v)" />
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'Custom text for the Table button.') }}
						</p>
					</div>
					<div class="cn-field">
						<NcTextField :value="configValue('cardsLabel')"
							:label="t('nextcloud-vue', 'Cards toggle label')"
							:label-visible="true"
							:placeholder="t('nextcloud-vue', 'Cards')"
							@update:value="(v) => setConfig('cardsLabel', v)" />
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'Custom text for the Cards button.') }}
						</p>
					</div>
				</div>
				<div class="cn-page-config__row">
					<div class="cn-field">
						<NcTextField :value="configValue('listLabel')"
							:label="t('nextcloud-vue', 'List toggle label')"
							:label-visible="true"
							:placeholder="t('nextcloud-vue', 'List')"
							@update:value="(v) => setConfig('listLabel', v)" />
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'Custom text for the List button (when List is available).') }}
						</p>
					</div>
					<div class="cn-field">
						<NcTextField :value="configValue('mapLabel')"
							:label="t('nextcloud-vue', 'Map toggle label')"
							:label-visible="true"
							:placeholder="t('nextcloud-vue', 'Map')"
							@update:value="(v) => setConfig('mapLabel', v)" />
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'Custom text for the Map button (when Map is available).') }}
						</p>
					</div>
				</div>

				<!-- Map view configuration (shown once Map is an available view). The
				     map reads each row's coordinates from either lat/lng property paths
				     or a single GeoJSON Point property, and labels pins with the popup
				     field. Written to `config.mapConfig`. -->
				<template v-if="mapEnabled">
					<div class="cn-field cn-field--section">
						<h3 class="cn-page-config__subtitle">
							{{ t('nextcloud-vue', 'Map view') }}
						</h3>
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'Where the map reads each record’s location. Use latitude + longitude fields, or a single GeoJSON Point field.') }}
						</p>
					</div>
					<div class="cn-page-config__row">
						<div class="cn-field">
							<NcTextField :value="mapConfigValue('latField')"
								:label="t('nextcloud-vue', 'Latitude field')"
								:label-visible="true"
								:placeholder="'lat'"
								@update:value="(v) => setMapConfig('latField', v)" />
							<p class="cn-field__hint">
								{{ t('nextcloud-vue', 'Property holding the latitude (e.g. lat).') }}
							</p>
						</div>
						<div class="cn-field">
							<NcTextField :value="mapConfigValue('lngField')"
								:label="t('nextcloud-vue', 'Longitude field')"
								:label-visible="true"
								:placeholder="'lng'"
								@update:value="(v) => setMapConfig('lngField', v)" />
							<p class="cn-field__hint">
								{{ t('nextcloud-vue', 'Property holding the longitude (e.g. lng).') }}
							</p>
						</div>
					</div>
					<div class="cn-page-config__row">
						<div class="cn-field">
							<NcTextField :value="mapConfigValue('geoField')"
								:label="t('nextcloud-vue', 'GeoJSON Point field')"
								:label-visible="true"
								:placeholder="'geometry'"
								@update:value="(v) => setMapConfig('geoField', v)" />
							<p class="cn-field__hint">
								{{ t('nextcloud-vue', 'Alternative: one property holding a GeoJSON Point. Takes precedence over lat/lng.') }}
							</p>
						</div>
						<div class="cn-field">
							<NcTextField :value="mapConfigValue('popupField')"
								:label="t('nextcloud-vue', 'Popup label field')"
								:label-visible="true"
								:placeholder="'title'"
								@update:value="(v) => setMapConfig('popupField', v)" />
							<p class="cn-field__hint">
								{{ t('nextcloud-vue', 'Property used to label each pin’s popup.') }}
							</p>
						</div>
					</div>
				</template>
				<div class="cn-field">
					<NcCheckboxRadioSwitch :checked="boolVal('inlineSearch')" type="switch" @update:checked="(c) => setBool('inlineSearch', c)">
						{{ t('nextcloud-vue', 'Inline search box') }}
					</NcCheckboxRadioSwitch>
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Show a search field in the page toolbar.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcTextField :value="configValue('searchPlaceholder')"
						:label="t('nextcloud-vue', 'Search placeholder')"
						:label-visible="true"
						:placeholder="t('nextcloud-vue', 'Search…')"
						@update:value="(v) => setConfig('searchPlaceholder', v)" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Hint text shown inside the search field.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcTextField :value="configValue('emptyText')"
						:label="t('nextcloud-vue', 'Empty-state text')"
						:label-visible="true"
						:placeholder="t('nextcloud-vue', 'No items found')"
						@update:value="(v) => setConfig('emptyText', v)" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Message shown when the list has no items.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcTextField :value="configValue('loadingText')"
						:label="t('nextcloud-vue', 'Loading text')"
						:label-visible="true"
						:placeholder="t('nextcloud-vue', 'Loading…')"
						@update:value="(v) => setConfig('loadingText', v)" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Message shown while items are loading.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcCheckboxRadioSwitch :checked="boolVal('filterMenu')" type="switch" @update:checked="(c) => setBool('filterMenu', c)">
						{{ t('nextcloud-vue', 'Show table filter menu') }}
					</NcCheckboxRadioSwitch>
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Show the funnel menu for filtering the table. The funnel appears only when a column has set values to filter by (e.g. a status with options or a badge column).') }}
					</p>
				</div>
				<div class="cn-field">
					<NcCheckboxRadioSwitch :checked="boolVal('columnMenu')" type="switch" @update:checked="(c) => setBool('columnMenu', c)">
						{{ t('nextcloud-vue', 'Show column (show/hide) menu') }}
					</NcCheckboxRadioSwitch>
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Let visitors choose which columns are visible.') }}
					</p>
				</div>
				<div class="cn-page-config__row">
					<div class="cn-field">
						<NcTextField :value="configValue('documentationUrl')"
							:label="t('nextcloud-vue', 'Documentation URL')"
							:label-visible="true"
							:placeholder="'https://…'"
							@update:value="(v) => setConfig('documentationUrl', v)" />
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'Adds a documentation link to the … menu.') }}
						</p>
					</div>
					<div class="cn-field">
						<NcTextField :value="configValue('documentationLabel')"
							:label="t('nextcloud-vue', 'Documentation label')"
							:label-visible="true"
							:placeholder="t('nextcloud-vue', 'Documentation')"
							@update:value="(v) => setConfig('documentationLabel', v)" />
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'Text for that documentation link.') }}
						</p>
					</div>
				</div>
			</div>

			<!-- Data source -->
			<div v-show="activeTab === 'data'" class="cn-page-config__section">
				<template v-if="isDataPage">
					<div class="cn-field">
						<NcSelect v-if="hasDataSources"
							class="cn-page-config__field"
							:value="selectedRegister"
							:options="registerOptions"
							:input-label="t('nextcloud-vue', 'Register')"
							label="label"
							:clearable="true"
							:placeholder="t('nextcloud-vue', 'Choose a register')"
							@input="setRegister" />
						<NcTextField v-else
							:value="configValue('register')"
							:label="t('nextcloud-vue', 'Register')"
							:label-visible="true"
							@update:value="(v) => setConfig('register', v)" />
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'The OpenRegister register this page reads its objects from.') }}
						</p>
					</div>

					<div class="cn-field">
						<NcSelect v-if="hasDataSources"
							class="cn-page-config__field"
							:value="selectedSchema"
							:options="schemaOptions"
							:input-label="t('nextcloud-vue', 'Schema')"
							label="label"
							:clearable="true"
							:disabled="!configValue('register')"
							:placeholder="t('nextcloud-vue', 'Choose a schema')"
							@input="setSchema" />
						<NcTextField v-else
							:value="configValue('schema')"
							:label="t('nextcloud-vue', 'Schema')"
							:label-visible="true"
							@update:value="(v) => setConfig('schema', v)" />
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'The object type (schema) within that register.') }}
						</p>
					</div>

					<div class="cn-field">
						<NcTextField :value="configValue('rowKey')"
							:label="t('nextcloud-vue', 'Row identifier field')"
							:label-visible="true"
							:placeholder="'id'"
							@update:value="(v) => setConfig('rowKey', v)" />
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'Property that uniquely identifies each row. Defaults to id.') }}
						</p>
					</div>
				</template>
				<p v-else class="cn-page-config__hint">
					{{ t('nextcloud-vue', 'Set the type to Index or Detail to configure a data source.') }}
				</p>
			</div>

			<!-- Columns -->
			<div v-show="activeTab === 'columns'" class="cn-page-config__section">
				<template v-if="isDataPage">
					<div class="cn-field">
						<NcSelect v-if="columnOptions.length"
							class="cn-page-config__field"
							:value="selectedColumns"
							:options="columnOptions"
							:input-label="t('nextcloud-vue', 'Columns shown')"
							label="label"
							:multiple="true"
							:close-on-select="false"
							:placeholder="t('nextcloud-vue', 'All properties')"
							@input="setColumns" />
						<NcTextField v-else
							:value="columnsText"
							:label="t('nextcloud-vue', 'Columns (comma separated)')"
							:label-visible="true"
							:placeholder="'name, status'"
							@update:value="setColumnsText" />
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'Pick which properties become table columns. Leave empty to show all.') }}
						</p>
					</div>

					<!-- Per-column transforms: a friendly label + a formatter/widget. -->
					<template v-if="transformColumns.length">
						<div class="cn-field cn-field--section">
							<h3 class="cn-page-config__subtitle">
								{{ t('nextcloud-vue', 'Column transforms') }}
							</h3>
							<p class="cn-field__hint">
								{{ t('nextcloud-vue', 'Give a column a custom header label and choose how its value is rendered.') }}
							</p>
						</div>
						<div v-for="col in transformColumns" :key="col" class="cn-page-config__col-transform">
							<span class="cn-page-config__col-name">{{ col }}</span>
							<NcTextField :value="colLabel(col)"
								:label="t('nextcloud-vue', 'Label')"
								:placeholder="col"
								@update:value="(v) => setColLabel(col, v)" />
							<NcSelect class="cn-page-config__field"
								:value="selectedFormat(col)"
								:options="formatOptions"
								:input-label="t('nextcloud-vue', 'Format')"
								label="label"
								:clearable="false"
								@input="(o) => setColFormat(col, o)" />
						</div>
					</template>

					<!-- Default sort. -->
					<div class="cn-field cn-field--section">
						<h3 class="cn-page-config__subtitle">
							{{ t('nextcloud-vue', 'Default sort') }}
						</h3>
						<p class="cn-field__hint">
							{{ t('nextcloud-vue', 'Order the rows by a column when the page first loads.') }}
						</p>
					</div>
					<div class="cn-page-config__row">
						<div class="cn-field">
							<NcSelect class="cn-page-config__field"
								:value="selectedSortField"
								:options="sortFieldOptions"
								:input-label="t('nextcloud-vue', 'Sort by')"
								label="label"
								:clearable="true"
								:placeholder="t('nextcloud-vue', 'None')"
								@input="setSortField" />
						</div>
						<div class="cn-field">
							<NcSelect class="cn-page-config__field"
								:value="selectedSortOrder"
								:options="sortOrderOptions"
								:input-label="t('nextcloud-vue', 'Direction')"
								label="label"
								:clearable="false"
								:disabled="!selectedSortField"
								@input="setSortOrder" />
						</div>
					</div>
				</template>
				<p v-else class="cn-page-config__hint">
					{{ t('nextcloud-vue', 'Columns apply to Index pages with a data source.') }}
				</p>
			</div>

			<!-- Actions -->
			<div v-show="activeTab === 'actions'" class="cn-page-config__section">
				<div v-for="toggle in actionToggles" :key="toggle.key" class="cn-field">
					<NcCheckboxRadioSwitch :checked="boolVal(toggle.key)"
						type="switch"
						@update:checked="(c) => setBool(toggle.key, c)">
						{{ toggle.label }}
					</NcCheckboxRadioSwitch>
					<p class="cn-field__hint">
						{{ toggle.hint }}
					</p>
				</div>
				<div class="cn-field">
					<NcTextField :value="configValue('addLabel')"
						:label="t('nextcloud-vue', 'Add button label')"
						:label-visible="true"
						:placeholder="t('nextcloud-vue', 'Add')"
						@update:value="(v) => setConfig('addLabel', v)" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Custom text for the Add button.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcCheckboxRadioSwitch :checked="boolVal('useAdvancedFormDialog')" type="switch" @update:checked="(c) => setBool('useAdvancedFormDialog', c)">
						{{ t('nextcloud-vue', 'Use the advanced create/edit dialog') }}
					</NcCheckboxRadioSwitch>
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Use the richer create/edit dialog with a properties table and a JSON data tab.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcTextField :value="configValue('massActionNameField')"
						:label="t('nextcloud-vue', 'Mass-action name field')"
						:label-visible="true"
						:placeholder="'title'"
						@update:value="(v) => setConfig('massActionNameField', v)" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'Which property labels each item in bulk-action dialogs. Defaults to title.') }}
					</p>
				</div>
				<div class="cn-field">
					<NcTextField :value="configValue('inlineActionCount')"
						type="number"
						:label="t('nextcloud-vue', 'Inline row actions before overflow')"
						:label-visible="true"
						:placeholder="'1'"
						@update:value="(v) => setNumber('inlineActionCount', v)" />
					<p class="cn-field__hint">
						{{ t('nextcloud-vue', 'How many row actions show as buttons before the rest collapse into a … menu.') }}
					</p>
				</div>
			</div>

			<!-- Advanced (JSON escape-hatch for the richer options) -->
			<div v-show="activeTab === 'advanced'" class="cn-page-config__section">
				<p class="cn-page-config__hint">
					{{ t('nextcloud-vue', 'These options take JSON. Leave a field blank to unset it.') }}
				</p>
				<div v-for="field in jsonFields" :key="field.key" class="cn-page-config__json">
					<label class="cn-page-config__json-label">{{ field.label }}</label>
					<p class="cn-field__hint">
						{{ field.hint }}
					</p>
					<textarea class="cn-page-config__json-input"
						:class="{ 'cn-page-config__json-input--error': jsonErrors[field.key] }"
						rows="3"
						:placeholder="field.placeholder"
						:value="jsonText[field.key]"
						@input="(e) => setJson(field.key, e.target.value)" />
					<span v-if="jsonErrors[field.key]" class="cn-page-config__json-error">
						{{ t('nextcloud-vue', 'Invalid JSON') }}
					</span>
				</div>
			</div>

			<div class="cn-page-config__footer">
				<span class="cn-page-config__id">{{ page.id }}</span>
				<NcButton type="primary" :disabled="saving || hasJsonError" @click="onDone">
					<template v-if="saving" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Done') }}
				</NcButton>
			</div>
		</div>
	</NcModal>
</template>

<script>
import { NcModal, NcButton, NcTextField, NcSelect, NcCheckboxRadioSwitch, NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import CnIconPicker from '../components/CnIconPicker/CnIconPicker.vue'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

const PAGE_TYPES = [
	{ value: 'dashboard', label: 'Dashboard' },
	{ value: 'index', label: 'Index (list)' },
	{ value: 'detail', label: 'Detail' },
	{ value: 'custom', label: 'Custom' },
]

// The four CnIndexPage layouts. Any of them can be the default view; the
// subset offered as toggle segments is controlled by `config.viewModes`.
const VIEW_MODES = [
	{ value: 'table', label: 'Table' },
	{ value: 'cards', label: 'Cards' },
	{ value: 'list', label: 'List' },
	{ value: 'map', label: 'Map' },
]

// Per-column transform presets. A friendly label maps to ONE of CnCellRenderer's
// three transform channels: a registry `formatter` (date/datetime/relative-time),
// a numeric `format.style` (currency/number/percent), or a built-in `widget`
// (badge/link). `selectedFormat`/`setColFormat` translate between them.
const FORMAT_OPTIONS = [
	{ value: '', label: 'Default', channel: null },
	{ value: 'date', label: 'Date', channel: 'formatter' },
	{ value: 'datetime', label: 'Date & time', channel: 'formatter' },
	{ value: 'relative-time', label: 'Relative time', channel: 'formatter' },
	{ value: 'currency', label: 'Currency (€)', channel: 'format' },
	{ value: 'number', label: 'Number', channel: 'format' },
	{ value: 'percent', label: 'Percent', channel: 'format' },
	{ value: 'badge', label: 'Status badge', channel: 'widget' },
	{ value: 'link', label: 'Link', channel: 'widget' },
]

const SORT_ORDERS = [
	{ value: 'asc', label: 'Ascending' },
	{ value: 'desc', label: 'Descending' },
]

// Per-key CnIndexPage boolean defaults, so a toggle reflects the true effective
// state and only stores a value that DIFFERS from the default (minimal config).
// showTitle / filterMenu / columnMenu / inlineSearch / useAdvancedFormDialog
// default false; the rest default true.
const BOOL_DEFAULTS = {
	showTitle: false,
	showViewToggle: true,
	filterMenu: false,
	columnMenu: false,
	inlineSearch: false,
	useAdvancedFormDialog: false,
	showAdd: true,
	showViewAction: true,
	showEditAction: true,
	showCopyAction: true,
	showDeleteAction: true,
	selectable: true,
	showMassDelete: true,
	showMassCopy: true,
	showMassExport: true,
	showMassImport: true,
	showFormDialog: true,
}

// CnIndexPage action toggles (all default true) — stored as `false` when off.
const ACTION_TOGGLES = [
	{ key: 'showAdd', label: 'Show Add button', hint: 'Show the button that creates a new item.' },
	{ key: 'showViewAction', label: 'Show row View action', hint: 'Offer a View action on every row.' },
	{ key: 'showEditAction', label: 'Show row Edit action', hint: 'Offer an Edit action on every row.' },
	{ key: 'showCopyAction', label: 'Show row Copy action', hint: 'Offer a Copy/duplicate action on every row.' },
	{ key: 'showDeleteAction', label: 'Show row Delete action', hint: 'Offer a Delete action on every row.' },
	{ key: 'selectable', label: 'Allow selection (mass actions)', hint: 'Show row checkboxes so several rows can be picked for bulk actions.' },
	{ key: 'showMassDelete', label: 'Mass delete', hint: 'Allow deleting the selected rows in one action.' },
	{ key: 'showMassCopy', label: 'Mass copy', hint: 'Allow copying the selected rows in one action.' },
	{ key: 'showMassExport', label: 'Mass export', hint: 'Allow exporting the selected rows to a file.' },
	{ key: 'showMassImport', label: 'Mass import', hint: 'Allow importing items from an uploaded file.' },
	{ key: 'showFormDialog', label: 'Built-in create/edit form', hint: 'Use the library’s schema-driven form for creating and editing.' },
]

// Richer array/object config options that have no dedicated control yet — edited
// as JSON on the Advanced tab. Each maps straight onto a CnIndexPage prop.
const JSON_FIELDS = [
	{ key: 'quickFilters', label: 'Quick filters', placeholder: '[{ "label": "Open", "filter": { "status": "open" } }]', hint: 'Filter tabs shown above the table. Array of { label, filter }.' },
	{ key: 'filter', label: 'Base filter', placeholder: '{ "status": "active" }', hint: 'A filter always applied to the query (visitors cannot remove it).' },
	{ key: 'includeFields', label: 'Form fields — include', placeholder: '["title", "status"]', hint: 'Whitelist of properties shown in the create/edit form.' },
	{ key: 'excludeFields', label: 'Form fields — exclude', placeholder: '["createdAt"]', hint: 'Properties hidden from the create/edit form.' },
	{ key: 'fieldOverrides', label: 'Form field overrides', placeholder: '{ "status": { "label": "State" } }', hint: 'Per-field tweaks (label, widget, …) keyed by property name.' },
	{ key: 'exportFormats', label: 'Export formats', placeholder: '["csv", "json"]', hint: 'File formats offered in the export dialog.' },
	{ key: 'importOptions', label: 'Import options', placeholder: '{ "formats": ["csv"] }', hint: 'Configuration for the import dialog (accepted formats, …).' },
]

/**
 * CnPageConfigModal — comprehensive single-page config editor (see file header).
 */
export default {
	name: 'CnPageConfigModal',

	components: { NcModal, NcButton, NcTextField, NcSelect, NcCheckboxRadioSwitch, NcLoadingIcon, CnIconPicker },

	mixins: [manifestModalDoneMixin],

	inject: {
		/** App registers/schemas for the data-source pickers; null → free text. */
		cnDataSources: { default: null },
	},

	props: {
		/**
		 * The page object (the working manifest's page), mutated in place.
		 *
		 * @type {object}
		 */
		page: {
			type: Object,
			required: true,
		},
	},

	data() {
		return {
			// Active config tab: 'display' | 'data' | 'columns' | 'actions' | 'advanced'.
			activeTab: 'display',
			// Editing buffer for the Advanced JSON fields (string per key).
			jsonText: this.buildJsonText(),
			// Per-key parse-error flag for the Advanced JSON fields.
			jsonErrors: {},
		}
	},

	computed: {
		/** The config tabs. */
		tabs() {
			return [
				{ id: 'display', label: t('nextcloud-vue', 'Display') },
				{ id: 'data', label: t('nextcloud-vue', 'Data source') },
				{ id: 'columns', label: t('nextcloud-vue', 'Columns') },
				{ id: 'actions', label: t('nextcloud-vue', 'Actions') },
				{ id: 'advanced', label: t('nextcloud-vue', 'Advanced') },
			]
		},
		/** Closed page-type options. */
		pageTypeOptions() {
			return PAGE_TYPES
		},
		/** All four layouts — the "Available views" multi-select options. */
		viewModeOptions() {
			return VIEW_MODES.map((o) => ({ value: o.value, label: t('nextcloud-vue', o.label) }))
		},
		/**
		 * The enabled view layouts (array form): the page's `config.viewModes`
		 * whitelist when set, else the historical Cards + Table default.
		 * @return {string[]}
		 */
		enabledViews() {
			const v = this.page && this.page.config && this.page.config.viewModes
			return (Array.isArray(v) && v.length) ? v : ['cards', 'table']
		},
		/** The enabled views as multi-select options. */
		selectedAvailableViews() {
			return this.enabledViews
				.map((val) => this.viewModeOptions.find((o) => o.value === val))
				.filter(Boolean)
		},
		/**
		 * Default-view options: only the enabled layouts (plus the current default
		 * even if it was disabled, so it still displays rather than reading blank).
		 * @return {Array<{value: string, label: string}>}
		 */
		defaultViewOptions() {
			const enabled = new Set(this.enabledViews)
			const current = this.configValue('viewMode') || 'table'
			enabled.add(current)
			return this.viewModeOptions.filter((o) => enabled.has(o.value))
		},
		/** Whether Map is one of the enabled views (reveals the Map-config fields). */
		mapEnabled() {
			return this.enabledViews.includes('map')
		},
		/** Per-column transform format options. */
		formatOptions() {
			return FORMAT_OPTIONS.map((o) => ({ value: o.value, label: t('nextcloud-vue', o.label), channel: o.channel }))
		},
		/** Sort-direction options. */
		sortOrderOptions() {
			return SORT_ORDERS.map((o) => ({ value: o.value, label: t('nextcloud-vue', o.label) }))
		},
		/** Index action toggles. */
		actionToggles() {
			return ACTION_TOGGLES.map((a) => ({ key: a.key, label: t('nextcloud-vue', a.label), hint: t('nextcloud-vue', a.hint) }))
		},
		/** Advanced JSON fields. */
		jsonFields() {
			return JSON_FIELDS.map((f) => ({ key: f.key, label: t('nextcloud-vue', f.label), placeholder: f.placeholder, hint: t('nextcloud-vue', f.hint) }))
		},
		/** True while any Advanced JSON field holds invalid JSON (blocks Done). */
		hasJsonError() {
			return Object.values(this.jsonErrors).some(Boolean)
		},
		/** The page's type as an option. */
		selectedType() {
			const type = (this.page && this.page.type) || 'custom'
			return PAGE_TYPES.find((o) => o.value === type) || { value: type, label: type }
		},
		/** The default view as an option. */
		selectedViewMode() {
			const v = this.configValue('viewMode') || 'table'
			return VIEW_MODES.find((o) => o.value === v) || { value: v, label: v }
		},
		/** Whether this page renders OpenRegister data. */
		isDataPage() {
			return this.page && (this.page.type === 'index' || this.page.type === 'detail')
		},
		/** Whether app data sources were provided. */
		hasDataSources() {
			return !!(this.cnDataSources && Array.isArray(this.cnDataSources.registers) && this.cnDataSources.registers.length)
		},
		/** Register options. */
		registerOptions() {
			if (!this.hasDataSources) return []
			return this.cnDataSources.registers.map((r) => ({ value: r.value, label: r.label || r.value }))
		},
		/** Schema options for the chosen register. */
		schemaOptions() {
			if (!this.hasDataSources) return []
			const reg = this.cnDataSources.registers.find((r) => r.value === this.configValue('register'))
			const schemas = (reg && Array.isArray(reg.schemas)) ? reg.schemas : []
			return schemas.map((s) => ({ value: s.value, label: s.label || s.value, columns: s.columns || [] }))
		},
		/** Chosen register option. */
		selectedRegister() {
			const slug = this.configValue('register')
			if (!slug) return null
			return this.registerOptions.find((o) => o.value === slug) || { value: slug, label: slug }
		},
		/** Chosen schema option. */
		selectedSchema() {
			const slug = this.configValue('schema')
			if (!slug) return null
			return this.schemaOptions.find((o) => o.value === slug) || { value: slug, label: slug }
		},
		/** Column options (chosen schema's properties). */
		columnOptions() {
			const schema = this.schemaOptions.find((o) => o.value === this.configValue('schema'))
			const cols = (schema && Array.isArray(schema.columns)) ? schema.columns : []
			return cols.map((c) => ({ value: c, label: c }))
		},
		/** Page columns as options. */
		selectedColumns() {
			return this.columnsArray.map((c) => ({ value: c, label: c }))
		},
		/** Page columns as comma string. */
		columnsText() {
			return this.columnsArray.join(', ')
		},
		/** Configured columns (array form). */
		columnsArray() {
			return (this.page && this.page.config && Array.isArray(this.page.config.columns)) ? this.page.config.columns : []
		},
		/**
		 * Columns offered the per-column transform rows: the configured columns,
		 * else the schema's columns. Empty when neither is known (free-text page).
		 * @return {string[]}
		 */
		transformColumns() {
			if (this.columnsArray.length) return this.columnsArray
			return this.columnOptions.map((o) => o.value)
		},
		/** Columns offered as default-sort fields (same source as transforms). */
		sortFieldOptions() {
			return this.transformColumns.map((c) => ({ value: c, label: c }))
		},
		/** The default-sort field as an option (single-key). */
		selectedSortField() {
			const sort = this.defaultSortArray
			if (!sort.length || !sort[0].field) return null
			return { value: sort[0].field, label: sort[0].field }
		},
		/** The default-sort direction as an option. */
		selectedSortOrder() {
			const sort = this.defaultSortArray
			const order = (sort[0] && sort[0].order) || 'asc'
			return SORT_ORDERS.find((o) => o.value === order) || SORT_ORDERS[0]
		},
		/** The configured default sort (array form). */
		defaultSortArray() {
			return (this.page && this.page.config && Array.isArray(this.page.config.defaultSort)) ? this.page.config.defaultSort : []
		},
	},

	methods: {
		t,
		/**
		 * Build the Advanced-tab editing buffer from the page's current config —
		 * each JSON field pretty-printed, or '' when unset.
		 * @return {object}
		 */
		buildJsonText() {
			const cfg = (this.page && this.page.config && !Array.isArray(this.page.config)) ? this.page.config : {}
			const out = {}
			for (const f of JSON_FIELDS) {
				out[f.key] = (cfg[f.key] === undefined) ? '' : JSON.stringify(cfg[f.key], null, 2)
			}
			return out
		},
		/**
		 * Ensure the page has a plain-object config (resets a PHP-corrupted array).
		 * @return {object}
		 */
		ensureConfig() {
			if (!this.page.config || typeof this.page.config !== 'object' || Array.isArray(this.page.config)) {
				this.$set(this.page, 'config', {})
			}
			return this.page.config
		},
		/**
		 * Read a config value (empty string when unset).
		 * @param {string} key The config key.
		 * @return {*}
		 */
		configValue(key) {
			const v = (this.page && this.page.config && this.page.config[key])
			return (v === undefined || v === null) ? '' : v
		},
		/**
		 * Write a config field in place (deletes when falsy/empty).
		 * @param {string} key The config key.
		 * @param {string} value The value.
		 * @return {void}
		 */
		setConfig(key, value) {
			const config = this.ensureConfig()
			if (value) this.$set(config, key, value)
			else this.$delete(config, key)
		},
		/**
		 * Write a numeric config field (deletes when blank/NaN).
		 * @param {string} key The config key.
		 * @param {string} value The raw input value.
		 * @return {void}
		 */
		setNumber(key, value) {
			const config = this.ensureConfig()
			const n = Number(value)
			if (value === '' || value === null || Number.isNaN(n)) this.$delete(config, key)
			else this.$set(config, key, n)
		},
		/**
		 * Effective value of a boolean toggle: the stored value when set, else the
		 * key's CnIndexPage default (NOT all default-true — e.g. showTitle is false).
		 * @param {string} key The config key.
		 * @return {boolean}
		 */
		boolVal(key) {
			const cfg = (this.page && this.page.config) || {}
			if (Object.prototype.hasOwnProperty.call(cfg, key)) return !!cfg[key]
			return BOOL_DEFAULTS[key] === true
		},
		/**
		 * Set a boolean toggle: store the value when it differs from the key's
		 * default, drop the key when it equals the default (keeps config minimal,
		 * and correct for keys that default false like showTitle).
		 * @param {string} key The config key.
		 * @param {boolean} checked The new state.
		 * @return {void}
		 */
		setBool(key, checked) {
			const config = this.ensureConfig()
			if (checked === (BOOL_DEFAULTS[key] === true)) this.$delete(config, key)
			else this.$set(config, key, checked)
		},
		/**
		 * Set the page type in place.
		 * @param {{value: string}|null} option The type option.
		 * @return {void}
		 */
		setType(option) {
			this.$set(this.page, 'type', option ? option.value : 'custom')
		},
		/**
		 * Set the default view mode (drops the key when it equals the 'table' default).
		 * @param {{value: string}|null} option The view-mode option.
		 * @return {void}
		 */
		setViewMode(option) {
			const config = this.ensureConfig()
			const v = option ? option.value : 'table'
			if (v && v !== 'table') this.$set(config, 'viewMode', v)
			else this.$delete(config, 'viewMode')
		},
		/**
		 * Set the enabled view layouts (`config.viewModes`), preserving the picked
		 * order. Drops the key when it equals the Cards + Table default (order-
		 * independent) so the config stays minimal. When the current default view is
		 * no longer enabled, resets it to the first still-enabled layout.
		 * @param {Array<{value: string}>} options The selected view options.
		 * @return {void}
		 */
		setAvailableViews(options) {
			const config = this.ensureConfig()
			const modes = (options || []).map((o) => o.value)
			const isDefault = modes.length === 2
				&& modes.includes('cards') && modes.includes('table')
			if (!modes.length || isDefault) this.$delete(config, 'viewModes')
			else this.$set(config, 'viewModes', modes)
			// Keep the default view within the enabled set.
			const effective = modes.length ? modes : ['cards', 'table']
			const current = this.configValue('viewMode') || 'table'
			if (!effective.includes(current)) {
				const next = effective[0]
				if (next && next !== 'table') this.$set(config, 'viewMode', next)
				else this.$delete(config, 'viewMode')
			}
		},
		/**
		 * Read a `config.mapConfig` sub-field (empty string when unset).
		 * @param {string} key The mapConfig key.
		 * @return {string}
		 */
		mapConfigValue(key) {
			const mc = this.page && this.page.config && this.page.config.mapConfig
			return (mc && typeof mc === 'object' && mc[key] != null) ? mc[key] : ''
		},
		/**
		 * Write a `config.mapConfig` sub-field in place, pruning an emptied map so
		 * the config stays minimal.
		 * @param {string} key The mapConfig key.
		 * @param {string} value The value.
		 * @return {void}
		 */
		setMapConfig(key, value) {
			const config = this.ensureConfig()
			let map = config.mapConfig
			if (!map || typeof map !== 'object' || Array.isArray(map)) {
				map = {}
				this.$set(config, 'mapConfig', map)
			}
			if (value) this.$set(map, key, value)
			else this.$delete(map, key)
			if (!Object.keys(config.mapConfig).length) this.$delete(config, 'mapConfig')
		},
		/**
		 * Set the register; clears schema + columns.
		 * @param {{value: string}|null} option The register option.
		 * @return {void}
		 */
		setRegister(option) {
			this.setConfig('register', option ? option.value : '')
			this.setConfig('schema', '')
			this.setConfig('columns', '')
		},
		/**
		 * Set the schema; clears columns.
		 * @param {{value: string}|null} option The schema option.
		 * @return {void}
		 */
		setSchema(option) {
			this.setConfig('schema', option ? option.value : '')
			this.setConfig('columns', '')
		},
		/**
		 * Set columns from selected options.
		 * @param {Array<{value: string}>} options The column options.
		 * @return {void}
		 */
		setColumns(options) {
			const config = this.ensureConfig()
			const cols = (options || []).map((o) => o.value)
			if (cols.length) this.$set(config, 'columns', cols)
			else this.$delete(config, 'columns')
		},
		/**
		 * Set columns from a comma-separated string.
		 * @param {string} text The column keys.
		 * @return {void}
		 */
		setColumnsText(text) {
			const config = this.ensureConfig()
			const cols = String(text || '').split(',').map((s) => s.trim()).filter(Boolean)
			if (cols.length) this.$set(config, 'columns', cols)
			else this.$delete(config, 'columns')
		},
		/**
		 * The override object for a column (empty object when none).
		 * @param {string} col The column key.
		 * @return {object}
		 */
		colOverride(col) {
			const ov = this.page && this.page.config && this.page.config.columnOverrides
			return (ov && typeof ov === 'object' && ov[col]) ? ov[col] : {}
		},
		/**
		 * A column's custom label (empty string when none).
		 * @param {string} col The column key.
		 * @return {string}
		 */
		colLabel(col) {
			return this.colOverride(col).label || ''
		},
		/**
		 * Persist (or remove) a column override, pruning empty objects/maps so the
		 * config stays minimal.
		 * @param {string} col The column key.
		 * @param {object} override The next override object.
		 * @return {void}
		 */
		writeOverride(col, override) {
			const config = this.ensureConfig()
			let map = config.columnOverrides
			if (!map || typeof map !== 'object' || Array.isArray(map)) {
				map = {}
				this.$set(config, 'columnOverrides', map)
			}
			if (override && Object.keys(override).length) this.$set(map, col, override)
			else this.$delete(map, col)
			if (!Object.keys(config.columnOverrides).length) this.$delete(config, 'columnOverrides')
		},
		/**
		 * Set a column's custom label.
		 * @param {string} col The column key.
		 * @param {string} label The label.
		 * @return {void}
		 */
		setColLabel(col, label) {
			const next = { ...this.colOverride(col) }
			if (label) next.label = label
			else delete next.label
			this.writeOverride(col, next)
		},
		/**
		 * The selected format option for a column (reverse-mapped from its override).
		 * @param {string} col The column key.
		 * @return {object}
		 */
		selectedFormat(col) {
			const ov = this.colOverride(col)
			let value = ''
			if (ov.formatter) value = ov.formatter
			else if (ov.widget) value = ov.widget
			else if (ov.format && ov.format.style) value = ov.format.style
			return this.formatOptions.find((o) => o.value === value) || this.formatOptions[0]
		},
		/**
		 * Apply a format preset to a column — clears the other transform channels,
		 * keeps any custom label.
		 * @param {string} col The column key.
		 * @param {object} option The chosen format option ({value, channel}).
		 * @return {void}
		 */
		setColFormat(col, option) {
			const next = { ...this.colOverride(col) }
			delete next.formatter
			delete next.widget
			delete next.format
			const preset = FORMAT_OPTIONS.find((o) => o.value === (option && option.value))
			if (preset && preset.channel === 'formatter') next.formatter = preset.value
			else if (preset && preset.channel === 'widget') next.widget = preset.value
			else if (preset && preset.channel === 'format') next.format = { style: preset.value }
			this.writeOverride(col, next)
		},
		/**
		 * Set the default-sort field (single-key); preserves the current direction.
		 * @param {{value: string}|null} option The field option.
		 * @return {void}
		 */
		setSortField(option) {
			const config = this.ensureConfig()
			if (!option) { this.$delete(config, 'defaultSort'); return }
			const order = (this.defaultSortArray[0] && this.defaultSortArray[0].order) || 'asc'
			this.$set(config, 'defaultSort', [{ field: option.value, order }])
		},
		/**
		 * Set the default-sort direction (no-op until a field is chosen).
		 * @param {{value: string}|null} option The direction option.
		 * @return {void}
		 */
		setSortOrder(option) {
			const sort = this.defaultSortArray
			if (!sort.length || !sort[0].field) return
			const config = this.ensureConfig()
			this.$set(config, 'defaultSort', [{ field: sort[0].field, order: option ? option.value : 'asc' }])
		},
		/**
		 * Edit an Advanced JSON field: parse, flag errors, and persist on success
		 * (blank clears the key).
		 * @param {string} key The config key.
		 * @param {string} text The raw textarea value.
		 * @return {void}
		 */
		setJson(key, text) {
			this.$set(this.jsonText, key, text)
			const config = this.ensureConfig()
			const trimmed = String(text || '').trim()
			if (!trimmed) {
				this.$delete(this.jsonErrors, key)
				this.$delete(config, key)
				return
			}
			try {
				const parsed = JSON.parse(trimmed)
				this.$delete(this.jsonErrors, key)
				this.$set(config, key, parsed)
			} catch (e) {
				this.$set(this.jsonErrors, key, true)
			}
		},
	},
}
</script>

<style scoped>
.cn-page-config {
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-page-config__title {
	margin: 0;
}

.cn-page-config__subtitle {
	margin: 0;
	font-size: 1em;
	font-weight: 600;
}

.cn-page-config__tabs {
	display: flex;
	gap: 4px;
	flex-wrap: wrap;
	border-bottom: 1px solid var(--color-border);
	padding-bottom: 8px;
}

.cn-page-config__section {
	display: flex;
	flex-direction: column;
	gap: 20px;
	min-height: 220px;
	max-height: 55vh;
	overflow-y: auto;
	/* room so the scrollbar + each field's floating notch-label don't clip */
	padding: 4px 4px 0;
}

/* One control + its description. The column layout keeps the hint directly under
   the input and the 20px section gap above keeps a following field's floating
   notch-label from overlapping the previous control. */
.cn-field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-field--section {
	gap: 2px;
}

.cn-field__label {
	font-weight: 500;
}

.cn-field__hint {
	margin: 0;
	font-size: 0.8em;
	line-height: 1.3;
	color: var(--color-text-maxcontrast);
}

.cn-page-config__row {
	display: flex;
	gap: 16px;
	align-items: flex-start;
}

.cn-page-config__row > * {
	flex: 1;
	min-width: 0;
}

.cn-page-config__field {
	min-width: 200px;
}

.cn-page-config__col-transform {
	display: grid;
	grid-template-columns: 120px 1fr 1fr;
	gap: 8px;
	align-items: center;
}

.cn-page-config__col-name {
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-page-config__hint {
	color: var(--color-text-maxcontrast);
}

.cn-page-config__json {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-page-config__json-label {
	font-weight: 600;
}

.cn-page-config__json-input {
	width: 100%;
	font-family: monospace;
	font-size: 0.85em;
	border-radius: var(--border-radius);
	border: 2px solid var(--color-border-dark);
	background-color: var(--color-main-background);
	color: var(--color-main-text);
	padding: 6px 8px;
}

.cn-page-config__json-input--error {
	border-color: var(--color-error);
}

.cn-page-config__json-error {
	color: var(--color-error);
	font-size: 0.85em;
}

.cn-page-config__footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-top: 1px solid var(--color-border);
	padding-top: 12px;
}

.cn-page-config__id {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}
</style>
