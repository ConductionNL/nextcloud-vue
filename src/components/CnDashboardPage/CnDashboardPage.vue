<!--
  CnDashboardPage — Top-level dashboard page with GridStack widget grid.

  The dashboard equivalent of CnIndexPage. Assembles a complete dashboard
  from a widget definition array and a layout array. Supports:
  - Custom widgets via scoped slots (#widget-{widgetId})
  - Nextcloud Dashboard API widgets (auto-rendered)
  - Tile widgets (quick-access links)
  - Drag-and-drop editing mode
  - Header with title, actions, and edit toggle
-->
<template>
	<div class="cn-dashboard-page" data-testid="cn-dashboard-page">
		<!-- Header -->
		<div class="cn-dashboard-page__header" data-testid="cn-dashboard-page-header">
			<div class="cn-dashboard-page__header-left">
				<h2 v-if="title" class="cn-dashboard-page__title">
					{{ resolvedTitle }}
				</h2>
				<p v-if="description" class="cn-dashboard-page__description">
					{{ resolvedDescription }}
				</p>
			</div>
			<div class="cn-dashboard-page__header-actions">
				<!-- Declarative header actions (#91 Wave 3): a manifest
				     `headerActions[]` renders as buttons (open-form / api-call /
				     toggle / navigate / refresh) with visibleWhen gating,
				     before the slot content so app-provided buttons stay
				     right-most next to the edit toggle. -->
				<CnActionButtons
					v-if="headerActions && headerActions.length"
					:actions="headerActions"
					data-testid="cn-dashboard-page-header-actions" />
				<!-- @slot header-actions Inline buttons rendered in the dashboard header next to the edit toggle. Used by every existing consumer (decidesk, launchpad, opencatalogi, pipelinq, procest). -->
				<slot name="header-actions" />
				<!-- @slot actions Back-compat alias for `#header-actions`. Prefer `#header-actions` in new code. -->
				<slot name="actions" />
				<NcButton
					v-if="allowEdit"
					:type="isEditing ? 'primary' : 'secondary'"
					@click="toggleEdit">
					<template #icon>
						<Pencil v-if="!isEditing" :size="20" />
						<Check v-else :size="20" />
					</template>
					{{ isEditing ? doneLabel : editLabel }}
				</NcButton>
				<!-- In-app edit button (ADR-041). Renders only when Buildiq is
				     reachable; self-wires from the cnManifestEditor / cnOpenBuildAvailable
				     provided by CnAppRoot. Sits inline with the page's action buttons. -->
				<CnBuildiqEditButton />
				<!-- Page-level overflow Actions menu (Refresh / Documentation /
				     Request a feature). Separate from the per-widget menus.
				     On by default; opt out per item, supply documentation-url
				     to surface a docs link. -->
				<CnActionsMenu
					:show-refresh="showRefresh"
					:show-request-feature="showRequestFeature"
					:documentation-url="documentationUrl"
					:documentation-label="documentationLabel"
					:refresh-label="refreshLabel"
					:request-feature-label="requestFeatureLabel"
					:actions-menu-label="actionsMenuLabel"
					:refreshing="refreshing"
					:widget-id="resolvedPageId"
					:title="title"
					:surface="`dashboard:${resolvedPageId}`"
					:spec-ref="specRef"
					refresh-channel="cn:page:refresh"
					testid-base="cn-dashboard-page"
					@refresh="onActionsRefresh"
					@request-feature="onActionsRequestFeature">
					<!-- @slot action-items Additional NcActionButton-family
					     items appended inside the page-level overflow menu,
					     after Refresh / Documentation / Request a feature. -->
					<template v-if="hasActionItemsSlot" #action-items>
						<slot name="action-items" />
					</template>
				</CnActionsMenu>
			</div>
		</div>

		<!-- Date-range header (optional).
		     Rendered only when `dateRange.enabled === true` AND
		     `dateRange.showHeaderPicker !== false`. The range STATE
		     (currentRange / cnDashboardDateRange) is always initialised
		     when the feature is enabled, so per-chart-widget date chips
		     keep working even when this header picker is hidden — set
		     `showHeaderPicker: false` to rely solely on the per-widget
		     chips. The picker is wired to `currentRange` (data) which
		     mirrors the provided `cnDashboardDateRange` ref; all change
		     handling, persistence, and event emission lives in
		     `onDateRangeChange`. -->
		<div
			v-if="showHeaderDateRange"
			class="cn-dashboard-page__date-range"
			:class="{ 'cn-dashboard-page__date-range--pills': dateRangeControl === 'pills' }"
			data-testid="cn-dashboard-page-date-range">
			<!-- Pills mode (`dateRange.control: 'pills'`): a compact segmented
			     toggle-button row replaces the bulky select + two date inputs.
			     Each preset is a pill; the active one drives the dashboard window
			     exactly like the picker does (same `onDateRangeChange`). A
			     de-emphasised "Custom range" pill opens a small from/to popover
			     so the arbitrary-window affordance is kept without two bare
			     date inputs being always visible. -->
			<div
				v-if="dateRangeControl === 'pills'"
				class="cn-dashboard-page__date-pills"
				role="group"
				:aria-label="datePillsGroupLabel"
				data-testid="cn-dashboard-page-date-pills">
				<button
					v-for="preset in pillPresets"
					:key="preset.id"
					type="button"
					class="cn-dashboard-page__date-pill"
					:class="{ 'cn-dashboard-page__date-pill--active': currentRange && currentRange.preset === preset.id }"
					:aria-pressed="String(Boolean(currentRange && currentRange.preset === preset.id))"
					:data-testid="`cn-dashboard-page-date-pill-${preset.id}`"
					@click="onPillPick(preset)">
					{{ preset.label }}
				</button>
				<NcActions
					v-if="hasCustomPreset"
					:force-menu="true"
					container="body"
					class="cn-dashboard-page__date-pill-custom"
					data-testid="cn-dashboard-page-date-pill-custom">
					<template #icon>
						<span
							class="cn-dashboard-page__date-pill cn-dashboard-page__date-pill--custom"
							:class="{ 'cn-dashboard-page__date-pill--active': currentRange && currentRange.preset === 'custom' }">
							{{ customRangeLabel }}
						</span>
					</template>
					<NcActionInput
						type="datetime-local"
						is-native-picker
						:model-value="toPickerDate(currentRange && currentRange.from)"
						:label="t('nextcloud-vue', 'From')"
						@update:model-value="onChipDateInput('from', $event)" />
					<NcActionInput
						type="datetime-local"
						is-native-picker
						:model-value="toPickerDate(currentRange && currentRange.to)"
						:label="t('nextcloud-vue', 'To')"
						@update:model-value="onChipDateInput('to', $event)" />
				</NcActions>
			</div>
			<!-- Default (picker) mode: the original select + two date inputs. -->
			<CnDateRangePicker
				v-else
				:value="currentRange"
				:presets="effectivePresets"
				@input="onDateRangeChange" />
		</div>

		<!-- Page-level filter controls (optional). Each selection is written
		     into the reactive workspace context so any widget can read it via a
		     `@page.<key>` / `@workspace.<key>` token (e.g. an endpoint KPI's URL
		     interpolating a chosen period). -->
		<div
			v-if="pageFilters && pageFilters.length"
			class="cn-dashboard-page__page-filters"
			data-testid="cn-dashboard-page-page-filters">
			<label
				v-for="pf in pageFilters"
				:key="pf.key"
				class="cn-dashboard-page__page-filter">
				<span v-if="pf.label" class="cn-dashboard-page__page-filter-label">{{ pf.label }}</span>
				<NcSelect
					:model-value="selectedPageFilterOption(pf)"
					:options="pf.options || []"
					:clearable="false"
					:input-label="pf.label || pf.key"
					label="label"
					:data-testid="'cn-page-filter-' + pf.key"
					@update:model-value="onPageFilterChange(pf, $event)" />
			</label>
		</div>

		<!-- Declarative in-body sections, `placement: "before-grid"` — host-app
		     section components (e.g. a bespoke funnel / time-series chart reading
		     a custom REST endpoint) rendered ABOVE the widget grid. Independent of
		     the grid's loading / empty state so an analytics dashboard can be all
		     sections and no grid widgets. -->
		<CnBodySections
			v-if="hasBodyWidgets"
			:sections="bodyWidgets"
			:context="sectionContext"
			placement="before-grid"
			data-testid="cn-dashboard-body-sections-before-grid" />

		<!-- Loading state -->
		<NcLoadingIcon v-if="loading" />

		<!-- Widget predicates still settling: hold the grid's first paint
		     so a conditional widget is present or absent from the first
		     frame instead of popping in after load and reflowing the page.
		     Edit mode skips the gate — it renders the authored layout with
		     every widget regardless of conditions. -->
		<NcLoadingIcon v-else-if="!widgetConditionsSettled && !gridEditable" />

		<!-- Empty state. Suppressed when the page renders declarative body
		     sections (before-grid / after-grid / end): a page can legitimately
		     have no grid widgets yet still show bodyWidget content, so
		     "No widgets configured" would be a false negative. -->
		<div v-else-if="!hasWidgets && !hasBodyWidgets" class="cn-dashboard-page__empty">
			<!-- @slot empty Replaces the default empty state shown when the dashboard has no widgets. Defaults to an `NcEmptyContent` block. -->
			<slot name="empty">
				<NcEmptyContent :description="emptyLabel">
					<template #icon>
						<ViewDashboardOutline :size="48" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Widget-ref content items (manifest-widget-ref-page-content-type).
		     Rendered above the classic GridStack grid when present. Each item
		     is a `{ type: 'widget-ref', ref: 'openregister://widget/…' }` entry
		     from the manifest's `pages[].config.content[]` array. -->
		<div
			v-else-if="widgetRefItems.length > 0"
			class="cn-dashboard-page__content">
			<CnWidgetRefItem
				v-for="(item, idx) in widgetRefItems"
				:key="item.ref + '-' + idx"
				:ref-uri="item.ref"
				class="cn-dashboard-page__content-item" />
		</div>

		<!-- Dashboard grid (classic widgets+layout mode).
		     Uses v-else so the `v-else-if="!hasWidgets"` empty state and the
		     `v-else-if="widgetRefItems.length > 0"` content-items section
		     are mutually exclusive with the grid.
		     :key remounts the grid when in-app edit mode flips (ADR-041): the
		     manifest is raw (non-reactive) until useManifestEditor.enter()
		     observes it in place, so a grid mounted pre-edit never subscribed
		     to the layout/widgets arrays — in-place pushes (Add widget) keep
		     the same array identity and can't re-render it. One remount per
		     edit flip re-subscribes against the now-reactive graph. -->
		<CnDashboardGrid
			v-else
			:key="`cn-dashboard-grid-${gridEditable ? 'editing' : 'live'}`"
			:layout="displayLayout"
			:editable="gridEditable"
			:columns="columns"
			:cell-height="cellHeight"
			:margin="gridMargin"
			@layout-change="onLayoutChange">
			<template #widget="{ item }">
				<!-- In-app edit overlay (ADR-041): a single launchpad-style
				     configure cog opens the per-widget style/config editor,
				     which itself carries the delete affordance — so no separate
				     remove button here. Shown only while the page is in edit
				     mode. -->
				<div v-if="gridEditable" class="cn-dashboard-page__widget-edit">
					<NcButton variant="tertiary" :aria-label="t('nextcloud-vue', 'Configure widget')" @click="configureWidget(item)">
						<template #icon>
							<Cog :size="18" />
						</template>
					</NcButton>
				</div>
				<!-- requiresApp gate — when a widget declares `requiresApp`
				     (any widget type) and the owning app is not installed,
				     replace its body with an "Install …" CTA. Because all
				     fleet data lives in OpenRegister, an app can surface
				     another app's data; this keeps the tile honest when the
				     owning app is absent instead of showing an empty value. -->
				<CnWidgetWrapper
					v-if="missingRequiredApp(item)"
					:title="getWidgetTitle(item)"
					:show-title="widgetShowTitle(item)">
					<NcEmptyContent
						:name="installAppLabel(missingRequiredApp(item))"
						:description="t('nextcloud-vue', 'This widget shows data from another app that isn\'t installed yet.')"
						class="cn-dashboard-page__requires-app">
						<template #icon>
							<Download :size="32" />
						</template>
						<template #action>
							<NcButton
								variant="primary"
								:href="appInstallUrl(missingRequiredApp(item))">
								<template #icon>
									<Download :size="18" />
								</template>
								{{ installAppLabel(missingRequiredApp(item)) }}
							</NcButton>
						</template>
					</NcEmptyContent>
				</CnWidgetWrapper>

				<!-- Tile widget -->
				<CnTileWidget
					v-else-if="isTile(item)"
					:tile="getTileConfig(item)" />

				<!-- Custom slot widget — apps provide their own rendering -->
				<!-- Every page-side wrapper carries `widget-id`: the chrome's
				     Refresh broadcasts `cn:widget:refresh` with that id in the
				     payload, and without it the payload's empty widgetId
				     matches no subscriber — the per-widget Refresh silently
				     does nothing. -->
				<template v-else-if="hasWidgetSlot(item.widgetId)">
					<CnWidgetWrapper
						:widget-id="item.widgetId"
						:title="getWidgetTitle(item)"
						:icon-url="getWidgetIconUrl(item)"
						:icon-class="getWidgetIconClass(item)"
						:show-title="widgetShowTitle(item)"
						:borderless="widgetBorderless(item)"
						:flush="item.flush !== false"
						:buttons="getWidgetButtons(item)"
						:style-config="item.styleConfig || {}"
						:title-icon-position="getWidgetTitleIconPosition(item)"
						:title-icon-color="getWidgetTitleIconColor(item)"
						:show-refresh="getWidgetShowRefresh(item)"
						:show-actions="widgetShowActions(item)"
						:documentation-url="getWidgetDocumentationUrl(item)"
						@refresh="onWidgetRefresh(item)"
						@request-feature="onWidgetRequestFeature(item)">
						<!-- @slot widget-{widgetId}-title-icon Per-widget custom title icon (e.g. `#widget-my-work-title-icon`). Scope: `{ item, widget }`. -->
						<template v-if="$slots['widget-' + item.widgetId + '-title-icon']" #title-icon>
							<slot :name="'widget-' + item.widgetId + '-title-icon'" :item="item" :widget="getWidgetDef(item.widgetId)" />
						</template>
						<!-- @slot widget-{widgetId}-actions Per-widget custom header actions (e.g. `#widget-my-work-actions`). Scope: `{ item, widget }`. -->
						<template v-if="$slots['widget-' + item.widgetId + '-actions']" #actions>
							<slot :name="'widget-' + item.widgetId + '-actions'" :item="item" :widget="getWidgetDef(item.widgetId)" />
						</template>
						<!-- Opt-in per-widget date chip (`layout[].dateChip: true`).
						     Mirrors the chart-widget chip below — same popover,
						     same handlers, same SHARED dashboard range — so
						     custom widgets that consume `cnDashboardDateRange`
						     can surface the range in their own header instead
						     of (or alongside) the page-level picker. Keep the
						     two blocks in sync when editing either. -->
						<template v-if="dateRangeEnabled && item.dateChip === true" #title-meta>
							<NcActions
								v-model:open="openChipPicker[item.widgetId]"
								:force-menu="true"
								container="body"
								:data-testid="`cn-dashboard-page-date-chip-${item.widgetId}`"
								class="cn-dashboard-page__date-chip-trigger">
								<template #icon>
									<span class="cn-dashboard-page__date-chip" :title="dateChipTitle">
										{{ dashboardRangeChipLabel }}
									</span>
								</template>
								<NcActionButton
									v-for="preset in effectivePresets"
									:key="preset.id"
									:close-after-click="true"
									@click="onChipPresetPick(preset, item)">
									<template #icon>
										<CalendarRange v-if="currentRange.preset === preset.id" :size="16" />
										<span v-else class="cn-dashboard-page__date-chip-preset-spacer" />
									</template>
									{{ preset.label }}
								</NcActionButton>
								<NcActionSeparator />
								<NcActionInput
									type="datetime-local"
									is-native-picker
									:model-value="toPickerDate(currentRange.from)"
									:label="t('nextcloud-vue', 'From')"
									@update:model-value="onChipDateInput('from', $event)" />
								<NcActionInput
									type="datetime-local"
									is-native-picker
									:model-value="toPickerDate(currentRange.to)"
									:label="t('nextcloud-vue', 'To')"
									@update:model-value="onChipDateInput('to', $event)" />
							</NcActions>
						</template>
						<!-- @slot widget-{widgetId} Per-widget body content (e.g. `#widget-my-work`). Apps inject custom widget rendering here. Scope: `{ item, widget }`. -->
						<slot :name="'widget-' + item.widgetId" :item="item" :widget="getWidgetDef(item.widgetId)" />
					</CnWidgetWrapper>
				</template>

				<!-- Chart widget — manifest-driven apexcharts mount -->
				<template v-else-if="isChart(item)">
					<CnWidgetWrapper
						:widget-id="item.widgetId"
						:class="{ 'cn-dashboard-page__chart-fit': isChartFitted(item) }"
						:title="getWidgetTitle(item)"
						:icon-url="getWidgetIconUrl(item)"
						:icon-class="getWidgetIconClass(item)"
						:show-title="widgetShowTitle(item)"
						:borderless="widgetBorderless(item)"
						:flush="item.flush !== false"
						:buttons="getWidgetButtons(item)"
						:style-config="item.styleConfig || {}"
						:title-icon-position="getWidgetTitleIconPosition(item)"
						:title-icon-color="getWidgetTitleIconColor(item)"
						:show-refresh="getWidgetShowRefresh(item)"
						:documentation-url="getWidgetDocumentationUrl(item)"
						@refresh="onWidgetRefresh(item)"
						@request-feature="onWidgetRequestFeature(item)">
						<template v-if="dateRangeEnabled && (item.dateChip === true || formatChartDateRange(item))" #title-meta>
							<NcActions
								v-model:open="openChipPicker[item.widgetId]"
								:force-menu="true"
								container="body"
								:data-testid="`cn-dashboard-page-date-chip-${item.widgetId}`"
								class="cn-dashboard-page__date-chip-trigger">
								<template #icon>
									<span class="cn-dashboard-page__date-chip" :title="dateChipTitle">
										{{ formatChartDateRange(item) || dashboardRangeChipLabel }}
									</span>
								</template>
								<NcActionButton
									v-for="preset in effectivePresets"
									:key="preset.id"
									:close-after-click="true"
									@click="onChipPresetPick(preset, item)">
									<template #icon>
										<CalendarRange v-if="currentRange.preset === preset.id" :size="16" />
										<span v-else class="cn-dashboard-page__date-chip-preset-spacer" />
									</template>
									{{ preset.label }}
								</NcActionButton>
								<NcActionSeparator />
								<NcActionInput
									type="datetime-local"
									is-native-picker
									:model-value="toPickerDate(currentRange.from)"
									:label="t('nextcloud-vue', 'From')"
									@update:model-value="onChipDateInput('from', $event)" />
								<NcActionInput
									type="datetime-local"
									is-native-picker
									:model-value="toPickerDate(currentRange.to)"
									:label="t('nextcloud-vue', 'To')"
									@update:model-value="onChipDateInput('to', $event)" />
							</NcActions>
						</template>
						<CnChartWidget
							v-bind="getChartProps(item)"
							:widget-id="item.widgetId"
							:data-source="getWidgetDataSource(item)" />
					</CnWidgetWrapper>
				</template>

				<!-- Stats-block widget — manifest-driven CnStatsBlock with a
				     GraphQL-resolved count via `dataSource`. Rendered WITHOUT
				     CnWidgetWrapper: CnStatsBlock already supplies title +
				     bordered card chrome + count layout, so wrapping it
				     produced a double-card visual (outer + inner titles, two
				     bordered boxes). The action menu lives on the page-level
				     dashboard chrome instead. -->
				<template v-else-if="isStatsBlock(item)">
					<CnStatsBlockWidget
						v-bind="getStatsBlockProps(item)"
						:title="getWidgetTitle(item)"
						:data-source="getWidgetDataSource(item)" />
				</template>

				<!-- Integration widget — resolved from the pluggable
				     integration registry (AD-19 surface fallback). -->
				<template v-else-if="isIntegration(item)">
					<CnWidgetWrapper
						:widget-id="item.widgetId"
						:title="getWidgetTitle(item)"
						:icon-url="getWidgetIconUrl(item)"
						:icon-class="getWidgetIconClass(item)"
						:show-title="widgetShowTitle(item)"
						:borderless="widgetBorderless(item)"
						:flush="item.flush !== false"
						:buttons="getWidgetButtons(item)"
						:style-config="item.styleConfig || {}"
						:title-icon-position="getWidgetTitleIconPosition(item)"
						:title-icon-color="getWidgetTitleIconColor(item)"
						:show-refresh="getWidgetShowRefresh(item)"
						:documentation-url="getWidgetDocumentationUrl(item)"
						@refresh="onWidgetRefresh(item)"
						@request-feature="onWidgetRequestFeature(item)">
						<!-- Mount-mode integration leaf (openregister#2127):
						     rendered through CnLeafMountHost so a cross-Vue-major
						     leaf mounts its own framework into a bare element. -->
						<CnLeafMountHost
							v-if="isMountIntegration(item)"
							:provider="integrationProviderFor(item)"
							:mount-props="getIntegrationMountProps(item)" />
						<component
							:is="resolveIntegrationWidget(item)"
							v-else-if="resolveIntegrationWidget(item)"
							v-bind="getIntegrationProps(item)" />
						<div v-else class="cn-dashboard-page__unknown">
							{{ unavailableLabel }}
						</div>
					</CnWidgetWrapper>
				</template>

				<!-- NC Dashboard API widget -->
				<template v-else-if="isNcWidget(item)">
					<CnWidgetWrapper
						:widget-id="item.widgetId"
						:title="getWidgetTitle(item)"
						:icon-url="getWidgetIconUrl(item)"
						:icon-class="getWidgetIconClass(item)"
						:show-title="widgetShowTitle(item)"
						:buttons="getWidgetButtons(item)"
						:style-config="item.styleConfig || {}"
						:show-refresh="getWidgetShowRefresh(item)"
						:documentation-url="getWidgetDocumentationUrl(item)"
						@refresh="onWidgetRefresh(item)"
						@request-feature="onWidgetRequestFeature(item)">
						<CnWidgetRenderer
							:widget="getWidgetDef(item.widgetId)"
							:unavailable-text="unavailableLabel" />
					</CnWidgetWrapper>
				</template>

				<!-- Dashboard widget library (cn-widget-library): a widget whose
				     `type` is registered in dashboardWidgetRegistry renders here —
				     this is how catalog widgets added via "Add widget…" appear. -->
				<template v-else-if="registryRenderer(item)">
					<CnWidgetWrapper
						:widget-id="item.widgetId"
						:title="getWidgetTitle(item)"
						:show-title="widgetShowTitle(item)"
						:show-actions="widgetShowActions(item)"
						:show-refresh="getWidgetShowRefresh(item)"
						:flush="item.flush !== false"
						:class="{ 'cn-dashboard-page__card-fit': isCardWidget(item) }"
						:buttons="getWidgetButtons(item)"
						:style-config="item.styleConfig || {}"
						:documentation-url="getWidgetDocumentationUrl(item)"
						@refresh="onWidgetRefresh(item)"
						@request-feature="onWidgetRequestFeature(item)">
						<!-- Opt-in per-widget date chip (`layout[].dateChip: true`) for
						     registered card widgets (stat / gauge / delta). Same popover
						     and SHARED dashboard range as the custom-widget chip above; it
						     lets an abstract KPI tile carry its own period selector. Requires
						     the widget header (`showTitle !== false`). Keep in sync with the
						     custom-slot chip block. -->
						<template v-if="dateRangeEnabled && item.dateChip === true" #title-meta>
							<NcActions
								v-model:open="openChipPicker[item.widgetId]"
								:force-menu="true"
								container="body"
								:data-testid="`cn-dashboard-page-date-chip-${item.widgetId}`"
								class="cn-dashboard-page__date-chip-trigger">
								<template #icon>
									<span class="cn-dashboard-page__date-chip" :title="dateChipTitle">
										{{ dashboardRangeChipLabel }}
									</span>
								</template>
								<NcActionButton
									v-for="preset in effectivePresets"
									:key="preset.id"
									:close-after-click="true"
									@click="onChipPresetPick(preset, item)">
									<template #icon>
										<CalendarRange v-if="currentRange && currentRange.preset === preset.id" :size="16" />
										<span v-else class="cn-dashboard-page__date-chip-preset-spacer" />
									</template>
									{{ preset.label }}
								</NcActionButton>
								<NcActionSeparator />
								<NcActionInput
									type="datetime-local"
									is-native-picker
									:model-value="toPickerDate(currentRange && currentRange.from)"
									:label="t('nextcloud-vue', 'From')"
									@update:model-value="onChipDateInput('from', $event)" />
								<NcActionInput
									type="datetime-local"
									is-native-picker
									:model-value="toPickerDate(currentRange && currentRange.to)"
									:label="t('nextcloud-vue', 'To')"
									@update:model-value="onChipDateInput('to', $event)" />
							</NcActions>
						</template>
						<!-- `widget-id` reaches the renderer's own refresh
						     subscription (useEndpointSource matches it against
						     `cn:widget:refresh` payloads) — the chrome above
						     broadcasts with the same id. -->
						<component
							:is="registryRenderer(item)"
							:widget-id="item.widgetId"
							:content="registryWidgetBindings(item)"
							v-bind="registryWidgetBindings(item)" />
					</CnWidgetWrapper>
				</template>

				<!-- Unknown widget fallback -->
				<CnWidgetWrapper
					v-else
					:title="getWidgetTitle(item)"
					:show-title="widgetShowTitle(item)"
					:show-refresh="false">
					<div class="cn-dashboard-page__unknown">
						{{ unavailableLabel }}
					</div>
				</CnWidgetWrapper>
			</template>
		</CnDashboardGrid>

		<!-- Declarative in-body sections, `placement: "after-grid"` — host-app
		     section components rendered BELOW the widget grid. -->
		<CnBodySections
			v-if="hasBodyWidgets"
			:sections="bodyWidgets"
			:context="sectionContext"
			placement="after-grid"
			data-testid="cn-dashboard-body-sections-after-grid" />

		<!-- Declarative in-body sections, `placement: "end"` (the default
		     placement) — the last body content. Sections with no `placement`
		     (or an explicit `end`) land here; `before-grid` / `after-grid` are
		     filtered out so each section renders exactly once. -->
		<CnBodySections
			v-if="hasBodyWidgets"
			:sections="endPlacementSections"
			:context="sectionContext"
			:placement="null"
			data-testid="cn-dashboard-body-sections-end" />

		<!-- Per-widget style/config editor (ADR-041). Opened by the
		     per-widget configure cog while editing; the modal's own Delete
		     button removes the widget. -->
		<CnWidgetStyleEditorModal
			v-if="showWidgetConfig"
			:show="showWidgetConfig"
			:widget="configWidget"
			:deletable="true"
			@save="onWidgetConfigSave"
			@delete="onWidgetConfigDelete"
			@close="showWidgetConfig = false" />
	</div>
</template>

<script>
import { provide, ref, watch } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import {
	NcActions,
	NcActionButton,
	NcActionInput,
	NcActionSeparator,
	NcButton,
	NcEmptyContent,
	NcLoadingIcon,
	NcSelect,
} from '@nextcloud/vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Check from 'vue-material-design-icons/Check.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import CalendarRange from 'vue-material-design-icons/CalendarRange.vue'
import ViewDashboardOutline from 'vue-material-design-icons/ViewDashboardOutline.vue'
import Download from 'vue-material-design-icons/Download.vue'
import { isAppInstalled } from '../../utils/appInstalled.js'
import CnDashboardGrid from '../CnDashboardGrid/CnDashboardGrid.vue'
import { getWidgetTypeEntry } from '../CnWidgetGrid/dashboardWidgetRegistry.js'
import { BUILT_IN_WIDGETS } from '../CnWidgetGrid/builtInWidgets.js'
import { canonicalWidgetType } from '../../utils/widgetTypeAliases.js'
import { compareVisibleWhen, readVisibleWhenValue } from '../../utils/visibleWhen.js'
import CnWidgetWrapper from '../CnWidgetWrapper/CnWidgetWrapper.vue'
import CnWidgetRenderer from '../CnWidgetRenderer/CnWidgetRenderer.vue'
import CnTileWidget from '../CnTileWidget/CnTileWidget.vue'
import CnChartWidget from '../CnChartWidget/CnChartWidget.vue'
import CnStatsBlockWidget from '../CnStatsBlockWidget/CnStatsBlockWidget.vue'
import CnWidgetRefItem from '../CnWidgetRefItem/CnWidgetRefItem.vue'
import CnBodySections from '../CnBodySections/CnBodySections.vue'
import CnDateRangePicker, { DEFAULT_DATE_RANGE_PRESETS, resolvePresetWindow } from '../CnDateRangePicker/CnDateRangePicker.vue'
import { CnActionsMenu } from '../CnActionsMenu/index.js'
import { CnActionButtons } from '../CnActionButtons/index.js'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import CnWidgetStyleEditorModal from '../../dialogs/CnWidgetStyleEditorModal.vue'
import { CnLeafMountHost } from '../CnLeafMountHost/index.js'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'

/** Surfaces understood by the pluggable integration registry (AD-19). */
const INTEGRATION_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/**
 * Subset of `widgetDef.props` keys that the chart widget dispatcher
 * forwards to CnChartWidget. Unknown keys on `props` are ignored so
 * the manifest stays forward-compatible (e.g. `dataSource` is
 * round-tripped through manifest validators but not yet read here).
 *
 * `chartKind` is renamed to `type` because apexcharts' own component
 * prop is also called `type`, and `widgetDef.type` already means
 * "dispatcher selector" in this file.
 */
const CHART_PROP_KEYS = [
	'series',
	'categories',
	'labels',
	'options',
	'colors',
	'toolbar',
	'legend',
	'height',
	'width',
	'unavailableLabel',
	// Display passthrough (Wave 1, nextcloud-vue#91): additive presentation
	// keys forwarded verbatim to CnChartWidget.
	'horizontal',
	'legendPosition',
	'valueFormat',
	// Value-axis baseline guard: lets a manifest opt a chart out of the
	// zero-baseline default (`'fit'`) when its series lives far from zero.
	'valueAxisBaseline',
	'colorMap',
	'emptyLabel',
	// In-widget view switcher (Wave 3, nextcloud-vue#91): named display
	// views toggling which series / value format render.
	'views',
	// Endpoint data binding (Wave 2, nextcloud-vue#91): WITHOUT this key the
	// chart's endpointSource never reaches CnChartWidget on a dashboard
	// surface (getChartProps only forwards this allowlist), so the fleet's
	// trend charts silently render empty. `dataSource` is forwarded
	// separately via the template's :data-source binding (getWidgetDataSource),
	// so the Wave-3 aggregate/drilldown inside it already flow through.
	'endpointSource',
]

/**
 * CnDashboardPage — Top-level dashboard page component.
 *
 * The dashboard equivalent of CnIndexPage. Renders a configurable grid
 * of widgets from a `widgets` definition array and a `layout` array.
 *
 * Widget types (priority order, first match wins):
 * 1. **Tile** — Items with `type: 'tile'` render as quick-access tiles
 * 2. **Custom slot** — App provides rendering via `#widget-{widgetId}`
 *    (escape hatch — beats every built-in branch when a slot exists)
 * 3. **Chart** — Items with `type: 'chart'` mount CnChartWidget; chart
 *    inputs (chartKind, series, options, …) ride `widgetDef.props`,
 *    plus an optional `dataSource` block resolves `series` /
 *    `categories` from a GraphQL query.
 * 4. **Stats-block** — Items with `type: 'stats-block'` mount
 *    CnStatsBlockWidget; the count comes from `widgetDef.dataSource`
 *    (shorthand `{ register, schema, filter?, aggregate: 'count' }`
 *    or raw GraphQL `{ graphql: { query, variables?, selectors } }`).
 * 5. **NC Dashboard API** — Widgets with `itemApiVersions` auto-rendered
 * 6. **Unknown fallback** — `unavailableLabel` text inside a wrapper
 *
 * Basic usage with custom widgets
 * ```vue
 * <CnDashboardPage
 *   title="Dashboard"
 *   :widgets="widgetDefs"
 *   :layout="savedLayout"
 *   @layout-change="saveLayout">
 *   <template #widget-cases-by-status="{ item }">
 *     <StatusChart :data="statusData" />
 *   </template>
 *   <template #widget-my-work="{ item }">
 *     <MyWorkList :items="workItems" />
 *   </template>
 * </CnDashboardPage>
 * ```
 *
 * With NC Dashboard API widgets
 * ```vue
 * <CnDashboardPage
 *   title="Dashboard"
 *   :widgets="[...appWidgets, ...ncWidgets]"
 *   :layout="layout"
 *   @layout-change="saveLayout" />
 * ```
 *
 * With manifest-driven chart widgets (no consumer code required)
 * ```js
 * const widgets = [{
 *   id: 'sla-trend',
 *   title: 'SLA trend',
 *   type: 'chart',
 *   props: {
 *     chartKind: 'line',                 // line|bar|donut|area|pie|radialBar
 *     series: [{ name: 'SLA %', data: [82, 85, 88, 91] }],
 *     categories: ['Q1', 'Q2', 'Q3', 'Q4'],
 *     options: { stroke: { width: 3 } }, // deep-merged with defaults
 *     // dataSource is reserved for a future cycle — round-tripped
 *     // through manifest validators but not yet read at render time:
 *     // dataSource: { url: '/index.php/apps/myapp/api/charts/sla' }
 *     // dataSource: { register: 'cases', schema: 'case',
 *     //               groupBy: 'caseType', aggregate: 'count' }
 *   },
 * }]
 * ```
 */
export default {
	name: 'CnDashboardPage',

	components: {
		NcActions,
		NcActionButton,
		NcActionInput,
		NcActionSeparator,
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		NcSelect,
		Pencil,
		Check,
		Cog,
		CalendarRange,
		ViewDashboardOutline,
		Download,
		CnDashboardGrid,
		CnWidgetWrapper,
		CnWidgetRenderer,
		CnTileWidget,
		CnChartWidget,
		CnStatsBlockWidget,
		CnWidgetRefItem,
		CnBodySections,
		CnDateRangePicker,
		CnActionsMenu,
		CnActionButtons,
		CnBuildiqEditButton,
		CnWidgetStyleEditorModal,
		CnLeafMountHost,
	},

	inject: {
		/**
		 * Buildiq in-app edit state (ADR-041), provided by CnAppRoot as a ref.
		 * When true the dashboard grid becomes drag/resize/remove-able even
		 * without the consumer's own `allowEdit` toggle.
		 */
		cnEditingBody: { default: false },
		/**
		 * Reactive AI context holder provided by CnAppRoot. Overwritten
		 * on created() and watched for prop changes. Reset on beforeUnmount().
		 */
		cnAiContext: { default: null },
		/**
		 * Consumer widget registry provided by CnAppRoot — the SAME injection
		 * CnWidgetGrid and CnDetailPage read, so an app-registered widget
		 * resolves identically on all three surfaces (REQ-MVR-005: a custom
		 * widget overrides a built-in of the same name).
		 */
		cnRegistry: { default: () => ({}) },
		/**
		 * Host translate function provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). The
		 * manifest-authored page title/description are run through it.
		 * Defaults to an identity function so an untranslated key renders
		 * as itself.
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** Page title */
		title: {
			type: String,
			default: '',
		},
		/** Page description (shown below title) */
		description: {
			type: String,
			default: '',
		},
		/**
		 * Widget definitions array. Each widget defines metadata for rendering.
		 *
		 * Custom widgets: `{ id: 'my-widget', title: 'My Widget', type: 'custom' }`
		 * NC API widgets: `{ id: 'calendar', title: 'Calendar', itemApiVersions: [1,2], ... }`
		 * Tile widgets: `{ id: 'tile-files', type: 'tile', title: 'Files', icon: 'M12...', iconType: 'svg', backgroundColor: '#0082c9', textColor: '#fff', linkType: 'app', linkValue: 'files' }`
		 * Chart widgets: `{ id: 'sla', type: 'chart', title: 'SLA trend',
		 *   props: { chartKind: 'line', series: [{ name: 'SLA %', data: [82, 88, 91] }],
		 *            categories: ['Q1', 'Q2', 'Q3'], options: { stroke: { width: 3 } } } }`
		 * @type {Array<{ id: string, title: string, type: string, iconUrl: string, iconClass: string, buttons: Array, itemApiVersions: number[], reloadInterval: number, props: object }>}
		 */
		widgets: {
			type: Array,
			default: () => [],
		},
		/**
		 * Layout array defining widget positions in the grid.
		 *
		 * Each item: `{ id: 'unique-id', widgetId: 'my-widget', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 }`
		 *
		 * Additional properties (showTitle, styleConfig, tile config) are passed through.
		 * @type {Array<{ id: string|number, widgetId: string, gridX: number, gridY: number, gridWidth: number, gridHeight: number, showTitle: boolean, styleConfig: object }>}
		 */
		layout: {
			type: Array,
			default: () => [],
		},
		/**
		 * Declarative content items. Each item is a `widget-ref` entry from the
		 * manifest's `pages[].config.content[]` array:
		 *
		 *   `{ type: 'widget-ref', ref: 'openregister://widget/<schemaSlug>/<widgetSlug>' }`
		 *
		 * CnDashboardPage renders each widget-ref item as a `CnWidgetRefItem`
		 * which resolves the widget from OR's registry at runtime and renders
		 * the resolved component. Only `widget-ref` entries are processed; unknown
		 * `type` values are skipped with a `console.warn`.
		 *
		 * When both `content` (widget-ref items) and `widgets`+`layout` (classic
		 * GridStack layout) are present, `content` items are rendered above the
		 * grid in a stacked list.
		 *
		 * @type {Array<{ type: string, ref: string }>}
		 */
		content: {
			type: Array,
			default: () => [],
		},
		/**
		 * Declarative IN-BODY sections (host-app section components) rendered
		 * ALONGSIDE the widget grid — the dashboard equivalent of CnDetailPage's
		 * `bodyWidgets`. Each entry:
		 *
		 *   `{ id?, component, title?, props?, placement?, colSpan? }`
		 *
		 *   - `component` — registry name resolved from the v2 `cnRegistry` first,
		 *     then the legacy `cnCustomComponents` map (the SAME resolver
		 *     `type:"custom"` pages use). A bespoke funnel / time-series / channel
		 *     chart that reads a custom REST endpoint stays a registered component
		 *     and surfaces here without a rewrite.
		 *   - `props` — token-resolved against the page context: `@workspace.<key>`
		 *     / `@page.<key>` (page-level workspace state), `@config.<key>` (app
		 *     config), and the time / `@me` tokens. An unresolved optional token is
		 *     dropped so the child sees `undefined`.
		 *   - `placement` — `before-grid` (above the widget grid) | `after-grid`
		 *     (below it) | `end` (the default; same as `after-grid`). `before-grid`
		 *     renders even when the dashboard has no grid widgets.
		 *   - `colSpan` — 1–12 grid span when sections at one placement share a row.
		 *
		 * Empty / omitted (default `[]`) renders nothing — the current behaviour.
		 * The section context (`{ register, schema, objectId, workspace, config }`)
		 * is also `provide`d on `cnSectionContext` so a section component can
		 * inject it instead of taking explicit props. See `CnBodySections`.
		 *
		 * @type {Array<{id?: string, component: string, title?: string, props?: object, placement?: string, colSpan?: number}>}
		 */
		bodyWidgets: {
			type: Array,
			default: () => [],
		},
		/**
		 * Page-level app config map exposed to declarative widget / section
		 * config via the `@config.<key>` token (e.g. the reporting `currency`
		 * the setup wizard captures). Provided to descendants on `cnAppConfig`,
		 * so a stat widget's `format: { style: 'currency', currency:
		 * '@config.currency' }` formats with the configured value (falling back
		 * to the literal default — `EUR` — when unset) and an endpoint KPI's URL
		 * can interpolate `@config.<key>`. A manifest renderer typically seeds
		 * this from `loadState(appId, 'config', {})`. Empty (default) leaves
		 * every `@config.<key>` token to fall back to its literal default.
		 *
		 * @type {object}
		 */
		appConfig: {
			type: Object,
			default: () => ({}),
		},
		/** Whether the dashboard is loading */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Whether to show the edit toggle button */
		allowEdit: {
			type: Boolean,
			default: false,
		},
		/** Number of grid columns */
		columns: {
			type: Number,
			default: 12,
		},
		/** Grid cell height in pixels */
		cellHeight: {
			type: Number,
			default: 80,
		},
		/** Grid margin in pixels */
		gridMargin: {
			type: Number,
			default: 12,
		},
		/** Label for the edit button */
		editLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Edit'),
		},
		/** Label for the done button (when editing) */
		doneLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Done'),
		},
		/** Label for the empty state */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'No widgets configured'),
		},
		/** Label for unavailable widgets */
		unavailableLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Widget not available'),
		},
		/**
		 * Rendering surface forwarded to integration widgets (widgets
		 * whose `type === 'integration'`). Drives the AD-19 surface
		 * fallback on `resolveWidget(integrationId, surface)`.
		 *
		 * @type {'user-dashboard'|'app-dashboard'|'detail-page'|'single-entity'}
		 */
		surface: {
			type: String,
			default: 'app-dashboard',
			validator: (value) => INTEGRATION_SURFACES.includes(value),
		},
		/**
		 * Object context forwarded to integration widgets:
		 * `{ register, schema, objectId }`. Optional — most dashboards
		 * aren't object-scoped, but CnDetailPage passes one through so
		 * `CnFilesCard` / `CnTagsCard` / `CnAuditTrailCard` know which
		 * object's sub-resources to fetch.
		 *
		 * @type {object|null}
		 */
		integrationContext: {
			type: Object,
			default: null,
		},
		/**
		 * Optional per-app install/enable status map used by the
		 * `requiresApp` widget gate. Shape: `{ [appId]: { installed:
		 * boolean, enabled: boolean, category?: string } }` — typically
		 * the `dependency_statuses` initial state a consuming app injects.
		 * When a widget definition carries `requiresApp` (a string or
		 * array of app ids) and a required app is not enabled here, that
		 * widget renders an "Install …" call-to-action instead of its
		 * normal content. When this prop is `null` the gate falls back to
		 * the `isAppInstalled()` runtime check (`OC.appswebroots` →
		 * capabilities), so the gate works with or without injected data.
		 *
		 * @type {object|null}
		 */
		appStatuses: {
			type: Object,
			default: null,
		},
		/**
		 * Optional date-range header descriptor. When `enabled: true`
		 * the dashboard renders a `CnDateRangePicker` between the
		 * header and the widget grid, persists the chosen range to
		 * `localStorage` (when `persistKey` is set), emits
		 * `@date-range-change` on every change, AND provides a
		 * reactive `cnDashboardDateRange` ref to every descendant
		 * widget.
		 *
		 * When the prop is `null` (default), `false`, or
		 * `{ enabled: false }`, the header row is NOT rendered and the
		 * existing dashboard layout stays unchanged. The provide is
		 * still installed (always) but its value stays `null` so
		 * descendant chart widgets fall back to their
		 * `dataSource.bucket.staticRange` (or skip the query
		 * entirely).
		 *
		 * Shape:
		 * ```ts
		 * {
		 *   enabled: boolean,
		 *   control?: 'picker' | 'pills',
		 *   default?: { from: string, to: string, preset?: string },
		 *   persistKey?: string,
		 *   presets?: Array<{ id: string, label: string, days: number|null }>,
		 * }
		 * ```
		 *
		 * `control` selects the header control style: the default `'picker'`
		 * renders the `CnDateRangePicker` (a preset select + two date
		 * inputs); `'pills'` renders a compact segmented toggle-button row
		 * (one pill per preset, plus a de-emphasised "Custom range" popover
		 * pill). Both drive the same shared range.
		 *
		 * A preset with no numeric `days` / `hours` (other than the manual
		 * `custom` entry) — e.g. `{ id: 'all', label: 'All', days: null }` —
		 * is an "All" / CLEAR preset: picking it removes the window so
		 * date-bound widgets show their unfiltered count. An explicit
		 * `clear: true` forces the same behaviour.
		 *
		 * The active window is published into the page-level workspace
		 * context as `dateFrom` / `dateTo` / `datePreset`, so any declarative
		 * widget can scope itself to it via the optional filter tokens
		 * `@workspace.dateFrom?` / `@workspace.dateTo?` (an empty bound, i.e.
		 * the "All" range, drops the token so the filter is omitted).
		 *
		 * Default preset when no explicit `default` and no persisted
		 * state is found: `last-7` (`now − 7d → now`).
		 *
		 * Per-widget surfacing: chart widgets with a `dataSource.bucket`
		 * get an in-header date chip automatically; CUSTOM and registered
		 * card widgets (`stat` / `gauge` / `delta` KPI tiles) opt in via
		 * `layout[].dateChip: true` (same popover, writes the same shared
		 * range — so an abstract KPI card carries its own period selector).
		 * The chip needs the widget header (`showTitle !== false`) and shows
		 * the active preset's label (e.g. `7d` / `All`), staying clickable
		 * even on an unbounded ("All") range. Set `showHeaderPicker: false`
		 * to rely solely on the per-widget chips.
		 *
		 * @type {object|null}
		 */
		dateRange: {
			type: Object,
			default: null,
		},
		/**
		 * Optional declarative header actions (#91 Wave 3) rendered as buttons
		 * in the dashboard header via CnActionButtons — `open-form` (schema
		 * create dialog), `api-call` (POST/PUT + toast + refresh), `toggle`
		 * (two-way state button), `navigate` / `open-modal` / `refresh`, each
		 * with an optional `visibleWhen` predicate. Empty (the default) renders
		 * nothing; the `#header-actions` slot still works alongside it for
		 * bespoke buttons.
		 *
		 * @type {Array<object>}
		 */
		headerActions: {
			type: Array,
			default: () => [],
		},
		/**
		 * Optional page-level filter controls rendered in the dashboard header.
		 * Each selection is written into the reactive page-level workspace
		 * context (the same bag `cnWorkspaceContext` provides), so any widget can
		 * read it via a `@page.<key>` / `@workspace.<key>` token — e.g. a period
		 * selector that every endpoint-bound KPI's URL interpolates.
		 *
		 * Each entry: `{ key, label?, type?: 'select', options: [{ value, label }],
		 * default? }`. `key` is the workspace-context key written on change;
		 * `default` (or the first option) seeds it on mount. Only `'select'` is
		 * supported today. Empty (the default) renders no controls and leaves the
		 * context untouched.
		 *
		 * @type {Array<{key: string, label?: string, type?: string, options: Array<{value: (string|number), label: string}>, default?: (string|number)}>}
		 */
		pageFilters: {
			type: Array,
			default: () => [],
		},
		/**
		 * Show the built-in Refresh item in the page-level overflow Actions
		 * menu. On by default. The default handler emits `@refresh` and,
		 * unless suppressed, fires the `cn:page:refresh` event-bus channel —
		 * which the built-in data widgets subscribe to, so the action works
		 * with no host wiring at all. A `@refresh` listener that calls
		 * `preventDefault()` replaces that default rather than adding to it.
		 *
		 * This is ALSO the default for each widget's own overflow menu: when
		 * `false`, the Refresh item is dropped from every widget too (handy
		 * for a read-only dashboard whose widgets have no refetch wired —
		 * Request-a-feature stays). A widget can still opt back in (or out)
		 * individually via `showRefresh` / `hideRefresh` on its definition or
		 * layout entry.
		 *
		 * @type {boolean}
		 */
		showRefresh: {
			type: Boolean,
			default: true,
		},
		/**
		 * Show the built-in Refresh item on each **custom-slot** widget
		 * (distinct from the page-level `showRefresh`). Tri-state:
		 * - `true` / `false` — force it on or off for all custom widgets.
		 * - `null` (the default) — **auto**: show it only when the app using
		 *   `CnDashboardPage` attached a `@widget-refresh` listener (i.e. it
		 *   will actually handle the refresh). Apps that refresh widgets
		 *   centrally by another route (e.g. a header button bumping a shared
		 *   signal) leave it unset and get no dead per-widget buttons.
		 *
		 * Built-in chart / NC / integration widgets always show Refresh
		 * (they refresh via the `cn:widget:refresh` bus or their renderer).
		 *
		 * @type {boolean|null}
		 */
		widgetShowRefresh: {
			type: Boolean,
			default: null,
		},
		/**
		 * Show the built-in Request-a-feature item in the page-level
		 * overflow Actions menu. On by default; opens the
		 * CnSuggestFeatureModal when mounted under CnAppRoot.
		 *
		 * @type {boolean}
		 */
		showRequestFeature: {
			type: Boolean,
			default: true,
		},
		/**
		 * Documentation link for this dashboard. When a non-empty URL is
		 * set, the page-level overflow menu renders a "Documentation" item
		 * that opens the link in a new tab. Empty (the default) hides it.
		 *
		 * @type {string}
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/** Pre-translated label for the Documentation action. Defaults to "Documentation". */
		documentationLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Documentation'),
		},
		/**
		 * Stable id for this dashboard, used in the `@refresh` /
		 * `@request-feature` payloads and the `surface: "dashboard:<id>"`
		 * field on the feature-request modal. Falls back to a slugified
		 * `title` when unset.
		 *
		 * @type {string}
		 */
		pageId: {
			type: String,
			default: '',
		},
		/** Optional `specRef` forwarded to the feature-request modal. */
		specRef: {
			type: String,
			default: '',
		},
		/** Whether a page-level refresh is in flight (disables the Refresh item and shows its spinner). */
		refreshing: {
			type: Boolean,
			default: false,
		},
		/** Pre-translated label for the Refresh action. */
		refreshLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Refresh'),
		},
		/** Pre-translated label for the Request-a-feature action. */
		requestFeatureLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Request a feature'),
		},
		/** Pre-translated aria-label / tooltip for the overflow menu trigger. */
		actionsMenuLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Actions'),
		},
	},

	emits: [
		'date-range-change',
		'edit-toggle',
		'layout-change',
		'page-filter-change',
		'refresh',
		'request-feature',
		'widget-refresh',
		'widget-remove',
		'widget-request-feature',
	],

	setup(props) {
		// Wire the pluggable integration registry so widgets of type
		// `integration` resolve their component reactively. No-op cost
		// when no integration widgets are configured.
		const { integrations: registryIntegrations, resolveWidget, getById } = useIntegrationRegistry()

		// Provide a reactive date-range ref to every descendant widget,
		// ALWAYS — even when the feature is off. Descendants can then
		// `inject('cnDashboardDateRange', ref(null))` without a fallback
		// dance, and the value stays `null` (= no range) until the user
		// picks one. CnChartWidget reads this via inject() to drive its
		// bucket-shorthand variables.
		const dashboardDateRange = ref(null)
		provide('cnDashboardDateRange', dashboardDateRange)

		// Page-level WORKSPACE CONTEXT — a reactive bag of shared keys that
		// widgets on this page both write (e.g. an interaction form sets
		// `selectedClient` / `activeSummary`) and read (a client-overview list
		// filters on `@workspace.selectedClient`; a knowledge-base widget reacts
		// to `activeSummary`). Provided ALWAYS — like cnDashboardDateRange — so
		// descendants can `inject('cnWorkspaceContext')` without a fallback dance;
		// the bag starts empty and stays inert for dashboards that don't use it.
		const workspaceContext = ref({})
		provide('cnWorkspaceContext', workspaceContext)

		// Page-level APP CONFIG — exposed to declarative widget / section config
		// via the `@config.<key>` token (e.g. the reporting currency the setup
		// wizard captures). Provided ALWAYS (like cnWorkspaceContext) and kept in
		// sync with the `appConfig` prop so a late-loaded config re-resolves
		// downstream tokens. Descendants `inject('cnAppConfig', ref({}))`.
		const appConfigRef = ref({ ...(props.appConfig || {}) })
		provide('cnAppConfig', appConfigRef)
		watch(
			() => props.appConfig,
			(next) => { appConfigRef.value = { ...(next || {}) } },
			{ deep: true },
		)

		return {
			registryIntegrations,
			resolveRegistryWidget: resolveWidget,
			getRegistryProvider: getById,
			dashboardDateRange,
			workspaceContext,
			appConfigRef,
		}
	},

	data() {
		return {
			isEditing: false,
			/** Whether the per-widget style/config editor modal is open. */
			showWidgetConfig: false,
			/** widgetId of the widget currently being configured (drives `configWidget`). */
			configWidgetId: null,
			/**
			 * Local mirror of the picker's current value. Initialised
			 * in `created()` from `dateRange.default` → persisted
			 * state → `last-7` fallback, and kept in sync with the
			 * provided `dashboardDateRange` ref via a watcher.
			 *
			 * @type {{ from: string, to: string, preset: string }|null}
			 */
			currentRange: null,
			/**
			 * Per-widget open/close state for the in-chart date-range
			 * popover. Keyed by widgetId so each chart widget's chip
			 * tracks its own NcActions open state independently. Vue 2
			 * reactivity caveat — entries are created lazily via
			 * Vue.set when needed.
			 *
			 * @type {Record<string, boolean>}
			 */
			openChipPicker: {},
			/**
			 * Pre-translated tooltip for the chart-widget date-range
			 * chip — kept as a data field rather than a computed so the
			 * lib's `translate` is evaluated once at component creation
			 * and not on every render.
			 */
			dateChipTitle: t('nextcloud-vue', 'Change date range'),
			/**
			 * Evaluated `visibleWhen` outcome per conditional widget, keyed
			 * by widget id: `{ met, value }` — whether the widget's cell may
			 * show, and the raw field value the predicate read (handed to
			 * banners so they can interpolate `{value}` into their text and
			 * skip re-fetching). Feeds `displayLayout`, which collapses the
			 * grid cell of a widget whose condition is unmet — a widget that
			 * renders nothing (or a whole card that should not exist yet)
			 * would otherwise leave its wrapper card and reserved grid row
			 * behind as a tall empty box.
			 *
			 * @type {Record<string, {met: boolean, value: any}>}
			 */
			widgetConditionOutcome: {},
			/**
			 * Whether the initial predicate evaluation has finished. The
			 * grid's FIRST paint waits for it (only when the page actually
			 * has conditional widgets), so a conditional widget is present
			 * or absent from the first rendered frame — never popping in
			 * after load and reflowing everything below it (WCAG-hostile
			 * layout shift). Set synchronously when there is nothing to
			 * evaluate; never reset once true (a later live change may
			 * still reflow, which is the correct behaviour for a state
			 * that truly changed).
			 */
			widgetConditionsSettled: false,
			/**
			 * Monotonic id of the newest evaluateWidgetConditions() run.
			 * Each run captures its own id and writes outcomes only while it
			 * is still the newest — an older run resolving late (slow
			 * endpoint) must not overwrite fresher verdicts, and only the
			 * newest run may prune outcomes for removed defs.
			 */
			widgetEvalSeq: 0,
			/**
			 * Signature of the last-evaluated conditional set — the sorted
			 * `[id, visibleWhen]` pairs. The deep `widgets` watch fires on
			 * ANY def edit (a title tweak, a color change); re-running the
			 * predicates is only warranted when this signature actually
			 * changed, otherwise an authoring session would refetch every
			 * conditional endpoint on every keystroke.
			 */
			widgetEvalSignature: null,
		}
	},

	computed: {
		/**
		 * Effective translate function: the injected `cnTranslate` (the host
		 * app's bound `t()`), identity by default.
		 *
		 * @return {(key: string) => string}
		 */
		effectiveTranslate() {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate : (key) => key
		},

		/**
		 * The page title run through the host translate function so a
		 * manifest-authored source string localises.
		 *
		 * @return {string}
		 */
		resolvedTitle() {
			return this.title ? this.effectiveTranslate(this.title) : this.title
		},

		/**
		 * The page description run through the host translate function.
		 *
		 * @return {string}
		 */
		resolvedDescription() {
			return this.description ? this.effectiveTranslate(this.description) : this.description
		},

		/**
		 * Whether the widget grid should be drag/resize/remove-able — the
		 * consumer's own edit toggle OR the Buildiq in-app editor (ADR-041).
		 * Unwraps the injected `cnEditingBody` ref.
		 *
		 * @return {boolean}
		 */
		gridEditable() {
			const e = this.cnEditingBody
			const buildiqEditing = Boolean(e && typeof e === 'object' && 'value' in e ? e.value : e)
			return this.isEditing || buildiqEditing
		},
		/**
		 * The layout actually handed to the grid. In live (non-edit) mode,
		 * widgets that would render nothing right now — a `visibleWhen`
		 * that has not evaluated true, or a banner with no text — are
		 * REMOVED and the remaining items are re-compacted upward:
		 * GridStack runs `float: true`, so a hidden widget otherwise keeps
		 * its wrapper card and its reserved grid row, and a dashboard whose
		 * fail-safe-hidden widgets are (correctly) hidden opens on a column
		 * of tall empty cards.
		 *
		 * Purely a display transform: the authored `layout` prop is never
		 * mutated (`onLayoutChange` merges geometry back into the FULL
		 * authored array by id, so collapsed items survive round-trips), and
		 * edit mode returns the authored layout untouched so hidden widgets
		 * stay visible, placeable and configurable while editing.
		 *
		 * @return {Array<object>}
		 */
		displayLayout() {
			if (this.gridEditable) return this.layout
			const items = this.layout || []
			const visible = items.filter((item) => !this.isCollapsedWidget(item))
			if (visible.length === items.length) return items
			return this.compactDisplayLayout(visible)
		},
		/**
		 * Effective Refresh visibility for custom-slot widgets. An explicit
		 * `widgetShowRefresh` prop wins; when unset (`null`), show Refresh
		 * only if the app attached a `@widget-refresh` listener that will
		 * handle it. (The page always attaches its own `@refresh` re-emitter
		 * to each wrapper, so wrapper-level auto-detection can't be relied on
		 * here — we resolve it at the page instead.)
		 *
		 * @return {boolean}
		 */
		effectiveWidgetShowRefresh() {
			if (this.widgetShowRefresh !== null) return this.widgetShowRefresh
			// `$.vnode.props`, not `$attrs`: a declared emit is stripped out of
			// `$attrs`. And the key is `onWidgetRefresh` — Vue's compiler
			// camelizes every `v-on` argument, so the hyphenated
			// `$attrs['onWidget-refresh']` this used to read was `undefined`
			// unconditionally and the auto-detect never once fired.
			return Boolean(this.$.vnode.props?.onWidgetRefresh)
		},
		/**
		 * Stable id for the page-level Actions menu. Prefers the explicit
		 * `pageId` prop; falls back to a slugified `title`, then
		 * `'dashboard'`.
		 *
		 * @return {string}
		 */
		resolvedPageId() {
			if (this.pageId) return this.pageId
			const slug = (this.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
			return slug || 'dashboard'
		},
		/**
		 * Whether the caller supplied an `action-items` slot — forwarded
		 * conditionally so the shared CnActionsMenu doesn't treat an
		 * always-present pass-through template as content.
		 *
		 * @return {boolean}
		 */
		hasActionItemsSlot() {
			return Boolean(this.$slots['action-items']) || Boolean(this.$slots && this.$slots['action-items'])
		},

		/**
		 * True when the date-range header should render. `false`,
		 * `null`, and `{ enabled: false }` all collapse to `false`.
		 */
		dateRangeEnabled() {
			return !!(this.dateRange && this.dateRange.enabled === true)
		},

		/**
		 * True when the header date-range picker should render. The
		 * range feature must be enabled AND `showHeaderPicker` must not
		 * be explicitly false. Defaults to showing the header (backwards
		 * compatible) — consumers that drive the range entirely through
		 * per-widget chart chips set `dateRange.showHeaderPicker: false`
		 * to drop the redundant header control.
		 *
		 * @return {boolean}
		 */
		showHeaderDateRange() {
			return this.dateRangeEnabled && this.dateRange.showHeaderPicker !== false
		},

		/**
		 * The preset list passed to the picker. Falls back to the
		 * `DEFAULT_DATE_RANGE_PRESETS` constant when the consumer
		 * doesn't supply one.
		 */
		effectivePresets() {
			return Array.isArray(this.dateRange?.presets) && this.dateRange.presets.length > 0
				? this.dateRange.presets
				: DEFAULT_DATE_RANGE_PRESETS.map((p) => ({ ...p }))
		},

		/**
		 * Which header date-range control to render. `'pills'` swaps the
		 * select + two date inputs for a compact segmented pill row; any
		 * other value (or none) keeps the default `CnDateRangePicker`.
		 *
		 * @return {string}
		 */
		dateRangeControl() {
			return this.dateRange?.control === 'pills' ? 'pills' : 'picker'
		},

		/**
		 * Compact, always-present label for the per-widget date chip
		 * (`layout[].dateChip`). Prefers the active preset's own label (e.g.
		 * `7d` / `30d` / `All`) so a KPI card surfaces a tidy period token;
		 * falls back to the concrete `from – to` span for a manual range, and
		 * to a generic "Date range" when neither is known. NEVER empty, so the
		 * chip stays clickable even on an unbounded ("All") range.
		 *
		 * @return {string} The chip label.
		 */
		dashboardRangeChipLabel() {
			const rng = this.currentRange || this.dashboardDateRange
			if (rng && rng.preset && rng.preset !== 'custom') {
				const preset = this.effectivePresets.find((p) => p && p.id === rng.preset)
				if (preset && preset.label) return preset.label
			}
			return this.formatDashboardDateRange() || t('nextcloud-vue', 'Date range')
		},

		/**
		 * Preset list rendered as pills — `effectivePresets` minus the
		 * manual `custom` entry (which surfaces as a separate de-emphasised
		 * popover pill instead of a bare toggle).
		 *
		 * @return {Array<{ id: string, label: string }>}
		 */
		pillPresets() {
			return this.effectivePresets.filter((p) => p && p.id !== 'custom')
		},

		/**
		 * Whether a `custom` preset exists in the list — drives the optional
		 * "Custom range" popover pill in pills mode.
		 *
		 * @return {boolean}
		 */
		hasCustomPreset() {
			return this.effectivePresets.some((p) => p && p.id === 'custom')
		},

		/**
		 * Accessible label for the pill toggle group.
		 *
		 * @return {string}
		 */
		datePillsGroupLabel() {
			return t('nextcloud-vue', 'Date range')
		},

		/**
		 * Label for the custom-range pill: the `custom` preset's own label
		 * when set, else a sensible default.
		 *
		 * @return {string}
		 */
		customRangeLabel() {
			const c = this.effectivePresets.find((p) => p && p.id === 'custom')
			return (c && c.label) || t('nextcloud-vue', 'Custom range')
		},

		/**
		 * True when the dashboard has either classic grid widgets (via
		 * `layout`) or declarative `content[]` widget-ref items to render.
		 */
		hasWidgets() {
			// Depend on the (always-reactive) edit flag so this computed
			// re-evaluates when in-app edit mode flips. Manifest arrays are raw
			// until useManifestEditor.enter() observes them in place — a cache
			// built pre-edit has no reactive deps and would stay frozen forever,
			// keeping the empty state on screen after the first Add widget.
			// Re-evaluating post-enter re-subscribes against the reactive graph.
			// eslint-disable-next-line no-unused-expressions
			this.gridEditable
			return this.layout.length > 0 || this.widgetRefItems.length > 0
		},

		/**
		 * The widget settings object handed to CnWidgetStyleEditorModal,
		 * built from the widget definition currently being configured
		 * (`configWidgetId`). Carries the chrome fields the editor reads /
		 * mutates (`title`, `styleConfig`, `showTitle`, `customTitle`,
		 * `customIcon`, `content`) plus the widget `id`. Returns an empty
		 * shell when nothing is selected so the modal's `required` widget
		 * prop never sees null.
		 *
		 * @return {object}
		 */
		configWidget() {
			const def = this.getWidgetDef(this.configWidgetId) || {}
			// Bridge legacy data-driven widgets (chart / stats-block / table that
			// carry top-level `props` + `dataSource` instead of `content`) into a
			// `content` shape so their config form pre-fills. Once saved, the
			// content-aware getters take over.
			let content = def.content || {}
			if ((!content || Object.keys(content).length === 0) && (def.props || def.dataSource)) {
				content = {}
				if (def.title) content.title = def.title
				if (def.props) {
					content.props = def.props
					if (def.props.chartKind) content.chartKind = def.props.chartKind
				}
				if (def.dataSource) content.dataSource = def.dataSource
			}
			return {
				id: def.id || this.configWidgetId,
				type: def.type || '',
				title: def.title || '',
				styleConfig: def.styleConfig || {},
				// Left raw (possibly undefined) so the modal can apply the
				// card-aware default rather than being handed a coerced `true`.
				showTitle: def.showTitle,
				customTitle: def.customTitle || '',
				customIcon: def.customIcon || '',
				content,
			}
		},

		/**
		 * Filtered list of `widget-ref` items from `content[]`.
		 * Unknown `type` values are logged and excluded so future
		 * content item types can be added without breaking existing
		 * dashboards.
		 *
		 * @return {Array<{ type: 'widget-ref', ref: string }>}
		 */
		widgetRefItems() {
			const out = []
			for (const item of this.content) {
				if (!item || typeof item !== 'object') continue
				if (item.type === 'widget-ref') {
					out.push(item)
				} else {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnDashboardPage] Unknown content item type "${item.type}" — only "widget-ref" is supported. Item will be skipped.`,
					)
				}
			}
			return out
		},

		/**
		 * Whether any in-body sections are configured (drives the three
		 * placement mounts of CnBodySections).
		 *
		 * @return {boolean}
		 */
		hasBodyWidgets() {
			return Array.isArray(this.bodyWidgets) && this.bodyWidgets.length > 0
		},

		/**
		 * Sections that land at the END placement: those with no `placement` (the
		 * default) or an explicit `placement: "end"`. The two named placement
		 * mounts (`before-grid` / `after-grid`) filter by their own value, so this
		 * computed excludes them to avoid double-rendering.
		 *
		 * @return {Array}
		 */
		endPlacementSections() {
			const named = ['before-grid', 'after-grid']
			return (Array.isArray(this.bodyWidgets) ? this.bodyWidgets : [])
				.filter((s) => !s || !s.placement || !named.includes(s.placement))
		},

		/**
		 * Page context forwarded to CnBodySections for token resolution
		 * (`@workspace.<key>` / `@page.<key>` / `@config.<key>` + time tokens) AND
		 * provided on `cnSectionContext` for host section components that inject.
		 * The optional object scoping (`objectId` / `register` / `schema`) is read
		 * from `integrationContext` so an object-scoped dashboard can resolve
		 * `@objectId` / `@object.<field>` too.
		 *
		 * @return {{objectId: (string|null), register: string, schema: string, workspace: object, config: object}}
		 */
		sectionContext() {
			const ic = this.integrationContext || {}
			return {
				objectId: (ic.objectId !== undefined && ic.objectId !== null) ? String(ic.objectId) : null,
				register: ic.register || '',
				schema: ic.schema || '',
				workspace: this.workspaceContext,
				config: this.appConfigRef,
			}
		},
	},

	watch: {
		/**
		 * Re-evaluate the widget predicates when the defs change — the
		 * in-app editor (ADR-041) mutates widget defs in place and "Add
		 * widget" pushes into the same array, so a deep watch is the only
		 * signal that a widget's `visibleWhen` was added or edited.
		 */
		widgets: {
			deep: true,
			handler() { this.evaluateWidgetConditions() },
		},
	},

	created() {
		this.pushAiContext()
		this.initDateRange()
		this.initPageFilters()
		this.evaluateWidgetConditions()
	},

	beforeUnmount() {
		if (this.cnAiContext) {
			this.cnAiContext.pageKind = 'custom'
			this.cnAiContext.registerSlug = undefined
			this.cnAiContext.schemaSlug = undefined
		}
	},

	methods: {
		/**
		 * Seed the reactive workspace context with each page filter's default
		 * (its `default`, else the first option's value) so endpoint-bound
		 * widgets have a value to interpolate on first render. Only writes keys
		 * that aren't already present, so a value another widget set survives.
		 *
		 * @return {void}
		 */
		initPageFilters() {
			for (const pf of this.pageFilters || []) {
				if (!pf || !pf.key) continue
				if (this.workspaceContext[pf.key] !== undefined) continue
				const fallback = (pf.options && pf.options.length) ? pf.options[0].value : undefined
				const value = pf.default !== undefined ? pf.default : fallback
				if (value !== undefined) {
					this.workspaceContext[pf.key] = value
				}
			}
		},
		/**
		 * The currently-selected option object for a page filter's NcSelect
		 * (matched by `value` against the workspace context), or null.
		 *
		 * @param {object} pf The page-filter descriptor.
		 * @return {object|null}
		 */
		selectedPageFilterOption(pf) {
			if (!pf || !pf.key) return null
			const current = this.workspaceContext[pf.key]
			return (pf.options || []).find((o) => o.value === current) || null
		},
		/**
		 * Write a page filter's new selection into the reactive workspace
		 * context so every `@page.<key>` / `@workspace.<key>` token re-resolves.
		 *
		 * @param {object} pf The page-filter descriptor.
		 * @param {object|null} option The chosen NcSelect option (`{ value, label }`).
		 * @return {void}
		 */
		onPageFilterChange(pf, option) {
			if (!pf || !pf.key) return
			const value = option && typeof option === 'object' ? option.value : option
			this.workspaceContext[pf.key] = value
			/**
			 * @event page-filter-change Emitted when a page-level filter selection changes.
			 * @type {{ key: string, value: (string|number|null) }}
			 */
			this.$emit('page-filter-change', { key: pf.key, value })
		},
		/**
		 * Re-emit the page-level CnActionsMenu `@refresh` to the host,
		 * passing the synthetic event through so a host listener can
		 * `preventDefault()` the built-in default (event-bus emit on
		 * `cn:page:refresh`). Distinct from `@widget-refresh`, which the
		 * per-widget menus emit.
		 *
		 * @param {{ widgetId: string, title: string }} payload Action payload.
		 * @param {{ defaultPrevented: boolean, preventDefault: Function }} ev Synthetic event.
		 * @return {void}
		 */
		onActionsRefresh(payload, ev) {
			/**
			 * @event refresh User clicked Refresh in the page-level overflow
			 * Actions menu. Payload: `{ widgetId, title }`. Handlers may
			 * call the second arg's `preventDefault()` to suppress the
			 * built-in default (event-bus emit on `cn:page:refresh`).
			 * @type {{ widgetId: string, title: string }}
			 */
			this.$emit('refresh', payload, ev)
		},

		/**
		 * Re-emit the page-level CnActionsMenu `@request-feature` to the
		 * host. Distinct from `@widget-request-feature`.
		 *
		 * @param {{ widgetId: string, title: string }} payload Action payload.
		 * @param {{ defaultPrevented: boolean, preventDefault: Function }} ev Synthetic event.
		 * @return {void}
		 */
		onActionsRequestFeature(payload, ev) {
			/**
			 * @event request-feature User clicked Request a feature in the
			 * page-level overflow Actions menu. Payload: `{ widgetId,
			 * title }`. Handlers may call the second arg's
			 * `preventDefault()` to suppress the built-in default
			 * (auto-opening CnSuggestFeatureModal).
			 * @type {{ widgetId: string, title: string }}
			 */
			this.$emit('request-feature', payload, ev)
		},

		/**
		 * Forward a widget's `@refresh` from CnWidgetWrapper to the
		 * dashboard host. The host wires this to its data-fetching layer
		 * (e.g. re-fetching the GraphQL aggregate for a chart). Payload
		 * is the layout item so consumers can route by widget id.
		 *
		 * @param {object} item Layout item descriptor.
		 * @return {void}
		 */
		onWidgetRefresh(item) {
			/**
			 * @event widget-refresh User clicked Refresh in a widget's
			 * overflow action menu. Payload: the layout item descriptor.
			 */
			this.$emit('widget-refresh', item)
		},

		/**
		 * Forward a widget's `@request-feature` from CnWidgetWrapper to
		 * the dashboard host. The host decides where to send the user
		 * (typically an issue tracker).
		 *
		 * @param {object} item Layout item descriptor.
		 * @return {void}
		 */
		onWidgetRequestFeature(item) {
			/**
			 * @event widget-request-feature User clicked Request a
			 * feature in a widget's overflow action menu. Payload: the
			 * layout item descriptor.
			 */
			this.$emit('widget-request-feature', item)
		},

		/**
		 * Format a chart widget's bucket date range as a short readable
		 * chip, rendered inside CnWidgetWrapper's `#title-meta` slot.
		 * Returns null when the bucket has neither a `staticRange` nor
		 * resolved `from`/`to` via the reactive dashboard `dateRange`
		 * provide (in which case the chip simply doesn't render).
		 *
		 * @param {object} item Layout item descriptor with chart shorthand.
		 * @return {string|null} `"2026-05-18 → 2026-05-25"` or null.
		 */
		formatChartDateRange(item) {
			const ds = this.getWidgetDataSource(item) || {}
			const bucket = ds.bucket || {}
			// 1. Bucket-level staticRange wins (explicit per-widget freeze).
			const sr = bucket.staticRange || {}
			let from = sr.from || null
			let to = sr.to || null
			// 2. Fall back to the dashboard-level reactive dateRange when
			//    the bucket uses fromVar/toVar shorthand. Vue 2.7's setup
			//    auto-unwraps refs when accessed via `this`, so
			//    `this.dashboardDateRange` IS the current value (not the
			//    ref). Assignments in setRange() / initial-range
			//    methods write through to the ref's `.value` automatically.
			if ((!from || !to) && this.dashboardDateRange) {
				const rng = this.dashboardDateRange
				if (bucket.fromVar && rng[bucket.fromVar]) from = from || rng[bucket.fromVar]
				if (bucket.toVar && rng[bucket.toVar]) to = to || rng[bucket.toVar]
			}
			return this.formatRangeLabel(from, to)
		},

		/**
		 * Format the SHARED dashboard date range as a compact chip label.
		 * Used by the opt-in custom-widget date chip (`layout[].dateChip`),
		 * which has no per-widget dataSource to derive a window from —
		 * the chip always surfaces the dashboard-level range.
		 *
		 * @return {string|null} `"18 May – 25 May"` or null when no range is set.
		 */
		formatDashboardDateRange() {
			const rng = this.dashboardDateRange
			if (!rng) return null
			return this.formatRangeLabel(rng.from || null, rng.to || null)
		},

		/**
		 * Friendly compact label: "18 May – 25 May" / "18 Dec 2025 – 2 Jan 2026".
		 * The year is only shown when a bound falls outside the current
		 * year, keeping the common same-year case short while staying
		 * unambiguous for older / cross-year windows.
		 *
		 * @param {string|null} from ISO-8601 lower bound (or null).
		 * @param {string|null} to ISO-8601 upper bound (or null).
		 * @return {string|null} Formatted label, or null when both bounds are empty.
		 */
		formatRangeLabel(from, to) {
			if (!from && !to) return null
			const toDate = (v) => {
				if (typeof v !== 'string' || v.length < 10) return null
				const d = new Date(`${v.slice(0, 10)}T00:00:00`)
				return Number.isNaN(d.getTime()) ? null : d
			}
			const fromDate = toDate(from)
			const toDateValue = toDate(to)
			const thisYear = new Date().getFullYear()
			const needsYear = [fromDate, toDateValue].some((d) => d && d.getFullYear() !== thisYear)
			const fmt = (d) => {
				if (!d) return ''
				return d.toLocaleDateString(undefined, {
					day: 'numeric',
					month: 'short',
					...(needsYear ? { year: 'numeric' } : {}),
				})
			}
			const left = fmt(fromDate)
			const right = fmt(toDateValue)
			if (left && right) return `${left} – ${right}`
			return (left || right) || null
		},

		/**
		 * Handle a preset pick from the in-chip date-range popover. The
		 * popover renders the same preset list the global picker uses
		 * (effectivePresets). On click we resolve the preset to a from/to
		 * window, build a `{ from, to, preset }` value, and forward to the
		 * existing `onDateRangeChange` — same handler the top picker uses.
		 * Effect: the chip is a per-chart shortcut to the dashboard-wide
		 * range, not a per-widget override.
		 *
		 * @param {{ label: string, value: string }} preset Preset descriptor.
		 * @param {object} _item Layout item (unused — included so the
		 *   binding shape matches the template's @click signature).
		 * @return {void}
		 */
		onChipPresetPick(preset, _item) {
			if (!preset || !preset.id) return
			if (preset.id === 'custom') return
			if (this.isClearPreset(preset)) {
				this.onDateRangeChange({ from: '', to: '', preset: preset.id })
				return
			}
			const win = resolvePresetWindow(preset.id, this.effectivePresets)
			if (!win) return
			this.onDateRangeChange({ ...win, preset: preset.id })
		},

		/**
		 * Handle a header date-range pill click (pills mode). Resolves the
		 * preset to a from/to window and forwards to `onDateRangeChange` —
		 * the same handler the select picker uses — so the active range
		 * drives every widget identically. Re-clicking the active pill
		 * re-resolves (cheap no-op for fixed presets).
		 *
		 * @param {{ id: string, label: string }} preset The picked preset.
		 * @return {void}
		 */
		onPillPick(preset) {
			if (!preset || !preset.id) return
			// An "All" / clear preset removes the window (empty from/to) so
			// optional date tokens drop and widgets show the unfiltered count.
			if (this.isClearPreset(preset)) {
				this.onDateRangeChange({ from: '', to: '', preset: preset.id })
				return
			}
			const win = resolvePresetWindow(preset.id, this.effectivePresets)
			if (!win) return
			this.onDateRangeChange({ ...win, preset: preset.id })
		},

		/**
		 * Handle a manual datetime-input change inside the in-chip popover.
		 * The `<input type="datetime-local">` emits a local "YYYY-MM-DDTHH:mm"
		 * string (or a DOM Event in some NcActionInput versions); we
		 * normalise to an ISO-8601 UTC string for storage and forward
		 * `{ from, to, preset: 'custom' }` to `onDateRangeChange`.
		 *
		 * @param {'from'|'to'} field The half being edited.
		 * @param {Date|string|Event} value Date from the picker, local
		 *   datetime string, or a raw input Event.
		 * @return {void}
		 */
		onChipDateInput(field, value) {
			const next = {
				from: this.currentRange?.from || '',
				to: this.currentRange?.to || '',
				preset: 'custom',
			}
			// NcActionInput's date types are backed by a date picker that
			// emits a Date — NOT a string and NOT an input Event. Handle the
			// Date first; without it every manual edit fell through to '' and
			// silently CLEARED the half being edited.
			if (value instanceof Date) {
				next[field] = Number.isNaN(value.getTime()) ? '' : value.toISOString()
			} else {
				const raw = typeof value === 'string'
					? value
					: (value && value.target ? value.target.value : '')
				next[field] = raw ? this.localDateTimeInputToIso(raw) : ''
			}
			this.onDateRangeChange(next)
		},

		/**
		 * Coerce a stored ISO-8601 string into the `Date` that
		 * `NcActionInput`'s date types require — they are backed by a date
		 * picker whose model is typed `Date` and which renders EMPTY for a
		 * string. Returns null for missing / unparseable input.
		 *
		 * @param {string} iso ISO-8601 timestamp.
		 * @return {Date|null} Date for the picker model, or null.
		 */
		toPickerDate(iso) {
			if (!iso) return null
			const d = new Date(iso)
			return Number.isNaN(d.getTime()) ? null : d
		},

		/**
		 * Parse a local "YYYY-MM-DDTHH:mm" datetime-local value into an
		 * ISO-8601 UTC string. `new Date(local)` interprets the bare
		 * string in the runtime's local timezone, matching what the
		 * native input shows the user.
		 *
		 * @param {string} local Local datetime-local input value.
		 * @return {string} ISO-8601 UTC string, or empty when unparseable.
		 */
		localDateTimeInputToIso(local) {
			const d = new Date(local)
			return Number.isNaN(d.getTime()) ? '' : d.toISOString()
		},

		/**
		 * Push pageKind = 'dashboard' into the reactive cnAiContext.
		 * registerSlug/schemaSlug are populated when the dashboard page
		 * receives those props (some dashboards are schema-specific).
		 */
		pushAiContext() {
			if (!this.cnAiContext) return
			this.cnAiContext.pageKind = 'dashboard'
			// Dashboard pages don't universally carry register/schema props —
			// leave them undefined (they'll be whatever the previous page set,
			// but we reset to undefined here for a clean context).
			this.cnAiContext.registerSlug = undefined
			this.cnAiContext.schemaSlug = undefined
			this.cnAiContext.objectUuid = undefined
		},

		/**
		 * Resolve the initial date-range value when the feature is on.
		 * Priority: explicit `dateRange.default` → persisted
		 * `localStorage` entry (when `persistKey`) → `last-7` preset.
		 * No-ops when the feature is disabled. Emits
		 * `date-range-change` if a non-null value was resolved so
		 * consumers can wire their initial fetch to the same event.
		 */
		initDateRange() {
			if (!this.dateRangeEnabled) return
			let initial = null
			// 1. Persisted state (when a key is set).
			if (this.dateRange?.persistKey) {
				initial = this.readPersisted(this.dateRange.persistKey)
			}
			// 2. Explicit consumer-supplied default. A default may be given
			//    as an explicit { from, to } window OR as just a preset id
			//    (e.g. `default: { preset: 'last-7' }`) — in the latter case
			//    we resolve the window from the preset so the manifest can
			//    declare a starting range by name without hard-coding dates.
			if (!initial && this.dateRange?.default) {
				const def = this.dateRange.default
				if ((!def.from || !def.to) && def.preset && def.preset !== 'custom') {
					const win = resolvePresetWindow(def.preset, this.effectivePresets)
					if (win) {
						initial = { from: win.from, to: win.to, preset: def.preset }
					}
				}
				if (!initial) {
					initial = {
						from: def.from || null,
						to: def.to || null,
						preset: def.preset || 'custom',
					}
				}
			}
			// 3. Last-7 fallback.
			if (!initial) {
				const win = resolvePresetWindow('last-7', this.effectivePresets)
				if (win) {
					initial = { from: win.from, to: win.to, preset: 'last-7' }
				}
			}
			if (initial) {
				this.currentRange = initial
				this.dashboardDateRange = initial
				this.syncRangeToWorkspace(initial)
				/**
				 * @event date-range-change Fired whenever the dashboard's effective date range changes (initial resolve, picker change, or persisted-range restore). Payload: `{ from, to, preset }`.
				 */
				this.$emit('date-range-change', { ...initial })
			}
		},

		/**
		 * Handle a picker change. Persists (when `persistKey` is
		 * set), updates the provided ref, emits `date-range-change`.
		 *
		 * @param {{ from: string, to: string, preset: string }} value
		 *   The new range, emitted by `CnDateRangePicker`.
		 */
		onDateRangeChange(value) {
			this.currentRange = value
			this.dashboardDateRange = value
			this.syncRangeToWorkspace(value)
			if (this.dateRange?.persistKey) {
				this.persistRange(this.dateRange.persistKey, value)
			}
			/**
			 * @event date-range-change Fired whenever the dashboard's effective date range changes. Payload: `{ from, to, preset }`.
			 */
			this.$emit('date-range-change', { ...value })
		},

		/**
		 * Publish the active window into the shared `cnWorkspaceContext` as
		 * `dateFrom` / `dateTo` / `datePreset` so every declarative widget can
		 * read it via the existing `@workspace.dateFrom?` / `@workspace.dateTo?`
		 * filter tokens (e.g. a stat tile that scopes its count to the picked
		 * window). An empty / null half writes `''`, which leaves an optional
		 * token unresolved so `dropOptionalUnresolved` omits it — i.e. an "All"
		 * range removes the date filter rather than sending a bound.
		 *
		 * @param {{ from?: string, to?: string, preset?: string }|null} value The range.
		 * @return {void}
		 */
		syncRangeToWorkspace(value) {
			const v = value || {}
			this.workspaceContext.dateFrom = v.from || ''
			this.workspaceContext.dateTo = v.to || ''
			this.workspaceContext.datePreset = v.preset || ''
		},

		/**
		 * Whether a preset clears the window (an "All" / unbounded option) rather
		 * than resolving to a from/to span. True for an explicit `clear: true`,
		 * or any non-`custom` preset that carries no numeric `days` / `hours`
		 * (so a manifest can declare `{ id: 'all', label: 'All', days: null }`
		 * without an extra flag). The `custom` preset is excluded — it opens the
		 * manual from/to popover instead.
		 *
		 * @param {object} preset The preset descriptor.
		 * @return {boolean}
		 */
		isClearPreset(preset) {
			if (!preset) return false
			if (preset.clear === true) return true
			return preset.id !== 'custom'
				&& typeof preset.days !== 'number'
				&& typeof preset.hours !== 'number'
		},

		/**
		 * Read a persisted range from `localStorage`. Returns `null`
		 * when the key is missing, the stored value isn't valid JSON,
		 * or the parsed value doesn't have both `from` and `to`
		 * strings. Storage failures (private windows, opaque iframes)
		 * are swallowed.
		 *
		 * @param {string} key The localStorage key.
		 * @return {{ from: string, to: string, preset: string }|null}
		 */
		readPersisted(key) {
			try {
				if (typeof localStorage === 'undefined') return null
				const raw = localStorage.getItem(key)
				if (!raw) return null
				const parsed = JSON.parse(raw)
				if (!parsed || typeof parsed.from !== 'string' || typeof parsed.to !== 'string') {
					return null
				}
				return {
					from: parsed.from,
					to: parsed.to,
					preset: typeof parsed.preset === 'string' ? parsed.preset : 'custom',
				}
			} catch (_e) {
				return null
			}
		},

		/**
		 * Persist a range to `localStorage`. Swallows errors (quota
		 * exhaustion, private-window restrictions) — the picker
		 * keeps working in-memory.
		 *
		 * @param {string} key The localStorage key.
		 * @param {object} value The range to persist.
		 */
		persistRange(key, value) {
			try {
				if (typeof localStorage === 'undefined') return
				localStorage.setItem(key, JSON.stringify(value))
			} catch (_e) {
				// Intentionally swallowed — non-fatal.
			}
		},

		toggleEdit() {
			this.isEditing = !this.isEditing
			/**
			 * @event edit-toggle Emitted when the user toggles edit mode. Payload: `true` when entering edit mode, `false` when leaving.
			 */
			this.$emit('edit-toggle', this.isEditing)
		},

		onLayoutChange(updated) {
			// Write the new geometry back into the layout items IN PLACE so the
			// in-place manifest editor's diff (ADR-041) captures drag/resize —
			// CnDashboardGrid emits a freshly-mapped array, which on its own
			// never reaches the diffed manifest, so a resize would survive the
			// session (GridStack DOM) but vanish on reload.
			if (Array.isArray(updated) && Array.isArray(this.layout)) {
				for (const u of updated) {
					const item = this.layout.find((l) => String(l.id) === String(u.id))
						|| this.layout.find((l) => l.widgetId === u.widgetId)
					if (!item) continue
					if (u.gridX !== undefined) item.gridX = u.gridX
					if (u.gridY !== undefined) item.gridY = u.gridY
					if (u.gridWidth !== undefined) item.gridWidth = u.gridWidth
					if (u.gridHeight !== undefined) item.gridHeight = u.gridHeight
				}
			}
			/**
			 * @event layout-change Emitted when the user finishes dragging/resizing a widget. Payload: the updated layout array `[{ widgetId, x, y, w, h }, ...]`.
			 */
			this.$emit('layout-change', this.layout)
		},

		/**
		 * Whether a widget def is a banner (alias-canonicalised by type
		 * name, so a consumer-registry override of `banner` keeps the same
		 * declarative semantics its config promises).
		 *
		 * @param {object} def Widget definition.
		 * @return {boolean}
		 */
		isBannerDef(def) {
			return !!def && !!def.type
				&& (def.type === 'banner' || canonicalWidgetType(def.type) === 'banner')
		},

		/**
		 * The cell-visibility inputs of a widget def. `visibleWhen` may sit
		 * at the def's TOP LEVEL (any widget type — the declarative way to
		 * gate a whole card, e.g. an object-table that should only exist
		 * while its queue is non-empty), in the `content` blob (the shape
		 * the registry branch forwards to CnBannerWidget), or in the legacy
		 * manifest `props` blob (the fallback getStatsBlockProps and
		 * getChartProps already honour for their own widget types). `text`
		 * is only meaningful for banners.
		 *
		 * @param {object} def Widget definition.
		 * @return {{ text: string, visibleWhen: (object|null) }}
		 */
		widgetDisplayConfig(def) {
			const content = (def && typeof def.content === 'object' && def.content) || {}
			const props = (def && typeof def.props === 'object' && def.props) || {}
			return {
				text: content.text || props.text || '',
				visibleWhen: (def && def.visibleWhen) || content.visibleWhen || props.visibleWhen || null,
			}
		},

		/**
		 * Whether a layout item would render nothing right now — a widget
		 * whose `visibleWhen` has not evaluated true, or a banner with no
		 * text at all — and must therefore surrender its grid cell in live
		 * mode instead of leaving an empty card behind.
		 *
		 * @param {object} item Layout item.
		 * @return {boolean} true when the cell must collapse.
		 */
		isCollapsedWidget(item) {
			const def = this.getWidgetDef(item.widgetId)
			if (!def || !def.type) return false
			const { text, visibleWhen } = this.widgetDisplayConfig(def)
			if (this.isBannerDef(def) && text === '') return true
			if (!visibleWhen) return false
			const outcome = this.widgetConditionOutcome[item.widgetId]
			return !outcome || outcome.met !== true
		},

		/**
		 * Evaluate every conditional widget's `visibleWhen` into
		 * `widgetConditionOutcome` — the verdict AND the raw field value,
		 * read through the same shared util primitives CnBannerWidget uses.
		 * Runs on created() and again whenever `widgets` changes (the
		 * in-app editor mutates defs in place). Fail-safe like the banner
		 * itself: any fetch/shape error counts as "not met", so a broken
		 * predicate collapses the cell rather than breaking the page.
		 *
		 * Flips `widgetConditionsSettled` when the initial round is done —
		 * synchronously when there is nothing to evaluate, so a dashboard
		 * without conditional widgets never waits.
		 *
		 * @return {Promise<void>}
		 */
		async evaluateWidgetConditions() {
			const conditional = (this.widgets || []).filter((def) => def && def.id && def.type
				&& this.widgetDisplayConfig(def).visibleWhen)
			// Skip when the CONDITIONAL SET is unchanged: the deep `widgets`
			// watch fires on any def edit, but only an added/removed/edited
			// predicate warrants refetching every conditional endpoint.
			const signature = JSON.stringify(conditional
				.map((def) => [def.id, this.widgetDisplayConfig(def).visibleWhen])
				.sort((a, b) => String(a[0]).localeCompare(String(b[0]))))
			if (signature === this.widgetEvalSignature && this.widgetConditionsSettled) {
				return
			}
			this.widgetEvalSignature = signature
			const seq = ++this.widgetEvalSeq
			if (conditional.length === 0) {
				this.widgetConditionsSettled = true
				return
			}
			await Promise.all(conditional.map(async (def) => {
				const cond = this.widgetDisplayConfig(def).visibleWhen
				let outcome = { met: false, value: null }
				try {
					const value = await readVisibleWhenValue(cond)
					outcome = { met: compareVisibleWhen(value, cond.op || 'eq', cond.value), value }
				} catch (e) {
					// fail-safe: hidden
				}
				// A newer run owns the map now — a stale verdict (possibly for
				// a def that no longer exists) must not overwrite its writes.
				if (seq === this.widgetEvalSeq) {
					this.widgetConditionOutcome[def.id] = outcome
				}
			}))
			if (seq !== this.widgetEvalSeq) return
			// Prune outcomes for defs that left the conditional set — pruned
			// AFTER the run (not before) so a still-visible widget never
			// flashes collapsed while its re-evaluation is in flight.
			const live = new Set(conditional.map((def) => def.id))
			for (const id of Object.keys(this.widgetConditionOutcome)) {
				if (!live.has(id)) delete this.widgetConditionOutcome[id]
			}
			this.widgetConditionsSettled = true
		},

		/**
		 * The v-bind payload for a registry-rendered widget. Banners get the
		 * page's evaluated `conditionOutcome` merged in, so CnBannerWidget
		 * renders from the verdict this page already fetched — no second
		 * request, no invisible-until-self-evaluated flash inside the cell —
		 * and can interpolate the predicate's field value into its text
		 * (`{value}`). Every other widget type receives its stored content
		 * unchanged: their cell-level `visibleWhen` is consumed entirely by
		 * this page, never forwarded as a component prop.
		 *
		 * @param {object} item Layout item.
		 * @return {object}
		 */
		registryWidgetBindings(item) {
			const content = this.getWidgetContent(item)
			const def = this.getWidgetDef(item.widgetId)
			if (!this.isBannerDef(def)) {
				return content
			}
			const outcome = this.widgetConditionOutcome[item.widgetId]
			return outcome ? { ...content, conditionOutcome: outcome } : content
		},

		/**
		 * Re-compact a filtered layout upward, display-only. GridStack runs
		 * `float: true`, so removing an item does not close its row — this
		 * skyline pass does, preserving the authored order (gridY, then
		 * gridX) and every item's own column, width and height. Items are
		 * shallow-copied only when their gridY actually moves.
		 *
		 * @param {Array<object>} items Layout items to compact.
		 * @return {Array<object>} New array with recomputed gridY values.
		 */
		compactDisplayLayout(items) {
			const heights = new Array(Math.max(1, this.columns)).fill(0)
			return [...items]
				.sort((a, b) => ((a.gridY ?? 0) - (b.gridY ?? 0)) || ((a.gridX ?? 0) - (b.gridX ?? 0)))
				.map((item) => {
					const x = Math.min(Math.max(0, item.gridX ?? 0), heights.length - 1)
					const w = Math.max(1, item.gridWidth ?? 1)
					const h = Math.max(1, item.gridHeight ?? 1)
					const to = Math.min(x + w, heights.length)
					// An item authored wider than the grid is clamped in the
					// RETURNED geometry too, not just in the skyline pass —
					// otherwise GridStack re-places a widget the pack thought
					// was narrower and the two can disagree on gridY.
					const effectiveWidth = to - x
					let y = 0
					for (let c = x; c < to; c++) y = Math.max(y, heights[c])
					for (let c = x; c < to; c++) heights[c] = y + h
					if (y === (item.gridY ?? 0) && effectiveWidth === w) return item
					const out = { ...item, gridY: y }
					if (effectiveWidth !== w) out.gridWidth = effectiveWidth
					return out
				})
		},

		/**
		 * Resolve a layout item's widget definition from `widgets[]`.
		 *
		 * Deliberately a METHOD, not a cached computed `widgetMap`. The
		 * `widgets` prop array is mutated IN PLACE by the in-app editor
		 * (CnBuildiqEditButton's "Add widget…" pushes onto
		 * `page.config.widgets`), and a computed over a prop array does not
		 * subscribe to that array's observer — so the map never invalidated
		 * and every freshly added widget rendered the `unavailableLabel`
		 * placeholder (with its raw id as the title) until a full reload.
		 * A method re-runs on every render, so the lookup cannot go stale.
		 *
		 * @param {string} widgetId The layout item's `widgetId`.
		 * @return {object|null} The matching widget definition, or null.
		 */
		getWidgetDef(widgetId) {
			const list = Array.isArray(this.widgets) ? this.widgets : []
			return list.find((w) => w && w.id === widgetId) || null
		},

		/**
		 * The app id(s) a widget depends on, declared via `requiresApp`
		 * (a single id string or an array of ids). Empty array when the
		 * widget has no cross-app dependency.
		 *
		 * @param {object} item Layout item.
		 * @return {string[]} Required app ids (possibly empty).
		 */
		requiredAppsFor(item) {
			const def = this.getWidgetDef(item.widgetId)
			const req = def && def.requiresApp
			if (!req) return []
			return Array.isArray(req) ? req.filter(Boolean) : [req]
		},

		/**
		 * Whether a given app counts as available. Prefers the injected
		 * `appStatuses` map (an app is available when `enabled`, or when
		 * only `installed` is known); falls back to the `isAppInstalled()`
		 * runtime check when no status was injected for that app.
		 *
		 * @param {string} appId Nextcloud app id.
		 * @return {boolean} True when the app is present/usable.
		 */
		isAppAvailable(appId) {
			const status = this.appStatuses && this.appStatuses[appId]
			if (status) {
				if (typeof status.enabled === 'boolean') return status.enabled
				if (typeof status.installed === 'boolean') return status.installed
			}
			return isAppInstalled(appId)
		},

		/**
		 * The first required app that is missing for a widget, or null when
		 * all its `requiresApp` dependencies are available. Drives the
		 * install-CTA gate that replaces the widget body for any widget
		 * type (stat, chart, object-list, …) surfacing another app's data.
		 *
		 * @param {object} item Layout item.
		 * @return {(string|null)} Missing app id, or null.
		 */
		missingRequiredApp(item) {
			for (const appId of this.requiredAppsFor(item)) {
				if (!this.isAppAvailable(appId)) return appId
			}
			return null
		},

		/**
		 * App-store deep link used by the install CTA. Prefers the
		 * injected per-app `category` (when present) so the user lands on
		 * the right App Store section; otherwise links to the app's own
		 * App Store entry.
		 *
		 * @param {string} appId Nextcloud app id.
		 * @return {string} Settings/apps URL.
		 */
		appInstallUrl(appId) {
			const category = this.appStatuses && this.appStatuses[appId] && this.appStatuses[appId].category
			return category
				? `/index.php/settings/apps/${encodeURIComponent(category)}/${encodeURIComponent(appId)}`
				: `/index.php/settings/apps/${encodeURIComponent(appId)}`
		},

		/**
		 * Human-readable "Install {app}" heading for the gate CTA.
		 *
		 * @param {string} appId Nextcloud app id.
		 * @return {string} Localized install label.
		 */
		installAppLabel(appId) {
			return t('nextcloud-vue', 'Install {app}', { app: appId })
		},

		/**
		 * The dashboardWidgetRegistry renderer for a layout item, when its widget
		 * definition's `type` is a registered catalog widget and no consumer
		 * `#widget-{id}` slot handles it. This is how widgets added via the
		 * in-app "Add widget…" flow (ADR-041) render on a dashboard.
		 *
		 * @param {object} item Layout item.
		 * @return {(object|null)} The widget renderer component, or null.
		 */
		registryRenderer(item) {
			const def = this.getWidgetDef(item.widgetId)
			if (!def || !def.type) return null
			// `integration` is NOT ours to resolve — it has its own branch
			// (isIntegrationWidget -> resolveRegistryWidget(integrationId)),
			// and one without an `integrationId` must fall through to
			// `unavailableLabel`. Claiming it here for BUILT_IN_WIDGETS
			// .integration would render a widget where the page means to say
			// "unavailable". CnDetailPage excludes the same type for the same
			// reason.
			if (def.type === 'integration') return null
			// Same three-layer order as CnWidgetGrid and CnDetailPage:
			// consumer registry -> dashboard catalog -> BUILT_IN_WIDGETS.
			//
			// This method used to read the catalog ALONE, which made a
			// dashboard the odd surface out in two ways, both silent:
			//
			//  - a consumer override was IGNORED whenever the catalog carried
			//    the same name. `chart` and `stat` are in both, so an app that
			//    registers its own (hrmq registers a TrendChartWidget under
			//    `chart`) got the library's component instead — the widget
			//    still rendered, just the wrong one, which is worse than a
			//    blank. REQ-MVR-005 mandates custom-over-built-in.
			//  - a BUILT_IN-only type — `integration`, `metadata` — resolved
			//    to nothing and the widget did not appear at all.
			//
			// #709 unified CnWidgetGrid and CnDetailPage but missed this one.
			const consumer = (this.cnRegistry || {})[def.type]
			if (consumer) return consumer.component ?? consumer
			// THE TYPE AS WRITTEN WINS; the alias is only a fallback.
			//
			// `object-table` and `table` are two DIFFERENT registered widgets
			// (CnHostedObjectTable vs CnObjectListWidget2), and
			// WIDGET_TYPE_ALIASES nonetheless maps the first onto the second.
			// Canonicalising before the lookup therefore resolved an
			// `object-table` dashboard widget to the `table` renderer: a widget
			// still appeared, nothing threw, it was simply the wrong component
			// and the stored `content` blob never reached the props the host
			// adapter maps it onto. That is the failure this method's own
			// comment above calls "worse than a blank".
			//
			// Caught by larpingapp e2e on the 2.8.2 -> 2.9.2 bump:
			// `.cn-widget-object-table` was not in the DOM at all.
			//
			// Aliases keep working for a spelling that is NOT registered in its
			// own right — `map-viewer` still reaches `map`.
			const entry = getWidgetTypeEntry(def.type)
				|| getWidgetTypeEntry(canonicalWidgetType(def.type))
			if (entry && entry.renderer) return entry.renderer
			return BUILT_IN_WIDGETS[def.type] || BUILT_IN_WIDGETS[canonicalWidgetType(def.type)] || null
		},

		/**
		 * Whether a registry widget renders a self-contained "card" surface
		 * (a single KPI / gauge / delta tile) that must size to its tile
		 * without an inner scrollbar. Driven by the registry entry's
		 * `card: true` hint (stat / gauge / delta). Card widgets are
		 * rendered `flush` (no wrapper padding) and the wrapper content area
		 * is switched to centred, non-scrolling layout via the
		 * `cn-dashboard-page__card-fit` class — fixing the stray vertical /
		 * horizontal scrollbars on short KPI / gauge tiles.
		 *
		 * @param {object} item Layout item.
		 * @return {boolean} true when the matching registry entry is a card.
		 */
		isCardWidget(item) {
			const def = this.getWidgetDef(item.widgetId)
			if (!def || !def.type) return false
			// Same precedence as registryRenderer: the type as written first, the
			// alias only as a fallback. Canonicalising first read the card flag
			// off a DIFFERENT widget's entry, so the chrome could disagree with
			// the component actually rendered.
			const entry = getWidgetTypeEntry(def.type)
				|| getWidgetTypeEntry(canonicalWidgetType(def.type))
			return Boolean(entry && entry.card === true)
		},

		/**
		 * The stored content/config for a catalog widget (passed to its renderer).
		 *
		 * @param {object} item Layout item.
		 * @return {object}
		 */
		getWidgetContent(item) {
			const def = this.getWidgetDef(item.widgetId)
			return (def && def.content && typeof def.content === 'object') ? def.content : {}
		},

		/**
		 * Remove a widget from the dashboard while editing (ADR-041): drops it from
		 * `config.widgets` + `config.layout` (the working manifest, by reference)
		 * and emits the updated layout so consumers persist.
		 *
		 * Splices in place rather than emitting fresh arrays. `widgets` / `layout`
		 * ARE the working manifest's arrays — CnBuildiqEditButton.onAddWidgetSubmit
		 * pushes straight into them, and onWidgetConfigSave mutates a def in place —
		 * so mutation is what actually removes the widget from the page. Filtering
		 * into new arrays and emitting them only told listeners about the removal,
		 * and nothing listens (`@widget-remove` has no consumer in the library or in
		 * Buildiq), so Delete was a no-op.
		 *
		 * @spec openspec/changes/dashboard-widget-system/specs/dashboard-page/spec.md
		 * @param {object} item Layout item to remove.
		 */
		removeWidget(item) {
			const id = item.widgetId
			const layoutIndex = this.layout.findIndex((l) => l.widgetId === id)
			/*
			 * `layout` and `widgets` are the working manifest's own arrays, passed by
			 * reference on purpose: the edit button pushes into them to add a widget,
			 * and onWidgetConfigSave mutates a def in place to save one. Emitting a
			 * copy instead leaves the manifest untouched — exactly the bug this
			 * replaces — so the mutation is deliberate here.
			 */
			if (layoutIndex !== -1) {
				// eslint-disable-next-line vue/no-mutating-props
				this.layout.splice(layoutIndex, 1)
			}
			if (Array.isArray(this.widgets)) {
				const widgetIndex = this.widgets.findIndex((w) => w.id === id)
				if (widgetIndex !== -1) {
					// eslint-disable-next-line vue/no-mutating-props
					this.widgets.splice(widgetIndex, 1)
				}
			}
			this.$emit('layout-change', this.layout)
			/**
			 * @event widget-remove Emitted when a widget is removed via the in-place editor.
			 * @type {{ id: string, widgets: Array }}
			 */
			this.$emit('widget-remove', id, this.widgets)
		},

		/**
		 * Open the per-widget style/config editor for a layout item.
		 * Launchpad-style cog: selects the widget and shows the modal.
		 *
		 * @param {object} item Layout item to configure.
		 */
		configureWidget(item) {
			this.configWidgetId = item.widgetId
			this.showWidgetConfig = true
		},

		/**
		 * Persist the editor's changes onto the matching widget definition
		 * IN PLACE (so the in-place manifest editor picks them up) and close
		 * the modal. Mirrors the relevant chrome fields onto the layout
		 * entry's `styleConfig` too, since the grid reads styleConfig from
		 * the layout item.
		 *
		 * @param {object} edited The widget object mutated by the editor.
		 */
		onWidgetConfigSave(edited) {
			const def = Array.isArray(this.widgets)
				? this.widgets.find((w) => w.id === this.configWidgetId)
				: null
			if (def) {
				def.title = edited.title !== undefined ? edited.title : def.title
				def.styleConfig = edited.styleConfig || {}
				def.showTitle = edited.showTitle !== false
				def.customTitle = edited.customTitle || null
				def.customIcon = edited.customIcon || null
				if (edited.content !== undefined) def.content = edited.content
			}
			const layoutItem = this.layout.find((l) => l.widgetId === this.configWidgetId)
			if (layoutItem) {
				layoutItem.styleConfig = edited.styleConfig || {}
			}
			this.showWidgetConfig = false
			this.$emit('layout-change', this.layout)
		},

		/**
		 * Delete from inside the editor — drop the widget and close.
		 *
		 * @param {object} _w The widget the editor wants deleted (unused; we
		 *   route by `configWidgetId`).
		 */
		onWidgetConfigDelete(_w) {
			this.removeWidget({ widgetId: this.configWidgetId })
			this.showWidgetConfig = false
		},

		getWidgetTitle(item) {
			const def = this.getWidgetDef(item.widgetId)
			// Prefer a per-placement override, then the widget def's customTitle
			// (set by the in-place style editor cog), then the def's base title.
			return item.customTitle || def?.customTitle || def?.title || item.widgetId
		},

		/**
		 * Whether a widget's title header renders. Tri-state, resolved from the
		 * layout placement first, then the widget def. The def fallback matters
		 * because the in-place style editor persists `showTitle` onto the
		 * widget def (see onWidgetConfigSave), while hand-written manifests
		 * may set it on either object — mirrors getWidgetTitle's def fallback.
		 *
		 * When neither sets it, the default depends on the family: card widgets
		 * (stat / gauge / delta) headline themselves via `content.label`, so a
		 * chrome header would only repeat it — or, when no title was ever set,
		 * show the raw type name ("stat"). Cards therefore default headerless;
		 * every other widget defaults to showing the header.
		 *
		 * @param {object} item the layout placement.
		 * @return {boolean}
		 */
		widgetShowTitle(item) {
			const def = this.getWidgetDef(item.widgetId)
			const value = item.showTitle !== undefined ? item.showTitle : def?.showTitle
			if (value === undefined || value === null) return !this.isCardWidget(item)
			return value !== false
		},

		/**
		 * Whether a widget's card chrome is suppressed. An explicit
		 * `layout[].borderless` wins; otherwise a widget with no header is drawn
		 * borderless, as before.
		 *
		 * The explicit override exists because "no header" and "no card" are
		 * different intentions, and conflating them pushed authors into the
		 * wrong shape: a headerless tile (a KPI whose label IS its content) lost
		 * its card, so the widget drew its OWN bordered box inside the grid
		 * cell — a card inside a card. Now `borderless: false` keeps the chrome
		 * and the widget can stay flat, which is what a tile wants.
		 *
		 * @param {object} item the layout placement.
		 * @return {boolean}
		 */
		widgetBorderless(item) {
			if (typeof item.borderless === 'boolean') return item.borderless
			return !this.widgetShowTitle(item)
		},

		/**
		 * Whether a widget's overflow Actions menu renders. Same tri-state +
		 * layout-then-def resolution as widgetShowTitle, and the same card
		 * default: cards are the "card" family (docs/architecture/cards-and-widgets.md)
		 * and carry no Actions menu — a KPI tile has no refreshable surface of
		 * its own and the menu eats the header width it needs.
		 *
		 * @param {object} item the layout placement.
		 * @return {boolean}
		 */
		widgetShowActions(item) {
			const def = this.getWidgetDef(item.widgetId)
			const value = item.showActions !== undefined ? item.showActions : def?.showActions
			if (value === undefined || value === null) return !this.isCardWidget(item)
			return value !== false
		},

		/**
		 * Documentation URL for a widget's overflow Actions menu. Prefers a
		 * per-widget `documentationUrl` on the widget def, then falls back to
		 * the page-level `documentationUrl` so every widget on a documented
		 * page surfaces the Documentation item — matching the page header menu.
		 *
		 * @param {object} item Layout item descriptor.
		 * @return {string} The resolved documentation URL, or '' when none.
		 */
		getWidgetDocumentationUrl(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.documentationUrl || this.documentationUrl || ''
		},

		getWidgetIconUrl(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.iconUrl || null
		},

		getWidgetIconClass(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.iconClass || null
		},

		getWidgetButtons(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.buttons || []
		},

		/**
		 * Whether a widget's overflow Actions menu shows the Refresh item.
		 * An explicit per-widget flag wins — on the widget definition or
		 * the layout item, as either `hideRefresh: true` or
		 * `showRefresh: false`. Otherwise custom-slot widgets (which have no
		 * built-in refetch path) resolve via the `widgetShowRefresh` tri-state
		 * — the explicit prop, else whether a `@widget-refresh` listener is
		 * wired (see `effectiveWidgetShowRefresh`) — while built-in widgets
		 * (chart / NC / integration) inherit the page-level `showRefresh`. So a
		 * read-only overview whose widgets have no refetch wired drops the dead
		 * Refresh item from every widget menu while keeping Request-a-feature.
		 *
		 * @param {object} item Layout placement entry.
		 * @return {boolean}
		 */
		getWidgetShowRefresh(item) {
			const def = this.getWidgetDef(item.widgetId) || {}
			if (def.hideRefresh === true || item.hideRefresh === true) return false
			if (typeof def.showRefresh === 'boolean') return def.showRefresh
			if (typeof item.showRefresh === 'boolean') return item.showRefresh
			if (this.hasWidgetSlot(item.widgetId)) return this.effectiveWidgetShowRefresh
			return this.showRefresh
		},

		getWidgetTitleIconPosition(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.titleIconPosition || 'right'
		},

		getWidgetTitleIconColor(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.titleIconColor || null
		},

		isTile(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.type === 'tile'
		},

		getTileConfig(item) {
			const def = this.getWidgetDef(item.widgetId)
			if (!def) return null
			return {
				title: def.title,
				icon: def.icon,
				iconType: def.iconType,
				backgroundColor: def.backgroundColor,
				textColor: def.textColor,
				linkType: def.linkType,
				linkValue: def.linkValue,
			}
		},

		isNcWidget(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.itemApiVersions && def.itemApiVersions.length > 0
		},

		/**
		 * Whether this layout item resolves to an integration-typed
		 * widget — `def.type === 'integration'` with an `integrationId`
		 * pointing at a provider registered on the pluggable
		 * integration registry. Mirrors `isTile` / `isChart`.
		 *
		 * @param {object} item Layout item
		 * @return {boolean} true when the matching widgetDef is an integration widget
		 */
		isIntegration(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.type === 'integration' && typeof def.integrationId === 'string'
		},

		/**
		 * Resolve the Vue component for an integration widget, applying
		 * the AD-19 surface fallback. Returns null when the integration
		 * isn't registered (renders the unavailable fallback instead).
		 *
		 * @param {object} item Layout item
		 * @return {object|null} Vue component, or null.
		 */
		resolveIntegrationWidget(item) {
			const def = this.getWidgetDef(item.widgetId)
			if (!def || typeof def.integrationId !== 'string') {
				return null
			}
			return this.resolveRegistryWidget(def.integrationId, this.surface)
		},

		/**
		 * Props passed to an integration widget: the rendering surface,
		 * the (optional) object context, and any extra `props` declared
		 * on the widget definition (per-widget props win on overlap).
		 *
		 * @param {object} item Layout item
		 * @return {object} Props object for the widget component.
		 */
		getIntegrationProps(item) {
			const def = this.getWidgetDef(item.widgetId)
			return {
				surface: this.surface,
				...(this.integrationContext || {}),
				...(def?.props || {}),
			}
		},

		/**
		 * The registry provider descriptor behind an integration widget def,
		 * carrying `mount`/`unmount` when it is a mount-mode leaf
		 * (openregister#2127). Null when unregistered.
		 *
		 * @param {object} item Layout item
		 * @return {object|null} Provider descriptor, or null.
		 */
		integrationProviderFor(item) {
			const def = this.getWidgetDef(item.widgetId)
			if (!def || typeof def.integrationId !== 'string' || typeof this.getRegistryProvider !== 'function') {
				return null
			}
			return this.getRegistryProvider(def.integrationId)
		},

		/**
		 * Whether an integration widget resolves to a mount-mode leaf
		 * (`renderMode: 'mount'`) — rendered through CnLeafMountHost rather
		 * than as a component under the host's Vue runtime.
		 *
		 * @param {object} item Layout item
		 * @return {boolean} true when the integration is mount-mode.
		 */
		isMountIntegration(item) {
			if (!this.isIntegration(item)) {
				return false
			}
			const provider = this.integrationProviderFor(item)
			return Boolean(provider)
				&& provider.renderMode === 'mount'
				&& typeof provider.mount === 'function'
				&& typeof provider.unmount === 'function'
		},

		/**
		 * Props forwarded to a mount-mode leaf's `mount(el, props)` — the same
		 * context an SFC integration widget receives, plus an explicit
		 * `integrationContext` bag for leaves that read it directly.
		 *
		 * @param {object} item Layout item
		 * @return {object} Mount props.
		 */
		getIntegrationMountProps(item) {
			return {
				...this.getIntegrationProps(item),
				integrationContext: { ...(this.integrationContext || {}) },
			}
		},

		/**
		 * Whether this layout item resolves to a chart-typed widget
		 * definition. Mirrors `isTile` and `isNcWidget`. Used by the
		 * dispatcher template to mount CnChartWidget.
		 *
		 * @param {object} item Layout item
		 * @return {boolean} true when the matching widgetDef.type is 'chart'
		 */
		isChart(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.type === 'chart'
		},

		/**
		 * Whether this layout item resolves to a stats-block widget
		 * definition. Mirrors `isChart`. Used by the dispatcher
		 * template to mount CnStatsBlockWidget.
		 *
		 * @param {object} item Layout item
		 * @return {boolean} true when the matching widgetDef.type is 'stats-block'
		 */
		isStatsBlock(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.type === 'stats-block'
		},

		/**
		 * Read the manifest `dataSource` block from a widget
		 * definition. Returns `null` when none is set so the child
		 * components can render their fallback (or stay loading).
		 *
		 * @param {object} item Layout item
		 * @return {object|null} The dataSource block or null
		 */
		getWidgetDataSource(item) {
			const def = this.getWidgetDef(item.widgetId)
			// Prefer the in-app-editable `content.dataSource` (ADR-041), else the
			// legacy top-level manifest `dataSource`.
			return (def?.content && def.content.dataSource) || def?.dataSource || null
		},

		/**
		 * Build the v-bind payload for CnStatsBlockWidget from a
		 * stats-block widget definition. Forwards `props.countLabel`,
		 * `props.variant`, `props.showZeroCount`, `props.horizontal`,
		 * `props.route`, and `props.iconClass` plus the widgetDef's
		 * `title`. The `dataSource` is bound separately by the template
		 * (see `getWidgetDataSource`) so the prop appears clearly in
		 * the template even when it lives on the widgetDef root.
		 *
		 * `iconClass` is a Nextcloud core CSS class (`icon-link`, …)
		 * applied to the widget's wrapping `<div>` — a lightweight icon
		 * path that doesn't require MDI dynamic-import. See
		 * CnStatsBlockWidget for usage notes.
		 *
		 * @param {object} item Layout item
		 * @return {object} v-bind payload for CnStatsBlockWidget
		 */
		getStatsBlockProps(item) {
			const def = this.getWidgetDef(item.widgetId)
			// In-app-editable cards carry config in `content` (set by
			// CnStatsBlockWidgetForm); legacy manifests use top-level props.
			const content = def?.content || {}
			const props = content.props || def?.props || {}
			const out = { title: content.title || def?.title || item.widgetId }
			for (const key of ['countLabel', 'variant', 'showZeroCount', 'horizontal', 'route', 'iconClass']) {
				if (props[key] !== undefined) out[key] = props[key]
			}
			// Multi-entry mode (ADR-049): prefer `content.entries`, then
			// `props.entries`. A legacy manifest that declared `entries` at the
			// widgetDef ROOT (a common opencatalogi shape) was silently dropped
			// because the dispatcher only forwards `content` — honour it with a
			// one-time deprecation warning so those cards render while authors
			// migrate the key under `content`.
			const contentEntries = content.entries !== undefined ? content.entries : props.entries
			if (contentEntries !== undefined) {
				out.entries = contentEntries
			} else if (Array.isArray(def?.entries)) {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnDashboardPage] stats-block "${item.widgetId}" declares \`entries\` at the widget-def root — `
					+ 'move it under `content.entries`. Root-level `entries` is deprecated and will stop being read.',
				)
				out.entries = def.entries
			}
			return out
		},

		/**
		 * Build the v-bind payload for CnChartWidget from a chart-typed
		 * widget definition. Translates `props.chartKind` → `type` (so
		 * the manifest's free-form `chartKind` does not collide with
		 * apexcharts' own reserved `type` prop) and forwards the
		 * supported subset (`series`, `categories`, `labels`, `options`,
		 * `colors`, `toolbar`, `legend`, `height`, `width`,
		 * `unavailableLabel`, plus the display passthrough `horizontal`,
		 * `legendPosition`, `valueFormat`, `colorMap`, `emptyLabel`).
		 *
		 * Unknown keys on `props` (including the reserved `dataSource`
		 * union) are ignored at render time so manifest authors can ship
		 * forward-compatible declarations.
		 *
		 * @param {object} item Layout item
		 * @return {object} v-bind payload for CnChartWidget
		 */
		getChartProps(item) {
			const def = this.getWidgetDef(item.widgetId)
			// In-app-editable charts (ADR-041) carry their config in `content`
			// (set by CnChartWidgetForm); legacy manifest charts use `props`.
			const content = def?.content || {}
			const props = content.props || def?.props || {}
			const out = {}
			const chartKind = content.chartKind || props.chartKind
			if (chartKind) out.type = chartKind
			for (const key of CHART_PROP_KEYS) {
				const v = content[key] !== undefined ? content[key] : props[key]
				if (v !== undefined) out[key] = v
			}
			// A dashboard tile's height is fixed by its grid units, so the chart
			// has to fit the tile — CnChartWidget's standalone default is a
			// pinned 250px, which is taller than the content box of a typical
			// h=4 tile (4 × cellHeight, less the widget header) and turned every
			// chart tile into a scroll region: the tile scrolled the graph
			// instead of showing it. An authored `height` still wins, so a
			// manifest can pin one deliberately.
			if (out.height === undefined) out.height = '100%'
			return out
		},

		/**
		 * Whether a chart tile's graph sizes itself to the tile — i.e. the
		 * resolved height is a percentage. Only those tiles get the
		 * `chart-fit` class, whose `overflow: hidden` is what stops the
		 * wrapper showing a scrollbar for a sub-pixel rounding difference.
		 *
		 * An AUTHORED pixel height survives `getChartProps`, and clipping that
		 * is not a rounding difference: on a tile shorter than the authored
		 * height the bottom of the graph became unreachable, with the scroll
		 * affordance removed. Such a tile keeps the wrapper's default
		 * `overflow: auto` so the graph stays reachable.
		 *
		 * @param {object} item Layout item.
		 * @return {boolean} True when the chart fits its tile.
		 */
		isChartFitted(item) {
			const height = this.getChartProps(item).height
			return typeof height === 'string' && height.trim().endsWith('%')
		},

		hasWidgetSlot(widgetId) {
			return !!this.$slots['widget-' + widgetId]
		},
	},
}
</script>

<style scoped>
.cn-dashboard-page {
	padding: 20px;
	max-width: 1400px;
	/* Scroll the dashboard itself when its widgets are taller than the host
	   region (height:100% is a no-op when the host height is content-sized, so
	   this only kicks in when an ancestor constrains the height). */
	height: 100%;
	overflow-y: auto;
	box-sizing: border-box;
}

.cn-dashboard-page__header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 20px;
	flex-wrap: wrap;
	gap: 12px;
	/* Clear the Nextcloud navigation toggle button (44px wide, absolutely
	   positioned at the left edge of .app-content) plus 12px breathing
	   room. Only the HEADER shifts right — body widgets keep full width. */
	padding-inline-start: 56px;
}

.cn-dashboard-page__header-left {
	min-width: 0;
}

.cn-dashboard-page__title {
	margin: 0;
	font-size: 20px;
	font-weight: 700;
}

.cn-dashboard-page__description {
	margin: 4px 0 0;
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}

/* NOTE: the date-range chip's trigger/chip/preset-spacer rules live in the
   UNSCOPED <style> block below, anchored on the trigger's `data-testid`, not
   here. Consumers (pipelinq, …) split the library across webpack chunks with
   no shared runtime chunk, so a rendered CnDashboardPage instance can carry a
   different `data-v-*` scope id than the one baked into this scoped CSS — the
   scoped chip rules then silently don't match and the chip collapses into
   NcActions' ~30px icon slot (text wraps to "Last / 30 / days"). The
   data-testid is stable across chunks, so those rules match regardless. */

.cn-dashboard-page__header-actions {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	flex-shrink: 0;
	/* Keeps the actions hard right even when a wide action set (pipelinq's six
	   buttons) wraps onto its own line. The header's `justify-content:
	   space-between` only distributes items WITHIN a line, so once the actions
	   wrap they become the sole item on line 2 and would otherwise sit flush
	   left, under the title. No-op while title and actions share a line. */
	margin-left: auto;
}

/* Date-range header band. Kept compact so it doesn't open a tall gap
   above the grid; the pills variant is a single tidy toggle row. */
.cn-dashboard-page__date-range {
	margin-bottom: 12px;
}

.cn-dashboard-page__date-range--pills {
	margin-bottom: 8px;
}

.cn-dashboard-page__date-pills {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
}

.cn-dashboard-page__date-pill {
	display: inline-flex;
	align-items: center;
	padding: 5px 14px;
	border: 1px solid var(--color-border);
	border-radius: 999px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-size: 13px;
	font-weight: 500;
	line-height: 1.2;
	white-space: nowrap;
	cursor: pointer;
	transition: background-color 100ms ease, border-color 100ms ease, color 100ms ease;
}

.cn-dashboard-page__date-pill:hover {
	background: var(--color-background-hover);
}

.cn-dashboard-page__date-pill:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-dashboard-page__date-pill--active {
	background: var(--color-primary-element);
	border-color: var(--color-primary-element);
	color: var(--color-primary-element-text);
}

.cn-dashboard-page__date-pill--active:hover {
	background: var(--color-primary-element-hover, var(--color-primary-element));
}

/* The custom-range pill is de-emphasised — dashed outline, muted text —
   so it reads as an escape hatch rather than a primary option. */
.cn-dashboard-page__date-pill--custom {
	border-style: dashed;
	color: var(--color-text-maxcontrast);
}

.cn-dashboard-page__date-pill-custom :deep(.action-item__menutoggle) {
	min-width: 0;
	min-height: 0;
	padding: 0;
	background: transparent;
	border: none;
}

.cn-dashboard-page__date-pill-custom :deep(.button-vue),
.cn-dashboard-page__date-pill-custom :deep(.button-vue__wrapper),
.cn-dashboard-page__date-pill-custom :deep(.button-vue__icon) {
	width: auto !important;
	min-width: 0 !important;
	overflow: visible !important;
}

.cn-dashboard-page__empty {
	padding: 60px 20px;
}

.cn-dashboard-page__page-filters {
	display: flex;
	flex-wrap: wrap;
	gap: 16px;
	align-items: flex-end;
	margin-bottom: 12px;
}

.cn-dashboard-page__page-filter {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 200px;
}

.cn-dashboard-page__page-filter-label {
	font-size: 0.85em;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
}

.cn-dashboard-page__widget-edit {
	position: absolute;
	top: 4px;
	inset-inline-end: 4px;
	z-index: 5;
	background: var(--color-main-background);
	border-radius: var(--border-radius);
	box-shadow: 0 1px 4px var(--color-box-shadow, rgba(0, 0, 0, 0.2));
}

/* Card-fit registry widgets (stat / gauge / delta): the tile content is a
   self-contained card that should size to the tile and centre vertically,
   never scroll. CnWidgetWrapper's content area defaults to overflow:auto +
   16px padding, which produced stray scrollbars on short KPI / gauge tiles
   and a horizontal scrollbar when a long currency value met the icon. Here
   we drop the inner scroll, add comfortable padding back (flush removed it),
   and centre the card. */
.cn-dashboard-page__card-fit :deep(.cn-widget-wrapper__content),
.cn-dashboard-page__card-fit.cn-widget-wrapper--flush :deep(.cn-widget-wrapper__content) {
	overflow: hidden;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: 8px 14px;
}

/* Chart tiles whose graph FITS the tile (see isChartFitted — a percentage
   height, which getChartProps supplies unless the author pinned pixels), so
   the wrapper's default `overflow: auto` content area has nothing to scroll —
   and leaving it on means any rounding difference between the box and the SVG
   shows up as a scrollbar the user has to drag to see the whole graph. Same
   shape as the card-fit rule above, minus the padding: chart tiles render
   `flush`, and apexcharts already draws its own margins. */
.cn-dashboard-page__chart-fit :deep(.cn-widget-wrapper__content) {
	overflow: hidden;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

/* Card content (stat / gauge / delta) must fit the tile width: let the
   widget shrink and its value/label truncate instead of pushing past the
   tile edge (the horizontal clip on long currency values). */
.cn-dashboard-page__card-fit :deep(.cn-stat-widget),
.cn-dashboard-page__card-fit :deep(.cn-gauge-widget),
.cn-dashboard-page__card-fit :deep(.cn-delta-widget) {
	min-width: 0;
	max-width: 100%;
}

.cn-dashboard-page__unknown {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
	padding: 16px;
}

/* widget-ref content items */
.cn-dashboard-page__content {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-dashboard-page__content-item {
	width: 100%;
}
</style>

<!-- Unscoped, anchored on the stable `data-testid` NcActions renders on both
     the trigger and (forwarded) the teleported <body> popper. Everything about
     the date chip lives here rather than in scoped CSS because a consumer that
     splits the library across webpack chunks (pipelinq) can render a
     CnDashboardPage instance whose `data-v-*` scope id differs from the one
     compiled into the scoped stylesheet — scoped rules then don't match and the
     chip collapses into NcActions' ~30px icon slot. The data-testid is chunk-
     stable, so these rules always match. Classes stay `cn-`-prefixed so the
     unscoped rules can't collide with anything outside this widget. -->
<style>
/* Trigger: strip NcActions' default button chrome down to just the chip span. */
[data-testid^="cn-dashboard-page-date-chip-"].cn-dashboard-page__date-chip-trigger {
	display: inline-flex;
}

/* The toggle is a chrome-less carrier for the pill — the pill IS the control.
   NcButton paints its own background, ~30px box and `--border-radius-element`
   corners on hover / focus / :active / aria-expanded; left alone that draws a
   rounded SQUARE behind (and around) the wider, fully-rounded pill. Every
   state is neutralised with `!important` because NcButton's own state rules
   are more specific than a plain class selector. */
[data-testid^="cn-dashboard-page-date-chip-"] .action-item__menutoggle,
[data-testid^="cn-dashboard-page-date-chip-"] .action-item__menutoggle:hover,
[data-testid^="cn-dashboard-page-date-chip-"] .action-item__menutoggle:focus,
[data-testid^="cn-dashboard-page-date-chip-"] .action-item__menutoggle:focus-visible,
[data-testid^="cn-dashboard-page-date-chip-"] .action-item__menutoggle:active,
[data-testid^="cn-dashboard-page-date-chip-"] .action-item__menutoggle[aria-expanded="true"] {
	min-width: 0 !important;
	min-height: 0 !important;
	height: auto !important;
	padding: 0 !important;
	background: transparent !important;
	background-color: transparent !important;
	border: none !important;
	box-shadow: none !important;
	border-radius: 999px;
}

/* The chip text lives in NcActions' icon slot, whose default toggle is sized
   for a single icon and clips/wraps wider content. Let the toggle + its icon
   wrapper grow to the chip's natural width so "Last 30 days" reads on one
   line — and keep them shrink-wrapped so the pill isn't offset inside a wider
   box (which is what pushed the chip outside its own trigger). */
[data-testid^="cn-dashboard-page-date-chip-"] .button-vue,
[data-testid^="cn-dashboard-page-date-chip-"] .button-vue__wrapper,
[data-testid^="cn-dashboard-page-date-chip-"] .button-vue__icon {
	width: auto !important;
	min-width: 0 !important;
	height: auto !important;
	min-height: 0 !important;
	overflow: visible !important;
}

/* The width above is NOT enough on its own, and this rule is what actually
   frees the pill. NcButton pins an icon-only button to a square clickable area
   with an `!important` of its own:

     .button-vue[data-v-…]:has(.button-vue__text:empty):not(.button-vue--wide) {
       width: var(--button-size) !important;   // --default-clickable-area, 34px
     }

   NcActions fills the trigger's text slot from its `menuName` prop, which the
   chip does not use (its label is markup, not a string), so `.button-vue__text`
   renders empty and that rule always matches here. Two `!important`
   declarations are settled by SPECIFICITY, and theirs is (0,5,0) against the
   (0,2,0) of the plain descendant selector above — so the button stayed 34px
   wide while its icon wrapper grew to the pill's ~106px. Combined with the
   `overflow: visible` above, the pill then rendered centred on a 34px box and
   spilled ~36px out each side, over the widget title.

   This selector re-states their `:has()` predicate — so it applies exactly
   where theirs does, and drops out with it on a browser without `:has()` — and
   adds the trigger's own three hooks, reaching (0,7,0). Keep it ahead of
   whatever NcButton declares: tests/components/CnDashboardPageDateChip.spec.js
   reads both selectors out of the installed NcButton stylesheet and fails when
   this margin disappears. */
[data-testid^="cn-dashboard-page-date-chip-"].cn-dashboard-page__date-chip-trigger.action-item
	.button-vue.action-item__menutoggle:has(.button-vue__text:empty) {
	width: auto !important;
	min-width: 0 !important;
}

.cn-dashboard-page__date-chip {
	display: inline-flex;
	align-items: center;
	/* Breathing room from the widget title / header edge — the chip sits in
	   CnWidgetWrapper's `#title-meta` slot, flush against its neighbours. */
	margin-inline: 4px;
	padding: 2px 10px;
	border-radius: 999px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	cursor: pointer;
	transition: background 100ms ease, color 100ms ease;
}

[data-testid^="cn-dashboard-page-date-chip-"]:hover .cn-dashboard-page__date-chip,
[data-testid^="cn-dashboard-page-date-chip-"]:focus-within .cn-dashboard-page__date-chip {
	background: var(--color-primary-element-light, var(--color-background-darker));
	color: var(--color-main-text);
}

/* Open state: the pill itself goes primary. The active affordance is the
   pill's own colour — never a separate box painted behind it. */
[data-testid^="cn-dashboard-page-date-chip-"] .action-item__menutoggle[aria-expanded="true"] .cn-dashboard-page__date-chip {
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
}

/* Keyboard focus needs a visible ring now that the button chrome is gone. */
[data-testid^="cn-dashboard-page-date-chip-"] .action-item__menutoggle:focus-visible .cn-dashboard-page__date-chip {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

/* Empty span keeping preset NcActionButtons' labels aligned with the row that
   shows the current-selection CalendarRange icon (NcActionButton icon slot is
   ~20px). Lives in the teleported popper, so it's unscoped too. */
.cn-dashboard-page__date-chip-preset-spacer {
	display: inline-block;
	width: 16px;
	height: 16px;
}

.action-item__popper[data-testid^="cn-dashboard-page-date-chip-"] .v-popper__inner,
[data-testid^="cn-dashboard-page-date-chip-"].v-popper__popper .v-popper__inner {
	overflow: visible;
}

[data-testid^="cn-dashboard-page-date-chip-"] .action-input__form,
[data-testid^="cn-dashboard-page-date-chip-"] .action-input {
	min-width: 240px;
}
</style>
