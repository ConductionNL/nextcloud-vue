<template>
	<div class="cn-index-page"
		:class="[lookClass, { 'cn-index-page--with-side-panel': hasSidePanel, 'cn-index-page--quick-filters-toolbar': effectiveQuickFilterPlacement === 'toolbar' }]"
		data-testid="cn-index-page"
		@keydown="onListKeydown">
		<!-- Header — overridable via #header slot. CnPageHeader ALWAYS renders:
		     with showTitle it is the full visual header (icon, title,
		     description); without it, `visuallyHidden` clips everything but the
		     <h1> out of the layout. The page therefore looks identical either
		     way, but the <main> landmark always carries a heading — the sidebar
		     title this component used to rely on lives outside <main>, so
		     screen-reader users and "skip to main content" got an unlabelled
		     region (WCAG 2.4.6 / 1.3.1). -->
		<slot
			name="header"
			:title="shownTitle"
			:description="headerDescription"
			:icon="resolvedIcon"
			:showTitle="showTitle">
			<CnPageHeader
				:title="shownTitle"
				:description="headerDescription"
				:icon="showTitleIcon && !isBoardLook ? resolvedIcon : ''"
				:breadcrumb="presented('breadcrumb')"
				:meta="headerMetaText"
				:visuallyHidden="!showTitle">
				<!-- The board's header buttons (`headerButtons`), beside the
				     title. Declaring them takes the Views and Actions menus
				     (and the Add / Export controls a button takes over) out of
				     the actions bar. -->
				<template v-if="headerButtonsShown || buildiqInHeader" #extra>
					<div class="cn-index-page__header-buttons" data-testid="cn-index-header-buttons">
						<template v-for="button in (headerButtonsShown ? orderedHeaderButtons : [])" :key="button.key">
							<!-- The buildiq square (the in-app edit button), between the secondary buttons and the primary one. -->
							<CnBuildiqEditButton v-if="button.action === '__buildiq'" />
							<!-- `actions-menu`: the page's header actions as one labelled menu. -->
							<NcActions
								v-else-if="button.action === 'actions-menu'"
								:forceMenu="true"
								:forceName="true"
								:menuName="button.label"
								:aria-label="button.label"
								variant="secondary"
								:data-testid="`cn-index-header-button-${button.key}`">
								<template #icon>
									<DotsHorizontal :size="20" />
								</template>
								<!-- The menu's entries (`items` on the button; the page's header
								     actions when it names none): a header action, a built-in by
								     name, or a link (an entry with `href`, the documentation). -->
								<template v-for="entry in headerMenuEntries(button)" :key="entry.key">
									<!-- A group heading and a separator (`{ heading }` and
									     `separator` in items), as the board's "Ga naar" and
									     "Selectie" groups. -->
									<NcActionCaption
										v-if="entry.kind === 'heading'"
										class="cn-index-header-menu__heading"
										:name="entry.label"
										:data-testid="`cn-index-header-menu-${entry.key}`" />
									<NcActionSeparator
										v-else-if="entry.kind === 'separator'"
										:data-testid="`cn-index-header-menu-${entry.key}`" />
									<NcActionLink
										v-else-if="entry.href"
										:href="entry.href"
										:target="entry.linkTarget || '_blank'"
										rel="noopener noreferrer"
										:data-testid="`cn-index-header-menu-${entry.key}`">
										<template v-if="entry.icon" #icon>
											<CnIcon :name="entry.icon" :size="20" />
										</template>
										{{ entry.label }}
									</NcActionLink>
									<NcActionLink
										v-else-if="entry.link"
										:href="entry.link.href"
										:closeAfterClick="true"
										:data-testid="`cn-index-header-menu-${entry.key}`"
										@click="onHeaderMenuLinkClick(entry, $event)">
										<template v-if="entry.icon" #icon>
											<CnIcon :name="entry.icon" :size="20" />
										</template>
										{{ entry.label }}
									</NcActionLink>
									<NcActionButton
										v-else
										:disabled="entry.disabled"
										:title="entry.title || null"
										:closeAfterClick="true"
										:data-testid="`cn-index-header-menu-${entry.key}`"
										@click="entry.run()">
										<!-- A built-in ships its own icon (`iconComponent`), so it
										     never falls back to the "?" when the app has not
										     registered that icon name. -->
										<template v-if="entry.iconComponent || entry.icon" #icon>
											<component :is="entry.iconComponent" v-if="entry.iconComponent" :size="20" />
											<CnIcon v-else :name="entry.icon" :size="20" />
										</template>
										{{ entry.label }}
									</NcActionButton>
								</template>
							</NcActions>
							<NcButton
								v-else
								:variant="button.variant"
								:href="button.link ? button.link.href : undefined"
								:target="button.link ? button.link.target : undefined"
								:data-testid="`cn-index-header-button-${button.key}`"
								@click="onHeaderButton(button)">
								<template v-if="button.icon" #icon>
									<CnIcon :name="button.icon" :size="20" />
								</template>
								{{ button.label }}
							</NcButton>
						</template>
						<CnBuildiqEditButton v-if="buildiqInHeader && !headerButtonsShown" />
					</div>
				</template>
			</CnPageHeader>
		</slot>

		<!-- Optional content below header, above actions bar -->
		<div v-if="$slots['below-header']" class="cn-index-page__below-header">
			<slot name="below-header" />
		</div>

		<!-- Page tabs a named source declares (`pageTabs()`): sibling lists
		     of the same thing, such as a flow list and its runs this week.
		     Links, not tabs: each one is its own page. -->
		<nav v-if="effectivePageTabs.length > 0"
			class="cn-index-page__page-tabs"
			:aria-label="title || t('nextcloud-vue', 'Pages')"
			data-testid="cn-index-page-tabs">
			<a v-for="tab in effectivePageTabs"
				:key="tab.id || tab.to"
				class="cn-index-page__page-tab"
				:class="{ 'cn-index-page__page-tab--active': isActivePageTab(tab) }"
				:href="pageTabHref(tab)"
				:aria-current="isActivePageTab(tab) ? 'page' : undefined"
				:data-testid="`cn-index-page-tab-${tab.id || tab.to}`"
				@click="onPageTabClick(tab, $event)">
				{{ tab.label }}
				<span v-if="typeof tab.count === 'number'" class="cn-index-page__page-tab-count">{{ tab.count }}</span>
			</a>
		</nav>

		<!-- KPI tiles above the list (`statRow`) and cards beside it
		     (`sidePanel`), as DqTeamwachtrij and PqContracten
		     (screens-index-stat-row). -->
		<CnIndexPageWidgets
			v-if="statRow && statRow.length > 0"
			class="cn-index-page__stat-row"
			variant="stat-row"
			:widgets="statRow" />
		<CnIndexPageWidgets
			v-if="hasSidePanel"
			class="cn-index-page__side-panel"
			variant="side-panel"
			:widgets="sidePanel" />

		<!-- Actions bar -->
		<!-- `quickFilterPlacement: "row"`: the chips on a row of their own above
		     the toolbar, wrapping onto more lines (DqTeamwachtrij). -->
		<div
			v-if="effectiveQuickFilterPlacement === 'row' && tabStripEntries && tabStripEntries.length > 0"
			class="cn-index-page__quick-filter-row"
			data-testid="cn-index-page-quick-filter-row">
			<CnQuickFilterBar
				inline
				:tabs="tabStripEntries"
				:mode="quickFilterMode"
				:maxVisible="quickFilterMaxVisible"
				:fit="false"
				:multiple="quickFilterMultiple"
				:activeIndex="activeQuickFilterIndex"
				:selectedIndices="selectedQuickFilterIndices"
				:counts="effectiveTabCounts"
				@update:activeIndex="onQuickFilterChange"
				@update:selectedIndices="onQuickFilterMultiChange" />
		</div>
		<CnActionsBar
			:layout="isBoardLook ? 'board' : 'nextcloud'"
			:activeFilterChips="activeFilterChips"
			:showBuildiqButton="!buildiqInHeader"
			:bulkNoun="boardBulkNoun"
			:bulkHint="viewBulkBand && viewBulkBand.hint !== true ? '' : (bulkHint ? cnTranslate(bulkHint) : bulkHint)"
			:bulkBandAlways="bulkBandAlways && !viewBulkBand"
			:bulkLead="viewBulkBandLead"
			:bulkCancel="Boolean(viewBulkBand && viewBulkBand.cancel === true)"
			:pagination="effectivePagination"
			:objectCount="effectiveObjects.length"
			:selectable="selectable"
			:selectedIds="internalSelectedIds"
			:addLabel="resolvedAddLabel"
			:addIcon="resolvedIcon"
			:inlineActionCount="inlineActionCount"
			:showMassImport="showMassImport"
			:showMassExport="showMassExport"
			:showMassCopy="showMassCopy && !viewBulkBand"
			:showMassDelete="showMassDelete && !viewBulkBand"
			:viewMode="currentViewMode"
			:showViewToggle="showViewToggle"
			:availableViewModes="effectiveToggleModes"
			:disabledViewModes="viewSwitchDisabledModes"
			:viewModeLinks="viewSwitchLinkTargets"
			:cardsLabel="cardsLabel"
			:tableLabel="tableLabel"
			:listLabel="listLabel"
			:cardsIcon="cardsIcon"
			:tableIcon="tableIcon"
			:showMap="showMapSegment"
			:mapLabel="mapLabel"
			:mapIcon="mapIcon"
			:listIcon="listIcon"
			:showSearch="search !== false && (inlineSearch || isBoardLook) && !sourceRefusal"
			:searchPlacement="searchPlacement"
			:searchValue="effectiveSearchValue"
			:searchPlaceholder="shownSearchPlaceholder"
			:showCountWithSearch="showCountWithSearch"
			:refreshing="effectiveRefreshing"
			:refreshDisabled="refreshDisabled"
			:addDisabled="addDisabled"
			:addTo="addLinkTo"
			:showAdd="effectiveShowAdd && !headerButtonTakes('add')"
			:showCount="showCount && !isBoardLook"
			:showActionsMenu="!headerButtonsShown"
			:showSidebarToggle="hasSidebar"
			:sidebarOpen="sidebarOpen"
			:headerActions="mergedHeaderActions"
			:bulkActions="viewBulkActions"
			:documentationUrl="documentationUrl"
			:documentationLabel="documentationLabel || undefined"
			@add="onAddClick"
			@clearSelection="onSelect([])"
			@removeFilter="onRemoveActiveFilter"
			@clearFilters="onClearFilters"
			@toggleSidebar="sidebarOpen = !sidebarOpen"
			@refresh="onRefreshEvent"
			@headerAction="onHeaderAction"
			@bulkAction="onBulkAction"
			@showImport="showImportDialog = true"
			@showExport="showExportDialog = true"
			@showCopy="showMassCopyDialog = true"
			@showDelete="showMassDeleteDialog = true"
			@search="onSearchEvent"
			@viewModeChange="onViewModeChange">
			<template v-if="$slots['mass-actions']" #mass-actions="{ count, selectedIds: ids }">
				<slot name="mass-actions" :count="count" :selectedIds="ids" />
			</template>
			<template v-if="$slots['action-items']" #action-items>
				<slot name="action-items" />
			</template>
			<template v-if="$slots['after-search'] || searchInFiles || boardControlsShown || relatedFieldFilters || sourceFacetControls.length > 0" #after-search>
				<!-- The values an endpoint source counts in its answer
				     (`sourceConfig.facets`), as pickers: "Kanaal: alle". -->
				<label
					v-for="facet in sourceFacetControls"
					:key="`source-facet-${facet.field}`"
					class="cn-index-page__board-control"
					:data-testid="`cn-source-facet-${facet.field}`">
					<span class="cn-index-page__board-control-label">{{ facet.label }}</span>
					<select
						class="cn-index-page__board-select"
						:value="facet.value"
						@change="onSourceFacetChange(facet.field, $event.target.value)">
						<option value="">{{ facet.allLabel }}</option>
						<option
							v-for="option in facet.options"
							:key="`source-facet-${facet.field}-${option.value}`"
							:value="option.value">
							{{ option.label }}
						</option>
					</select>
				</label>
				<!-- Board view controls, after the search (screens-board-reference-columns):
				     the narrowing select ("Case type:"), the column switch ("Columns:
				     status | type | assignee") and the board's hint sentence. -->
				<template v-if="boardControlsShown">
					<label
						v-if="boardNarrow"
						class="cn-index-page__board-control"
						data-testid="cn-board-narrow">
						<span class="cn-index-page__board-control-label">{{ boardNarrowLabel }}</span>
						<select
							class="cn-index-page__board-select"
							data-testid="cn-board-narrow-select"
							:value="boardNarrowValue"
							@change="onBoardNarrowChange($event.target.value)">
							<option value="">{{ boardNarrowAllLabel }}</option>
							<option
								v-for="option in boardNarrowOptions"
								:key="`narrow-${option.value}`"
								:value="option.value">
								{{ option.label }}
							</option>
						</select>
					</label>
					<label
						v-if="boardColumnFields.length > 1"
						class="cn-index-page__board-control"
						data-testid="cn-board-column-switch">
						<span class="cn-index-page__board-control-label">{{ boardColumnSwitchLabel }}</span>
						<select
							class="cn-index-page__board-select cn-index-page__board-select--strong"
							data-testid="cn-board-column-switch-select"
							:value="boardColumnField"
							@change="onBoardColumnFieldChange($event.target.value)">
							<option
								v-for="entry in boardColumnFields"
								:key="`colfield-${entry.field}`"
								:value="entry.field">
								{{ cnTranslate(entry.label) }}
							</option>
						</select>
					</label>
					<span
						v-if="board.hint"
						class="cn-index-page__board-hint"
						data-testid="cn-board-hint">{{ cnTranslate(board.hint) }}</span>
				</template>
				<NcCheckboxRadioSwitch
					v-if="searchInFiles"
					:modelValue="contentSearch"
					type="switch"
					class="cn-index-page__content-search"
					data-testid="cn-index-content-search"
					@update:modelValue="onContentSearchToggle">
					{{ t('nextcloud-vue', 'Also search inside files') }}
				</NcCheckboxRadioSwitch>
				<CnRelatedFieldFilters
					v-if="relatedFieldFilters"
					:definitions="relatedFieldFilters.definitions || {}"
					:related="relatedFieldFilters.related || {}"
					:storeKey="objectType || selfObjectType || ''" />
				<slot name="after-search" />
			</template>
			<template
				v-if="$slots['selection-actions']"
				#selection-actions="{ count, selectedIds: ids }">
				<slot name="selection-actions" :count="count" :selectedIds="ids" />
			</template>
			<template v-if="$slots['header-actions'] || $slots['actions']" #actions>
				<!--
					@slot header-actions
					@description Extra buttons in the page header, inline next to the Add button. Documented since the beginning but wired up only later — consumers passing it (hermiq's flow list's "New flow" button) rendered nothing while the page looked fine.
				-->
				<slot name="header-actions" />
				<slot name="actions" />
			</template>
			<!-- Rendered AFTER the primary Add button (CnActionsBar's `actions-end`
			     slot), not before it: these are "browse/manage" controls — saved
			     views, export, page config — grouped together and kept apart from
			     the app-specific buttons in `#actions`, with Add sitting between
			     the two groups rather than before both (dossiq Cases/Queue). -->
			<template v-if="isEditMode || barShowsExportMenu || barShowsSavedViews" #actions-end>
				<!-- Saved views (opt-in via `allowSavedViews`): the toolbar keeps
				     "Save view" and, under the board look, the chips. The list
				     and every per-view action live in the sidebar's Filters tab. -->
				<CnSavedViewsControl
					v-if="barShowsSavedViews"
					:views="viewsForControl"
					:loading="savedViewsLoading"
					:currentUserId="currentSavedViewsUserId"
					:counts="savedViewCounts"
					:selectedViewId="appliedSavedViewId"
					:save="!headerSavesView"
					:chips="savedViewChips"
					@apply="onApplySavedView"
					@saveRequest="showSaveViewDialog = true" />
				<!-- Native Export menu (opt-in via `allowExport` + schema.exportable):
				     CSV/Excel entries navigate to OR's export-leaf URL, passing the
				     current route's query params through as filters. -->
				<NcActions
					v-if="barShowsExportMenu"
					:forceName="true"
					:menuName="t('nextcloud-vue', 'Export')"
					data-testid="cn-index-export-menu"
					:aria-label="t('nextcloud-vue', 'Export')">
					<template #icon>
						<Export :size="20" />
					</template>
					<NcActionButton data-testid="cn-index-export-csv" @click="onExportClick('csv')">
						<template #icon>
							<Export :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Export as CSV') }}
					</NcActionButton>
					<NcActionButton data-testid="cn-index-export-excel" @click="onExportClick('excel')">
						<template #icon>
							<Export :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Export as Excel') }}
					</NcActionButton>
				</NcActions>
				<!-- Edit-mode config cog: opens the page's full config editor
				     (CnPageRenderer wires @configure to CnPageConfigModal). -->
				<NcButton v-if="isEditMode"
					variant="tertiary"
					:aria-label="t('nextcloud-vue', 'Configure page')"
					@click="$emit('configure')">
					<template #icon>
						<Cog :size="20" />
					</template>
				</NcButton>
			</template>
			<!-- Quick-filter tabs (REQ-MIPFU-1) rendered INSIDE the action bar
			     (between the view toggle and the actions) when the manifest
			     declares `config.quickFilters`. Switching tabs re-fetches with
			     the merged filter; @event quick-filter-change. -->
			<template v-if="tabStripEntries && tabStripEntries.length > 0 && effectiveQuickFilterPlacement !== 'row'" #filters>
				<CnQuickFilterBar
					inline
					:tabs="tabStripEntries"
					:mode="quickFilterMode"
					:maxVisible="quickFilterMaxVisible"
					:fit="effectiveQuickFilterPlacement === 'toolbar'"
					:multiple="quickFilterMultiple"
					:activeIndex="shownQuickFilterIndex"
					:selectedIndices="selectedQuickFilterIndices"
					:counts="effectiveTabCounts"
					@update:activeIndex="onQuickFilterChange"
					@update:selectedIndices="onQuickFilterMultiChange" />
			</template>
			<!-- Board look, `filterMenu` on a page with no filter sidebar: the
			     board's Filter button, a menu of each enum column's values as
			     toggleable filters. -->
			<template v-if="boardFilterMenu" #filter-menu>
				<NcActions
					class="cn-actions-bar__filter-menu"
					:class="{ 'cn-actions-bar__filter-menu--counted': activeFilterChips.length > 0 }"
					:style="filterMenuCountStyle"
					:data-count="activeFilterChips.length > 0 ? activeFilterChips.length : null"
					:aria-label="filterMenuLabel"
					variant="secondary"
					:forceMenu="true"
					:menuName="t('nextcloud-vue', 'Filter')"
					data-testid="cn-index-filter-menu">
					<template #icon>
						<Tune :size="16" />
					</template>
					<template v-for="field in filterableFields" :key="field.key">
						<NcActionCaption :name="field.label" />
						<NcActionCheckbox
							v-for="val in field.values"
							:key="`${field.key}-${val}`"
							:modelValue="isFilterActive(field.key, val)"
							@update:modelValue="toggleFilter(field.key, val)">
							{{ val }}
						</NcActionCheckbox>
					</template>
				</NcActions>
			</template>
		</CnActionsBar>

		<!-- A second filter strip on one field (`filterStrip`), under the
		     toolbar: "All" and one pill per value, each with its count within
		     the active quick filter (board PqWachtrij: "Soort, dan kanaal"). -->
		<div
			v-if="filterStripEntries.length > 0"
			class="cn-index-page__filter-strip"
			role="group"
			:aria-label="filterStripLabel"
			data-testid="cn-index-filter-strip">
			<button
				v-for="entry in filterStripEntries"
				:key="entry.key"
				type="button"
				class="cn-index-page__filter-strip-pill"
				:class="{ 'cn-index-page__filter-strip-pill--active': entry.active }"
				:aria-pressed="entry.active ? 'true' : 'false'"
				:data-testid="`cn-index-filter-strip-${entry.key}`"
				@click="onFilterStripPick(entry.value)">
				<span>{{ entry.label }}</span> <span v-if="entry.count !== null" class="cn-index-page__filter-strip-count">{{ entry.count }}</span>
			</button>
		</div>

		<!-- Header actions of `type: "open-form"` or `"open-modal"`: this
		     instance draws nothing and owns the create dialog, as on a detail
		     page, so a header button or menu entry naming one opens it. -->
		<CnActionButtons
			v-if="dialogHeaderActions.length > 0"
			:actions="dialogHeaderActions"
			display="menu"
			data-testid="cn-index-header-dialog-actions"
			@entries="dialogHeaderRuns = $event"
			@created="onHeaderActionCreated" />

		<!-- Quick edit: a few fields of one row, over the list, with the list
		     keeping its place. -->
		<CnQuickEditDialog
			v-if="quickEditRow !== null"
			:object="quickEditRow"
			:schema="effectiveSchema"
			:register="register"
			:fields="quickEditFields"
			:writableField="writableField"
			:serverObject="quickEditServerRow"
			@save="onQuickEditSave"
			@keepTheirs="onQuickEditKeepTheirs"
			@close="quickEditRow = null" />

		<!-- The help key's sheet. Every shortcut the list offers is here and in
		     the command palette: one that only the handler knows about is one
		     nobody can find. -->
		<CnConfirmDialog
			v-if="showShortcutHelp"
			:name="shortcutHelpTitle"
			:confirmLabel="closeLabel"
			data-testid="cn-list-shortcuts-help"
			@confirm="showShortcutHelp = false"
			@cancel="showShortcutHelp = false">
			<dl class="cn-index-page__shortcuts">
				<template v-for="entry in shortcutHelpEntries" :key="entry.id">
					<dt><kbd>{{ entry.keys }}</kbd></dt>
					<dd>{{ entry.description }}</dd>
				</template>
			</dl>
		</CnConfirmDialog>

		<!-- Mass delete dialog -->
		<CnMassDeleteDialog
			v-if="showMassDeleteDialog"
			ref="massDeleteDialog"
			:items="selectedObjects"
			:nameField="massActionNameField"
			:nameFormatter="nameFormatter"
			@confirm="onMassDeleteConfirm"
			@close="showMassDeleteDialog = false" />

		<!-- Mass copy dialog -->
		<CnMassCopyDialog
			v-if="showMassCopyDialog"
			ref="massCopyDialog"
			:items="selectedObjects"
			:nameField="massActionNameField"
			:nameFormatter="nameFormatter"
			:include="copyIncludeKinds"
			:register="copyRegisterSlug"
			:schema="copySchemaSlug"
			@confirm="onMassCopyConfirm"
			@close="showMassCopyDialog = false" />

		<!-- Mass export dialog -->
		<CnMassExportDialog
			v-if="showExportDialog"
			ref="exportDialog"
			:formats="exportFormats"
			:scopeText="massExportScopeText"
			@confirm="onMassExportConfirm"
			@close="showExportDialog = false" />

		<!-- Mass import dialog -->
		<CnMassImportDialog
			v-if="showImportDialog"
			ref="importDialog"
			:options="importOptions"
			@confirm="onMassImportConfirm"
			@close="showImportDialog = false">
			<template v-if="$slots['import-fields']" #fields="{ file }">
				<slot name="import-fields" :file="file" />
			</template>
		</CnMassImportDialog>

		<!-- Save-current-view dialog (saved-views-ui) -->
		<CnSaveViewDialog
			v-if="showSaveViewDialog"
			ref="saveViewDialog"
			:schema="viewPresentationSchema"
			@confirm="onSaveViewConfirm"
			@close="showSaveViewDialog = false" />

		<!-- How-a-saved-view-shows dialog (view-presentation-picker) -->
		<CnSavedViewPresentationDialog
			v-if="viewPendingPresentation"
			ref="presentationViewDialog"
			:view="viewPendingPresentation"
			:schema="viewPresentationSchema"
			@confirm="onPresentationViewConfirm"
			@close="viewPendingPresentation = null" />

		<!-- Edit-a-saved-view dialog (saved-views-manage-and-defaults) -->
		<CnSavedViewEditDialog
			v-if="viewPendingEdit"
			ref="editViewDialog"
			:view="viewPendingEdit"
			@confirm="onEditViewConfirm"
			@close="viewPendingEdit = null" />

		<!-- Share-a-saved-view dialog (saved-views-shared-by-role) -->
		<CnSavedViewShareDialog
			v-if="viewPendingShare"
			ref="shareViewDialog"
			:view="viewPendingShare"
			@confirm="onShareViewConfirm"
			@close="viewPendingShare = null" />

		<!-- Delete-saved-view confirm (saved-views-ui) -->
		<CnConfirmDialog
			v-if="viewPendingDelete"
			ref="deleteViewConfirmDialog"
			variant="error"
			:dialogTitle="t('nextcloud-vue', 'Delete view?')"
			:message="deleteViewMessage"
			:confirmLabel="t('nextcloud-vue', 'Delete view')"
			confirmIcon="DeleteOutline"
			@confirm="onDeleteViewConfirm"
			@close="viewPendingDelete = null" />

		<!-- @slot delete-dialog Replace the single-item delete dialog. -->
		<!-- @binding {boolean} show Whether the delete dialog is currently visible. -->
		<!-- @binding {object} item The item targeted for deletion. -->
		<!-- @binding {Function} confirm Performs the delete — the same path the default dialog's `@confirm` runs. -->
		<!-- @binding {Function} close Closes the delete dialog. -->
		<!-- `show` and `confirm` are props for the same reason as `form-dialog`
		     above: a manifest-mounted replacement receives props only. -->
		<slot
			name="delete-dialog"
			:show="showSingleDeleteDialog"
			:item="actionTargetItem"
			:confirm="onSingleDeleteConfirm"
			:close="closeSingleDelete">
			<CnDeleteDialog
				v-if="showSingleDeleteDialog && actionTargetItem"
				ref="singleDeleteDialog"
				:item="actionTargetItem"
				:nameField="massActionNameField"
				:nameFormatter="nameFormatter"
				@confirm="onSingleDeleteConfirm"
				@close="closeSingleDelete" />
		</slot>

		<!-- @slot copy-dialog Replace the single-item copy dialog. -->
		<!-- @binding {boolean} show Whether the copy dialog is currently visible. -->
		<!-- @binding {object} item The item targeted for copy. -->
		<!-- @binding {Function} confirm Performs the copy — the same path the default dialog's `@confirm` runs. -->
		<!-- @binding {Function} close Closes the copy dialog. -->
		<!-- `show` and `confirm` are props for the same reason as `form-dialog`
		     above: a manifest-mounted replacement receives props only. -->
		<slot
			name="copy-dialog"
			:show="showSingleCopyDialog"
			:item="actionTargetItem"
			:confirm="onSingleCopyConfirm"
			:close="closeSingleCopy">
			<CnCopyDialog
				v-if="showSingleCopyDialog && actionTargetItem"
				ref="singleCopyDialog"
				:item="actionTargetItem"
				:nameField="massActionNameField"
				:nameFormatter="nameFormatter"
				:include="copyIncludeKinds"
				:register="copyRegisterSlug"
				:schema="copySchemaSlug"
				@confirm="onSingleCopyConfirm"
				@close="closeSingleCopy" />
		</slot>

		<!-- @slot form-dialog Replace the create/edit form dialog (use CnFormDialog or CnAdvancedFormDialog). -->
		<!-- @binding {boolean} show Whether the form dialog is currently visible. -->
		<!-- @binding {?object} item The item being edited, or null in create mode. -->
		<!-- @binding {object} schema The effective JSON schema driving the form. -->
		<!-- @binding {Function} confirm Persists the form data through the page's own save path (store / self-store / createOverride) and emits `create`/`edit`. Call this instead of saving in the replacement dialog, so a create or edit made there behaves exactly like one made in the built-in dialog. Takes the complete object to save. List refresh is automatic on the self-fetch and `createOverride` paths; with the `store` prop, refresh is driven by the consumer's `create`/`edit` handler as usual. -->
		<!-- @binding {Function} close Closes the form dialog. -->
		<!-- @binding {Function} refresh Re-reads the list. For a replacement dialog that saves through its own endpoint rather than `confirm`, so the list still shows what it saved. -->
		<!--
		     `confirm` is bound as a PROP, not left as an `@confirm` listener on
		     the default child. A manifest-declared replacement is mounted by
		     CnPageRenderer as `<component :is=… v-bind="slotProps" />`, which
		     binds props only — so a listener is unreachable from a manifest
		     even in principle, and a replacement dialog could render and close
		     but never save (openconnector#1150).
		-->
		<slot
			name="form-dialog"
			:show="showFormDialogVisible"
			:item="editItem"
			:schema="formSchema"
			:confirm="onFormConfirm"
			:close="closeFormDialog"
			:refresh="onRefreshEvent">
			<CnFormDialog
				v-if="showFormDialogVisible && !useAdvancedFormDialog"
				ref="formDialog"
				:schema="formSchema"
				:item="editItem"
				:register="formRegister"
				:excludeFields="rowFormTarget ? [] : excludeFields"
				:includeFields="rowFormTarget ? null : includeFields"
				:fieldOverrides="rowFormTarget ? {} : fieldOverrides"
				:nameField="massActionNameField"
				:size="formSize"
				:columns="formColumns"
				:initialData="resolvedCreateDefaults"
				@confirm="onFormConfirm"
				@close="closeFormDialog">
				<template v-if="$slots['form-fields']" #form="scope">
					<slot name="form-fields" v-bind="scope" />
				</template>
			</CnFormDialog>
			<CnAdvancedFormDialog
				v-if="showFormDialogVisible && useAdvancedFormDialog"
				ref="formDialog"
				:schema="formSchema"
				:item="editItem"
				:excludeFields="rowFormTarget ? [] : excludeFields"
				:includeFields="rowFormTarget ? null : includeFields"
				:fieldOverrides="rowFormTarget ? {} : fieldOverrides"
				:nameField="massActionNameField"
				:initialValues="resolvedCreateDefaults"
				@confirm="onFormConfirm"
				@close="closeFormDialog" />
		</slot>

		<!-- Body -->
		<div class="cn-index-page__body" :class="{ 'cn-index-page__body--with-folders': showsFolderPane }">
			<!-- Optional folder navigation pane (opt-in via the `folderSidebar`
			     config). Selecting a folder filters the list by the config's
			     `filterField`; "All" clears it. `pane: false` keeps the scope
			     from the deep link and draws no pane. -->
			<div v-if="showsFolderPane" class="cn-index-page__folder-pane">
				<CnFolderSidebar
					:source="folderSidebarSource"
					:folders="folderSidebarFolders"
					:objects="effectiveObjects"
					:groupBy="folderSidebar.groupBy || folderSidebar.field || ''"
					:facetValues="folderSidebarFacetValues"
					:partial="folderSidebarPartial"
					:filesPath="folderSidebar.filesPath || '/'"
					:selectedId="selectedFolderId"
					:allLabel="folderSidebar.allLabel ? cnTranslate(folderSidebar.allLabel) : undefined"
					:title="folderSidebar.title ? cnTranslate(folderSidebar.title) : ''"
					:idField="folderPassthroughIdField"
					:nameField="folderPassthroughNameField"
					:allowCreate="Boolean(folderSidebar.allowCreate)"
					@select="onFolderSelect"
					@create="$emit('folder-create', $event)" />
			</div>

			<!-- The list. `v-show`, never `v-if`: the narrow layout hides it
			     but must not unmount it, because unmounting throws away the
			     scroll position, the selection and the loaded page, which is
			     the whole thing the split view exists to keep. -->
			<div
				v-show="splitLayout !== 'detail'"
				ref="listScroll"
				class="cn-index-page__main"
				:class="{
					'cn-index-page__main--map': currentViewMode === 'map',
					'cn-index-page__main--table': currentViewMode === 'table',
					'cn-index-page__main--split': splitLayout === 'split',
				}"
				@scroll="onListScroll">
				<!-- @slot before-collection Content rendered above the collection in EVERY view mode (table, cards, list, map) — e.g. a folder/group strip that must stay visually separate from the objects instead of masquerading as rows or cards. -->
				<slot name="before-collection" />

				<!-- A sort option whose endpoint could not answer: the list fell
				     back to the option's own order, and says so. -->
				<p v-if="sortSourceFellBack && sortSourceFailedNote"
					class="cn-index-page__sort-source-note"
					role="status"
					data-testid="cn-index-sort-source-note">
					{{ sortSourceFailedNote }}
				</p>

				<!-- The selected folder as a heading above the list (a group on
				     DqAfdelingen: its name, then its parent and member count). -->
				<div v-if="scopeHeading" class="cn-index-page__scope-heading" data-testid="cn-index-page-scope-heading">
					<h2 class="cn-index-page__scope-title">
						{{ scopeHeading.name }}
					</h2>
					<span v-if="scopeHeading.subtitle" class="cn-index-page__scope-subtitle" data-testid="cn-index-page-scope-subtitle">{{ scopeHeading.subtitle }}</span>
				</div>

				<!-- A note the named source read off its answer ("Filters run in
				     this order: ..."). -->
				<p v-if="sourceNote && !sourceRefusal"
					class="cn-index-page__source-note"
					data-testid="cn-index-page-source-note">
					{{ sourceNote }}
				</p>

				<!-- Loading state — initial fetch only; a background refresh keeps the table visible -->
				<div v-if="showInitialLoader" class="cn-index-page__loading">
					<!-- name gives NcLoadingIcon a non-empty aria-label (WCAG role-img-alt); empty name ships an unlabeled role="img" -->
					<NcLoadingIcon :size="32" :name="loadingText" />
				</div>

				<!-- The named source's server refused this reader: its sentence
				     instead of the rows, never an empty list. -->
				<div v-else-if="sourceRefusal"
					class="cn-index-page__source-refusal"
					role="status"
					data-testid="cn-index-page-source-refusal">
					<NcNoteCard type="error">
						{{ sourceRefusal }}
					</NcNoteCard>
				</div>

				<!-- A search the server refused for its grammar: the term with the
				     character it stopped at, the server's reason, and what to do. -->
				<div v-else-if="searchRefusal"
					class="cn-index-page__search-refusal"
					role="status"
					data-testid="cn-index-page-search-refusal">
					<NcNoteCard type="warning">
						<p class="cn-index-page__search-refusal-headline">
							{{ t('nextcloud-vue', 'This search could not be read from character {position}.', { position: searchRefusal.position }) }}
						</p>
						<p class="cn-index-page__search-refusal-term" data-testid="cn-index-page-search-refusal-term">
							<span>{{ searchRefusal.before }}</span><mark v-if="searchRefusal.at">{{ searchRefusal.at }}</mark><span>{{ searchRefusal.after }}</span>
						</p>
						<p class="cn-index-page__search-refusal-muted">
							{{ searchRefusal.message }}
						</p>
						<p class="cn-index-page__search-refusal-muted">
							{{ searchRefusalHintText }}
						</p>
					</NcNoteCard>
				</div>

				<!-- Error state: the latest self-fetch failed (e.g. a search term the server rejects) -->
				<div v-else-if="selfFetchFailed || sourceFailed"
					class="cn-index-page__empty"
					role="status"
					data-testid="cn-index-page-fetch-error">
					<CnEmptyContent error
						:name="t('nextcloud-vue', 'An error occurred')"
						:description="effectiveSearchValue
							? t('nextcloud-vue', 'Change the search or try again.')
							: t('nextcloud-vue', 'Try again later.')">
						<template #icon>
							<AlertCircleOutline :size="64" />
						</template>
					</CnEmptyContent>
				</div>

				<!-- Empty state -->
				<div v-else-if="effectiveObjects.length === 0" class="cn-index-page__empty">
					<slot name="empty">
						<CnEmptyContent :name="lensReasonText || resolvedEmptyText"
							:data-lens-unavailable="lensReasonText ? 'true' : null">
							<template #icon>
								<CnIcon v-if="resolvedIcon" :name="resolvedIcon" :size="64" />
								<DatabaseSearch v-else :size="64" />
							</template>
						</CnEmptyContent>
					</slot>
				</div>

				<!-- Table view -->
				<CnDataTable
					v-else-if="currentViewMode === 'table'"
					:schema="effectiveSchema"
					:columns="renderedColumns"
					:pinnedCount="pinnedColumnCount"
					:rowIcon="rowIcon"
					:rowIndicators="rowIndicators"
					:rowIndicatorCap="rowIndicatorCap"
					:rows="displayObjects"
					:sortKey="effectiveSortKey"
					:sortOrder="effectiveSortOrder"
					:sortKeys="effectiveSortKeys"
					:selectable="selectable"
					:hideHeader="hideTableHeader"
					:rowClickToView="rowClickOpens"
					:selectedIds="internalSelectedIds"
					:rowKey="rowKey"
					:emptyText="emptyText"
					:excludeColumns="excludeColumns"
					:includeColumns="includeColumns"
					:columnOverrides="columnOverrides"
					:rowClass="compiledRowClass"
					:rowTitle="rowTitle"
					:showUnread="marksUnreadRows"
					:filterable="tableHeaderFilters"
					:activeFilters="tableActiveFilters"
					:filterRegister="typeof register === 'string' ? register : ''"
					@columnFilter="onColumnFilterEvent"
					@sort="onSortEvent"
					@select="onSelect"
					@rowClick="onRowClick"
					@rowAuxClick="onRowAuxClick"
					@rowContextMenu="onRowContextMenu">
					<!-- Follow column (showFollowColumn, or the deprecated showFavouriteColumn) -->
					<template v-if="followColumnOn" #column-__follow="{ row }">
						<CnFollowToggle
							v-if="row && row['@self'] && typeof row['@self'].watching === 'boolean'"
							compact
							:register="typeof register === 'string' ? register : ''"
							:schema="favouriteSchemaSlug"
							:objectId="String(row['@self'].id || row.id || '')"
							:watching="row['@self'].watching === true" />
					</template>

					<!-- Pass through column slots -->
					<template
						v-for="col in slotColumns"
						#[`column-${col}`]="{ row, value }">
						<slot :name="'column-' + col" :row="row" :value="value" />
					</template>

					<!-- Row actions -->
					<template v-if="hasRowActions" #row-actions="{ row }">
						<slot name="row-actions" :row="row">
							<CnRowActions
								:actions="rowActionsFor(row)"
								:row="row"
								:rowLabel="rowTitleFor(row)"
								@action="onRowAction" />
						</slot>
					</template>

					<!-- Table-header filter + column menus (both opt-in): funnel and
					     columns buttons above the row-actions column. The filter menu
					     lists each enum column's values as toggleable facet filters;
					     the column menu lists every governed column as a visibility
					     checkbox — compact, in-table alternatives to the sidebar. -->
					<template
						v-if="(showHeaderFilterMenu) || (columnMenu && governedColumns.length)"
						#actions-header>
						<NcActions
							v-if="showHeaderFilterMenu"
							:forceMenu="true"
							:aria-label="t('nextcloud-vue', 'Filter')">
							<template #icon>
								<FilterOutline :size="20" />
							</template>
							<template v-for="field in filterableFields" :key="field.key">
								<NcActionCaption :name="field.label" />
								<NcActionCheckbox
									v-for="val in field.values"
									:key="`${field.key}-${val}`"
									:modelValue="isFilterActive(field.key, val)"
									@update:modelValue="toggleFilter(field.key, val)">
									{{ val }}
								</NcActionCheckbox>
							</template>
						</NcActions>
						<NcActions
							v-if="columnMenu && governedColumns.length"
							:forceMenu="true"
							:aria-label="t('nextcloud-vue', 'Columns')">
							<template #icon>
								<ViewColumnOutline :size="20" />
							</template>
							<NcActionCaption :name="t('nextcloud-vue', 'Columns')" />
							<NcActionCheckbox
								v-for="col in governedColumns"
								:key="`col-${col.key}`"
								:modelValue="isColumnVisible(col.key)"
								@update:modelValue="toggleColumn(col.key)">
								{{ cnTranslate(col.label || col.key) }}
							</NcActionCheckbox>
						</NcActions>
					</template>
				</CnDataTable>

				<!-- Map view — plots the CURRENT filtered rows (displayObjects) as
				     inline markers; no separate fetch path, so it reuses the same
				     filter / sidebar / quick-filter machinery as table and cards.
				     A marker click routes back through onRowClick for identical
				     detail-page navigation. -->
				<!-- Map with a numbered list beside it (`mapConfig.list`,
				     DqZakenKaart): one framed card, the list numbered as the pins
				     are, the row under the pointer marked on both sides, and the
				     rows without a place counted under the list with a way to
				     the table. -->
				<div v-else-if="currentViewMode === 'map' && mapListEnabled"
					class="cn-index-page__map-card"
					data-testid="cn-index-map-card">
					<CnMapWidget
						class="cn-index-page__map"
						:center="mapCenter"
						:zoom="mapZoom"
						:layers="mapLayers"
						:basemaps="mapBasemaps"
						:markers="mapMarkers"
						:clustering="mapClustering"
						:autoFit="true"
						height="100%"
						@markerClick="onMarkerClick" />
					<div class="cn-index-page__map-side">
						<ol class="cn-index-page__map-list" :aria-label="mapListLabel" data-testid="cn-index-map-list">
							<li v-for="item in mapList.items"
								:key="item.key"
								class="cn-index-page__map-item"
								:class="{ 'cn-index-page__map-item--active': activeMapKey === item.key }"
								data-testid="cn-index-map-item"
								@mouseenter="activeMapKey = item.key"
								@mouseleave="activeMapKey = ''"
								@focusin="activeMapKey = item.key">
								<span class="cn-index-page__map-number" aria-hidden="true">{{ item.n }}</span>
								<div class="cn-index-page__map-text">
									<button type="button" class="cn-index-page__map-title" @click="onRowClick(item.row)">
										{{ item.title }}
									</button>
									<span v-if="item.sub" class="cn-index-page__map-sub">{{ item.sub }}</span>
									<span v-if="item.pills.length > 0 || item.due" class="cn-index-page__map-pills">
										<CnStatusBadge v-for="(pill, index) in item.pills"
											:key="index"
											:label="pill.label"
											:variant="pill.variant">
											<template v-if="pill.icon" #icon>
												<CnIcon :name="pill.icon" :size="14" />
											</template>
										</CnStatusBadge>
										<span v-if="item.due" class="cn-index-page__map-due">{{ item.due }}</span>
									</span>
								</div>
							</li>
						</ol>
						<div v-if="mapList.missing.length > 0" class="cn-index-page__map-missing" data-testid="cn-index-map-missing">
							<strong>{{ mapMissingTitle }}</strong>
							<NcButton variant="tertiary-no-background" data-testid="cn-index-map-missing-table" @click="onViewModeChange('table')">
								{{ mapMissingLink }}
							</NcButton>
						</div>
					</div>
				</div>

				<CnMapWidget
					v-else-if="currentViewMode === 'map'"
					class="cn-index-page__map"
					:zoom="mapZoom"
					:center="mapCenter"
					:layers="mapLayers"
					:basemaps="mapBasemaps"
					:markers="mapMarkers"
					:clustering="mapClustering"
					:autoFit="true"
					height="100%"
					@markerClick="onMarkerClick" />

				<!--
					Board view. The columns are the schema's stages and a move
					goes through the host's transition; CnBoardView never
					writes the status field, so with no runTransition it is
					read-only rather than broken.
				-->
				<CnBoardView
					v-else-if="currentViewMode === 'board'"
					:rows="displayObjects"
					:statusFieldSchema="boardFieldSchema"
					:statusField="boardColumnField"
					:columnKeyOf="boardColumnKeyOf"
					:wrapColumns="board.wrap === true"
					:selectable="selectable"
					:selectedIds="internalSelectedIds"
					:allowedMoves="boardAllowedMoves"
					:cardFields="board.cardFields || []"
					:cardCells="board.cardCells || null"
					:cardActions="boardCardActions"
					:swimlaneField="board.swimlaneField || ''"
					:dueRule="board.dueRule || null"
					:cardRoles="board.card || null"
					:pillLooks="refLooks"
					:colorField="board.colorField || ''"
					:sumField="board.sumField || ''"
					:sumFormat="boardSumFormat"
					:columnLimit="board.columnLimit || 0"
					:rowKey="rowKey"
					:runTransition="boardRunTransition"
					:paged="isPaged"
					@select="onSelect"
					@loadMore="onBoardLoadMore"
					@cardClick="onRowClick"
					@cardAuxClick="onRowAuxClick"
					@moved="onBoardMoved"
					@cardAction="onRowAction" />

				<!--
					Date axis. Reads only: nothing here reschedules, because a
					view that moved a bar on drag would be changing statutory
					dates from a picture.
				-->
				<CnDateAxisView
					v-else-if="currentViewMode === 'dateAxis'"
					:rows="displayObjects"
					:startField="dateAxis.startField || ''"
					:endField="dateAxis.endField || ''"
					:laneField="dateAxis.laneField || ''"
					:labelField="dateAxis.labelField || ''"
					:rowKey="rowKey"
					@rowClick="onRowClick"
					@rowAuxClick="onRowAuxClick" />

				<!--
					Calendar. The current filtered rows on a month by their date
					field. The month is added to the list query (see
					calendarRangeFilter), so only that month is fetched. Reads
					only: nothing here reschedules a record.
				-->
				<CnObjectCalendar
					v-else-if="currentViewMode === 'calendar'"
					:objects="displayObjects"
					:dateField="calendar.dateField || ''"
					:endDateField="calendar.endDateField || null"
					:titleField="calendar.titleField || null"
					:rowKey="rowKey"
					:loading="effectiveLoading"
					@rangeChange="onCalendarRange"
					@objectClick="onRowClick"
					@daySelect="onCalendarDaySelect" />

				<!-- List view -->
				<CnObjectList
					v-else-if="currentViewMode === 'list'"
					:objects="displayObjects"
					:schema="effectiveSchema"
					:config="renderedListConfig"
					:selectable="selectable"
					:selectedIds="internalSelectedIds"
					:rowKey="rowKey"
					:emptyText="emptyText"
					@click="onRowClick"
					@auxClick="onRowAuxClick"
					@select="onSelect">
					<!--
						List-item slot resolution priority (highest first):
						1. Parent-provided `#list-item` scoped slot — App.vue overrides win.
						2. `listComponent` prop (or manifest `pages[].config.listComponent`)
						   resolved against the customComponents registry.
						3. CnObjectList's default CnObjectRow.
					-->
					<template v-if="$slots['list-item']" #list-item="{ object, selected }">
						<slot name="list-item" :object="object" :selected="selected" />
					</template>
					<template v-else-if="resolvedListComponent" #list-item="{ object, selected }">
						<component
							:is="resolvedListComponent"
							:item="object"
							:object="object"
							:schema="effectiveSchema"
							:register="register"
							:selected="selected"
							@click="(...args) => onRowClick(object, args.find(isDomEvent))"
							@mousedown="onCustomItemMouseDown"
							@auxclick="onCustomItemAuxClick(object, $event)"
							@select="onSelect(toggleIdInArray(internalSelectedIds, object[rowKey]))" />
					</template>
					<!-- Per-part row slots (list view only): forwarded to CnObjectRow
					     so an app can override just the leading icon or the badge
					     while keeping the config-driven title/subtitle. -->
					<template v-if="$slots['row-icon']" #row-icon="{ object }">
						<slot name="row-icon" :object="object" />
					</template>
					<template v-if="$slots['row-badges']" #row-badges="{ object }">
						<slot name="row-badges" :object="object" />
					</template>
					<template v-if="hasRowActions || $slots['row-actions']" #row-actions="{ object }">
						<slot name="row-actions" :row="object">
							<CnRowActions
								:actions="rowActionsFor(object)"
								:row="object"
								:rowLabel="rowTitleFor(object)"
								@action="onRowAction" />
						</slot>
					</template>
				</CnObjectList>

				<!-- Card view -->
				<CnCardGrid
					v-else
					:objects="displayObjects"
					:schema="effectiveSchema"
					:selectable="selectable"
					:clickToView="rowClickOpens"
					:cardFields="resolvedCardFields"
					:cardLayout="cardLayout"
					:pillLooks="refLooks"
					:cardFieldColumns="cardFieldColumns"
					:accentOf="cardAccent"
					:selectedIds="internalSelectedIds"
					:rowKey="rowKey"
					:emptyText="emptyText"
					@click="onRowClick"
					@auxClick="onRowAuxClick"
					@select="onSelect">
					<!--
						Card slot resolution priority (highest first):
						1. Parent-provided `#card` scoped slot — App.vue overrides win.
						2. `cardComponent` prop (or manifest `pages[].config.cardComponent`)
						   resolved against the customComponents registry.
						3. CnCardGrid's default CnObjectCard.
					-->
					<template v-if="$slots.card" #card="{ object, selected }">
						<slot name="card" :object="object" :selected="selected" />
					</template>
					<template v-else-if="resolvedCardComponent" #card="{ object, selected }">
						<component
							:is="resolvedCardComponent"
							:item="object"
							:object="object"
							:schema="effectiveSchema"
							:register="register"
							:selected="selected"
							@click="(...args) => onRowClick(object, args.find(isDomEvent))"
							@mousedown="onCustomItemMouseDown"
							@auxclick="onCustomItemAuxClick(object, $event)"
							@select="onSelect(toggleIdInArray(internalSelectedIds, object[rowKey]))" />
					</template>
					<template v-if="hasRowActions" #card-actions="{ object }">
						<slot name="row-actions" :row="object">
							<CnRowActions
								:actions="rowActionsFor(object)"
								:row="object"
								:rowLabel="rowTitleFor(object)"
								:triggerLabel="isBoardLook ? t('nextcloud-vue', 'More actions for {name}', { name: rowTitleFor(object) }) : ''"
								@action="onRowAction" />
						</slot>
					</template>
				</CnCardGrid>

				<!-- Right-click context menu (positioned at cursor via CSS). Same per-row list as the row actions menu, so the two never drift. -->
				<CnContextMenu
					v-model:open="contextMenuOpen"
					:actions="rowActionsFor(contextMenuShownRow)"
					:targetItem="contextMenuShownRow"
					@action="onRowAction"
					@close="closeContextMenu" />

				<p
					v-if="searchInFiles && contentSearch"
					class="cn-index-page__content-search-note"
					data-testid="cn-index-content-search-note">
					{{ t('nextcloud-vue', 'File matches are limited to the best 50.') }}
				</p>

				<!-- The map's count line (`mapConfig.count`) and the note when a map
				     that plots every row reached its limit. -->
				<div
					v-if="mapCountLine || mapCapNote"
					class="cn-index-page__map-count"
					data-testid="cn-index-map-count">
					<span v-if="mapCountLine" data-testid="cn-index-map-count-line">{{ mapCountLine }}</span>
					<span v-if="mapCapNote" class="cn-index-page__map-cap" data-testid="cn-index-map-cap">{{ mapCapNote }}</span>
				</div>

				<!-- The board view's footer: it holds every row it loaded, so it
				     counts them and offers the next batch instead of pages. -->
				<div
					v-if="boardLoadsAll && boardLoadCounts.total > 0"
					class="cn-index-page__board-load"
					data-testid="cn-index-board-load">
					<span class="cn-index-page__board-load-count" data-testid="cn-index-board-load-count">
						{{ t('nextcloud-vue', 'Showing {count} of {total}', { count: boardLoadCounts.shown, total: boardLoadCounts.total }) }}
					</span>
					<NcButton
						v-if="isPaged"
						:disabled="effectiveLoading"
						data-testid="cn-index-board-load-more"
						@click="onBoardLoadMore">
						{{ t('nextcloud-vue', 'Load more') }}
					</NcButton>
				</div>

				<!-- Pagination -->
				<CnPagination
					v-else-if="effectivePagination && (effectivePagination.pages > 1 || (isBoardLook && effectivePagination.total > 0))"
					:variant="isBoardLook ? 'board' : ''"
					:footerNote="effectiveFooterNote"
					:currentPage="effectivePagination.page || 1"
					:totalPages="effectivePagination.pages || 1"
					:totalItems="effectivePagination.total || 0"
					:currentPageSize="effectivePagination.limit || 20"
					class="cn-index-page__pagination"
					@pageChanged="onPageEvent"
					@pageSizeChanged="onPageSizeEvent" />

				<!-- A notice under the list (`notice`): DqPrivacy's "Een
				     AVG-verzoek is een zaak met ..." band. -->
				<NcNoteCard
					v-if="notice && notice.text && !noticeOnPage"
					class="cn-index-page__notice"
					:type="noticeType"
					data-testid="cn-index-page-notice">
					{{ cnTranslate(notice.text) }}
				</NcNoteCard>

				<!-- Cards after the list (`afterList`), stacked in order (PqSocial). -->
				<CnIndexPageWidgets
					v-if="presentedAfterList.length > 0"
					class="cn-index-page__after-list"
					variant="after-list"
					:widgets="presentedAfterList" />
			</div>

			<!-- The open record, beside the list on a wide screen and instead
			     of it on a narrow one. Same slot either way, and the host
			     mounts the same detail component in it that the full route
			     mounts: two detail implementations drift within a month. -->
			<div
				v-if="splitLayout !== 'list'"
				class="cn-index-page__split-pane"
				:class="{ 'cn-index-page__split-pane--full': splitLayout === 'detail' }"
				:style="splitLayout === 'split' ? { width: splitPaneWidth } : null"
				data-testid="cn-index-page-split-pane"
				:data-split-layout="splitLayout">
				<!-- An <a>, not a button: closing the pane pushes the list's
				     route, so the browser supplies middle-click and open-in-new-tab
				     while `.prevent` keeps the plain click in-app. -->
				<a
					v-if="splitCloseVisible"
					class="cn-index-page__split-close"
					:href="splitCloseHref"
					:title="splitCloseTitle"
					data-testid="cn-index-page-split-close"
					@click.prevent="closeSplitPane">
					<Close :size="16" />
					<span>{{ splitCloseTitle }}</span>
				</a>
				<!-- @slot split-pane The open record, rendered beside the list. Mount the SAME detail component the full route mounts. -->
				<!-- @binding {string} id The record the address names. -->
				<!-- @binding {string} layout Either `split` (beside the list) or `detail` (the full page, below the breakpoint). -->
				<!-- @binding {Function} close Closes the pane and returns to the list, at the list's own address. -->
				<!-- @binding {Function} saved Call with the saved record to replace its row in the list without refetching the page. -->
				<slot
					:id="splitId"
					name="split-pane"
					:layout="splitLayout"
					:close="closeSplitPane"
					:saved="onSplitPaneSaved" />
			</div>
		</div>

		<!-- The notice under the list card, on the page ground
		     (`notice.placement: 'page'`, DqContracten). -->
		<NcNoteCard
			v-if="notice && notice.text && noticeOnPage"
			class="cn-index-page__notice cn-index-page__notice--page"
			:type="noticeType"
			data-testid="cn-index-page-notice">
			{{ cnTranslate(notice.text) }}
		</NcNoteCard>

		<!-- Manifest-driven sidebar — auto-mounted when sidebar.enabled
		     AND sidebar.show !== false.

		     When CnAppRoot is the host, the sidebar config is
		     PUBLISHED to the `cnIndexSidebarConfig` provide (see
		     mounted/beforeDestroy), and CnAppRoot mounts the
		     CnIndexSidebar at NcContent level — the only place where
		     Nextcloud's NcAppSidebar slides correctly from the right.

		     When no CnAppRoot ancestor exists (legacy apps mounting
		     CnIndexPage standalone), the inject default is the no-op
		     `{ value: null }` and we fall back to inline rendering
		     here so the legacy contract still works. -->
		<CnIndexSidebar
			v-if="shouldRenderInlineSidebar"
			:open="sidebarOpen"
			:schema="effectiveSchema"
			:title="title"
			:icon="resolvedIcon"
			:searchValue="effectiveSearchValue"
			:visibleColumns="effectiveVisibleColumns"
			:activeFilters="effectiveActiveFilters"
			:columnGroups="resolvedSidebar.columnGroups || []"
			:filterFields="resolvedSidebar.fields || null"
			:facetData="effectiveFacetData"
			:showMetadata="resolvedSidebar.showMetadata !== false"
			:personalColumns="personalColumns"
			:pinnedCount="pinnedColumnCount"
			:sortOptions="sidebarSortOptions"
			:currentSort="currentSortKeys"
			:currentSortValue="sortSource.value"
			:savedViews="savedViewsForSidebar"
			:activeTab="sidebarActiveTab"
			v-bind="sidebarSearchProps"
			@update:open="sidebarOpen = $event"
			@tabChange="sidebarActiveTab = $event"
			@savedView="onSavedViewAction"
			@search="onSearchEvent"
			@columnsChange="onColumnsEvent"
			@columnsReorder="onColumnsReorder"
			@pinChange="onPinChange"
			@columnsReset="onColumnsReset"
			@filterChange="onFilterEvent"
			@clearFilters="onClearFilters"
			@sortChange="onSidebarSortChange" />
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { getCanonicalLocale, translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActionCaption, NcActionCheckbox, NcActionLink, NcActions, NcActionSeparator, NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { getCurrentInstance, inject, markRaw, ref } from 'vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import DatabaseSearch from 'vue-material-design-icons/DatabaseSearch.vue'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import Export from 'vue-material-design-icons/Export.vue'
import Eye from 'vue-material-design-icons/Eye.vue'
import FilterOutline from 'vue-material-design-icons/FilterOutline.vue'
import ImportIcon from 'vue-material-design-icons/Import.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import Tune from 'vue-material-design-icons/Tune.vue'
import ViewColumnOutline from 'vue-material-design-icons/ViewColumnOutline.vue'
import CnConfirmDialog from '../../dialogs/CnConfirmDialog.vue'
import CnQuickEditDialog from '../../dialogs/CnQuickEditDialog.vue'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import CnEmptyContent from '../CnEmptyContent/CnEmptyContent.vue'
import CnFollowToggle from '../CnFollowToggle/CnFollowToggle.vue'
import CnRelatedFieldFilters from '../CnRelatedFieldFilters/CnRelatedFieldFilters.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import CnIndexPageWidgets from './CnIndexPageWidgets.vue'
import { useContextMenu } from '../../composables/index.js'
import { useLook } from '../../composables/useLook.js'
import { copyKindsOf } from '../../composables/useObjectCopy.js'
import { createRefLabelResolver } from '../../composables/useRefLabels.js'
import { useSavedViewsApi } from '../../composables/useSavedViewsApi.js'
import { METADATA_COLUMNS } from '../../constants/metadata.js'
import { useObjectStore } from '../../store/useObjectStore.js'
import { followItemActionLink, headerActionAsLink, resolveItemActionLink, routeHref } from '../../utils/actionLink.js'
import { buildOnSuccessRoute, isExternalActionTarget, resolveRegisteredHandler } from '../../utils/actionsDispatcher.js'
import {
	buildReferenceStages,
	buildValueStages,
	columnFieldsOf,
	columnKeyOfRow,
	fetchReferenceObjects,
	flattenItemRefs,
	fullTargetOf,
	referenceTargetOf,
	refIdOf,
	resolveDropValue,
} from '../../utils/boardReferenceColumns.js'
import { cnFetchJson } from '../../utils/cnFetch.js'
import { isColumnSortable } from '../../utils/columnFilters.js'
import { countLine } from '../../utils/countLine.js'
import { reportBindingProblems } from '../../utils/diagnostics.js'
import { fetchGroupedCounts } from '../../utils/fetchAggregate.js'
import { fetchFilterCounts, fetchListTotal } from '../../utils/fetchFilterCounts.js'
import { listText, rangeChipText, rangeEnds, relativeRangeText } from '../../utils/filterRangeLabel.js'
import { unwrapAppConfig } from '../../utils/formatMetric.js'
import { buildExportUrl } from '../../utils/indexExportHelpers.js'
import { labelsByField } from '../../utils/labelsByField.js'
import { lensUnavailableText } from '../../utils/lensAvailability.js'
import { isModifiedClick, openRowTarget } from '../../utils/linkNavigation.js'
import { resolveClaimedTeams, resolveClaimTokens, splitViewsIntoTabs, viewAsTab, viewIdOf } from '../../utils/listLenses.js'
import { LIST_SHORTCUTS, listPaletteCommands, shortcutFor } from '../../utils/listShortcuts.js'
import { mapListItems } from '../../utils/mapList.js'
import { markerColorOf, normalizeMarkerColor, resolveCssColor } from '../../utils/mapMarkerColor.js'
import { multiKeySort } from '../../utils/multiKeySort.js'
import { fetchGroups } from '../../utils/nextcloudDirectory.js'
import { OBJECTS_CHANGED_EVENT } from '../../utils/objectSignals.js'
import { objectUrlOf, patchObject } from '../../utils/objectWrite.js'
import { withPersonalLenses } from '../../utils/personalLenses.js'
import { resolveDeepTokens, resolveFilterTokens, resolveFilterValue } from '../../utils/resolveFilterTokens.js'
import { resolveRowActions } from '../../utils/resolveRowActions.js'
import { resolveFilterMap } from '../../utils/routeFilters.js'
import { availableRowActions, DEFAULT_ROW_ACTION_FIELD, refusalReasonFor, undeclaredRowActions, withoutViewWhenRowOpensDetail } from '../../utils/rowActionAvailability.js'
import { isRowActionVisible, rowActionPayload } from '../../utils/rowActionItem.js'
import { isNewTabClick, isNewTabHandled, isRowMiddleClick, markNewTabHandled, preventMiddleClickAutoscroll } from '../../utils/rowAuxClick.js'
import { compileRowClass } from '../../utils/rowClassRules.js'
import { DEFAULT_ROW_INDICATOR_CAP } from '../../utils/rowIndicators.js'
import { buildRouteQueryFromViewState, buildViewCreatePayload, defaultFilterViews, extractViewState, extractViewStateFromRouteQuery, normalizeSharedWith, pageOffersSavedViews, savedViewScope, schemaSlug, viewMatchesScope } from '../../utils/savedViewHelpers.js'
import { savedViewBadge, savedViewOverrides } from '../../utils/savedViewOverrides.js'
import { columnsFromSchema, fieldsFromSchema } from '../../utils/schema.js'
import { resolveScopeLayout, resolveScopePresentation } from '../../utils/scopeListLayout.js'
import { readSearchRefusal } from '../../utils/searchRefusal.js'
import { orderToSortKeys } from '../../utils/sortOrder.js'
import { annotateRows, filterSourceRows, pageSourceRows, rowsFromSourceBody } from '../../utils/sortSourceRows.js'
import { dispatchObjectCreated } from '../../utils/walkthroughSignals.js'
import { CnActionButtons } from '../CnActionButtons/index.js'
import { CnActionsBar } from '../CnActionsBar/index.js'
import { CnAdvancedFormDialog } from '../CnAdvancedFormDialog/index.js'
import { CnBoardView } from '../CnBoardView/index.js'
import { CnCardGrid } from '../CnCardGrid/index.js'
import { CnContextMenu } from '../CnContextMenu/index.js'
import { CnCopyDialog } from '../CnCopyDialog/index.js'
import { CnDataTable } from '../CnDataTable/index.js'
import { CnDateAxisView } from '../CnDateAxisView/index.js'
import { CnDeleteDialog } from '../CnDeleteDialog/index.js'
import { CnFolderSidebar } from '../CnFolderSidebar/index.js'
import { CnFormDialog } from '../CnFormDialog/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnIndexSidebar } from '../CnIndexSidebar/index.js'
import { CnMapWidget } from '../CnMapWidget/index.js'
import { CnMassCopyDialog } from '../CnMassCopyDialog/index.js'
import { CnMassDeleteDialog } from '../CnMassDeleteDialog/index.js'
import { CnMassExportDialog } from '../CnMassExportDialog/index.js'
import { CnMassImportDialog } from '../CnMassImportDialog/index.js'
import { CnObjectCalendar } from '../CnObjectCalendar/index.js'
import { CnObjectList } from '../CnObjectList/index.js'
import { CnPageHeader } from '../CnPageHeader/index.js'
import { CnPagination } from '../CnPagination/index.js'
import { CnQuickFilterBar } from '../CnQuickFilterBar/index.js'
import { CnRowActions } from '../CnRowActions/index.js'
import { CnSavedViewEditDialog } from '../CnSavedViewEditDialog/index.js'
import { CnSavedViewPresentationDialog } from '../CnSavedViewPresentationDialog/index.js'
import { CnSavedViewsControl } from '../CnSavedViewsControl/index.js'
import { CnSavedViewShareDialog } from '../CnSavedViewShareDialog/index.js'
import { CnSaveViewDialog } from '../CnSaveViewDialog/index.js'
import { applyAiContext } from './aiContext.js'
import { buildDefaultActions } from './defaultActions.js'
import { dispatchAction } from './manifestActionDispatch.js'
import { applyManualOrder, dropInOrder, manualOrderKey, moveInOrder, visibleIdsOf } from './manualOrder.js'
import { orderColumns, personalColumnsKey, reconcilePersonalColumns } from './personalColumns.js'
import { rowsToCsv } from './rowsToCsv.js'
import { createSelfModeActions, resolveRowTarget } from './selfModeActions.js'
import { applyRowPatches, normalisePaneWidth, rowIdOf, splitLayoutFor } from './splitView.js'
import { useNamedSource } from './useNamedSource.js'
import { BOARD_PAGE_SIZE, mapPlotAllLimitOf, resolveInitialQuickFilterIndex, useSelfFetchList } from './useSelfFetchList.js'

/** Rows fetched for one month in calendar mode. */
const CALENDAR_PAGE_SIZE = 200

/**
 * The separator a date-range filter uses in the URL: `2026-09-21..2026-09-25`.
 *
 * One query parameter per FIELD, not per bound, so the link reads as the
 * question the person asked and an open-ended window still round-trips
 * (`..2026-09-25` is "due before Friday").
 *
 * @type {string}
 */
const RANGE_SEPARATOR = '..'

/** Key of the synthetic follow column (`showFollowColumn`). */
const FOLLOW_COLUMN_KEY = '__follow'

/**
 * Whether a declared column starts hidden (`{ key, hidden: true }`): it stays
 * off until the visible-column set names it, which the person does from the
 * Columns tab.
 *
 * @param {string|object} column A declared column.
 * @return {boolean} True for a column object with `hidden: true`.
 * @spec openspec/changes/screens-column-hidden-by-default/specs/index-page/spec.md
 */
function isHiddenByDefault(column) {
	return Boolean(column && typeof column === 'object' && column.hidden === true)
}

/**
 * Whether a schema property wants a from/to pair rather than a value list.
 *
 * @param {object} prop The schema property.
 *
 * @return {boolean} True for a range control.
 */
function isRangeControl(prop) {
	const control = String((prop && prop.inputControl) || '')
	return control === 'date-range' || control === 'range'
}

/**
 * The filter declarations a page carries on its sidebar config.
 *
 * `sidebar.fields` and not `config.schema`: the schema key names the
 * OpenRegister schema a page self-fetches from, and a named source has no
 * register or schema to point at. The manifest schema types it as a string
 * for exactly that reason.
 *
 * @param {object} props The CnIndexPage props.
 *
 * @return {object} `{ propertyName: declaration }`, empty when none.
 */
function declaredFilterFields(props) {
	const fields = props.sidebar && props.sidebar.fields
	const declared = (fields && typeof fields === 'object') ? { ...fields } : {}
	// An endpoint source's facet pickers are filters the address carries too.
	const facets = props.sourceConfig && Array.isArray(props.sourceConfig.facets) ? props.sourceConfig.facets : []
	for (const facet of facets) {
		if (facet && typeof facet.field === 'string' && facet.field !== '' && !declared[facet.field]) {
			declared[facet.field] = { facetable: true }
		}
	}
	return declared
}

/**
 * Read a named-source page's sidebar filters back out of `$route.query`.
 *
 * Only properties the page's own schema declares `facetable` are read, so an
 * unrelated query parameter (`?action=create`, a saved-view key) never
 * becomes a filter, and a hand-edited link cannot invent a field the source
 * has no argument for.
 *
 * @param {import('vue').ComponentInternalInstance|null} instance The instance, for `$route`.
 * @param {object} props The CnIndexPage props.
 *
 * @return {object} The `{ fieldKey: values }` map, empty when the link carries none.
 */
function namedFiltersFromRoute(instance, props) {
	const route = instance && instance.proxy && instance.proxy.$route
	return namedFiltersFromQuery((route && route.query) || {}, props)
}

/**
 * The named-source filters the page opens with: the ones the address carries,
 * else the page's `defaultFilters` with their tokens resolved (`@monthStart`,
 * `@myGroups`), unless the address names a saved view.
 *
 * @param {import('vue').ComponentInternalInstance|null} instance The instance, for `$route`.
 * @param {object} props The CnIndexPage props.
 *
 * @return {object} The `{ fieldKey: values | { from, to } }` map.
 * @spec openspec/changes/named-source-default-filters/specs/index-page/spec.md#requirement-a-named-source-page-can-open-with-removable-default-filters
 */
function namedFiltersWithDefaults(instance, props) {
	const fromRoute = namedFiltersFromRoute(instance, props)
	const query = (instance && instance.proxy && instance.proxy.$route && instance.proxy.$route.query) || {}
	const defaults = props.defaultFilters
	if (!props.entitySource || Object.keys(fromRoute).length > 0 || query.savedView || !defaults || typeof defaults !== 'object') {
		return fromRoute
	}
	return resolveFilterTokens(defaults)
}

/**
 * The named-source filters a query carries, as `namedFiltersFromRoute` reads them.
 *
 * @param {object} query The route query.
 * @param {object} props The CnIndexPage props.
 *
 * @return {object} The `{ fieldKey: values }` map.
 */
function namedFiltersFromQuery(query, props) {
	if (!props.entitySource) {
		return {}
	}
	const properties = declaredFilterFields(props)
	const out = {}

	for (const [key, prop] of Object.entries(properties)) {
		if (!prop || prop.facetable !== true) {
			continue
		}
		const raw = query[key]
		if (raw === undefined || raw === null || raw === '') {
			continue
		}
		const value = Array.isArray(raw) ? raw.join(',') : String(raw)

		if (isRangeControl(prop)) {
			const [from, to] = value.split(RANGE_SEPARATOR)
			const range = {}
			if (from) {
				range.from = from
			}
			if (to) {
				range.to = to
			}
			if (Object.keys(range).length > 0) {
				out[key] = range
			}
			continue
		}

		const values = value.split(',').filter((entry) => entry !== '')
		if (values.length > 0) {
			out[key] = values
		}
	}

	return out
}

/**
 * The query-parameter spelling of one named-source filter value.
 *
 * @param {unknown} values The chosen values, or a `{ from, to }` range.
 *
 * @return {string} The parameter value, or '' when nothing is chosen.
 */
function namedFilterToQuery(values) {
	if (values && typeof values === 'object' && !Array.isArray(values)) {
		const from = values.from || ''
		const to = values.to || ''
		return (from === '' && to === '') ? '' : `${from}${RANGE_SEPARATOR}${to}`
	}
	const list = (Array.isArray(values) ? values : [values])
		.map((entry) => ((entry && typeof entry === 'object' && 'id' in entry) ? entry.id : entry))
		.filter((entry) => entry !== undefined && entry !== null && String(entry) !== '')
	return list.join(',')
}

/**
 * CnIndexPage — Top-level schema-driven index page component.
 *
 * Assembles sub-components (CnPageHeader, CnActionsBar, table, cards,
 * pagination, mass actions, single-object dialogs) into a single
 * zero-config page.
 *
 * Dialogs are overridable via named slots:
 * - `#form-dialog` — Replace the create/edit dialog entirely
 * - `#delete-dialog` — Replace the single-item delete dialog
 * - `#copy-dialog` — Replace the single-item copy dialog
 * - `#form-fields` — Replace only the form content inside the built-in form dialog (CnFormDialog only)
 *
 * Use the `useAdvancedFormDialog` prop to use CnAdvancedFormDialog for create/edit (properties table, JSON tab, optional metadata).
 *
 * Multi-column sort (self-fetch mode: `register` + `schema`, no external
 * `objects`): shift+click a second/third sortable header in the embedded
 * CnDataTable to build a priority-ordered sort. The active key list is
 * translated into OpenRegister's `_order` query param (`{field: 'asc'|
 * 'desc', ...}`, key order = priority — the exact shape `ObjectsController::
 * normalizeOrderParameter` / `MagicMapper` consume) and persisted in
 * `$route.query._order` (JSON-encoded), so a reload or a shared link
 * restores the same sort. Host-controlled (non-self-fetch) pages pass their
 * own `sortKeys` prop instead.
 *
 * Minimal usage (auto-generated dialogs from schema)
 * ```vue
 * <CnIndexPage
 *   title="Clients"
 *   :schema="effectiveSchema"
 *   :objects="clients"
 *   :pagination="effectivePagination"
 *   :loading="loading"
 *   @create="onCreate"
 *   @edit="onEdit"
 *   @delete="onDelete"
 *   @refresh="fetchClients"
 *   @row-click="openClient"
 *   @page-changed="onPage" />
 * ```
 *
 * With custom form dialog
 * ```vue
 * <CnIndexPage ...>
 *   <template #form-dialog="{ item, schema, confirm, close }">
 *     <MyCustomFormDialog :item="item" @save="confirm" @close="close" />
 *   </template>
 * </CnIndexPage>
 * ```
 *
 * @event {void} add — Add button clicked (backward compat, only if listener attached)
 * @event {object} create — Form dialog create confirmed. Payload: formData object
 * @event {object} edit — Form dialog edit confirmed. Payload: formData object (includes id)
 * @event {string} delete — Single delete confirmed. Payload: item ID
 * @event {{ id: string, newName: string }} copy — Single copy confirmed
 * @event {string[]} mass-delete — Mass delete confirmed. Payload: array of IDs
 * @event {object} mass-copy — Mass copy confirmed. Payload: { ids, pattern }
 * @event {object} mass-export — Mass export confirmed. Payload: { ids, format }
 * @event {object} mass-import — Mass import confirmed. Payload: import data
 * @event {void} refresh — Refresh button clicked
 * @event {object} row-click — Table row or card clicked. Payload: (row, event) — the row object and the native click event
 * @event {object} row-aux-click — Table row or card middle-clicked. Payload: (row, event) — the row object and the native auxclick event
 * @event {{ key: string, order: string }} sort — Column sort changed
 * @event {number} page-changed — Pagination page changed
 * @event {number} page-size-changed — Pagination page size changed. In self-fetch mode the list refetches page 1 at the new size first.
 * @event {string[]} select — Selection changed. Payload: array of selected IDs
 * @event {object} action — Row action triggered. Payload: { action, row }
 * @event {{ action: string, id: string, selectedIds: Array, count: number }} bulk-action — A declarative bulk action was triggered from the selection strip. The SELECTION travels with it: an action that has to go and find out what was selected is one re-render away from acting on a different set than the user saw highlighted.
 * @event {{ target: string, props: object }} open-modal — A bulk action of type `open-modal` asks the host to open a registered modal. `props` carries `selectedIds` and `count` merged under the action's own props.
 * @event {object} apply-view — A saved view was applied (saved-views-ui). Payload: the View API object. Only emitted when `allowSavedViews`.
 * @event {string} search — Search input changed in the embedded sidebar. Only emitted when `sidebar.enabled`.
 * @event {string[]} columns-change — Visible columns changed in the embedded sidebar. Only emitted when `sidebar.enabled`.
 * @event {{ key: string, values: Array<unknown> }} filter-change — Facet filter changed in the embedded sidebar. Only emitted when `sidebar.enabled`.
 * @event {void} clear-filters — "Clear all" clicked in the embedded sidebar. Search, every active filter and the folder-sidebar selection are reset (self-fetch mode); a consumer-managed page gets the bare event to handle itself.
 *
 * @slot mass-actions — Extra mass action buttons (shown when items are selected)
 * @slot action-items — Extra action bar buttons
 * @slot after-search — Refinement controls beside the search field on the bar's left side (e.g. a filter menu button)
 * @slot before-collection — Content above the collection in every view mode (e.g. a folder/group strip)
 * @slot selection-actions — Bulk-action buttons in the contextual selection strip shown while a selection is active. Scope: `{ count, selectedIds }`
 * @slot header-actions — Extra buttons in the page header
 * @slot delete-dialog — Replace the single-item delete dialog. Scope: `{ show, item, confirm, close }`. Call `confirm()` to perform the delete.
 * @slot copy-dialog — Replace the single-item copy dialog. Scope: `{ show, item, confirm, close }`. Call `confirm(payload)` to perform the copy.
 * @slot form-dialog — Replace the create/edit form dialog. Scope: `{ show, item, schema, confirm, close }`. Call `confirm(formData)` to save through the host's normal persistence path.
 * @slot form-fields — Replace form content inside the built-in CnFormDialog. Scope: `{ fields, formData, errors, updateField }`
 * @slot import-fields — Extra fields in the import dialog
 * @slot empty — Custom empty state content
 * @slot card — Custom card template for card view. Scope: `{ row }`
 * @slot row-actions — Custom row actions. Scope: `{ row }`
 * @slot column-{key} — Custom cell renderer for a specific column. Scope: `{ row, value }`
 */
export default {
	name: 'CnIndexPage',

	components: {
		CnIndexPageWidgets,
		CnRelatedFieldFilters,
		CnStatusBadge,
		NcNoteCard,
		CnBuildiqEditButton,
		CnFollowToggle,
		NcLoadingIcon,
		CnEmptyContent,
		NcActions,
		NcActionLink,
		NcActionButton,
		NcActionCaption,
		NcActionSeparator,
		NcActionCheckbox,
		NcButton,
		AlertCircleOutline,
		Close,
		Cog,
		DatabaseSearch,
		Export,
		FilterOutline,
		Tune,
		ViewColumnOutline,
		NcCheckboxRadioSwitch,
		CnPageHeader,
		CnQuickFilterBar,
		CnActionButtons,
		CnActionsBar,
		DotsHorizontal,
		CnIcon,
		CnDataTable,
		CnCardGrid,
		CnBoardView,
		CnDateAxisView,
		CnObjectCalendar,
		CnMapWidget,
		CnObjectList,
		CnFolderSidebar,
		CnPagination,
		CnRowActions,
		CnMassDeleteDialog,
		CnMassCopyDialog,
		CnMassExportDialog,
		CnMassImportDialog,
		CnDeleteDialog,
		CnCopyDialog,
		CnFormDialog,
		CnAdvancedFormDialog,
		CnContextMenu,
		CnIndexSidebar,
		CnSavedViewsControl,
		CnSavedViewPresentationDialog,
		CnSavedViewEditDialog,
		CnSavedViewShareDialog,
		CnSaveViewDialog,
		CnConfirmDialog,
		CnQuickEditDialog,
	},

	/**
	 * Inject the customComponents registry from a CnAppRoot ancestor.
	 * Used by:
	 * - REQ-MAD-3 / REQ-MAD-8 (manifest-actions-dispatch): resolves
	 *   `actions[].handler` registry names to functions called on
	 *   row-action click.
	 * - The cardComponent + form-dialog override paths: when set, the
	 *   prop-level `customComponents` wins, but the inject is the
	 *   default. See `effectiveCustomComponents`.
	 *
	 * Falls back to an empty object so `CnIndexPage` works standalone
	 * (unit tests, isolated mount) without `CnAppRoot`.
	 */
	/**
	 * The list a side-panel widget reads (`cnIndexList`): the applied saved
	 * view, the list's total, and a way to hand back a view that changed
	 * (the saved-view alert widget). Getters, so a widget follows the page.
	 *
	 * @return {object}
	 */
	provide() {
		return {
			cnIndexList: Object.defineProperties({}, {
				appliedView: { enumerable: true, get: () => this.appliedSavedView },
				total: {
					enumerable: true,
					get: () => {
						const total = this.effectivePagination && this.effectivePagination.total
						return typeof total === 'number' ? total : undefined
					},
				},
				replaceSavedView: { enumerable: true, value: (view) => this.replaceSavedView(view) },
			}),
		}
	},

	inject: {
		cnCustomComponents: { default: () => ({}) },
		/** The app's named formatters, provided by CnAppRoot, for the map list's pills and template tokens. */
		cnFormatters: { default: () => ({}) },
		/** The permissions the user holds, provided by CnAppRoot; for gated page tabs. */
		cnPermissions: { default: () => [] },
		/** The app config an ancestor provides, for `@config.<key>` in quick-filter labels. */
		cnAppConfig: { default: null },
		/** The app id CnAppRoot provides, for the plural form of `countSubtitle`. */
		cnAppId: { default: '' },
		/**
		 * The app manifest, provided by CnAppRoot. A column with `labelField`
		 * and `link: true` finds the referenced schema's detail page here.
		 */
		cnManifest: { default: null },
		/**
		 * The v2 component registry, provided by CnAppRoot. Named handlers
		 * (`actions[].handler`, `bulkActions[].handler`,
		 * `headerActions[].handler`) resolve here first and fall back to
		 * `cnCustomComponents`, so an app can register a `kind: 'handler'`
		 * entry instead of a bare function in the legacy map.
		 */
		cnRegistry: { default: () => ({}) },
		/**
		 * The per-user preference reader and writer, provided by CnAppRoot.
		 * Used for the manual row order, which belongs to the person and the
		 * list rather than to the records. The default is null, and every read
		 * and write is guarded, so a page mounted with no CnAppRoot ancestor
		 * simply has no held order instead of failing to render.
		 */
		cnUserPreferences: { default: null },
		/**
		 * The saved views this user put in the app menu, held by CnAppRoot:
		 * `{ entries, toggle(entry) }`. Absent without the shell, and then
		 * the sidebar offers no Add to menu.
		 */
		cnSavedViewMenu: { default: null },
		/**
		 * Consumer translation function, provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). Column and
		 * filter labels come from schema property titles, authored in English as
		 * the canonical source; the visible label is resolved through this
		 * function so it follows the user's language. Defaults to identity when
		 * used standalone (no CnAppRoot ancestor). The embedded CnDataTable
		 * resolves its own header labels through the same injection.
		 */
		cnTranslate: { default: () => (key) => key },
		/**
		 * Reactive edit-mode flag from CnAppRoot's manifest editor. When truthy
		 * the page shows a config cog in its actions bar (emits `configure`).
		 */
		cnEditingBody: { default: false },
		/** Opens a registry modal, provided by CnAppRoot. Used by `createModal`. */
		cnOpenModal: { default: null },
		/**
		 * Reactive holder provided by CnAppRoot for hoisting the
		 * embedded CnIndexSidebar to NcContent level. The default
		 * `{ value: null }` is what we get when no CnAppRoot
		 * ancestor exists; in that case we fall back to inline
		 * rendering inside the cn-index-page wrapper. See
		 * `shouldRenderInlineSidebar` and the mounted/beforeDestroy
		 * hooks below.
		 */
		cnIndexSidebarConfig: { default: () => ({ value: null }) },
		/**
		 * Sentinel set to `true` when a CnAppRoot ancestor exists.
		 * The default `false` is used for legacy apps that mount
		 * CnIndexPage standalone — those keep the inline sidebar
		 * render. See `shouldRenderInlineSidebar` for the gate.
		 */
		cnHostsIndexSidebar: { default: false },
		/**
		 * Reactive AI context holder provided by CnAppRoot. This page
		 * component writes pageKind, registerSlug, schemaSlug in
		 * created() and watches props for subsequent changes. On
		 * beforeUnmount(), fields are reset to avoid stale context on
		 * subsequent custom pages.
		 */
		cnAiContext: { default: null },
	},

	props: {
		/** Page title */
		title: {
			type: String,
			required: true,
		},

		/**
		 * A breadcrumb under the title (manifest `config.breadcrumb`): one
		 * crumb `{ label, route?, params?, href?, icon?, separator? }` or a
		 * list; the title follows as the current crumb. Drawn as the detail
		 * header's breadcrumb row. Null (the default) draws none.
		 *
		 * @type {object|Array<object>|null}
		 * @spec openspec/changes/page-header-breadcrumb/specs/page-header/spec.md#requirement-a-list-dashboard-or-settings-page-can-show-a-breadcrumb-and-a-meta-note
		 */
		breadcrumb: {
			type: [Object, Array],
			default: null,
		},

		/**
		 * A note after the breadcrumb and a middle dot (manifest `config.headerMeta`),
		 * such as "{total} open": `{total}` and `{shown}` are the list's counts,
		 * and `{count:<name>}` the count of a list named in `headerMetaCounts`
		 * ("{total} contracten bij {count:suppliers} leveranciers").
		 *
		 * @spec openspec/changes/page-header-breadcrumb/specs/page-header/spec.md#requirement-a-list-dashboard-or-settings-page-can-show-a-breadcrumb-and-a-meta-note
		 */
		headerMeta: {
			type: String,
			default: '',
		},

		/**
		 * The other lists `headerMeta` counts (manifest `config.headerMetaCounts`):
		 * `{ <name>: { register, schema, filter? } }`, each read as one list
		 * total and filled in for `{count:<name>}`. While a count loads, or when
		 * it fails, the note is left out rather than shown with a gap.
		 *
		 * @type {Record<string, {register: string, schema: string, filter?: object}>|null}
		 */
		headerMetaCounts: {
			type: Object,
			default: null,
		},

		/**
		 * Tabs to sibling pages above the toolbar (manifest `config.pageTabs`),
		 * each `{ id?, label, route?, params?, query?, href?, countFrom?: {
		 * register, schema, filter? }, adminOnly?, permission? }`: DqPrivacy's
		 * "AVG-verzoeken | Datalekken". The current page's tab is marked;
		 * `countFrom` adds the count of that list. A tab with `adminOnly` shows
		 * only to an instance admin, one with `permission` only to a user who
		 * holds it. That hides the tab and nothing more: the page it points to
		 * must still refuse the user on the server. Wins over a named source's
		 * own page tabs.
		 *
		 * @type {Array<object>|null}
		 * @spec openspec/changes/index-page-tabs-notice/specs/index-page/spec.md#requirement-an-index-page-can-link-its-sibling-pages-as-tabs
		 */
		pageTabs: {
			type: Array,
			default: null,
		},

		/**
		 * A notice under the list (manifest `config.notice`): `{ text,
		 * variant?: 'info' | 'success' | 'warning' }`, a band that explains
		 * the list, such as who decides what. The text goes through the host
		 * translate.
		 *
		 * `placement: 'page'` draws it under the list card, on the page
		 * ground, instead of inside the list under its rows.
		 *
		 * @type {{text: string, variant?: string, placement?: string}|null}
		 * @spec openspec/changes/index-page-tabs-notice/specs/index-page/spec.md#requirement-an-index-page-can-show-a-notice-under-its-list
		 * @spec openspec/changes/index-notice-below-card/specs/index-page/spec.md#requirement-an-index-page-notice-can-sit-under-the-list-card
		 */
		notice: {
			type: Object,
			default: null,
		},

		/** Optional description shown below the title */
		description: {
			type: String,
			default: '',
		},

		/**
		 * A description that carries the collection's total: `{total}` in
		 * the text is replaced by the current pagination total ("{total}
		 * open cases" reads "48 open cases"). Rendered in place of
		 * `description` once a total is known; before that, `description`
		 * shows. Manifest key `config.countSubtitle`. Goes through the host
		 * translate function.
		 *
		 * `{ singular, plural }` picks the form by the total ("1 invoice",
		 * "12 invoices") through the app's plural translation
		 * (`translatePlural` with the app id CnAppRoot provides), so a
		 * language with other plural rules gets its own forms.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-an-index-page-title-is-a-manifest-key
		 * @spec openspec/changes/index-count-plural/specs/index-header/spec.md#requirement-the-count-line-takes-a-singular-and-a-plural-form
		 * @type {string|{singular: string, plural: string}}
		 */
		countSubtitle: {
			type: [String, Object],
			default: '',
		},

		/**
		 * Whether to show the page header (icon, title, description) inline.
		 * When false (default), only the sidebar header shows the title
		 * visually — but the `<h1>` is still rendered visually-hidden inside
		 * the page, so the `<main>` landmark always has an accessible heading.
		 * This prop controls VISIBILITY only; it can no longer remove the
		 * heading from the accessibility tree.
		 */
		showTitle: {
			type: Boolean,
			default: false,
		},

		/**
		 * Whether the page header draws its icon before the title. `false`
		 * (manifest `config.showTitleIcon: false`) drops it, for a title that
		 * stands alone as the board draws it. True by default.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 */
		showTitleIcon: {
			type: Boolean,
			default: true,
		},

		/**
		 * Whether the actions bar shows its "Showing 20 of 258" line.
		 * `false` (manifest `config.showCount: false`) drops it, for a page
		 * whose title line already gives the total (`countSubtitle`). True by
		 * default.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 */
		showCount: {
			type: Boolean,
			default: true,
		},

		/**
		 * Draw this page in the `board` look (or `nextcloud`) whatever the app
		 * does. Empty follows the `cnLook` CnAppRoot provides. Manifest key
		 * `config.look`.
		 *
		 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md
		 * @type {('' | 'board' | 'nextcloud')}
		 *
		 * Read through `useLook(props)` in setup, which the unused-properties rule cannot see.
		 */
		look: {
			type: String,
			default: undefined,
		},

		/**
		 * Board look: the count line under the title, a template with `{shown}`
		 * (rows on this page) and `{total}` (all rows) and free text. Manifest
		 * key `config.countText`. Without it the page's `countSubtitle`, else
		 * "{shown} of {total}".
		 *
		 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-index-header-reads-title-count-and-the-board-buttons
		 */
		countText: {
			type: String,
			default: '',
		},

		/**
		 * The property keys the card's facts list shows, in order (manifest key
		 * `config.cardFields`). Without it the board look shows the first four
		 * list columns.
		 *
		 * @spec openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-a-record-card-has-a-head-facts-and-one-action
		 * @type {Array<string>}
		 */
		cardFields: {
			type: Array,
			default: null,
		},

		/**
		 * Board look: the record layout of each card in the cards view
		 * (manifest key `config.cardLayout`): `{ headPill, number, title,
		 * meta, footerPill, footerDate }`, each part naming a field. See
		 * CnObjectCard `layout`.
		 *
		 * @type {object}
		 * @spec openspec/changes/board-record-card-layout/specs/board-record-card-layout/spec.md#requirement-a-board-card-can-draw-the-record-layout-from-config
		 */
		cardLayout: {
			type: Object,
			default: null,
		},

		/**
		 * Gives each card in the card view a status accent: a colored start
		 * border and icon. See CnObjectCard `accent`.
		 *
		 * @type {((object: object) => ({variant: string, icon: string, label: string}|null))|null}
		 */
		cardAccent: {
			type: Function,
			default: null,
		},

		/**
		 * Board look: free text after the footer's count ("8 of 48 · click a
		 * column header to sort"). Manifest key `config.footerNote`.
		 *
		 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-footer-sits-inside-the-card
		 */
		footerNote: {
			type: String,
			default: '',
		},

		/**
		 * Board look: draw the bulk band before anything is selected too, its
		 * buttons disabled until there is a selection (DqZaken, DqWerkbord).
		 * Manifest key `config.bulkBandAlways`. Only when the band has an
		 * action to offer.
		 */
		bulkBandAlways: {
			type: Boolean,
			default: false,
		},

		/**
		 * Board look: the 13px hint after the bulk band's buttons ("See what
		 * changes first, then run it"). Manifest key `config.bulkHint`.
		 *
		 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-bulk-band-is-its-own-row
		 */
		bulkHint: {
			type: String,
			default: '',
		},

		/**
		 * Board look: another shape of the bulk band per view mode, keyed by
		 * the view (`board`, `cards`, ...). `{ lead?: { one, other }, actions?:
		 * Array<id|{ id, label? }>, cancel?: boolean, hint?: boolean }`: the
		 * lead counts the selection (`{count}`, through the app's translate),
		 * `actions` picks and relabels bulk actions, `cancel` adds a Cancel
		 * button that clears the selection, `hint: true` keeps `bulkHint`. In
		 * such a view the band shows only with a selection and without the
		 * built-in copy and delete (DqWerkbord: "1 zaak geselecteerd · Status
		 * wijzigen · Annuleren"). Manifest key `config.bulkBandViews`.
		 */
		bulkBandViews: {
			type: Object,
			default: null,
		},

		/**
		 * Board look: the plural the bulk band names ("With the selected
		 * cases"), through the app's translate and lower-cased. Wins over the
		 * schema's plural. Manifest key `config.bulkNoun`.
		 */
		bulkNoun: {
			type: String,
			default: '',
		},

		/**
		 * Buttons beside the page title, as the board's "Export" and "New
		 * case" (manifest `config.headerButtons`). Each is `{ label?, action,
		 * variant?, icon?, format?, id? }`: `action` is `add` (the Add flow;
		 * its label defaults to the Add label), `export` (the export leaf in
		 * `format`, `csv` by default, else the export dialog; with `run` the
		 * `headerActions` entry of that id; on an `entitySource` page without
		 * `run` and without a `@mass-export` listener it is not drawn),
		 * `import`,
		 * `refresh`, `save-view` (the save-current-view dialog: the board's
		 * "Zoekopdracht opslaan", label "Save view" by default), or the id of a
		 * `headerActions` entry; `variant` is
		 * `primary` or `secondary` (the default). Shown only with
		 * `showTitle`. When they show, the actions bar drops its Views and
		 * Actions menus, and the Add button and Export menu when a button
		 * takes their action. Empty (the default) changes nothing.
		 * `action: "actions-menu"` is one labelled menu: the page's header
		 * actions, or what its `items` name (`header-actions`, a header action
		 * id, `import`, `export`, `refresh`, `copy-selected`, `delete-selected`,
		 * `documentation`), so the entries the bar's menu loses have a place.
		 * `items` can group them: `{ heading }` draws a group heading (an i18n
		 * key) and `separator` a rule, each only when an entry follows.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 * @type {Array<{label?: string, action: string, variant?: ('primary'|'secondary'), icon?: string, format?: ('csv'|'excel'), id?: string, items?: Array<(string|{heading: string})>}>}
		 */
		headerButtons: {
			type: Array,
			default: () => [],
		},

		/**
		 * How the board look draws the table's title column (manifest
		 * `config.rowTitle`): `link` (the default) underlines the title,
		 * `plain` draws it as bold text without an underline over a 13px muted
		 * secondary line. The row stays clickable. The Nextcloud look ignores
		 * it. Maps to CnDataTable `rowTitle`.
		 *
		 * @spec openspec/changes/screens-table-rows-parity/specs/index-list-board-look/spec.md#requirement-a-row-title-can-be-plain-text
		 */
		rowTitle: {
			type: String,
			default: 'link',
			validator: (value) => ['link', 'plain'].includes(value),
		},

		/** Optional MDI icon name. Defaults to schema.icon when a schema is provided. */
		icon: {
			type: String,
			default: '',
		},

		/**
		 * Schema. Either a resolved schema object (consumer-managed path) OR a
		 * schema-slug string — when a string is given together with `register`
		 * and no `objects` prop, the page enters self-fetch mode: it drives the
		 * list via `useListView('${register}-${schema}', …)` and the column
		 * generation uses the schema object that composable loads. Backwards-
		 * compatible: `[Object, String]` still accepts an object.
		 */
		schema: {
			type: [Object, String],
			default: null,
		},

		/**
		 * Base filter for the self-fetch path. String values of the form
		 * `"@route.<name>"` / `":<name>"` are interpolated from `$route.params`.
		 */
		filter: {
			type: Object,
			default: null,
		},

		/**
		 * Self-fetch mode only — an array of clickable filter tabs rendered as
		 * a strip above the table. Each entry is `{label, filter, default?, icon?}`;
		 * clicking a tab merges its `filter` into the fetch — spread AFTER
		 * `filter` (so the active tab wins) and BEFORE the user's `activeFilters`
		 * (so user facets still narrow within the active tab). String values
		 * in a tab's `filter` resolve `@route.<name>` / `:<name>` from
		 * `$route.params` just like the `filter` prop. The first tab with
		 * `default:true` (else index 0) is active on mount; changing tabs
		 * re-fetches at page 1. Omit (or `null`) → no tab strip, behaviour
		 * unchanged. Under the board look a tab with `activeLabel` ("Pipeline:
		 * Sales") adds a removable chip with that text to the Active line and
		 * counts on the Filter badge while it is selected; removing the chip
		 * goes back to the default tab. A tab can say `empty: "field"` (or a
		 * list of fields) for the rows where the field has no value, and
		 * `notEmpty` for the rows where it has one: it reads as the filter
		 * `{ field: { isnull: true } }`. A tab can set its own order with
		 * `sort: { key, order }` (or a list of those): selecting it sorts the
		 * list that way, and selecting a tab without `sort` goes back to the
		 * page's `sortKey`/`sortOrder`. A column the person sorts by still wins
		 * until the next tab switch.
		 */
		quickFilters: {
			type: Array,
			default: null,
		},

		/**
		 * Quick filters made from the values a field holds in this list
		 * (manifest `config.quickFiltersFrom`): `{ field, register?, schema?,
		 * valueField?, labelField?, allLabel? }`. The page asks OpenRegister for the
		 * distinct values of `field` with their counts (within `filter`) and
		 * draws "All" plus one tab per value, the most frequent first, each
		 * with its count. With `register` and `schema` the values are ids of
		 * records of that schema and each tab shows the record's `labelField`
		 * (else its title or name). With `valueField` as well, the values are
		 * matched on that field of those records instead of their id (a slug).
		 * Ignored when `quickFilters` is set.
		 *
		 * @type {{field: string, register?: string, schema?: string, valueField?: string, labelField?: string, allLabel?: string}|null}
		 * @spec openspec/changes/index-quick-filters-from/specs/index-page/spec.md#requirement-quick-filters-can-come-from-a-field-s-values
		 */
		quickFiltersFrom: {
			type: Object,
			default: null,
		},

		/**
		 * Personal lenses appended to the quick filters: any of `watching`
		 * (`_watching`, labelled Following), `recent` (`_recent`) and `unread`
		 * (`_unread`). `favourite` is a deprecated alias of `watching`: a
		 * favourite is a follow now, and asking for both gives one tab.
		 * They combine with every other filter. While Recent is active column
		 * sorting is off, because the lens owns the order. Manifest
		 * `config.personalLenses`.
		 *
		 * @type {Array<'favourite'|'recent'|'watching'|'unread'>}
		 */
		personalLenses: {
			type: Array,
			default: () => [],
		},

		/**
		 * Whether the table marks unread rows (`@self.unread`) in bold with the
		 * unread marker: `true` in every look, `false` never. Unset (null)
		 * keeps the look's default (see `marksUnreadRows`). Manifest
		 * `config.showUnreadRows`.
		 *
		 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-page-can-ask-for-its-unread-rows
		 */
		showUnreadRows: {
			type: Boolean,
			default: null,
		},

		/**
		 * Add a first column with a follow toggle per row (`CnFollowToggle`,
		 * compact), bound to each row's `@self.watching`. Clicking it does not
		 * open the row. Manifest `config.showFollowColumn`.
		 */
		showFollowColumn: {
			type: Boolean,
			default: false,
		},

		/**
		 * Deprecated alias of `showFollowColumn`: the star column became the
		 * follow column (OpenRegister `merge-follow-and-favourites`).
		 *
		 * @deprecated Use `showFollowColumn`.
		 */
		showFavouriteColumn: {
			type: Boolean,
			default: false,
		},

		/**
		 * A second filter strip under the toolbar, on one field (manifest
		 * `config.filterStrip`): `{ field, label?, allLabel?, options?:
		 * [{ value, label }], showCount? }`. It draws "All" and one pill per
		 * value (the options, else the field's schema enum); picking one sets
		 * the page's filter on that field, "All" clears it. With `showCount`
		 * each pill counts the rows it would show within the active quick
		 * filter. Absent (the default) draws nothing.
		 *
		 * @type {{field: string, label?: string, allLabel?: string, options?: Array<{value: string, label?: string}>, showCount?: boolean}|null}
		 * @spec openspec/changes/screens-filter-strip/specs/index-filter-strip/spec.md#requirement-an-index-page-can-draw-a-second-filter-strip
		 */
		filterStrip: {
			type: Object,
			default: null,
		},

		/**
		 * Whether the board look draws the saved views as chips in the toolbar
		 * (manifest `config.savedViewChips`). `false` keeps only Save view,
		 * for a page whose views live in the side panel's Weergaven tab
		 * (DqZaken, DqZakenSorteren, DqZakenKaart, DqWerkbord, DqFilterBeheren).
		 *
		 * @spec openspec/changes/saved-view-chips-switch/specs/saved-views/spec.md#requirement-an-index-page-can-leave-the-saved-view-chips-out-of-the-toolbar
		 */
		savedViewChips: {
			type: Boolean,
			default: true,
		},

		/**
		 * Where the quick-filter chips sit (manifest `config.quickFilterPlacement`).
		 * `''` (the default) as before. `'toolbar'` keeps them on one row with
		 * the Filter button and the view switch, in whatever width that row has
		 * beside a side panel (DqTeamwachtrij): the chips take the room the
		 * buttons leave, and those that do not fit move into the overflow chip.
		 * `'row'` puts them on a row of their own above the toolbar, wrapping
		 * onto more lines instead of folding into the overflow chip.
		 *
		 * @type {''|'toolbar'|'row'}
		 */
		quickFilterPlacement: {
			type: String,
			default: '',
			validator: (v) => ['', 'toolbar', 'row'].includes(v),
		},

		/**
		 * The quick-filter placement per view mode (manifest
		 * `config.quickFilterPlacementByView`): `{ table?, cards?, board?, map? }`,
		 * each `''`, `'toolbar'` or `'row'`. A view it does not name keeps
		 * `quickFilterPlacement` (dossiq's case list: the chips beside Filter in
		 * its board and map views, on their own row in its table view).
		 *
		 * @spec openspec/changes/index-quick-filter-placement-per-view/specs/index-page/spec.md#requirement-the-quick-filter-placement-can-differ-per-view
		 */
		quickFilterPlacementByView: {
			type: Object,
			default: null,
		},

		/**
		 * Where the board look's search field sits (manifest
		 * `config.searchPlacement`): `''` (the default) opens row 2 with it,
		 * `'toolbar'` puts it on row 1 before the Filter button and the view
		 * switch (DqTeamwachtrij).
		 *
		 * @type {''|'toolbar'}
		 */
		searchPlacement: {
			type: String,
			default: '',
			validator: (v) => ['', 'toolbar'].includes(v),
		},

		/**
		 * How the quick filters render: `'chips'` (pill strip, default) or
		 * `'dropdown'` (a single `NcSelect`). Sourced from the manifest as
		 * `pages[].config.quickFilterMode`.
		 *
		 * @type {'chips'|'dropdown'}
		 */
		quickFilterMode: {
			type: String,
			default: 'chips',
			validator: (v) => ['chips', 'dropdown'].includes(v),
		},

		/**
		 * Allow several quick filters active at once. Selected tabs' filters
		 * are OR-ed together into the fetch (same field → array value →
		 * `field[]=` IN query). Sourced from `pages[].config.quickFilterMultiple`.
		 */
		quickFilterMultiple: {
			type: Boolean,
			default: false,
		},

		/**
		 * Chips mode only: how many quick-filter pills render inline before the
		 * rest move into an overflow menu. `0` (the default) renders every tab.
		 * A long strip wraps the actions bar onto a second line and squeezes the
		 * "Showing X of Y" count, so a page with many lenses caps this and keeps
		 * the everyday few in view. Sourced from
		 * `pages[].config.quickFilterMaxVisible`.
		 */
		quickFilterMaxVisible: {
			type: Number,
			default: 0,
		},

		/**
		 * How the Active line names a filter: per filter key an optional
		 * `label` for the field and `values` naming each value, both through
		 * the app's translate. Wins over the schema and sidebar names.
		 * Sourced from `pages[].config.filterLabels`.
		 *
		 * A range filter's entry may set `relative: true`, naming a range
		 * from today in words ("within 7 days").
		 *
		 * @example { isFinalStatus: { label: 'Status', values: { false: 'Ongoing', true: 'Finished' } } }
		 */
		filterLabels: {
			type: Object,
			default: () => ({}),
		},

		/** Manual column definitions (used instead of schema when provided) */
		columns: {
			type: Array,
			default: () => [],
		},

		/**
		 * OpenRegister `_extend[]` values forwarded on the fetch, e.g.
		 * `["calculations"]`. Sourced from `pages[].config.extend`.
		 *
		 * A schema's `x-openregister-calculations` entries declared
		 * `materialise: false` are VIRTUAL: RenderObject evaluates them only
		 * when the caller asks for them through `_extend`, so without this a
		 * declared calculation is simply absent from every row and its column
		 * renders empty. The same contract `objectTableSource.extend` already
		 * carries for dashboard widgets, which is where it shipped first;
		 * index pages could not ask for it at all.
		 */
		extend: { // eslint-disable-line vue/no-unused-properties -- read by useSelfFetchList.js off the props object, which this rule does not follow.
			type: Array,
			default: () => [],
		},

		/**
		 * Self-fetch only: list from this endpoint instead of
		 * `/api/objects/{register}/{schema}`, e.g. an app endpoint that searches
		 * several register/schema pairs at once. `register` and `schema` stay the
		 * page's own pair (columns, create, export, import). Rows of another pair,
		 * read from their `@self.register` / `@self.schema`, are edited, copied and
		 * deleted against that pair, with its own form. The endpoint takes
		 * `_page`, `_limit`, `_search` and `_order[key]=dir` and answers
		 * `{ results, total, page, pages }`.
		 */
		collectionUrl: {
			type: String,
			default: '',
		},

		/**
		 * Offer an "Also search inside files" switch beside the search box. On,
		 * a search also matches words inside attached files (OpenRegister
		 * `_content_search`), and a row found that way says which file matched.
		 * Manifest: `config.searchInFiles`.
		 */
		searchInFiles: {
			type: Boolean,
			default: false,
		},

		/**
		 * Filters over a type's own declared fields, beside the search
		 * (CnRelatedFieldFilters): `{ definitions: { register, schema, filter },
		 * related: { schema, backref, definitionKey?, valueKey? } }`.
		 * Manifest: `config.relatedFieldFilters`.
		 */
		relatedFieldFilters: {
			type: Object,
			default: null,
		},

		/** Object/row data array */
		objects: {
			type: Array,
			default: () => [],
		},

		/**
		 * Name of a registered NON-OBJECT entity collection to list (e.g. `flows`).
		 *
		 * The third data mode. `register` + `schema` fetches OpenRegister
		 * objects; `:objects` renders rows a parent already holds; `entitySource`
		 * names a list that is neither — a flow definition is deliberately not
		 * an OpenRegister object, so an index had nothing to point at and such
		 * lists became bespoke `type: "custom"` pages instead.
		 *
		 * Non-empty `:objects` still wins, and an entity source wins over
		 * register/schema. See `src/composables/indexSources.js`.
		 */
		entitySource: { type: String, default: '' },

		/**
		 * Route name a clicked row opens, overriding a named source's own
		 * navigation.
		 *
		 * An entity source knows where its rows live and navigates itself, and
		 * for a source whose detail page belongs to ANOTHER app that is right:
		 * `tasks` sends a click to openregister's task page, because pushing
		 * on this app's router could not reach it.
		 *
		 * It is wrong for an app that HAS its own page for those rows. Dossiq
		 * keeps a task detail page on purpose, so its handlers see a task in
		 * dossiq's vocabulary beside the case it belongs to. Without this prop
		 * adopting `entitySource: "tasks"` would send every click out of the
		 * app, and the `row-click` event cannot recover it: `openRow` calls
		 * `window.location.assign()`, so a host's push never lands.
		 *
		 * Set it and the row pushes `{ name: rowRoute, params: { id } }` on
		 * this app's router instead. Leave it unset and the source's own
		 * navigation is unchanged, which is what every current consumer gets.
		 */
		rowRoute: { type: String, default: '' },

		/**
		 * Config handed to the named source's loader (e.g. `{ app: 'dossiq' }`).
		 */
		sourceConfig: { type: Object, default: null },

		/** Pagination state: { page, pages, total, limit } */
		pagination: {
			type: Object,
			default: null,
		},

		/** Whether data is loading */
		loading: {
			type: Boolean,
			default: false,
		},

		/** Whether rows/cards can be selected */
		selectable: {
			type: Boolean,
			default: true,
		},

		/**
		 * Draw the table without its column-header row (manifest
		 * `config.hideTableHeader`), for a list the board draws as plain rows
		 * (DqTeamwachtrij). Pair it with `selectable: false` for no checkboxes.
		 */
		hideTableHeader: {
			type: Boolean,
			default: false,
		},

		/**
		 * When true, a row/card click emits `row-click` (to open/navigate) even
		 * while `selectable` — selection then happens via the checkbox only.
		 * Manifest-driven index pages set this when a matching detail page
		 * exists, so clicking a row opens its detail. Default false preserves
		 * the legacy select-on-click behaviour.
		 *
		 * @type {boolean}
		 */
		rowClickToView: {
			type: Boolean,
			default: false,
		},

		/**
		 * The page's `splitView` declaration: `{ enabled, breakpoint, paneWidth }`.
		 * With `enabled`, opening a row renders it beside the list in the
		 * `#split-pane` slot instead of navigating away, and the list keeps its
		 * scroll position, its selection and its loaded page. Omit it and the
		 * page renders exactly as it does today.
		 *
		 * @type {{ enabled?: boolean, breakpoint?: number, paneWidth?: string }}
		 */
		splitView: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The record the split pane is showing, taken from the split address.
		 * Empty closes the pane. Ignored unless `splitView.enabled`.
		 *
		 * @type {string}
		 */
		splitId: {
			type: String,
			default: '',
		},

		/**
		 * Route name the pane's close button returns to. Defaults to the
		 * current route's own list address when omitted.
		 *
		 * @type {string}
		 */
		splitCloseRoute: {
			type: String,
			default: '',
		},

		/**
		 * Whether the pane draws its own close link. Set false when the
		 * `#split-pane` slot draws one from the slot's `close`.
		 *
		 * @type {boolean}
		 */
		splitCloseButton: {
			type: Boolean,
			default: true,
		},

		/**
		 * Accessible name and tooltip for the pane's close button.
		 *
		 * @type {string}
		 */
		splitCloseLabel: {
			type: String,
			default: '',
		},

		/**
		 * Lets this person order and pin the table columns from the sidebar's
		 * Columns tab, and keeps the visible columns, their order and the pinned
		 * count per user and per list in their Nextcloud preferences. `false`
		 * keeps show and hide only, stored nowhere (for a page whose column set is
		 * a contract, such as an export preview).
		 *
		 * @type {boolean}
		 */
		personalColumns: {
			type: Boolean,
			default: true,
		},

		/**
		 * Lets this person drag the rows into an order of their own, held
		 * against them and this list and never written onto the records. The
		 * order stands down while a sort is active, because a sort the person
		 * just chose is them asking for a different order.
		 *
		 * @type {boolean}
		 */
		manualOrder: {
			type: Boolean,
			default: false,
		},

		/**
		 * Stable id this list's manual order is held under. Defaults to the
		 * object type or the schema, so two lists of one schema on different
		 * pages share an order only when the host says they should.
		 *
		 * @type {string}
		 */
		manualOrderId: {
			type: String,
			default: '',
		},

		/** Currently selected IDs */
		selectedIds: {
			type: Array,
			default: () => [],
		},

		/**
		 * View mode: 'table', 'cards', 'list', 'map', 'board', 'dateAxis' or 'calendar'.
		 * Default 'table'. List is opted in via `availableViewModes`; map via
		 * `mapConfig` / `config.viewModes`; board and dateAxis via
		 * `config.viewModes` and their own config blocks.
		 */
		viewMode: {
			type: String,
			default: 'table',
			validator: (v) => ['table', 'cards', 'list', 'map', 'board', 'dateAxis', 'calendar'].includes(v),
		},

		/**
		 * Marker geometry mapping for the opt-in `map` view mode, mirroring the
		 * manifest `config.map` block 1:1. When non-empty (and not excluded by an
		 * explicit `config.viewModes`), a third "Map" segment appears in the view
		 * toggle and the current filtered rows are plotted on a CnMapWidget.
		 *
		 * - `latField` / `lngField` — object (or `@self`) property paths holding the
		 *   marker's latitude / longitude. Dotted paths are supported (e.g.
		 *   `@self.geo.lat`).
		 * - `geoField` — alternative single property holding a GeoJSON Point
		 *   geometry (`{ type: 'Point', coordinates: [lng, lat] }`); takes
		 *   precedence over lat/lngField when present and resolvable.
		 * - `popupField` — object property rendered in the marker popup.
		 * - `center` — optional `[lat, lng]` fallback centre when the filtered set
		 *   has no plottable rows.
		 * - `zoom` — the map's initial zoom level.
		 * - `list` — a numbered list beside the map, map and list in one card
		 *   (DqZakenKaart): `{ title, sub?, pills?: [{ path?, text?, map?,
		 *   colorMap? }], due? }`, field templates read per row. The pins carry the
		 *   list's numbers, the row under the pointer is marked on both, the rows
		 *   without a place are counted under the list with a link to the table,
		 *   and the page's count line adds how many are on the map.
		 *
		 * @type {{ latField?: string, lngField?: string, geoField?: string, popupField?: string, center?: [number, number], zoom?: number, list?: object }}
		 */
		mapConfig: {
			type: Object,
			default: () => ({}),
		},

		/** Label for the map view-toggle segment (defaults to "Map"). */
		mapLabel: {
			type: String,
			default: '',
		},

		/** MDI icon name for the map view-toggle segment (defaults to the built-in map-marker icon). */
		mapIcon: {
			type: String,
			default: '',
		},

		/**
		 * Explicit whitelist of view-toggle segments to offer, e.g.
		 * `['table', 'cards', 'map']`. Fed from the manifest as
		 * `pages[].config.viewModes`. When set it takes precedence over the
		 * inferred availability (map otherwise appears iff `mapConfig` is
		 * non-empty). Cards/table always render regardless of this list.
		 *
		 * @type {Array<'table' | 'cards' | 'list' | 'map' | 'board' | 'dateAxis' | 'calendar'>}
		 */
		viewModes: {
			type: Array,
			default: null,
		},

		/**
		 * Board look: the segments the view switch draws, e.g. `['table',
		 * 'cards', 'board', 'map']` as the boards do. A listed mode the page
		 * can open is an ordinary segment; one it cannot (no board columns, no
		 * map configured) is drawn disabled, named "<mode>: not available on
		 * this list". Fed from `pages[].config.viewSwitch`. Ignored without the
		 * board look; absent, the board look draws all four.
		 *
		 * @type {Array<'table' | 'cards' | 'board' | 'map'>}
		 * @spec openspec/changes/screens-view-switch-parity/specs/view-switch-board-look/spec.md#requirement-the-manifest-can-draw-segments-the-page-cannot-open
		 */
		viewSwitch: {
			type: Array,
			default: null,
		},

		/**
		 * Board look: view switch segments that open another PAGE, by mode
		 * (`table`, `cards`, `board`, `map`): `{ board: { route: 'CaseBoard',
		 * params?, query? } }` or `{ map: { href: '/apps/x/map' } }`. The
		 * segment sits in its place in the switch as a link, for a board or a
		 * map that is a page of its own. A mode this page opens in place stays
		 * a button. Fed from `pages[].config.viewSwitchLinks`. Ignored without
		 * the board look.
		 *
		 * @type {{[mode: string]: {route?: string, params?: object, query?: object, href?: string}}}
		 * @spec openspec/changes/screens-view-switch-links/specs/view-switch/spec.md#requirement-a-view-switch-segment-can-open-another-page
		 */
		viewSwitchLinks: {
			type: Object,
			default: null,
		},

		/**
		 * The board's configuration, mirroring the manifest `config.board`
		 * block: `{ statusField, cardFields, swimlaneField }`. The board is
		 * offered only when this names a `statusField` AND `viewModes` lists
		 * `board`: a segment that opens a board saying it cannot be one is
		 * worse than no segment.
		 *
		 * @type {object}
		 */
		board: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The date axis's configuration, mirroring the manifest
		 * `config.dateAxis` block: `{ startField, endField, laneField,
		 * labelField }`. Offered only when both date fields are named.
		 *
		 * @type {object}
		 */
		dateAxis: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The calendar's configuration, mirroring the manifest
		 * `config.calendar` block: `{ dateField, endDateField?, titleField? }`.
		 * Offered only when `dateField` is named and `viewModes` lists
		 * `calendar`. Only the visible month is fetched.
		 *
		 * @type {{dateField?: string, endDateField?: string, titleField?: string}}
		 */
		calendar: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The host's transition, handed to the board. Absent, the board is
		 * read-only: it never writes the status field itself, so with no
		 * transition there is nothing it can do.
		 *
		 * @type {((move: { card: object, toKey: string }) => Promise<object>)|null}
		 */
		runTransition: {
			type: Function,
			default: null,
		},

		/**
		 * Which view-mode toggle segments to expose (cards/table/list), in order.
		 * Defaults to the historical Cards/Table pair; include `'list'` to offer the
		 * list view. Fed from the manifest as `pages[].config.availableViewModes`.
		 * Map is added separately via `mapConfig` / `viewModes`.
		 *
		 * @type {Array<'cards' | 'table' | 'list' | 'map' | 'board' | 'dateAxis' | 'calendar'>}
		 */
		availableViewModes: {
			type: Array,
			default: () => ['cards', 'table'],
			validator: (modes) => modes.every((m) => ['cards', 'table', 'list', 'map', 'board', 'dateAxis', 'calendar'].includes(m)),
		},

		/** Current sort key */
		sortKey: {
			type: String,
			default: null,
		},

		/** Current sort order */
		sortOrder: {
			type: String,
			default: 'asc',
		},

		/**
		 * Ordered multi-column sort state (host-controlled / non-self-fetch
		 * mode): `[{ key, order }, ...]`, mirroring the `sortKey`/`sortOrder`
		 * pair but for more than one active key. Ignored in self-fetch mode
		 * (register + schema), which manages its own multi-sort state via
		 * `useSelfFetchList`/`useListView` and persists it in the route query.
		 *
		 * @type {Array<{key: string, order: 'asc'|'desc'}>}
		 */
		sortKeys: {
			type: Array,
			default: () => [],
		},

		/**
		 * Optional declarative DEFAULT multi-key client-side sort, applied to the
		 * already-loaded rows whenever no explicit column sort is active (no
		 * `sortKey` selected by the user / passed in). Each entry is
		 * `{ field, order }` with `order` one of `'asc'` / `'desc'` (default
		 * `'asc'`); rows are compared by the first field, ties broken by the
		 * next, and so on. Comparison is type-aware (numbers numerically, dates
		 * by timestamp, strings via `localeCompare`). Clicking a sortable header
		 * takes over and suppresses this default. Useful for a fixed presentation
		 * order such as "group by type, then name".
		 *
		 * @type {Array<{field: string, order?: 'asc'|'desc'}>}
		 */
		defaultSort: {
			type: Array,
			default: () => [],
		},

		/** Unique row identifier property */
		rowKey: {
			type: String,
			default: 'id',
		},

		/**
		 * Optional leading icon for every table row — a static MDI icon name or
		 * a `(row) => iconName` function. Forwarded to CnDataTable. Fed from the
		 * manifest as `pages[].config.rowIcon`. Unset = no icon column.
		 *
		 * @type {string | ((row: object) => string) | null}
		 */
		rowIcon: {
			type: [String, Function],
			default: null,
		},

		/** Columns to exclude in schema mode */
		excludeColumns: {
			type: Array,
			default: () => [],
		},

		/** Columns to include in schema mode (whitelist) */
		includeColumns: {
			type: Array,
			default: null,
		},

		/** Per-column overrides in schema mode */
		columnOverrides: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Row action definitions, merged with the built-in View / Edit / Copy / Delete.
		 * Objects are app actions.
		 * A `"builtin:view"`, `"builtin:edit"`, `"builtin:copy"` or `"builtin:delete"` string places that built-in at its position when its `show*Action` toggle is on; enabled built-ins not placed are appended in that order.
		 */
		actions: {
			type: Array,
			default: () => [],
		},

		/**
		 * Text shown when no items found. The default is the library's own
		 * string, so it reads in the user's language; a page's own text goes
		 * through the app's translate function.
		 */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No items found'),
		},

		/**
		 * Personal-lens report of the list on screen, for a host that fetches
		 * itself: the response's `@self.lenses` (`{ recent: { available,
		 * reason } }`). In self-fetch mode the page reads it from the store
		 * and this prop is ignored. When a lens reports `available: false`
		 * the empty state explains why instead of showing `emptyText`.
		 *
		 * @type {object|null}
		 * @spec openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-an-unavailable-lens-explains-its-empty-page
		 */
		lenses: {
			type: Object,
			default: null,
		},

		/**
		 * App wording for an unavailable lens, keyed `<lens>.<reason>`
		 * (`recent.audit-trail-disabled`) or `<reason>`; the specific key
		 * wins, and both win over the library's object-neutral text.
		 *
		 * @type {{[key: string]: string}|null}
		 * @spec openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-an-unavailable-lens-explains-its-empty-page
		 */
		lensReasonTexts: {
			type: Object,
			default: null,
		},

		/**
		 * What to do after a refused search, through the app's translate. The
		 * default explains AND, OR, NOT and quotes.
		 *
		 * @spec openspec/changes/index-search-refusal/specs/index-search-refusal/spec.md#requirement-a-refused-search-is-said-where-it-was-typed
		 */
		searchRefusalHint: {
			type: String,
			default: '',
		},

		/** Accessible label for the loading spinner (NcLoadingIcon aria-label) */
		loadingText: {
			type: String,
			default: 'Loading…',
		},

		/**
		 * Object types whose live changes this list follows (manifest
		 * `config.live`): it subscribes to them through the object store and
		 * reads the list again shortly after a change, so a card a colleague
		 * moved moves here too. Empty (the default) subscribes to nothing.
		 *
		 * @type {Array<string>}
		 */
		live: {
			type: Array,
			default: () => [],
		},

		/**
		 * CSS class(es) for a row: a function `(row) => string`, or (manifest
		 * `config.rowClass`) rules `[{ when: { field, op?, value }, class }]`,
		 * each adding its class to a row whose field compares to the value
		 * (the `visibleWhen` operators, `@today` included). DqTaken marks an
		 * overdue task: `{ when: { field: "dueAt", op: "lt", value: "@today" },
		 * class: "cn-row--overdue" }`.
		 *
		 * @type {((row: object) => string)|Array<{when: {field: string, op?: string, value: unknown}, class: string}>|null}
		 */
		rowClass: {
			type: [Function, Array],
			default: null,
		},

		/** Override label for the Add button. Defaults to "Add {schema.title}" */
		addLabel: {
			type: String,
			default: '',
		},

		/** How many action buttons to show inline (rest go in overflow dropdown) */
		inlineActionCount: {
			type: Number,
			default: 0,
		},

		/** Whether to show the built-in mass Import action */
		showMassImport: {
			type: Boolean,
			default: true,
		},

		/** Whether to show the built-in mass Export action */
		showMassExport: {
			type: Boolean,
			default: true,
		},

		/**
		 * Copy settings from the manifest's `config.copy`. `include` lists the link
		 * kinds a copy may take along (`relationRows`, `incoming`, `files`); the copy
		 * dialogs then list them, ticked, and the copy is one request to
		 * OpenRegister's copy endpoint. Without it a copy carries the fields only,
		 * as before. A server without the endpoint shows the list read-only.
		 *
		 * @type {{include?: Array<'relationRows'|'incoming'|'files'>}|null}
		 */
		copy: {
			type: Object,
			default: null,
		},

		/** Whether to show the built-in mass Copy button */
		showMassCopy: {
			type: Boolean,
			default: true,
		},

		/** Whether to show the built-in mass Delete button */
		showMassDelete: {
			type: Boolean,
			default: true,
		},

		/**
		 * Opt-in flag for the native Export menu (CSV/Excel) rendered in the
		 * toolbar next to the Add button. Defaults to `false` — an app must
		 * explicitly enable it per page. The menu only renders when this is
		 * `true` AND the resolved schema is flagged `exportable: true`; it
		 * navigates the browser to OpenRegister's export leaf
		 * (`GET /apps/openregister/api/objects/{register}/{schema}/export`),
		 * passing the current route's query params through as filters. This
		 * is distinct from the `showMassExport` mass-action, which exports
		 * only the fetched/selected rows via a blob download.
		 */
		allowExport: {
			type: Boolean,
			default: false,
		},

		/**
		 * Saved views (saved-views-ui). Unset, the sidebar's Views tab is on
		 * for every page with a sidebar and a source a view can be scoped to
		 * (register and schema, `entitySource` or `savedViewsScope`); `false`
		 * turns it off. `true` also forces the sidebar and adds the toolbar
		 * control, where a Views dropdown lists the
		 * current user's OpenRegister saved-search views
		 * (`GET /apps/openregister/api/views`); applying one writes its
		 * stored filters/search/sort into the route query (reusing the
		 * existing deep-link contract — non-underscore keys are filters,
		 * `_search` and `_order` are reserved), "Save current view…"
		 * persists the current route-query state via POST and toasts either
		 * way naming the view (a failure also keeps the dialog open with the
		 * reason), and own views can be deleted after confirmation.
		 */
		allowSavedViews: {
			type: Boolean,
			default: null,
		},

		/**
		 * Which pages share this page's saved views. By default a view is
		 * shared by every page over the same register and schema and by no
		 * other page, because a view is filters over one schema's fields. Set
		 * this to share views across pages over different sources, or to
		 * keep two pages over the same source apart. Written into the saved
		 * view's `query.scope`; views saved before scoping stay visible
		 * everywhere.
		 */
		savedViewsScope: {
			type: String,
			default: '',
		},

		/**
		 * Views the app ships for this page (`config.defaultSavedViews`), each
		 * `{ slug, name, filters, search?, sort?, label? }`. Listed read-only
		 * above the user's own saved views, never stored; a user may apply one
		 * or save a copy. `@`-tokens in `filters` resolve when it is applied.
		 */
		defaultSavedViews: {
			type: Array,
			default: () => [],
		},

		/** Property name used to display item names in dialogs */
		massActionNameField: {
			type: String,
			default: 'title',
		},

		/** Optional function to format item names in dialogs. Receives the item, returns a string. Overrides massActionNameField when provided. */
		nameFormatter: {
			type: Function,
			default: null,
		},

		/** Available export formats for the export dialog */
		exportFormats: {
			type: Array,
			default: () => [
				{ id: 'excel', label: 'Excel (.xlsx)' },
				{ id: 'csv', label: 'CSV (.csv)' },
			],
		},

		/** Import option definitions for the import dialog */
		importOptions: {
			type: Array,
			default: () => [],
		},

		/** Whether to show the built-in form dialog for Add/Edit */
		showFormDialog: {
			type: Boolean,
			default: true,
		},

		/**
		 * Registry key of a `kind: 'modal'` entry that Add (and `?action=create`)
		 * opens instead of the built-in form dialog. Edits keep the form dialog.
		 */
		createModal: {
			type: String,
			default: '',
		},

		/** Use CnAdvancedFormDialog (properties table, JSON tab, optional metadata) instead of CnFormDialog for Add/Edit */
		useAdvancedFormDialog: {
			type: Boolean,
			default: false,
		},

		/**
		 * NcDialog size for the built-in Add/Edit form dialog.
		 *
		 * The dialog itself has taken a `size` since it shipped, but this page
		 * never passed one, so an index page's Add form was stuck at `normal`
		 * however many properties its schema declared. A manifest-declared
		 * `open-form` header action, which reaches CnFormDialog through
		 * CnActionButtons, could already ask for `large` — which is why the
		 * same app could have a roomy create form on a detail page and a
		 * cramped one on its index.
		 */
		formSize: {
			type: String,
			default: 'normal',
		},

		/**
		 * How many columns the built-in Add/Edit form flows its fields into.
		 *
		 * Pair `2` with `formSize: 'large'`, or the two columns are merely two
		 * narrow ones. Worth it once the schema asks more questions than fit on
		 * a screen; below 700px CnFormDialog collapses back to one column on
		 * its own, so this is safe on a narrow viewport.
		 */
		formColumns: {
			type: Number,
			default: 1,
			validator: (value) => value === 1 || value === 2,
		},

		/**
		 * Seed values for the built-in create dialog. Never applied on edit:
		 * both dialogs consult `initialData` / `initialValues` only when there
		 * is no item. Values resolve `@me` / `@now` / `@today` at any depth;
		 * `@object.*` / `@workspace.*` / `@config.*` need a context this page
		 * does not carry, so they pass through unresolved.
		 *
		 * @type {object|null}
		 */
		createDefaults: {
			type: Object,
			default: null,
		},

		/**
		 * Where to go after a successful create from the built-in Add dialog.
		 * A route name, or `{ name, paramField?, objectParam? }`; the created
		 * object's id is merged into the params. Empty stays on the list.
		 *
		 * @type {string|object|null}
		 */
		createSuccessRoute: {
			type: [String, Object],
			default: null,
		},

		/**
		 * Toast shown after a successful create from the built-in Add dialog,
		 * run through the host `cnTranslate`. Empty shows none.
		 *
		 * @type {string}
		 */
		createSuccessMessage: {
			type: String,
			default: '',
		},

		/**
		 * Opt-in async create hook. When provided, a **create** (not edit)
		 * confirmed from the built-in form dialog calls
		 * `await createOverride(formData, ctx)` INSTEAD of persisting via the
		 * store / self-store `saveObject`. The override owns persistence
		 * (e.g. an app posting through a contact-aware endpoint that fills a
		 * required FK before saving to OpenRegister) and MUST return the
		 * created object (a truthy value) on success; return a falsy value to
		 * signal failure. The returned object is used as the created result
		 * (`@create` payload + dialog success). Throwing rejects with the
		 * error surfaced in the form dialog. Edits are never routed here.
		 *
		 * `ctx` carries `{ register, schema, objectType, effectiveSchema }`
		 * so a single handler can branch per schema.
		 *
		 * When absent, create behaviour is unchanged (store / self-store save).
		 *
		 * @type {((formData: object, ctx: { register: string, schema: (object|string), objectType: string, effectiveSchema: object }) => Promise<object>)|null}
		 */
		createOverride: {
			type: Function,
			default: null,
		},

		/**
		 * Whether to add a View action to row actions. The action emits a
		 * dedicated `view` event — independent of `row-click`. Bind `@view`
		 * to handle "open detail" and `@row-click` to handle row click
		 * (selection, expand, etc.); they may share a handler when the app
		 * wants click-to-view, but they are conceptually distinct.
		 *
		 * On a named `entitySource` page the effective default is FALSE: the
		 * source's own open action navigates to the detail page, which is the
		 * view. Passing the prop explicitly still wins.
		 */
		showViewAction: {
			type: Boolean,
			default: true,
		},

		/**
		 * Where the View row action points, as `(row) => location | null`.
		 * When it returns a location, View renders as a link to it (middle
		 * click, copy link) and does not emit `view`; when it returns null,
		 * View stays a button that emits `view`. CnPageRenderer sets it to
		 * where a row click opens.
		 */
		viewTo: {
			type: Function,
			default: null,
		},

		/**
		 * Whether to add an Edit action to row actions.
		 *
		 * On a named `entitySource` page the effective default is FALSE: a
		 * source has no schema, so the form modal this action opens could only
		 * ever render empty — the source declares its own Edit, which
		 * navigates. Passing the prop explicitly still wins.
		 */
		showEditAction: {
			type: Boolean,
			default: true,
		},

		/**
		 * Send the Edit row action to the record's detail page instead of
		 * opening the edit modal, by emitting `edit-open` rather than showing
		 * the form dialog.
		 *
		 * OFF by default, and `CnPageRenderer` no longer derives it: the host
		 * binds `@edit-open` to the same navigation as a row click, so an Edit
		 * that routes is an Edit that does what clicking the row does — the
		 * split pane, or the detail page — while the form it names becomes
		 * unreachable from the list.
		 *
		 * Set it when the modal genuinely cannot express the record and you
		 * accept the duplication: it renders the schema's flat scalars only, so
		 * related rows, sub-resources and tabs stay uneditable there.
		 */
		editOpensDetail: {
			type: Boolean,
			default: false,
		},

		/**
		 * Whether to add a Copy action to row actions.
		 *
		 * On a named `entitySource` page the effective default is whether the
		 * source implements `copyRow` — without it, the copy dialog's confirm
		 * has nowhere to go. Passing the prop explicitly still wins.
		 */
		showCopyAction: {
			type: Boolean,
			default: true,
		},

		/**
		 * Whether to add a Delete action to row actions.
		 *
		 * On a named `entitySource` page the effective default is whether the
		 * source implements `deleteRow` — without it, the delete dialog's
		 * confirm has nowhere to go. Passing the prop explicitly still wins.
		 */
		showDeleteAction: {
			type: Boolean,
			default: true,
		},

		/** Field keys to exclude from the form dialog */
		excludeFields: {
			type: Array,
			default: () => [],
		},

		/** Field keys to include in the form dialog (whitelist mode) */
		includeFields: {
			type: Array,
			default: null,
		},

		/** Per-field overrides passed to CnFormDialog */
		fieldOverrides: {
			type: Object,
			default: () => ({}),
		},

		/** Whether to show the Cards/Table view toggle in the actions bar */
		showViewToggle: {
			type: Boolean,
			default: true,
		},

		/**
		 * Show an inline search field in the actions bar (in addition to / instead
		 * of the sidebar search). Fed from the manifest as `pages[].config.inlineSearch`.
		 */
		inlineSearch: {
			type: Boolean,
			default: false,
		},

		/**
		 * `false` draws no inline search in the actions bar, also in the board
		 * look, which otherwise draws one on every index page. Fed from the
		 * manifest as `pages[].config.search`.
		 */
		search: {
			type: Boolean,
			default: true,
		},

		/**
		 * The app config `@config.<key>` tokens resolve against, in quick-filter
		 * filters and labels (`"Residence @config.municipality"`), as on the
		 * dashboard and detail pages. Merged over a config an ancestor provides
		 * on `cnAppConfig`. Manifest: `config.appConfig`.
		 *
		 * @type {object}
		 */
		appConfig: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Keep the "Showing X of Y" counter visible beside the inline search field,
		 * after any `#after-search` controls (only relevant with `inlineSearch`,
		 * which otherwise takes the counter's place). Fed from the manifest as
		 * `pages[].config.showCountWithSearch`.
		 */
		showCountWithSearch: {
			type: Boolean,
			default: false,
		},

		/** Placeholder for the inline search field (manifest `config.searchPlaceholder`) */
		searchPlaceholder: {
			type: String,
			default: '',
		},

		/**
		 * A search placeholder per view (manifest `config.searchPlaceholderByView`),
		 * `{ table?, cards?, board?, map? }`, through the app's translate: the
		 * board view asks "Zoek op zaak of verzoeker", the map "Filter op zaak of
		 * aanvrager" (DqWerkbord, DqZakenKaart). A view it does not name keeps
		 * `searchPlaceholder`.
		 *
		 * @spec openspec/changes/search-placeholder-per-view/specs/index-page/spec.md#requirement-the-search-placeholder-can-differ-per-view
		 */
		searchPlaceholderByView: {
			type: Object,
			default: null,
		},

		/** Label for the cards view-toggle option (manifest `config.cardsLabel`, e.g. "Tiles") */
		cardsLabel: {
			type: String,
			default: '',
		},

		/** Label for the table view-toggle option (manifest `config.tableLabel`, e.g. "List") */
		tableLabel: {
			type: String,
			default: '',
		},

		/** MDI icon name for the cards view-toggle option (manifest `config.cardsIcon`) */
		cardsIcon: {
			type: String,
			default: '',
		},

		/** MDI icon name for the table view-toggle option (manifest `config.tableIcon`) */
		tableIcon: {
			type: String,
			default: '',
		},

		/** Label for the list view-toggle option (manifest `config.listLabel`, e.g. "Rows") */
		listLabel: {
			type: String,
			default: '',
		},

		/**
		 * Deprecated, without effect: the toolbar draws no sort select. The
		 * table sorts by its column headers, the list, card and map views by
		 * the Sort section in the index sidebar.
		 *
		 * @deprecated
		 */
		showSortSelect: {
			type: Boolean,
			default: false,
		},

		/**
		 * The orders the index sidebar's Sort section offers in the list, card
		 * and map views (manifest `config.sortSelectOptions`): `{ value, label,
		 * order?, default?, source? }`, the order its `order` (an
		 * `orderToSortKeys` form) or its `value` read as one. Without them the
		 * section offers the sortable columns.
		 *
		 * An option may name an endpoint `source` (`{ url, params?, rowsPath?,
		 * rowPath?, carry?, idPath?, annotate?, searchFields?, failedNote? }`)
		 * for an order the server cannot sort by: choosing it lists that
		 * endpoint's rows in their order, and the page's search, sidebar
		 * filters and pager run over them in the browser. `default: true` opens
		 * the page on it unless the address carries an order; a column header
		 * click in the table view leaves it for that column's order. When the
		 * endpoint fails the list falls back to the option's `order` and shows
		 * `failedNote`. `carry` copies entry fields onto each row (a tier a
		 * card's head pill reads); with `annotate` they also reach the rows of
		 * every other order, matched on `idPath` (`id` by default). The option
		 * is chosen by its value (`selectSortOption`), as a saved view's
		 * `sortOption` does.
		 *
		 * @type {Array<{ value: string, label: string, order?: (string|object|Array), default?: boolean, source?: object }>}
		 * @spec openspec/changes/sidebar-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
		 */
		sortSelectOptions: {
			type: Array,
			default: () => [],
		},

		/**
		 * Deprecated, without effect: the toolbar sort select is gone; the
		 * Sort section in the index sidebar shows the current order.
		 *
		 * @deprecated
		 */
		sortSelectValue: {
			type: String,
			default: '',
		},

		/**
		 * The order a self-fetch page opens on when neither the address nor
		 * `sortKeys`/`sortKey` gives one (manifest `config.defaultOrder`):
		 * `"-createdAt"`, `"priority:desc,title"`, an `_order` map or a
		 * `[{ key, order }]` list.
		 *
		 * @type {string|object|Array}
		 */
		defaultOrder: {
			type: [String, Object, Array],
			default: '',
		},

		/** MDI icon name for the list view-toggle option (manifest `config.listIcon`) */
		listIcon: {
			type: String,
			default: '',
		},

		/**
		 * Field mapping for the default list-view rows (CnObjectRow). Overrides
		 * the schema-configuration defaults. Fed from the manifest as
		 * `pages[].config.listConfig`.
		 *
		 * @type {{ titleField?: string, subtitleField?: string, imageField?: string, iconField?: string, iconName?: string, badgeField?: string, badgeVariantField?: string, badgeVariant?: string, badgeColorMap?: object }}
		 */
		listConfig: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Opt-in folder navigation pane (rendered left of the list). Selecting a
		 * folder filters the list by `filterField` (via the self-fetch filter);
		 * "All" clears it. Fed from the manifest as `pages[].config.folderSidebar`.
		 *
		 * - `source` — `'register'` (fetch the folder list from an OpenRegister
		 *   register/schema), `'field'` (distinct values of the current rows'
		 *   `field`), `'custom'` (use `folders`), or `'files'` (NC folders).
		 * - `register` / `schema` — the OR source for `source:'register'`.
		 * - `idField` / `nameField` — which folder object props map to the folder
		 *   id (the filter value) and display name. Dotted paths supported.
		 * - `field` / `filterField` — the row field to group/filter by (filterField
		 *   defaults to `field`).
		 * - `folders` — explicit folder list for `source:'custom'`.
		 * - `allLabel` / `title` / `allowCreate` — passed to CnFolderSidebar.
		 * - `scopeViews` — the view modes the scope's look (columns, title,
		 *   count line and the other scope keys) applies in, e.g. `["table",
		 *   "list"]`; other views keep the page's own look. Default: every view.
		 * - `pane` — `false` draws no pane: the scope still comes from the
		 *   deep-link filter (`?caseType=<id>`) and still applies its look, as
		 *   a list narrowed to one case type does without a folder column.
		 *
		 * A folder entry is also a SCOPE: it may carry `columns`, `defaultSort`
		 * and `searchFields`, and while it is selected the list is shown that
		 * way. `columns` takes the same shapes as the `columns` prop, and the
		 * page's own `columns` still decides which columns this page has, so a
		 * scope naming one the page does not declare is dropped rather than
		 * rendered. A `source: 'register'` folder list reads the same three
		 * keys off each row's `x-index` block, which the folder entry's own
		 * value wins over, key by key.
		 *
		 * A folder entry may also carry `schema` (and optionally `register`,
		 * defaulting to the page's own). While it is selected the page loads that
		 * register and schema instead of its own, with that schema's columns,
		 * fetch and live updates; "All", or a folder without `schema`, restores
		 * the page's own. Switching clears the row selection and closes open
		 * dialogs. A folder without `schema` filters the page's schema as before.
		 *
		 * @type {object}
		 */
		folderSidebar: {
			type: Object,
			default: null,
		},

		/**
		 * KPI tiles above the list (manifest `config.statRow`): dashboard
		 * widget definitions `{ id, type, title?, content }`, usually `stat`,
		 * drawn in an auto-fit row (each at least 200px) in the listed order.
		 * Types resolve like dashboard widgets: the app registry, then the
		 * dashboard catalog. Empty by default.
		 *
		 * @spec openspec/changes/screens-index-stat-row/specs/index-page/spec.md#requirement-an-index-page-can-draw-a-stat-row-above-the-list
		 * @type {Array<object>}
		 */
		statRow: {
			type: Array,
			default: () => [],
		},

		/**
		 * Cards beside the list (manifest `config.sidePanel`): dashboard
		 * widget definitions `{ id, type, title?, content, headerLink? }`
		 * drawn in a 300px column right of the toolbar and the list. Empty
		 * by default; below 1024px the column moves above the list.
		 *
		 * @spec openspec/changes/screens-index-stat-row/specs/index-page/spec.md#requirement-an-index-page-can-draw-a-side-panel-beside-the-list
		 * @type {Array<object>}
		 */
		sidePanel: {
			type: Array,
			default: () => [],
		},

		/**
		 * Cards after the list (manifest `config.afterList`): dashboard widget
		 * definitions `{ id, type, title?, content, headerLink? }` stacked
		 * under the list in the listed order, the counterpart of `statRow`
		 * above it. A query preset or a scope can set its own.
		 *
		 * @spec openspec/changes/index-scope-presentation/specs/index-page/spec.md#requirement-an-index-page-can-draw-widgets-after-its-list
		 * @type {Array<object>}
		 */
		afterList: {
			type: Array,
			default: () => [],
		},

		/**
		 * The route query pairs that chose this page's query preset, set by
		 * CnPageRenderer. They scope the list, so they show no removable
		 * active-filter chip.
		 *
		 * @spec openspec/changes/index-scope-presentation/specs/index-page/spec.md#requirement-the-query-that-chose-a-preset-is-not-a-removable-filter
		 * @type {object|null}
		 */
		fixedFilters: {
			type: Object,
			default: null,
		},

		/**
		 * Filters the list opens with (manifest `config.defaultFilters`), as
		 * `{ field: value | [values] }`: applied when the address names no
		 * filter and no saved view, shown on the Active line and removed with
		 * their chip or "Clear all" like any other filter. An address that
		 * names a filter wins (DqContracten "Status: actief en verlopend").
		 *
		 * @spec openspec/changes/index-default-filters/specs/index-page/spec.md#requirement-an-index-page-can-open-with-removable-default-filters
		 * @type {object|null}
		 */
		defaultFilters: {
			type: Object,
			default: null,
		},

		/**
		 * Where a row carries the actions the server says this caller may run
		 * on it: a dotted path, read off the rows the list already fetched, so
		 * ninety rows cost one request rather than ninety.
		 *
		 * A row's menu is then the INTERSECTION of what this page declares and
		 * what the server allows. An action the server allows but this page has
		 * stopped declaring stays out, so a row cannot bring back a button the
		 * page removed. An action the page declares but the server refuses
		 * stays out too, and its reason is available from
		 * `rowActionRefusal(row, action)`.
		 *
		 * An action matches by its id. The built-in View, Edit, Copy and Delete
		 * also match OpenRegister's permission verbs: `read` permits View and
		 * Copy, `update` permits Edit, `delete` permits Delete.
		 *
		 * A row carrying nothing at this path is a server that does not answer
		 * about actions, and the page's declaration stands unchanged.
		 *
		 * @type {string}
		 */
		rowActionField: {
			type: String,
			default: DEFAULT_ROW_ACTION_FIELD,
		},

		/**
		 * State indicators this page declares for its rows, handed straight to
		 * CnDataTable. Each entry is `{ id, field, equals?, in?, icon, text,
		 * tooltip? }`. The page declares which indicators exist; a record
		 * cannot add one the page has not declared. A page declaring none
		 * renders its rows as before. Fed from the manifest as
		 * `pages[].config.rowIndicators`.
		 *
		 * @type {Array<object>}
		 */
		rowIndicators: {
			type: Array,
			default: () => [],
		},

		/**
		 * How many declared indicators render on the row itself before the
		 * rest move into the row menu. Fed from the manifest as
		 * `pages[].config.rowIndicatorCap`.
		 *
		 * @type {number}
		 */
		rowIndicatorCap: {
			type: Number,
			default: DEFAULT_ROW_INDICATOR_CAP,
		},

		/**
		 * The fields a quick edit asks for, opened from a row without leaving
		 * the list. Empty means no quick edit. The page names the fields; a
		 * record cannot open a form on one the page did not name. Fed from the
		 * manifest as `pages[].config.quickEditFields`.
		 *
		 * @type {string[]}
		 */
		quickEditFields: {
			type: Array,
			default: () => [],
		},

		/**
		 * Where a record lists the fields this caller may write. A field the
		 * page named that is not in that list renders read-only rather than
		 * missing, so a person sees the value and learns it is not theirs to
		 * change. A row carrying nothing there leaves every named field
		 * editable.
		 *
		 * @type {string}
		 */
		writableField: {
			type: String,
			default: '@self.writableFields',
		},

		/**
		 * Saved view ids this page renders as tabs instead of as entries in the
		 * views control. A view appears in one place or the other, never both.
		 * An id naming a view that no longer exists produces no tab.
		 *
		 * @type {string[]}
		 */
		viewTabs: {
			type: Array,
			default: () => [],
		},

		/**
		 * Which saved views show how many records they match: `true` for all
		 * of them (tabs and the entries in the views control), or a list of
		 * view ids. Off by default, so no count request is made. A quick
		 * filter opts in on its own entry with `showCount: true`.
		 *
		 * @type {boolean|string[]}
		 */
		viewCounts: {
			type: [Boolean, Array],
			default: false,
		},

		/**
		 * The teams this person may claim. The instance decides this list; it
		 * is the membership side of `claimedTeams`.
		 *
		 * @type {Array<string|object>}
		 */
		offeredTeams: {
			type: Array,
			default: () => [],
		},

		/**
		 * The teams this person stored as claimed, read as a personal
		 * preference alongside the others. It is narrowed to `offeredTeams`, so
		 * a team they claimed before it was taken away is passed over rather
		 * than honoured.
		 *
		 * @type {string[]}
		 */
		claimedTeams: {
			type: Array,
			default: () => [],
		},

		/**
		 * The field carrying a record's DERIVED priority, and the order its
		 * values rank in, lowest first. The list reads the value and sorts on
		 * it; it never computes one. A record with no priority sorts after
		 * every ranked one, in both directions, and stays in the list.
		 *
		 * @type {string}
		 */
		priorityField: {
			type: String,
			default: '',
		},

		/**
		 * The priority values in rank order, lowest first, e.g.
		 * `['low', 'medium', 'high']`. A value outside this list is unranked.
		 *
		 * @type {string[]}
		 */
		priorityLevels: {
			type: Array,
			default: () => [],
		},

		/**
		 * Offer the list's keyboard shortcuts. Every one of them is also listed
		 * in the command palette and on the help key, because a shortcut nobody
		 * can find does not count.
		 */
		listShortcuts: {
			type: Boolean,
			default: false,
		},

		/**
		 * Per-column filters in the table header: a filter button on every
		 * column that can filter, opening a small panel that fits the column
		 * (checkboxes, yes/no/any, from and to, a searchable reference list).
		 * On by default; a column opts out with `filterable: false`, a page
		 * with `pages[].config.headerFilters: false`. Filters write into the
		 * same active-filter map as the facet sidebar, so they persist in the
		 * route query and reach the same OpenRegister query parameters.
		 *
		 * @spec openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md#requirement-every-backed-column-filters-from-its-header
		 */
		headerFilters: {
			type: Boolean,
			default: true,
		},

		/**
		 * Show a filter menu (funnel button) in the table header, above the
		 * row-actions column. Its menu lists every enum/badge column's values as
		 * toggleable facet filters — a compact alternative to the facet sidebar.
		 * Under the board look, on a page with no filter sidebar, it is the
		 * toolbar's labelled Filter button instead (row 1, before the view switch).
		 * Fed from the manifest as `pages[].config.filterMenu`.
		 */
		filterMenu: {
			type: Boolean,
			default: false,
		},

		/**
		 * Show a column menu (columns button) in the table header, above the
		 * row-actions column. Its menu lists every governed column as a toggleable
		 * checkbox — a compact, in-table alternative to the sidebar's Columns tab,
		 * so the sidebar space can be reclaimed. Fed from the manifest as
		 * `pages[].config.columnMenu`.
		 */
		columnMenu: {
			type: Boolean,
			default: false,
		},

		/** Whether the refresh action is currently in progress */
		refreshing: {
			type: Boolean,
			default: false,
		},

		/**
		 * Whether to auto-subscribe to live collection updates in self-fetch
		 * mode. Defaults to true. When `register` + `schema` are set (and no
		 * `objects` prop is passed), the page subscribes to the collection's
		 * `or-collection-{register}-{schema}` scope on mount and refetches
		 * (coalesced — events are hints) when an update event arrives; the
		 * subscription is released on unmount. Set `false` (manifest:
		 * `config.subscribe: false`) for static / read-once views. No-op in
		 * consumer-managed mode (an `objects` prop was passed) and on stores
		 * without live-updates support.
		 *
		 * @type {boolean}
		 */
		subscribe: { // eslint-disable-line vue/no-unused-properties -- read by useSelfFetchList.js off the props object, which this rule does not follow.
			type: Boolean,
			default: true,
		},

		/** Whether the refresh action is disabled (e.g. when required selections are missing) */
		refreshDisabled: {
			type: Boolean,
			default: false,
		},

		/** Whether the Add button is disabled (e.g. when required selections are missing) */
		addDisabled: {
			type: Boolean,
			default: false,
		},

		/** Whether to show the Add button in the actions bar */
		showAdd: {
			type: Boolean,
			default: true,
		},

		/**
		 * Store instance for automatic save integration. When provided alongside
		 * objectType, the form dialog saves directly to the store instead of
		 * emitting create/edit events. The object type must already be registered
		 * in the store via registerObjectType() before passing the store here.
		 */
		store: { type: Object, default: null },
		/**
		 * Object type slug for store integration (e.g. `${registerId}-${schemaId}`).
		 * Required when store is set — a console warning is emitted if missing.
		 */
		objectType: { type: String, default: '' },
		/**
		 * Manifest-driven sidebar configuration. When set with
		 * `enabled: true`, CnIndexPage auto-mounts an embedded
		 * CnIndexSidebar wired to the page's schema, search, columns,
		 * and facet props. When unset or `enabled: false`, the
		 * legacy slot-based interface is preserved — consumers
		 * mount their own CnIndexSidebar at the App.vue level.
		 *
		 * Shape:
		 * - `enabled` (boolean) — **existence gate**. Whether the
		 *   page configures an embedded sidebar at all. When `false`
		 *   or unset, the auto-mount path is bypassed (no
		 *   `<CnIndexSidebar>` rendered) and the consumer's slot
		 *   pattern stays active.
		 * - `show` (boolean, default `true`) — **visibility gate**.
		 *   Even when `enabled: true`, `show: false` SUPPRESSES
		 *   rendering for this page so manifest authors can hide
		 *   the sidebar declaratively without removing the config.
		 *   Distinct from `enabled` so config can be retained
		 *   (e.g. for a watcher / responsive layout) while the
		 *   visible surface is hidden.
		 * - `columnGroups` (array) — extra column groups beyond schema + Metadata.
		 * - `facets` (object) — live facet data { fieldName: { values: [...] } }.
		 * - `showMetadata` (boolean) — include the built-in Metadata column group (defaults true).
		 * - `search` (object) — search-related label overrides forwarded to CnIndexSidebar.
		 *
		 * @type {{ enabled: boolean, show?: boolean, columnGroups?: Array, facets?: object, showMetadata?: boolean, search?: object }|null}
		 */
		sidebar: {
			type: Object,
			default: null,
		},

		/** Current search term (forwarded to the embedded sidebar when sidebar.enabled). */
		searchValue: {
			type: String,
			default: '',
		},

		/** Currently visible column keys (forwarded to the embedded sidebar). */
		visibleColumns: {
			type: Array,
			default: null,
		},

		/** Currently active facet filters: { fieldName: [values] } (forwarded to the embedded sidebar). */
		activeFilters: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Effective register slug for the page. Forwarded as a prop to
		 * the resolved card component (when `cardComponent` is set) so
		 * bespoke card UIs can match the schema → register pair.
		 *
		 * Manifest-driven path: `pages[].config.register` flows in via
		 * CnPageRenderer's `v-bind="resolvedProps"` spread.
		 *
		 * @type {string}
		 */
		register: {
			type: String,
			default: '',
		},

		/**
		 * Optional name of a consumer-provided card component (registered
		 * in the `customComponents` registry on `CnAppRoot`) to render in
		 * place of the default `CnObjectCard` when the page is in
		 * card-grid view mode.
		 *
		 * Resolution priority (highest first):
		 *   1. The parent's `#card` scoped slot (always wins).
		 *   2. The component resolved from `cardComponent` against the v2
		 *      `registry` (any kind carrying a `component`), then the legacy
		 *      customComponents map.
		 *   3. The library default (`CnObjectCard`).
		 *
		 * Unknown names log `console.warn` once and fall back to the
		 * default so a misconfigured manifest never blanks the grid.
		 *
		 * @type {string}
		 */
		cardComponent: {
			type: String,
			default: '',
		},

		/**
		 * Name of a custom row component for list view, resolved against the v2
		 * `registry` and then the legacy customComponents map (manifest
		 * `pages[].config.listComponent`).
		 * Same resolution priority as `cardComponent`: the `#list-item` slot
		 * wins, then this component, then the default `CnObjectRow`. Unknown
		 * names warn once and fall back to the default.
		 *
		 * @type {string}
		 */
		listComponent: {
			type: String,
			default: '',
		},

		/**
		 * Optional explicit customComponents registry. When set, this
		 * overrides the registry injected from `CnAppRoot` via
		 * `cnCustomComponents`. Provided primarily so unit tests can
		 * pass a registry without mounting `CnAppRoot`.
		 *
		 * Used by:
		 * - `cardComponent` resolution (REQ-MCI from manifest-card-index)
		 * - `actions[].handler` registry name resolution (REQ-MAD-3 from
		 *   manifest-actions-dispatch — handler funcs called on row-action click)
		 *
		 * @type {object|null}
		 */
		customComponents: {
			type: Object,
			default: null,
		},

		/**
		 * Manifest-driven page-level actions rendered inside the
		 * NcActions overflow dropdown between Refresh and the
		 * `#action-items` slot. Each entry is
		 * `{ id, label, icon?, handler?, route?, disabled? }`. The
		 * `handler` field mirrors the row-level
		 * `actions[].handler` pattern: a function, the keyword
		 * `'navigate'`, `'emit'`, `'none'`, or a string name looked
		 * up in the v2 `registry` (a `kind: 'handler'` entry) and
		 * then in the legacy `customComponents`. The page
		 * dispatches the resolved handler via `onHeaderAction` AND
		 * (unless the handler is the `'none'` keyword) emits
		 * `@header-action({ action: id, id })`.
		 *
		 * An entry with `href` instead renders as a real link and is never
		 * dispatched or emitted: an absolute `http(s)`, `mailto:`, `tel:` or
		 * `//host/...` URL is used as written, an instance path (leading `/`) goes through
		 * `generateUrl()`. `target: '_blank'` opens it in a new tab.
		 *
		 * Reserved ids (those used by built-ins on the bar — `refresh`,
		 * `import`, `export`, `copy`, `delete`) are dropped from the
		 * merged list with a `console.warn`.
		 *
		 * @type {Array<{ id: string, label: string, icon?: string, handler?: string|(() => void), route?: string, href?: string, target?: ('_blank'|'_self'), disabled?: boolean }>}
		 */
		headerActions: {
			type: Array,
			default: () => [],
		},

		/**
		 * Declarative bulk actions for the contextual selection strip.
		 *
		 * The strip has had a `#selection-actions` slot for a while, but a slot
		 * can only be filled by a hand-written host component — so a page
		 * declared in an app manifest could carry row actions and header
		 * actions and never a bulk one. This prop is the missing vocabulary.
		 *
		 * Handler resolution mirrors `headerActions[]`, with one difference
		 * that is the whole point: the handler is called with the SELECTION.
		 * A bulk handler that has to go and find out what was selected is a
		 * bulk handler waiting to disagree with the strip that invoked it.
		 *
		 * Reserved ids (`copy`, `delete`) are dropped with a warning — the
		 * strip already ships those two as built-ins, and a second button with
		 * the same name doing something else is worse than no button.
		 *
		 * @type {Array<{ id: string, label: string, icon?: string, handler?: string|((scope: { actionId: string, selectedIds: Array<string>, count: number }) => void), target?: string, props?: object, disabled?: boolean }>}
		 */
		bulkActions: {
			type: Array,
			default: () => [],
		},

		/**
		 * Active organisation entity (multi-tenancy-context). When
		 * bound from a tenant-switcher higher in the tree, CnIndexPage
		 * watches it and calls `store.setActiveTenantOrganisation(uuid)`
		 * so the next fetchCollection() stamps the new tenant header
		 * and the in-memory caches are cleared. When the prop is unset
		 * the legacy single-tenant behaviour is preserved exactly.
		 *
		 * @type {object|null}
		 */
		activeOrganisation: {
			type: Object,
			default: null,
		},

		/**
		 * When set, adds a Documentation entry to the Actions overflow
		 * (after Refresh). Opens the URL in a new tab. Empty hides it.
		 */
		documentationUrl: {
			type: String,
			default: '',
		},

		/** Label for the Documentation overflow entry. */
		documentationLabel: {
			type: String,
			default: '',
		},
	},

	emits: [
		'action',
		'add',
		'apply-view',
		'board-move',
		'board-column-field-change',
		'bulk-action',
		'clear-filters',
		'columns-change',
		'quick-edit-save',
		'configure',
		'content-search',
		'copy',
		'create',
		'delete',
		'edit-open',
		'filter-change',
		'folder-change',
		'folder-create',
		'header-action',
		'mass-copy',
		'open-modal',
		'mass-delete',
		'mass-export',
		'mass-import',
		'page-changed',
		'page-size-changed',
		'quick-filter-change',
		'refresh',
		'row-click',
		'row-aux-click',
		'search',
		'select',
		'sort',
		'sort-change',
		'view',
		'view-mode-change',
		'view-overrides',
		'split-close',
		'split-saved',
		'manual-order-change',
	],

	setup(props) {
		// The look this page is drawn in: its own `look` prop, else the
		// `cnLook` CnAppRoot (or the page renderer) provides.
		const { isBoard: isBoardLook, lookClass } = useLook(props)

		const {
			isOpen: contextMenuOpen,
			targetItem: contextMenuRow,
			open: openContextMenu,
			close: closeContextMenu,
		} = useContextMenu()

		// The selected folder's own `{ schema, register? }`, or null. Written by
		// onFolderSelect(); useSelfFetchList turns it into the loaded object type.
		const activeFolderSchema = ref(null)

		const {
			isSelfFetch,
			list,
			selfObjectStore,
			selfObjectType,
			activeQuickFilterIndex,
			selectedQuickFilterIndices,
			contentSearch,
			selfFetchTokenCtx,
			initialQueryFilterKeys,
		} = useSelfFetchList(props, getCurrentInstance(), inject, { activeFolderSchema })

		// The sidebar's chosen values on a NAMED-SOURCE page. Self-fetch keeps
		// its own in `useSelfFetchList`; a named source had nowhere to put
		// them, so `activeFilters` was a prop only a consumer could fill and a
		// manifest page's sidebar rendered controls that narrowed nothing.
		//
		// Seeded from the route query so a shared link lands filtered, the
		// same way `_order` and a deep-link filter already do for self-fetch.
		// The page a paging named source shows: page 1 at the source config's
		// `limit` (20 by default), moved by the pager.
		const namedPageSize = Number(props.sourceConfig && props.sourceConfig.limit) > 0 ? Number(props.sourceConfig.limit) : 20
		const namedPaging = ref({ page: 1, limit: namedPageSize })
		const namedActiveFilters = ref(namedFiltersWithDefaults(getCurrentInstance(), props))
		// The search term on a named source that searches (`searchParam`).
		const namedSearchTerm = ref('')

		const {
			isNamedSource,
			namedSource,
			namedRows,
			namedLoading,
			namedQuickFilters,
		} = useNamedSource(props, { activeQuickFilterIndex, activeFilters: namedActiveFilters, paging: namedPaging, searchTerm: namedSearchTerm })

		return {
			isBoard: isBoardLook,
			isBoardLook,
			lookClass,
			isNamedSource,
			namedSource,
			namedRows,
			namedLoading,
			namedQuickFilters,
			namedActiveFilters,
			namedPaging,
			namedSearchTerm,
			contextMenuOpen,
			contextMenuRow,
			openContextMenu,
			closeContextMenu,
			isSelfFetch,
			list,
			selfObjectStore,
			selfObjectType,
			activeQuickFilterIndex,
			selectedQuickFilterIndices,
			contentSearch,
			activeFolderSchema,
			selfFetchTokenCtx,
			initialQueryFilterKeys,
		}
	},

	data() {
		return {
			/** The order a named source that `sortsRows` shows its rows in. */
			namedSort: { key: '', order: 'asc' },
			/**
			 * The chosen sort option that names an endpoint `source`, its rows,
			 * their state ('idle' | 'loading' | 'ready' | 'failed') and the page
			 * shown. The value is '' while an ordinary order is chosen.
			 */
			sortSource: { value: '', rows: [], state: 'idle', page: 1 },
			currentViewMode: this.viewMode,
			/** Whether `?_view=` names a mode the page did not offer yet, to open once it does. */
			routeViewPending: false,
			/** The column field the reader picked in the board's column switch; '' = the default. */
			boardColumnFieldChoice: '',
			/** The rows a reference column field is built from, by field. */
			boardRefs: {},
			liveHandles: [],
			liveTimer: null,
			liveUnwatch: null,
			/** The options of the board's narrowing select (`board.narrow`). */
			boardNarrowOptions: [],
			/** The menu entries CnActionButtons reports for the dialog header actions, each with its `run()`. */
			dialogHeaderRuns: [],
			/** The visible calendar window `{ rangeStart, rangeEnd }` (ISO dates), or null outside calendar mode. */
			calendarRange: null,
			/** The page size to restore when leaving calendar mode. */
			calendarPrevPageSize: null,
			// The table's page size while the board view holds the list at
			// BOARD_PAGE_SIZE; restored on leaving the board.
			boardPrevPageSize: this.viewMode === 'board' ? ((this.pagination && this.pagination.limit) || 20) : null,
			/** Resolved labels of reference columns: `{ [columnKey]: { [id]: label|null } }`. */
			refLabels: {},
			/** Colour and icon names of the records badge columns point at: `{ [columnKey]: { [id]: { color, icon } } }`. */
			refLooks: {},
			/** Count per tab-strip index, for the entries that asked for one; null = none. */
			tabCounts: null,
			// The counts of the `filterStrip` pills, by pill key ('all', 'v0', ...).
			filterStripCounts: null,
			/** The `countFrom` counts of the manifest page tabs, by index. */
			pageTabCounts: {},
			/** The `headerMetaCounts` totals, by name; a failed one is null. */
			headerMetaCountValues: {},
			/** The row the pointer is on in the map list, by key; '' for none. */
			activeMapKey: '',
			/** The rows `mapConfig.markerColor.source` points at, or null before they load. */
			mapColorRefs: null,
			/** The page size to restore when leaving a map that plots every row. */
			mapPrevPageSize: this.viewMode === 'map' && mapPlotAllLimitOf(this.mapConfig) > 0 ? ((this.pagination && this.pagination.limit) || 20) : null,
			/** The tabs `quickFiltersFrom` produced, or null before they load. */
			generatedQuickFilters: null,
			/** Count per saved-view id, for the views control; null = none. */
			savedViewCounts: null,
			// The id (or slug) of the saved view that is applied; its chip shows selected under the board look.
			appliedSavedViewId: '',
			// The sort option the applied view's `overrides.sortOption` selected, so leaving the view can undo it.
			viewSortOption: '',
			// The applied view's filters as one comparable key, so the address keeps naming the view until they change.
			appliedViewFiltersKey: '',
			/**
			 * The non-`_` query keys this page owns, i.e. may clear on the next
			 * persist. Seeded with what it adopted from the query on load, and
			 * replaced by what it writes; a key it never claimed is somebody
			 * else's and is left in the address bar untouched.
			 *
			 * @type {Array<string>}
			 */
			persistedFilterKeys: [...(this.initialQueryFilterKeys || [])],
			internalSelectedIds: [...this.selectedIds],
			// Rows seen in a collectionUrl list, so a selection kept across pages still resolves its own pair.
			collectionRowsById: markRaw(new Map()),
			// Folder-sidebar state: selected folder id + the register-fetched list.
			selectedFolderId: null,
			/**
			 * The grouping field's facet as last seen with NO folder selected:
			 * the whole set of folders, kept on screen while one is selected.
			 *
			 * @type {Array<object>}
			 */
			folderSidebarAllValues: [],
			folderRegisterList: [],
			/** The Nextcloud groups a `folderSidebar.source: 'groups'` pane lists. */
			folderGroupList: [],
			// `x-index` blocks read off the schema rows a `source: 'register'`
			// folder list was built from, keyed by folder id. The layout a case
			// type carries travels with the record rather than being restated
			// in every manifest that lists it.
			folderRowLayouts: {},
			/** The row the keyboard is on, or -1. */
			focusedRowIndex: -1,
			// The row the context menu shows: set on open, never cleared on close, so a closing menu keeps its entries and a late close cannot null a reopened one.
			contextMenuShownRow: null,
			/** The row a quick edit is open on, or null. */
			quickEditRow: null,
			/** The row as the server holds it, after a stale save. */
			quickEditServerRow: null,
			/** Whether the shortcut help sheet is open. */
			showShortcutHelp: false,
			// Mass action dialogs
			showMassDeleteDialog: false,
			showMassCopyDialog: false,
			showExportDialog: false,
			showImportDialog: false,
			// Single-object dialogs
			showSingleDeleteDialog: false,
			showSingleCopyDialog: false,
			showFormDialogVisible: false,
			// Dialog targets
			actionTargetItem: null,
			editItem: null,
			// The pair and schema of a row edited outside the page's own pair (collectionUrl).
			rowFormTarget: null,
			rowFormSchema: null,
			// Drives the Actions-menu Refresh spinner during a self-fetch
			// refresh, where the host has no promise to bind `:refreshing` to.
			internalRefreshing: false,
			// Search/Columns sidebar open state. Defaults closed so the page
			// content (table / cards) starts at the top and fills the width;
			// opened on demand via the actions-bar toggle.
			sidebarOpen: false,
			/** The sidebar tab to show; follows the user's own tab changes. */
			sidebarActiveTab: '',
			// Saved views (saved-views-ui): the fetched view list, its
			// loading flag, the save-dialog toggle, and the view awaiting
			// delete confirmation.
			savedViews: [],
			savedViewsLoading: false,
			showSaveViewDialog: false,
			viewPendingDelete: null,
			/** The own view whose audience is being changed (CnSavedViewShareDialog), or null. */
			viewPendingShare: null,
			/** The own view being renamed or re-filtered (CnSavedViewEditDialog), or null. */
			viewPendingEdit: null,
			/** The view whose presentation is being changed (CnSavedViewPresentationDialog), or null. */
			viewPendingPresentation: null,
			// Split view (case-page-and-list-as-a-place). `splitRowPatches` holds
			// records saved in the pane, keyed by row id, so a save lands on the
			// row without refetching the page and losing the scroll position.
			// `splitViewportWidth` is measured rather than guessed, so the narrow
			// fallback follows a window resize and not only a reload.
			splitRowPatches: {},
			// Measured here rather than in `mounted`, so the FIRST render is
			// already the right layout. Measuring after the mount rendered
			// the split pane once on a phone and then swapped it for the full
			// page, which reads as the page flickering on every open.
			splitViewportWidth: (typeof window !== 'undefined' && Number.isFinite(window.innerWidth)) ? window.innerWidth : 0,
			splitScrollTop: 0,
			// Manual order: the row ids this person dragged into an order, read
			// from and written to their own preferences. Never on the records.
			manualOrderIds: [],
			// Personal column layout: `{ columns, pinned }` read from preferences
			// or set by the sidebar, and the columns of an applied saved view.
			personalLayout: null,
			appliedViewColumns: null,
		}
	},

	computed: {
		/**
		 * The quick-filter placement in the current view: its entry in
		 * `quickFilterPlacementByView`, else `quickFilterPlacement`.
		 *
		 * @spec openspec/changes/index-quick-filter-placement-per-view/specs/index-page/spec.md#requirement-the-quick-filter-placement-can-differ-per-view
		 * @return {''|'toolbar'|'row'} The placement.
		 */
		effectiveQuickFilterPlacement() {
			const byView = this.quickFilterPlacementByView
			const own = byView && typeof byView === 'object' ? byView[this.currentViewMode] : undefined
			return ['', 'toolbar', 'row'].includes(own) ? own : this.quickFilterPlacement
		},

		/**
		 * Whether the page draws cards beside its list (`sidePanel`).
		 *
		 * @spec openspec/changes/screens-index-stat-row/specs/index-page/spec.md#requirement-an-index-page-can-draw-a-side-panel-beside-the-list
		 * @return {boolean}
		 */
		hasSidePanel() {
			return Array.isArray(this.sidePanel) && this.sidePanel.length > 0
		},

		/**
		 * The empty-state copy run through the host translate function
		 * (the injected `cnTranslate`, identity by default). Only this
		 * component's OWN `NcEmptyContent` uses it — the raw `emptyText`
		 * keeps flowing to CnDataTable / CnObjectList / CnCardGrid, which
		 * translate at their own render boundary, so the string is never
		 * run through the translator twice.
		 *
		 * @return {string}
		 */
		resolvedEmptyText() {
			const fn = typeof this.cnTranslate === 'function' ? this.cnTranslate : (k) => k
			return this.emptyText ? fn(this.emptyText) : this.emptyText
		},

		/**
		 * The personal-lens reports of the list on screen: the store's copy
		 * of the latest response in self-fetch mode, else the `lenses` prop.
		 *
		 * @return {object}
		 * @spec openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-a-list-response-carries-the-report-of-the-lenses-it-was-asked-for
		 */
		effectiveLenses() {
			if (this.isNamedSource) {
				return {}
			}
			if (this.isSelfFetchMode) {
				return (this.list.lenses && this.list.lenses.value) || {}
			}
			return this.lenses || {}
		},

		/**
		 * Why the list is empty when a personal lens could not answer (the
		 * audit trail is off, nobody is logged in, the history could not be
		 * read), or `''` to keep the generic empty text.
		 *
		 * @return {string}
		 * @spec openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-an-unavailable-lens-explains-its-empty-page
		 */
		lensReasonText() {
			const text = lensUnavailableText(this.effectiveLenses, this.lensReasonTexts)
			if (!text) {
				return ''
			}
			const fn = typeof this.cnTranslate === 'function' ? this.cnTranslate : (k) => k
			return fn(text)
		},

		/**
		 * Whether the host manifest editor is in edit mode (unwraps the injected
		 * `cnEditingBody`, which may be a Vue ref or a plain boolean). Drives the
		 * in-header config cog.
		 *
		 * @return {boolean}
		 */
		isEditMode() {
			const e = this.cnEditingBody
			return !!(e && typeof e === 'object' && 'value' in e ? e.value : e)
		},

		/**
		 * The same map as `effectiveCustomComponents`, under the name the
		 * header-action and bulk-action paths have always used. One of the two
		 * computeds has to be the other, or a change to the resolution order
		 * lands on half the surfaces.
		 *
		 * @return {object}
		 */
		resolvedCustomComponents() {
			return this.effectiveCustomComponents
		},

		/**
		 * Whether a row click opens the row rather than selecting it:
		 * `rowClickToView` is set AND something can open it (a `row-click`
		 * listener, or a named source that routes its own rows). Otherwise a
		 * click on a selectable page selects, so it is never dead.
		 *
		 * `$.vnode.props` is not reactive, so a `row-click` listener attached
		 * or removed after mount does not re-evaluate this.
		 *
		 * @return {boolean}
		 */
		rowClickOpens() {
			if (!this.rowClickToView) {
				return false
			}
			if (this.isNamedSource && (this.rowRoute
				|| typeof this.namedSource?.openRow === 'function'
				|| this.namedSource?.detailRoute)) {
				return true
			}
			return !!this.$.vnode.props?.onRowClick
		},

		/**
		 * Merged page-level header actions: drops reserved ids and
		 * resolves declarative `handler` keywords (`navigate` / `emit`
		 * / `none` / registry name) to either a function or
		 * no-handler (emit-only) entries. Function-typed handlers are
		 * passed through untouched. The `none` keyword sets
		 * `_dispatchSuppress: true` and provides a no-op function so
		 * the bar still shows a clickable item.
		 *
		 * @return {Array<object>}
		 */
		/**
		 * The header actions that open a dialog: `type: "open-form"` (the
		 * schema-driven create form, as the navigation's primary action opens
		 * it) or `type: "open-modal"`, without a `handler` or `href` of their own.
		 * Reserved ids are left out, as in `mergedHeaderActions`. A modal
		 * opened from here also gets the list's active filters as
		 * `activeFilters`, so it knows what the list shows (the pipeline a
		 * board is narrowed to); the action's own props win.
		 *
		 * @spec openspec/changes/index-header-open-form/specs/index-header/spec.md#requirement-an-index-header-action-can-open-the-create-form
		 * @spec openspec/changes/pl4-board-card-actions/specs/pl4-board-card-actions/spec.md#requirement-a-header-modal-knows-the-lists-filters
		 * @return {Array<object>}
		 */
		dialogHeaderActions() {
			const reserved = new Set(['refresh', 'import', 'export', 'copy', 'delete'])
			return (this.headerActions || []).filter((entry) => entry
				&& typeof entry.id === 'string'
				&& !reserved.has(entry.id)
				&& (entry.handler === undefined || entry.handler === null || entry.handler === '')
				&& !entry.href
				&& (entry.type === 'open-form' || entry.type === 'open-modal'))
				.map((entry) => (entry.type === 'open-modal'
					? { ...entry, props: { activeFilters: { ...this.effectiveActiveFilters }, ...(entry.props || {}) } }
					: entry))
		},

		/**
		 * The header actions without reserved ids, each through
		 * `resolveHeaderHandler` (a manifest `href` entry becomes a link with
		 * `_dispatchSuppress`, so the page neither runs nor emits it).
		 *
		 * @spec openspec/changes/header-action-href/specs/header-action-href/spec.md#requirement-a-header-action-with-href-is-a-link-that-runs-and-emits-nothing
		 * @return {Array<object>}
		 */
		mergedHeaderActions() {
			const reserved = new Set(['refresh', 'import', 'export', 'copy', 'delete'])
			const merged = []
			for (const entry of this.headerActions || []) {
				if (entry && reserved.has(entry.id)) {
					// eslint-disable-next-line no-console
					console.warn(`CnIndexPage: headerActions[].id "${entry.id}" is reserved by the built-in bar; dropping entry`)
					continue
				}
				merged.push(this.resolveHeaderHandler(entry))
			}
			return merged
		},

		/**
		 * Where the Add button links to: the named source's `addRoute`, when
		 * that is what Add does (no host `@add` listener) and the router can
		 * resolve it. The bar then renders Add as a real link; null otherwise.
		 *
		 * `$.vnode.props` is not reactive, so an `add` listener attached or
		 * removed after mount does not re-evaluate this.
		 *
		 * @return {string|object|null}
		 */
		addLinkTo() {
			if (
				this.$.vnode.props?.onAdd
				|| !this.isNamedSource
				|| !this.namedSource
				|| !this.namedSource.addRoute
			) {
				return null
			}
			return routeHref(this.namedSource.addRoute, this.$router) ? this.namedSource.addRoute : null
		},

		/**
		 * Declarative bulk actions, validated and normalised.
		 *
		 * `copy` and `delete` are reserved: the selection strip already ships
		 * both as built-ins, so a declared action of the same name would put a
		 * second button with the same word next to one that does something
		 * else.
		 *
		 * Unlike `mergedHeaderActions` this does NOT pre-bind the handler.
		 * A bulk handler needs the selection, and the selection is only known
		 * at click time — binding it here would capture whatever was selected
		 * when the list last re-rendered.
		 *
		 * @return {Array<object>}
		 */
		mergedBulkActions() {
			const reserved = new Set(['copy', 'delete'])
			const merged = []
			for (const entry of this.bulkActions || []) {
				if (!entry || typeof entry !== 'object' || !entry.id || !entry.label) {
					// eslint-disable-next-line no-console
					console.warn(`[CnIndexPage] Ignoring bulkActions entry ${JSON.stringify(entry)}: a bulk action needs an id and a label.`)
					continue
				}
				if (reserved.has(entry.id)) {
					// eslint-disable-next-line no-console
					console.warn(`CnIndexPage: bulkActions[].id "${entry.id}" is reserved by the built-in selection strip; dropping entry`)
					continue
				}
				merged.push(entry)
			}
			return merged
		},

		// ── Self-fetch ↔ consumer-managed: the "effective" source of each
		//    list datum is the useListView instance in self-fetch mode, the
		//    prop otherwise. The template binds to these.
		/** True when self-fetch mode is active and the useListView instance exists. */
		isSelfFetchMode() {
			return this.isSelfFetch && !!this.list
		},

		/**
		 * Whether the latest self-fetch failed. The store keeps the previous
		 * rows and pagination on a failed fetch, so while this holds the page
		 * shows its error state instead of results for an earlier query.
		 */
		selfFetchFailed() {
			return this.isSelfFetchMode && !!this.list.error?.value
		},

		/**
		 * The failed fetch as a refused search, or null when it is not one.
		 *
		 * @spec openspec/changes/index-search-refusal/specs/index-search-refusal/spec.md#requirement-a-refused-search-is-said-where-it-was-typed
		 * @return {object|null}
		 */
		searchRefusal() {
			return this.selfFetchFailed ? readSearchRefusal(this.list.error.value, this.effectiveSearchValue) : null
		},

		/**
		 * Whether the named source sends the search term to its server.
		 *
		 * @return {boolean}
		 */
		namedSourceSearches() {
			return this.isNamedSource && !!this.namedSource && typeof this.namedSource.searchParam === 'string' && this.namedSource.searchParam !== ''
		},

		/**
		 * The sentence the named source's server refused this reader with, or ''.
		 * While it holds the page shows it instead of the rows, the search and
		 * the tabs: a list nobody may read is not an empty list.
		 *
		 * @return {string}
		 * @spec openspec/changes/index-endpoint-source-states/specs/index-page/spec.md
		 */
		sourceRefusal() {
			return this.isNamedSource && this.namedSource && typeof this.namedSource.refusal === 'function' ? (this.namedSource.refusal() || '') : ''
		},

		/**
		 * Whether the named source's last load failed (not refused).
		 *
		 * @return {boolean}
		 */
		sourceFailed() {
			return this.isNamedSource && !!this.namedSource && typeof this.namedSource.failed === 'function' && this.namedSource.failed() === true
		},

		/**
		 * The note the named source read off its last answer, or ''.
		 *
		 * @return {string}
		 * @spec openspec/changes/index-endpoint-source-states/specs/index-page/spec.md
		 */
		/**
		 * The endpoint source's facets as pickers: per declared facet its
		 * label, the All choice, the counted values ("E-mail (11)") and the
		 * value chosen now. A chosen value the narrowed answer no longer
		 * counts stays offered, so the picker still shows it.
		 *
		 * @return {Array<{field: string, label: string, allLabel: string, value: string, options: Array<{value: string, label: string}>}>}
		 * @spec openspec/changes/index-endpoint-source-states/specs/index-page/spec.md
		 */
		sourceFacetControls() {
			const source = this.isNamedSource ? this.namedSource : null
			const declared = source && Array.isArray(source.facetDeclarations) ? source.facetDeclarations : []
			if (declared.length === 0) {
				return []
			}
			const counted = typeof source.facets === 'function' ? (source.facets() || {}) : {}
			return declared.map((facet) => {
				const labels = facet.labels && typeof facet.labels === 'object' ? facet.labels : {}
				const nameOf = (value) => (labels[value] ? this.cnTranslate(labels[value]) : value)
				const chosenRaw = (this.namedActiveFilters || {})[facet.field]
				const chosen = Array.isArray(chosenRaw) ? String(chosenRaw[0] ?? '') : String(chosenRaw ?? '')
				const options = (counted[facet.field] || []).map((entry) => ({ value: entry.value, label: `${nameOf(entry.value)} (${entry.count})` }))
				if (chosen !== '' && !options.some((option) => option.value === chosen)) {
					options.push({ value: chosen, label: nameOf(chosen) })
				}
				return {
					field: facet.field,
					label: facet.label ? this.cnTranslate(facet.label) : facet.field,
					allLabel: facet.allLabel ? this.cnTranslate(facet.allLabel) : t('nextcloud-vue', 'All'),
					value: chosen,
					options,
				}
			})
		},

		sourceNote() {
			return this.isNamedSource && this.namedSource && typeof this.namedSource.note === 'function' ? (this.namedSource.note() || '') : ''
		},

		/** @return {string} What to do after a refused search. */
		searchRefusalHintText() {
			if (this.searchRefusalHint) {
				return typeof this.cnTranslate === 'function' ? this.cnTranslate(this.searchRefusalHint) : this.searchRefusalHint
			}
			return t('nextcloud-vue', 'Correct that character, or search for plain words. AND, OR and NOT work in capitals, and quotes make a phrase.')
		},

		/** Rows: store collection in self-fetch mode, else the `objects` prop. */
		effectiveObjects() {
			if (this.isNamedSource) {
				const sortsRows = !!(this.namedSource && this.namedSource.sortsRows === true)
				const key = sortsRows && this.namedSort ? this.namedSort.key : ''
				if (!key) {
					return this.namedRows
				}
				const direction = this.namedSort.order === 'desc' ? -1 : 1
				const text = (row) => String(row && row[key] !== undefined && row[key] !== null ? row[key] : '')
				return [...(this.namedRows || [])].sort((a, b) => direction * text(a).localeCompare(text(b), undefined, { numeric: true, sensitivity: 'base' }))
			}
			if (this.sortSourceShown) {
				return this.sortSourceView.rows
			}
			if (this.selfFetchFailed) {
				return []
			}
			const rows = this.isSelfFetchMode ? (this.list.objects.value || []) : this.objects
			return this.annotatingSource ? annotateRows(rows, this.sortSource.rows, this.annotatingSource) : rows
		},

		/**
		 * The sort options that name an endpoint `source`.
		 *
		 * @return {Array<object>}
		 */
		sourceSortOptions() {
			return (this.sortSelectOptions || []).filter((o) => o && o.value !== undefined && o.source && typeof o.source.url === 'string' && o.source.url !== '')
		},

		/**
		 * What the selected lenses ask a sort source for: the `sourceParams` of
		 * each selected quick filter, merged. A lens that changes WHICH rows an
		 * endpoint answers ("Including work you cover") cannot say so through its
		 * `filter`, which only narrows the object fetch and the rows already
		 * loaded.
		 *
		 * @return {object} The parameters.
		 * @spec openspec/changes/sidebar-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
		 */
		lensSourceParams() {
			const tabs = this.tabStripEntries || []
			const indices = this.quickFilterMultiple
				? (this.selectedQuickFilterIndices || [])
				: [this.activeQuickFilterIndex]
			const params = {}
			for (const index of indices) {
				const tab = typeof index === 'number' ? tabs[index] : null
				if (tab && tab.sourceParams && typeof tab.sourceParams === 'object' && !Array.isArray(tab.sourceParams)) {
					Object.assign(params, tab.sourceParams)
				}
			}
			return params
		},

		/**
		 * The sort option whose endpoint lists the rows now, or null.
		 *
		 * @return {object|null}
		 * @spec openspec/changes/sidebar-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
		 */
		activeSortSource() {
			if (!this.sortSource.value) {
				return null
			}
			return this.sourceSortOptions.find((o) => String(o.value) === this.sortSource.value) || null
		},

		/**
		 * Whether the rows on screen are the sort source's: a self-fetch page
		 * with a source option chosen whose endpoint did not fail.
		 *
		 * @return {boolean}
		 */
		sortSourceShown() {
			return !!this.activeSortSource && this.isSelfFetchMode && this.sortSource.state !== 'failed'
		},

		/**
		 * Whether a chosen source option fell back to its own order.
		 *
		 * @return {boolean}
		 */
		sortSourceFellBack() {
			return !!this.activeSortSource && this.sortSource.state === 'failed'
		},

		/**
		 * The translated note for a fallen-back source option, or ''.
		 *
		 * @return {string}
		 */
		sortSourceFailedNote() {
			const note = this.activeSortSource && this.activeSortSource.source.failedNote
			return typeof note === 'string' && note !== '' ? this.cnTranslate(note) : ''
		},

		/**
		 * The source rows after the page's search and sidebar filters, one
		 * page of them at the list's page size.
		 *
		 * @return {{rows: Array<object>, pagination: object}}
		 * @spec openspec/changes/sidebar-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
		 */
		sortSourceView() {
			const limit = (this.list && this.list.pagination && this.list.pagination.value && this.list.pagination.value.limit) || 20
			return pageSourceRows(this.sortSourceFilteredRows, this.sortSource.page, limit)
		},

		/**
		 * The source rows after the page's search and sidebar filters, every page.
		 *
		 * @return {Array<object>}
		 */
		sortSourceFilteredRows() {
			const source = this.activeSortSource ? this.activeSortSource.source : {}
			return filterSourceRows(this.sortSource.rows, {
				search: this.list && this.list.searchTerm ? this.list.searchTerm.value : '',
				filters: this.list && this.list.activeFilters ? this.list.activeFilters.value : {},
				searchFields: source.searchFields,
			})
		},

		/**
		 * The rows `{rows:<field>}` in the header note counts: every row of a
		 * sort source's list, else the rows on screen.
		 *
		 * @return {Array<object>}
		 */
		headerMetaRows() {
			return this.sortSourceShown ? this.sortSourceFilteredRows : (this.effectiveObjects || [])
		},

		/**
		 * The source whose carried fields reach every order's rows
		 * (`source.annotate`), once its rows are read, or null.
		 *
		 * @return {object|null} The option's source.
		 * @spec openspec/changes/sidebar-sort-source/specs/index-page/spec.md#requirement-a-row-field-the-source-supplies-reaches-every-order
		 */
		annotatingSource() {
			const option = this.sourceSortOptions.find((o) => o.source.annotate === true)
			return option && this.sortSource.rows.length > 0 ? option.source : null
		},

		/**
		 * The month window as list-query conditions, only in calendar mode.
		 * With an end field an entry counts when it overlaps the window;
		 * without one, when its date falls inside it. Read by
		 * `useSelfFetchList`'s fixed-filter getter, and empty outside calendar
		 * mode so the table is never narrowed after leaving.
		 *
		 * @return {object} The filter conditions, or an empty object.
		 */
		calendarRangeFilter() {
			const cal = this.calendar || {}
			if (this.currentViewMode !== 'calendar' || !cal.dateField || !this.calendarRange) {
				return {}
			}
			const { rangeStart, rangeEnd } = this.calendarRange
			if (cal.endDateField) {
				return { [`${cal.dateField}[lte]`]: rangeEnd, [`${cal.endDateField}[gte]`]: rangeStart }
			}
			return { [`${cal.dateField}[gte]`]: rangeStart, [`${cal.dateField}[lte]`]: rangeEnd }
		},

		/**
		 * Rows handed to the table / card grid — `effectiveObjects` re-sorted by
		 * the declarative `defaultSort` spec whenever no explicit user column
		 * sort is active. A live `sortKey` (user clicked a header, or one was
		 * passed in) takes over and this falls through to the unsorted rows so
		 * the server / prop order wins. No-op when `defaultSort` is empty.
		 *
		 * @return {object[]}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		displayObjects() {
			// The pane's saves and this person's own order are applied over
			// the loaded rows, in that order, so neither needs a refetch and
			// neither writes anything onto the records.
			const patched = applyRowPatches(this.sortedObjects, this.splitRowPatches, this.rowKey)
			return this.manualOrderActive
				? applyManualOrder(patched, this.manualOrderIds, this.rowKey)
				: patched
		},

		/**
		 * The rows in the order the server, the props or `defaultSort` put
		 * them. Split out of `displayObjects` so the pane's patches and this
		 * person's manual order stack on top of one sorted list rather than
		 * each re-deriving it.
		 *
		 * @return {object[]}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		sortedObjects() {
			const spec = this.effectiveDefaultSort
			// A sort source's rows arrive in the order they stand for.
			if (this.sortSourceShown || !spec || spec.length === 0) {
				return this.effectiveObjects
			}
			if (this.effectiveSortKey) {
				return this.effectiveObjects
			}
			return multiKeySort(this.effectiveObjects, spec)
		},

		/**
		 * Whether this page declares a working split view.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		splitViewEnabled() {
			return this.splitView?.enabled === true
		},

		/**
		 * Which of the three layouts the page is in: the plain list, the list
		 * with the pane beside it, or the record on its own below the
		 * breakpoint.
		 *
		 * @return {'list'|'split'|'detail'}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		splitLayout() {
			return splitLayoutFor({
				enabled: this.splitViewEnabled,
				splitId: this.splitId || null,
				viewportWidth: this.splitViewportWidth,
				breakpoint: this.splitView?.breakpoint,
			})
		},

		/**
		 * The pane's CSS width, falling back when the page declared something
		 * the browser would drop.
		 *
		 * @return {string}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		splitPaneWidth() {
			return normalisePaneWidth(this.splitView?.paneWidth)
		},

		/**
		 * Whether to draw the pane's close link. Needs a router: closing pushes
		 * the list route, so without one it would do nothing.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		splitCloseVisible() {
			return this.splitCloseButton && Boolean(this.$router)
		},

		/**
		 * Accessible name and tooltip for the pane's close link.
		 *
		 * @return {string}
		 */
		splitCloseTitle() {
			return this.splitCloseLabel || t('nextcloud-vue', 'Close')
		},

		/**
		 * The list's own address. Falls back to `#` rather than no href: an
		 * `<a>` without one is not focusable.
		 *
		 * @return {string}
		 */
		splitCloseHref() {
			const target = this.splitCloseRoute || this.$route?.meta?.cnPageId || null
			if (!target || typeof this.$router?.resolve !== 'function') {
				return '#'
			}
			try {
				return this.$router.resolve({ name: target, query: this.$route?.query || {} }).href || '#'
			} catch {
				// An unknown route name throws rather than answering.
				return '#'
			}
		},

		/**
		 * Whether a manual row order applies right now. A search, a filter or
		 * a sort the person just chose all mean they asked for a different
		 * order, and a held order that quietly overruled it would read as the
		 * list ignoring them.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		manualOrderActive() {
			return this.manualOrder === true
				&& this.manualOrderIds.length > 0
				&& !this.effectiveSortKey
		},

		/**
		 * Whether the `map` segment is offered in the view toggle. An explicit
		 * `viewModes` whitelist wins; otherwise map is available iff `mapConfig`
		 * carries at least one field. Cards/table are always available.
		 *
		 * @return {boolean}
		 */
		showMapSegment() {
			if (Array.isArray(this.viewModes)) {
				return this.viewModes.includes('map')
			}
			return Object.keys(this.mapConfig || {}).length > 0
		},

		/**
		 * Board look: where the linked view switch segments go
		 * (`viewSwitchLinks`), as `{ mode: { href, to? } }`. A route the router
		 * cannot resolve, and an entry with neither route nor href, is left out.
		 *
		 * @return {{[mode: string]: {href: string, to?: object}}}
		 * @spec openspec/changes/screens-view-switch-links/specs/view-switch/spec.md#requirement-a-view-switch-segment-can-open-another-page
		 */
		viewSwitchLinkTargets() {
			const declared = this.viewSwitchLinks
			if (!this.isBoardLook || !declared || typeof declared !== 'object') {
				return {}
			}
			const targets = {}
			for (const [mode, link] of Object.entries(declared)) {
				if (!['table', 'cards', 'board', 'map'].includes(mode) || !link || typeof link !== 'object') {
					continue
				}
				if (typeof link.route === 'string' && link.route !== '') {
					const to = { name: link.route }
					if (link.params && typeof link.params === 'object') {
						to.params = link.params
					}
					if (link.query && typeof link.query === 'object') {
						to.query = link.query
					}
					const href = routeHref(to, this.$router)
					if (href) {
						targets[mode] = { href, to }
					}
				} else if (typeof link.href === 'string' && link.href !== '') {
					targets[mode] = { href: link.href }
				}
			}
			return targets
		},

		/**
		 * Board look: the modes `viewSwitch` lists that this page cannot open,
		 * drawn as disabled segments.
		 *
		 * @return {Array<string>} The disabled modes.
		 * @spec openspec/changes/screens-view-switch-parity/specs/view-switch-board-look/spec.md#requirement-the-manifest-can-draw-segments-the-page-cannot-open
		 */
		viewSwitchDisabledModes() {
			if (!this.isBoardLook) {
				return []
			}
			// The index boards draw all four segments, so the board look does
			// too unless the manifest names its own list.
			const viewSwitch = this.presented('viewSwitch')
			const listed = Array.isArray(viewSwitch) ? viewSwitch : ['table', 'cards', 'board', 'map']
			const offered = [...this.effectiveToggleModes, ...(this.showMapSegment ? ['map'] : [])]
			return listed.filter((mode) => ['table', 'cards', 'board', 'map'].includes(mode) && !offered.includes(mode))
		},

		/**
		 * The base view-toggle segments (cards/table/list) passed to CnActionsBar.
		 * Beta's explicit `viewModes` whitelist wins when set; otherwise the
		 * `availableViewModes` list. Map is excluded here — it's added by the
		 * actions bar via the `showMap` bridge driven by `showMapSegment`.
		 *
		 * @return {Array<string>} The ordered toggle segments minus 'map'.
		 */
		effectiveToggleModes() {
			const list = (Array.isArray(this.viewModes) && this.viewModes.length)
				? this.viewModes
				: this.availableViewModes

			// 🔴 A SEGMENT ONLY WHEN THE MODE CAN ACTUALLY WORK. A board needs
			// a status field to build its columns from and a date axis needs
			// both dates; offering a segment that opens a view saying it
			// cannot be one is worse than not offering it, because the reader
			// has to click it to find out.
			return list.filter((mode) => {
				if (mode === 'map') {
					return false
				}
				if (mode === 'board') {
					return Boolean(this.board?.statusField)
				}
				if (mode === 'dateAxis') {
					return Boolean(this.dateAxis?.startField) && Boolean(this.dateAxis?.endField)
				}
				if (mode === 'calendar') {
					return Boolean(this.calendar?.dateField)
				}
				return true
			})
		},

		/**
		 * The modes `?_view=` can open: the toggle's modes plus the map when
		 * the page offers it.
		 *
		 * @return {Array<string>} The modes.
		 * @spec openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-the-address-opens-a-view-mode-that-arrives-later
		 */
		routeViewModes() {
			return [...this.effectiveToggleModes, ...(this.showMapSegment ? ['map'] : [])]
		},

		/**
		 * The column fields the board offers (`board.columnFields`), for the
		 * column switch (screens-board-reference-columns).
		 *
		 * @return {Array<object>} The normalised fields; empty for a board on `statusField` only.
		 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-a-board-can-switch-the-field-its-columns-come-from
		 */
		boardColumnFields() {
			return columnFieldsOf(this.board)
		},

		/**
		 * The column field in use: the reader's pick, else the one on
		 * `statusField`, else the first. Null on a board without `columnFields`.
		 *
		 * @return {object|null} The normalised column field.
		 */
		boardActiveColumnField() {
			const fields = this.boardColumnFields
			if (fields.length === 0) {
				return null
			}
			return fields.find((entry) => entry.field === this.boardColumnFieldChoice)
				|| fields.find((entry) => entry.field === this.board?.statusField)
				|| fields[0]
		},

		/** @return {string} The row field the columns come from. */
		boardColumnField() {
			return this.boardActiveColumnField?.field || this.board?.statusField || 'status'
		},

		/**
		 * The parent the board is narrowed to: the single value of the page
		 * filter on the reference's `narrowBy.rowField`, '' when none or several.
		 *
		 * @return {string} The parent id.
		 */
		boardNarrowValue() {
			const field = this.board?.narrow?.field || this.boardActiveColumnField?.source?.narrowBy?.rowField
			if (!field) {
				return ''
			}
			const current = this.effectiveActiveFilters?.[field]
			const values = Array.isArray(current) ? current : (current === undefined || current === null || current === '' ? [] : [current])
			return values.length === 1 ? refIdOf(values[0]) : ''
		},

		/**
		 * The stages of a reference or values column field, or null for a
		 * field the schema's enum or lifecycle states back.
		 *
		 * @return {object|null} `{ states, keyByValue, refsByKey }`.
		 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-columns-can-be-the-rows-a-field-references
		 */
		boardStages() {
			const active = this.boardActiveColumnField
			if (!active) {
				return null
			}
			if (active.kind === 'values') {
				return buildValueStages({
					rows: this.displayObjects,
					field: active.field,
					valueLabels: active.valueLabels,
					emptyLabel: active.emptyLabel ? this.cnTranslate(active.emptyLabel) : t('nextcloud-vue', 'Nobody'),
				})
			}
			if (active.kind !== 'reference') {
				return null
			}
			const source = active.source || {}
			const narrowBy = source.narrowBy && typeof source.narrowBy === 'object' ? source.narrowBy : null
			return buildReferenceStages({
				refs: this.boardRefs[active.field] || [],
				labelField: source.labelField || '',
				orderField: source.orderField || '',
				colorField: source.colorField || '',
				mergeBy: source.mergeBy || '',
				narrowBy,
				narrowValue: narrowBy ? this.boardNarrowValue : '',
				capacityField: source.capacityField || '',
				neutralColor: typeof source.neutralColor === 'string' ? source.neutralColor : '',
				colorMap: source.colorMap && typeof source.colorMap === 'object' ? source.colorMap : null,
				closedField: source.closedField || '',
			})
		},

		/**
		 * The row actions the board's cards offer, by the ids in
		 * `board.cardActions`, in that order.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/pl4-board-card-actions/specs/pl4-board-card-actions/spec.md#requirement-a-card-carries-the-row-actions
		 */
		boardCardActions() {
			const ids = Array.isArray(this.board?.cardActions) ? this.board.cardActions : []
			return ids.map((id) => this.mergedActions.find((action) => action && action.id === id)).filter(Boolean)
		},

		/**
		 * The field schema the board reads its columns from: the stages of a
		 * reference or values field as lifecycle `states`, else the schema's
		 * own property.
		 *
		 * @return {?object} The field schema, or null.
		 */
		boardFieldSchema() {
			if (this.boardStages) {
				return { states: this.boardStages.states }
			}
			const field = this.boardColumnField
			return this.effectiveSchema?.properties?.[field] || null
		},

		/**
		 * The column a card sits in, for a reference or values field.
		 *
		 * @return {((row: object) => string)|null} The mapper, or null.
		 */
		boardColumnKeyOf() {
			const stages = this.boardStages
			if (!stages) {
				return null
			}
			const field = this.boardColumnField
			return (row) => columnKeyOfRow(row, field, stages.keyByValue)
		},

		/**
		 * The move the board runs on a drop or a menu pick.
		 *
		 * A named handler (`moveHandler`, from the app's registry) gets
		 * `{ card, toKey, field, value, target }` and owns the write; the
		 * status of a case goes through the app's transition this way. A
		 * reference or values field without one has its value written on the
		 * row (PATCH). `readOnly` gives no move. A board on `statusField` with
		 * neither keeps the `runTransition` prop.
		 *
		 * With `source.capacityField`, a drop that would fill the referenced
		 * row past its limit is refused before the handler or the PATCH runs.
		 * The server still guards; this only spares the round trip.
		 *
		 * @return {((move: {card: object, toKey: string}) => Promise<object>)|null} The move, or null for a read-only board.
		 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-a-drop-writes-the-reference
		 */
		boardRunTransition() {
			const active = this.boardActiveColumnField
			if (active?.readOnly) {
				return null
			}
			const onStatusField = !active || active.field === this.board?.statusField
			const name = active?.moveHandler || (onStatusField ? (this.board?.moveHandler || '') : '')
			const handler = name ? resolveRegisteredHandler(name, this.effectiveRegistry, this.resolvedCustomComponents) : null
			if (name && typeof handler !== 'function') {
				return null
			}
			const stages = this.boardStages
			if (!handler && !stages) {
				return this.runTransition
			}
			const field = this.boardColumnField
			const kind = active?.kind || 'schema'
			const narrowBy = active?.source?.narrowBy || null
			const capacityField = active?.source?.capacityField || ''
			return async ({ card, toKey }) => {
				const drop = stages
					? resolveDropValue({ card, toKey, kind, refsByKey: stages.refsByKey, narrowBy })
					: { value: toKey, target: null }
				if (drop === null) {
					throw new Error(t('nextcloud-vue', 'This card cannot move to that column.'))
				}
				const full = capacityField && drop.target
					? fullTargetOf({ target: drop.target, card, rows: this.displayObjects, field, capacityField, rowKey: this.rowKey })
					: null
				if (full) {
					const column = stages.states.find((state) => state.key === String(toKey))?.label || String(toKey)
					throw new Error(t('nextcloud-vue', '{column} is full: {count} of {capacity}.', { column, count: full.count, capacity: full.capacity }))
				}
				if (handler) {
					return handler({ card, toKey, field, value: drop.value, target: drop.target })
				}
				const id = card?.id ?? card?.['@self']?.id ?? card?.[this.rowKey]
				const url = objectUrlOf(this.register, this.exportSchemaSlug, id)
				if (url === '') {
					throw new Error(t('nextcloud-vue', 'This card cannot move to that column.'))
				}
				return patchObject(url, { [field]: drop.value })
			}
		},

		/**
		 * Where a card may go, from the app's `moveTargetsHandler`: it gets
		 * `{ card, field }` and answers the values (referenced ids) the card
		 * can reach; the board maps them to its columns. An entry may also be
		 * `{ key, allowed, reason }`: a target that is offered but blocked,
		 * with the sentence that says why.
		 *
		 * @return {((card: object) => Promise<Array<string|{key: string, allowed: boolean, reason: string}>|null>)|null} The question, or null.
		 * @spec openspec/changes/board-move-block-reasons/specs/board-view/spec.md#requirement-a-move-target-can-be-blocked-with-a-reason
		 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-the-board-shows-where-a-card-can-go
		 */
		boardAllowedMoves() {
			const active = this.boardActiveColumnField
			const onStatusField = !active || active.field === this.board?.statusField
			const name = active?.moveTargetsHandler || (onStatusField ? (this.board?.moveTargetsHandler || '') : '')
			const handler = name ? resolveRegisteredHandler(name, this.effectiveRegistry, this.resolvedCustomComponents) : null
			if (typeof handler !== 'function' || this.boardRunTransition === null) {
				return null
			}
			const field = this.boardColumnField
			const stages = this.boardStages
			return async (card) => {
				const values = await handler({ card, field })
				if (!Array.isArray(values)) {
					return null
				}
				const columnOf = (id) => (stages && stages.keyByValue.has(id) ? stages.keyByValue.get(id) : id)
				return values.map((value) => {
					if (value && typeof value === 'object' && Object.hasOwn(value, 'key')) {
						return {
							key: columnOf(refIdOf(value.key)),
							allowed: value.allowed !== false,
							reason: typeof value.reason === 'string' ? value.reason : '',
						}
					}
					return columnOf(refIdOf(value))
				})
			}
		},

		/** @return {object|null} The board's narrowing select (`board.narrow`). */
		boardNarrow() {
			const narrow = this.board?.narrow
			return narrow && typeof narrow === 'object' && typeof narrow.field === 'string' && narrow.field !== '' ? narrow : null
		},

		/** @return {string} The narrowing select's label, with its colon. */
		boardNarrowLabel() {
			const narrow = this.boardNarrow || {}
			const prop = (this.effectiveSchema?.properties || {})[narrow.field] || {}
			return t('nextcloud-vue', '{label}:', { label: this.cnTranslate(narrow.label || prop.title || narrow.field || '') })
		},

		/** @return {string} The narrowing select's "all" option. */
		boardNarrowAllLabel() {
			return this.boardNarrow?.allLabel ? this.cnTranslate(this.boardNarrow.allLabel) : t('nextcloud-vue', 'All')
		},

		/** @return {string} The column switch's label, with its colon. */
		boardColumnSwitchLabel() {
			const label = this.board?.columnSwitchLabel ? this.cnTranslate(this.board.columnSwitchLabel) : t('nextcloud-vue', 'Columns')
			return t('nextcloud-vue', '{label}:', { label })
		},

		/** @return {boolean} Whether the board view draws its controls row. */
		boardControlsShown() {
			return this.currentViewMode === 'board'
				&& (this.boardColumnFields.length > 1 || this.boardNarrow !== null || Boolean(this.board?.hint))
		},

		/**
		 * What the board needs fetched, as one key the watcher reacts to.
		 *
		 * @return {string} The key, '' outside the board view.
		 */
		boardFetchKey() {
			if (this.currentViewMode !== 'board') {
				return ''
			}
			return [this.boardColumnField, this.boardActiveColumnField?.kind || '', this.effectiveSchema ? 1 : 0, this.boardNarrow ? this.boardNarrow.field : ''].join('|')
		},

		/**
		 * The status field's schema, for the board's columns.
		 *
		 * Read from the schema this page already holds rather than fetched: the
		 * stages are a property of the type, and a second read of them could
		 * disagree with the one the table is rendering from.
		 *
		 * @return {?object} The field schema, or null.
		 */
		boardStatusFieldSchema() {
			const field = this.board?.statusField
			if (!field) {
				return null
			}
			return this.effectiveSchema?.properties?.[field] || null
		},

		/**
		 * How the board's column sums are formatted: `board.sumFormat`, else
		 * what the sum field's schema declares (`format: "currency"` or
		 * `"percent"`), else a plain number.
		 *
		 * @return {object|null} A metric format, or null for the plain default.
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-column-header
		 */
		boardSumFormat() {
			if (this.board?.sumFormat && typeof this.board.sumFormat === 'object') {
				return this.board.sumFormat
			}
			const field = this.board?.sumField
			const property = field ? this.effectiveSchema?.properties?.[field] : null
			if (property && (property.format === 'currency' || property.format === 'percent')) {
				return { style: property.format, currency: property.currency, decimals: property.format === 'currency' ? 2 : 0 }
			}
			return null
		},

		/**
		 * Whether the list holds one page of more.
		 *
		 * The board says so beside its counts: a count of a page shown as
		 * though it were the total is a number somebody quotes in a meeting.
		 *
		 * @return {boolean} True when there is more than this page.
		 */
		isPaged() {
			if (this.boardLoadsAll) {
				const loaded = this.effectivePagination || {}
				return Number(loaded.page || 1) < Number(loaded.pages || 1)
			}
			if (this.isNamedSource && this.namedSource && this.namedSource.pages === true) {
				return Number(this.effectivePagination?.pages || 1) > 1
			}
			return Number(this.pagination?.pages || 1) > 1
		},

		/**
		 * Whether the board view gathers every row itself: in self-fetch mode
		 * it adds page after page (`list.loadMore`) instead of paging, and
		 * draws its own footer in place of the pagination.
		 *
		 * @return {boolean} True for a self-fetching page in board view.
		 * @spec openspec/changes/board-loads-every-row/specs/board-view/spec.md#requirement-the-index-board-shows-every-matching-row
		 */
		boardLoadsAll() {
			return this.currentViewMode === 'board' && this.isSelfFetchMode && !this.isNamedSource && typeof this.list.loadMore === 'function'
		},

		/**
		 * The rows the board holds against the rows that match, for the
		 * board's footer.
		 *
		 * @return {{shown: number, total: number}} The counts.
		 */
		boardLoadCounts() {
			const shown = this.effectiveObjects.length
			return { shown, total: Math.max(shown, Number(this.effectivePagination?.total || 0)) }
		},

		/**
		 * Whether the folder pane is drawn: a `folderSidebar` without
		 * `pane: false`.
		 *
		 * @spec openspec/changes/folder-sidebar-pane-off/specs/index-page/spec.md#requirement-a-folder-scope-without-a-pane
		 * @return {boolean}
		 */
		showsFolderPane() {
			return Boolean(this.folderSidebar) && this.folderSidebar.pane !== false
		},

		/**
		 * The CnFolderSidebar source. A `register` source is fetched by this
		 * component and handed to CnFolderSidebar as a `custom` folder list.
		 *
		 * @return {string} The resolved CnFolderSidebar source.
		 */
		folderSidebarSource() {
			const s = this.folderSidebar && this.folderSidebar.source
			return (s === 'register' || s === 'groups' || !s) ? 'custom' : s
		},

		/**
		 * The folder list for CnFolderSidebar's custom source: register-fetched
		 * objects (source:'register') or the explicit `folders` (source:'custom').
		 * Empty for the field/files sources, which derive their own list.
		 *
		 * @return {Array<object>} The folder list.
		 */
		folderSidebarFolders() {
			if (!this.folderSidebar) {
				return []
			}
			if (this.folderSidebar.source === 'register') {
				return this.folderRegisterList
			}
			if (this.folderSidebar.source === 'groups') {
				return this.folderGroupList
			}
			return this.folderSidebar.folders || []
		},

		/**
		 * The folder entry for the folder currently selected in the sidebar,
		 * or null while "All" is selected.
		 *
		 * @return {(object|null)} The active scope's folder entry.
		 * @spec openspec/changes/index-columns-per-scope/specs/index-page/spec.md
		 */
		activeScope() {
			if (this.selectedFolderId === null || this.selectedFolderId === undefined) {
				return null
			}
			const idField = this.folderPassthroughIdField
			const match = this.folderSidebarFolders
				.find((f) => f && String(this.getByPath(f, idField)) === String(this.selectedFolderId))
			return match || null
		},

		/**
		 * The heading above the list for the selected folder: on a `groups`
		 * pane (or with `folderSidebar.heading: true`), its name and, under
		 * it, its parent folder and its count. The count reads
		 * `folderSidebar.countText` (`{count}`, through the app's translate),
		 * else "{count} members" on a groups pane.
		 *
		 * @return {{name: string, subtitle: string}|null} The heading, or null on All.
		 */
		scopeHeading() {
			const cfg = this.folderSidebar
			const scope = this.activeScope
			if (!cfg || !scope || !(cfg.source === 'groups' || cfg.heading === true)) {
				return null
			}
			const idField = this.folderPassthroughIdField
			const name = String(this.getByPath(scope, this.folderPassthroughNameField) ?? this.selectedFolderId)
			const parentId = scope.parentId ?? scope.parent ?? null
			const parent = parentId === null || parentId === undefined
				? null
				: this.folderSidebarFolders.find((f) => f && String(this.getByPath(f, idField)) === String(parentId))
			const parts = []
			if (parent) {
				parts.push(String(this.getByPath(parent, this.folderPassthroughNameField) ?? parentId))
			}
			if (typeof scope.count === 'number') {
				if (cfg.countText) {
					parts.push(this.cnTranslate(cfg.countText).replace('{count}', String(scope.count)))
				} else if (cfg.source === 'groups') {
					parts.push(n('nextcloud-vue', '{count} member', '{count} members', scope.count, { count: scope.count }))
				}
			}
			return { name, subtitle: parts.join(' · ') }
		},

		/**
		 * The list's current order, `[{ key, order }]`: the self-fetched list's,
		 * else the `sortKeys` / `sortKey` props.
		 *
		 * @return {Array<{key: string, order: string}>} The order.
		 */
		currentSortKeys() {
			if (this.isSelfFetchMode && this.list && this.list.sortKeys) {
				return this.list.sortKeys.value || []
			}
			if (Array.isArray(this.sortKeys) && this.sortKeys.length > 0) {
				return this.sortKeys
			}
			return this.sortKey ? [{ key: this.sortKey, order: this.sortOrder || 'asc' }] : []
		},

		/**
		 * The orders the index sidebar's Sort section offers: none in the table
		 * view, which sorts by its column headers; else `sortSelectOptions`,
		 * or else the sortable columns, ascending.
		 *
		 * @return {Array<{value: string, label: string, keys: Array<{key: string, order: string}>}>} The options.
		 */
		sidebarSortOptions() {
			if (this.currentViewMode === 'table') {
				return []
			}
			if (Array.isArray(this.sortSelectOptions) && this.sortSelectOptions.length > 0) {
				return this.sortSelectOptions
					.filter((o) => o && o.value !== undefined && o.value !== null)
					.map((o) => {
						const fixed = this.isSelfFetchMode && !!(o.source && typeof o.source.url === 'string' && o.source.url !== '')
						return {
							value: String(o.value),
							label: this.cnTranslate(o.label || String(o.value)),
							// An endpoint-ranked order is chosen by its value; its
							// `order` is only the fallback.
							keys: fixed ? [] : orderToSortKeys(o.order !== undefined ? o.order : o.value),
							...(fixed ? { fixed: true } : {}),
						}
					})
					.filter((o) => o.fixed === true || o.keys.length > 0)
			}
			return (this.tableColumns || [])
				.filter((c) => c && typeof c === 'object' && c.key && isColumnSortable(c, this.effectiveSchema))
				.map((c) => ({ value: c.key, label: this.cnTranslate(c.label || c.key), keys: [{ key: c.key, order: 'asc' }] }))
		},

		/**
		 * The `x-index` block the active scope's own schema row carries, for a
		 * folder list derived from a register. Empty for every other source:
		 * a folder that is a distinct field value, or one written into the
		 * manifest by hand, has no record behind it to read.
		 *
		 * @return {(object|null)} A row-shaped object carrying `x-index`, or null.
		 * @spec openspec/changes/index-columns-per-scope/specs/index-page/spec.md
		 */
		activeScopeRow() {
			if (this.selectedFolderId === null || this.selectedFolderId === undefined) {
				return null
			}
			const carried = this.folderRowLayouts[String(this.selectedFolderId)]
			return carried ? { 'x-index': carried } : null
		},

		/**
		 * The list layout the active scope asks for. Two declarations meet
		 * here and they decide different things: this page's `columns` prop
		 * decides which columns the page HAS, and the scope decides which of
		 * them it shows, in what order, sorted by what and searched over what.
		 * A scope naming a column this page does not declare is dropped, so a
		 * scope written before a column was taken out cannot bring it back.
		 *
		 * @return {{columns: (Array|null), sortKeys: Array, searchFields: string[]}}
		 * @spec openspec/changes/index-columns-per-scope/specs/index-page/spec.md
		 */
		activeScopeLayout() {
			if (!this.folderSidebar || !this.scopeShapesView) {
				return { columns: null, sortKeys: [], searchFields: [] }
			}
			return resolveScopeLayout({
				scope: this.activeScope,
				row: this.activeScopeRow,
				pageColumns: this.declaredColumns,
			})
		},

		/**
		 * Whether the active scope's look applies in the current view mode:
		 * always, unless `folderSidebar.scopeViews` names the view modes it is
		 * for (`["table", "list"]`), so the board keeps the page's generic
		 * look (DqWerkbord). The scope's filter applies in every view.
		 *
		 * @spec openspec/changes/index-scope-views/specs/index-page/spec.md#requirement-a-scope-look-can-be-limited-to-view-modes
		 * @return {boolean}
		 */
		scopeShapesView() {
			const views = this.folderSidebar && this.folderSidebar.scopeViews
			if (!Array.isArray(views) || views.length === 0) {
				return true
			}
			return views.includes(this.currentViewMode)
		},

		/**
		 * This page's own value of each presentation key, which a query preset
		 * may have set: what `presented()` falls back to without a scope.
		 *
		 * @return {object}
		 * @spec openspec/changes/index-scope-presentation/specs/index-page/spec.md#requirement-a-preset-or-a-scope-sets-the-list-s-presentation
		 */
		ownPresentation() {
			return {
				title: this.title,
				quickFilters: this.quickFilters,
				cardFields: this.cardFields,
				countText: this.countText,
				searchPlaceholder: this.searchPlaceholder,
				footerNote: this.footerNote,
				viewSwitch: this.viewSwitch,
				addLabel: this.addLabel,
				headerButtons: this.headerButtons,
				breadcrumb: this.breadcrumb,
				headerMeta: this.headerMeta,
				afterList: this.afterList,
			}
		},

		/**
		 * The presentation the active scope declares (`title`, `countText`,
		 * `quickFilters`, `addLabel`, `afterList` and the other query preset
		 * keys), from its folder entry or its row's `x-index`. Empty without a
		 * scope, so the page's own values stand.
		 *
		 * @return {object}
		 * @spec openspec/changes/index-scope-presentation/specs/index-page/spec.md#requirement-a-preset-or-a-scope-sets-the-list-s-presentation
		 */
		activeScopePresentation() {
			if (!this.folderSidebar || !this.scopeShapesView) {
				return {}
			}
			return resolveScopePresentation({ scope: this.activeScope, row: this.activeScopeRow })
		},

		/**
		 * The widgets drawn after the list: the active scope's `afterList`,
		 * else the page's.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/index-scope-presentation/specs/index-page/spec.md#requirement-an-index-page-can-draw-widgets-after-its-list
		 */
		presentedAfterList() {
			const list = this.presented('afterList')
			return Array.isArray(list) ? list : []
		},

		/**
		 * The fields the search box searches over while a scope declaring
		 * `searchFields` is active. Read by `useSelfFetchList`'s fixed-filter
		 * getter off this instance, so a scope change re-scopes the next fetch
		 * without a second search path.
		 *
		 * @return {string[]} The scope's search fields, or [].
		 * @spec openspec/changes/index-columns-per-scope/specs/index-page/spec.md
		 */
		activeScopeSearchFields() {
			return this.activeScopeLayout.searchFields
		},

		/**
		 * The teams this person is treated as having claimed: what they stored,
		 * narrowed to what the instance offers them now.
		 *
		 * @return {string[]} The claimed team ids.
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		claimedTeamIds() {
			return resolveClaimedTeams(this.offeredTeams, this.claimedTeams)
		},

		/**
		 * The saved views this page renders as tabs, and the ones that stay in
		 * the views control. A view is in one or the other, never both.
		 *
		 * Split out of the SCOPED views, not the fetched ones: a view made on
		 * another page names fields this schema does not have, and is no more
		 * use as a tab than it is as a dropdown entry.
		 *
		 * @return {{tabs: Array<object>, control: Array<object>}}
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		splitSavedViews() {
			return splitViewsIntoTabs(this.visibleSavedViews, this.viewTabs)
		},

		/**
		 * The lens tabs, as the tab strip this page already has understands
		 * them, with each lens's claim tokens resolved against this person.
		 *
		 * @return {Array<object>} The tabs.
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		lensTabs() {
			return this.splitSavedViews.tabs.map((view) => {
				const tab = viewAsTab(view)
				const { filter, narrowsToNothing } = resolveClaimTokens(tab.filter, { teams: this.claimedTeamIds })
				return { ...tab, filter, narrowsToNothing }
			})
		},

		/**
		 * The views the control lists: every saved view this page did not name
		 * as a tab.
		 *
		 * @return {Array<object>} The views.
		 */
		viewsForControl() {
			return [...this.defaultFilterViews, ...this.splitSavedViews.control]
		},

		/**
		 * The page config overrides of the applied view (`overrides`), or null
		 * when no view is applied or it carries none. CnPageRenderer lays them
		 * over the page config while the view is active (`view-overrides`).
		 *
		 * @return {object|null}
		 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-view-can-override-the-page-config-while-it-is-active
		 */
		activeSavedViewOverrides() {
			const id = this.appliedSavedViewId
			if (!id) {
				return null
			}
			const views = [...this.defaultFilterViews, ...(this.savedViews || [])]
			const view = views.find((v) => v && (String(v.id) === id || String(v.slug) === id))
			return savedViewOverrides(view)
		},

		/**
		 * `activeSavedViewOverrides` as one comparable key.
		 *
		 * @return {string}
		 */
		activeSavedViewOverridesKey() {
			return JSON.stringify(this.activeSavedViewOverrides)
		},

		/**
		 * What the sidebar's saved-views panel shows, or null when the page
		 * does not offer saved views.
		 *
		 * @return {object|null}
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-6
		 */
		savedViewsForSidebar() {
			if (!this.savedViewsOffered) {
				return null
			}
			return {
				views: this.viewsForControl,
				loading: this.savedViewsLoading,
				currentUserId: this.currentSavedViewsUserId,
				counts: this.savedViewCounts,
				selectedViewId: this.appliedSavedViewId,
				menuIds: this.savedViewMenuIds,
			}
		},

		/**
		 * The route name this page's menu entries point at.
		 *
		 * @return {string}
		 */
		savedViewPage() {
			return (this.$route && typeof this.$route.name === 'string') ? this.$route.name : ''
		},

		/**
		 * The ids of this page's views in the app menu, or null when there is
		 * no menu to add to.
		 *
		 * @return {Array<string>|null}
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-7
		 */
		savedViewMenuIds() {
			const menu = this.cnSavedViewMenu
			if (!menu || typeof menu.toggle !== 'function' || this.savedViewPage === '') {
				return null
			}
			return (menu.entries || []).filter((e) => e.page === this.savedViewPage).map((e) => String(e.id))
		},

		/**
		 * The page's `defaultSavedViews` as read-only views.
		 *
		 * @return {Array<object>} The views.
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-4
		 */
		defaultFilterViews() {
			const defaults = (Array.isArray(this.defaultSavedViews) ? this.defaultSavedViews : []).map((entry) => (entry && typeof entry.name === 'string' ? { ...entry, name: this.cnTranslate(entry.name) } : entry))
			return defaultFilterViews(defaults, this.savedViewsPage)
		},

		/**
		 * The values the `filterStrip` offers: its options, else the field's
		 * schema enum, each `{ value, label }`.
		 *
		 * @return {Array<{value: string, label: string}>}
		 */
		filterStripValues() {
			const strip = this.filterStrip
			if (!strip || typeof strip !== 'object' || typeof strip.field !== 'string' || strip.field === '') {
				return []
			}
			const declared = Array.isArray(strip.options) ? strip.options : null
			const prop = (this.effectiveSchema?.properties || {})[strip.field] || {}
			const raw = declared || (Array.isArray(prop.enum) ? prop.enum.map((value) => ({ value })) : [])
			return raw
				.map((option) => (option && typeof option === 'object' ? option : { value: option }))
				.filter((option) => option.value !== undefined && option.value !== null && option.value !== '')
				.map((option) => ({ value: String(option.value), label: this.cnTranslate(String(option.label ?? option.value)) }))
		},

		/**
		 * The pills of the `filterStrip`: All, then one per value, with the
		 * active one marked and its count when `showCount` is on.
		 *
		 * @spec openspec/changes/screens-filter-strip/specs/index-filter-strip/spec.md#requirement-an-index-page-can-draw-a-second-filter-strip
		 * @return {Array<{key: string, value: string, label: string, active: boolean, count: (number|null)}>}
		 */
		filterStripEntries() {
			const values = this.filterStripValues
			if (values.length === 0) {
				return []
			}
			const current = this.effectiveActiveFilters[this.filterStrip.field]
			const picked = Array.isArray(current) ? current.map(String) : (current === undefined || current === null || current === '' ? [] : [String(current)])
			const counts = this.filterStripCounts || {}
			const countOf = (key) => (Object.hasOwn(counts, key) && typeof counts[key] === 'number' ? counts[key] : null)
			const allLabel = this.filterStrip.allLabel ? this.cnTranslate(this.filterStrip.allLabel) : t('nextcloud-vue', 'All')
			return [
				{ key: 'all', value: '', label: allLabel, active: picked.length === 0, count: countOf('all') },
				...values.map((option, index) => ({ key: `v${index}`, value: option.value, label: option.label, active: picked.length === 1 && picked[0] === option.value, count: countOf(`v${index}`) })),
			]
		},

		/** @return {string} The accessible name of the filter strip. */
		filterStripLabel() {
			const strip = this.filterStrip || {}
			if (strip.label) {
				return this.cnTranslate(strip.label)
			}
			const prop = (this.effectiveSchema?.properties || {})[strip.field] || {}
			return this.cnTranslate(prop.title || strip.field || '')
		},

		/**
		 * The filter of the active quick filter tab, which the strip's counts
		 * are narrowed by ("Soort, dan kanaal").
		 *
		 * @return {object}
		 */
		filterStripTabFilter() {
			const tabs = this.tabStripEntries || []
			const index = this.activeQuickFilterIndex
			const tab = index !== null && index !== undefined ? tabs[index] : null
			return tab && tab.filter && typeof tab.filter === 'object' ? tab.filter : {}
		},

		/**
		 * Changes whenever the strip's counts have to be read again: another
		 * quick filter, another page filter, or a list whose total moved.
		 *
		 * @return {string} The signature, '' when the strip counts nothing.
		 */
		/**
		 * What the `quickFiltersFrom` tabs depend on, as one key: a change
		 * asks again. Empty without the prop, or with `quickFilters` holding tabs.
		 *
		 * @return {string}
		 * @spec openspec/changes/index-quick-filters-from/specs/index-page/spec.md#requirement-quick-filters-can-come-from-a-field-s-values
		 */
		quickFiltersFromKey() {
			const from = this.quickFiltersFrom
			const declared = Array.isArray(this.quickFilters) && this.quickFilters.length > 0
			if (declared || !from || typeof from.field !== 'string' || from.field === '') {
				return ''
			}
			return JSON.stringify({ r: this.register, s: this.exportSchemaSlug, f: this.filter || null, q: from })
		},

		filterStripCountKey() {
			if (!this.filterStrip || this.filterStrip.showCount !== true || this.filterStripValues.length === 0) {
				return ''
			}
			return JSON.stringify({
				r: this.register,
				s: this.exportSchemaSlug,
				f: this.filter || null,
				q: this.filterStripTabFilter,
				v: this.filterStripValues.map((option) => option.value),
				t: Number((this.isSelfFetchMode ? this.list.pagination.value : this.effectivePagination)?.total ?? 0),
			})
		},

		/**
		 * The filters whose record count this page shows: quick filters that
		 * set `showCount`, and the saved views `viewCounts` names. Empty when
		 * nothing opted in, which is what keeps the page from making a count
		 * request nobody asked for.
		 *
		 * @return {Array<{key: string, filter: object}>} The filters to count.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
		 */
		countEntries() {
			const entries = []
			const tabs = this.tabStripEntries || []
			const lens = this.lensTabs.length > 0
			tabs.forEach((tab, index) => {
				const wants = lens ? this.viewWantsCount(tab.id) : (tab && tab.showCount === true)
				if (wants && tab.narrowsToNothing !== true) {
					entries.push({ key: `tab:${index}`, filter: tab.filter || {} })
				}
			})
			for (const view of this.viewsForControl) {
				const id = viewIdOf(view)
				if (this.viewWantsCount(id)) {
					entries.push({ key: `view:${id}`, filter: viewAsTab(view).filter })
				}
			}
			return entries
		},

		/**
		 * Changes whenever the counts have to be fetched again: another set
		 * of filters, another register or schema, or a list whose total moved
		 * (a record was added, removed, or left a filter).
		 *
		 * @return {string} The signature.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
		 */
		countRequestKey() {
			if (this.countEntries.length === 0) {
				return ''
			}
			return JSON.stringify({
				r: this.register,
				s: this.exportSchemaSlug,
				f: this.filter || null,
				e: this.countEntries,
				// The store's total, not the error override in effectivePagination,
				// so a failed fetch and its recovery do not refetch the counts.
				t: Number((this.isSelfFetchMode ? this.list.pagination.value : this.effectivePagination)?.total ?? 0),
			})
		},

		/**
		 * What the tab strip shows: the page's lens tabs when it named any,
		 * else its quick filters. One strip, never two, so a person is not
		 * offered the same narrowing twice under two names.
		 *
		 * @return {(Array<object>|null)} The tabs.
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		/**
		 * The chip the strip lights: the active tab, else the default tab of
		 * tabs that arrived after setup (`quickFiltersFrom`), which is the
		 * one the fetch applies.
		 *
		 * @return {number|null} The tab index, or null without tabs.
		 */
		shownQuickFilterIndex() {
			if (this.activeQuickFilterIndex !== null && this.activeQuickFilterIndex !== undefined) {
				return this.activeQuickFilterIndex
			}
			return this.quickFilterMultiple ? null : resolveInitialQuickFilterIndex(this.tabStripEntries)
		},

		tabStripEntries() {
			if (this.sourceRefusal) {
				return []
			}
			if (this.lensTabs.length > 0) {
				return this.lensTabs
			}
			return this.effectiveQuickFilters
		},

		/** @return {Array<object>} The shortcuts the help sheet lists. */
		shortcutHelpEntries() {
			return LIST_SHORTCUTS.filter((entry) => typeof this.listShortcutHandlers[entry.id] === 'function')
		},

		/** @return {string} Heading of the shortcut help sheet. */
		shortcutHelpTitle() {
			return t('nextcloud-vue', 'Keyboard shortcuts')
		},

		/** @return {string} Label of the help sheet's close button. */
		closeLabel() {
			return t('nextcloud-vue', 'Close')
		},

		/**
		 * Whether the active lens narrowed to nothing because this person has
		 * claimed no teams. The page says that, rather than showing an empty
		 * list under a heading that claims to be filtering by their teams.
		 *
		 * @return {boolean} True when the active lens has nothing to match.
		 */
		activeLensNarrowsToNothing() {
			const index = this.activeQuickFilterIndex
			if (index === null || index === undefined || this.lensTabs.length === 0) {
				return false
			}
			return Boolean(this.lensTabs[index] && this.lensTabs[index].narrowsToNothing)
		},

		/**
		 * The declarative sort this page applies, with the priority sort folded
		 * in when the page names a priority field. The value is READ off the
		 * record; nothing here derives one.
		 *
		 * @return {Array<object>} The sort spec.
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		effectiveDefaultSort() {
			const declared = Array.isArray(this.defaultSort) ? this.defaultSort : []
			if (this.priorityField === '') {
				return declared
			}
			if (declared.some((entry) => entry && entry.field === this.priorityField)) {
				return declared.map((entry) => (entry && entry.field === this.priorityField
					? { ...entry, levels: this.priorityLevels }
					: entry))
			}
			return [{ field: this.priorityField, order: 'desc', levels: this.priorityLevels }, ...declared]
		},

		/**
		 * The list's keyboard shortcuts, bound to what this page can do. A
		 * shortcut with nothing behind it is left out rather than listed.
		 *
		 * @return {object} Handlers by shortcut id.
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		listShortcutHandlers() {
			const handlers = {
				'row-next': () => this.moveFocusedRow(1),
				'row-previous': () => this.moveFocusedRow(-1),
				'row-open': () => this.focusedRow && this.onRowClick(this.focusedRow),
				'row-select': () => this.toggleFocusedRowSelection(),
				'list-help': () => { this.showShortcutHelp = true },
			}
			if (this.quickEditFields.length > 0) {
				handlers['row-quick-edit'] = () => this.focusedRow && this.openQuickEdit(this.focusedRow)
			}
			if (this.focusedRow && this.primaryRowActionFor(this.focusedRow)) {
				handlers['row-primary'] = () => this.runPrimaryRowAction()
			}
			return handlers
		},

		/**
		 * The shortcuts as command-palette entries, so someone who has never
		 * used this list can find every one of them.
		 *
		 * @return {Array<object>} The palette entries.
		 */
		listPaletteEntries() {
			return listPaletteCommands(this.listShortcutHandlers)
		},

		/**
		 * The row the keyboard is on, or null.
		 *
		 * @return {(object|null)} The focused row.
		 */
		focusedRow() {
			const rows = this.displayObjects || []
			if (this.focusedRowIndex < 0 || this.focusedRowIndex >= rows.length) {
				return null
			}
			return rows[this.focusedRowIndex]
		},

		/**
		 * The grouping field for a `field`-source folder sidebar.
		 *
		 * @return {string} The property the folders group by, or ''.
		 */
		folderSidebarGroupBy() {
			if (!this.folderSidebar) {
				return ''
			}
			return this.folderSidebar.groupBy || this.folderSidebar.field || ''
		},

		/**
		 * Facet buckets for the folder sidebar's grouping field.
		 *
		 * `:objects` is the current page, so folders derived from it alone list
		 * only the values that happen to have a row on screen. The platform
		 * already answers this properly: OpenRegister computes facets with the
		 * pagination parameters removed, so a facet over the grouping field is
		 * the complete set of distinct values with their true totals. Any
		 * property marked `facetable: true` gets one under `_facets=extend`.
		 *
		 * Read from the live store first, so the folder pane does not depend on
		 * the metadata sidebar being switched on, then from the sidebar config
		 * a consumer-managed page supplies, then from the folder config itself.
		 *
		 * @return {Array<object>} Normalised facet values, or [] when none.
		 */
		folderSidebarLiveFacetValues() {
			const field = this.folderSidebarGroupBy
			if (!field) {
				return []
			}

			const facets = this.storeFacets
				|| (this.folderSidebar && this.folderSidebar.facets)
				|| this.resolvedSidebar.facets
				|| {}

			return facets[field]?.values || []
		},

		/**
		 * The folders to show: the live facet, except while a folder is
		 * selected. Selecting one filters the query by the grouping field, so
		 * the live facet then holds that one value and every other folder
		 * would vanish, which makes switching folders impossible. The set seen
		 * before the selection stands in until it is cleared.
		 *
		 * @return {Array<object>} Normalised facet values.
		 */
		folderSidebarFacetValues() {
			const selected = this.selectedFolderId !== null && this.selectedFolderId !== undefined
			if (selected && this.folderSidebarAllValues.length > 0) {
				return this.folderSidebarAllValues
			}
			return this.folderSidebarLiveFacetValues
		},

		/**
		 * The facet buckets OpenRegister computed for THIS page's query, or
		 * null when this page does not fetch its own rows.
		 *
		 * Only self-fetch mode has them: the store keys facets by object type
		 * and rewrites that entry from the same response the rows came from, so
		 * what this returns always describes the query currently on screen.
		 * Consumer-managed, named-source and entity-source pages never fetch
		 * through the store, so there is nothing here to read and the caller
		 * falls back to whatever the consumer passed in.
		 *
		 * @return {object|null} The live facet map, or null.
		 */
		storeFacets() {
			return this.isSelfFetchMode ? (this.list.facets?.value || null) : null
		},

		/**
		 * The schema the presentation picker reads: the page's schema object
		 * once it has properties, else null (no picker).
		 *
		 * @return {object|null}
		 */
		viewPresentationSchema() {
			const schema = this.effectiveSchema
			return schema && typeof schema === 'object' && schema.properties && Object.keys(schema.properties).length > 0 ? schema : null
		},

		/**
		 * Reference columns that ask for a label (`labelField`), with the
		 * referenced register and schema read off the page schema's `$ref`.
		 *
		 * @return {Array<{key: string, labelField: string, register: string, schema: string, route: (string|null), sortByLabel: boolean}>}
		 * @spec openspec/changes/index-ref-column-labels/tasks.md#task-2
		 */
		refLabelSpecs() {
			const cols = this.tableColumns.filter((c) => c && typeof c === 'object' && typeof c.labelField === 'string' && c.labelField !== '' && !c.widget)
			if (cols.length === 0 || !this.effectiveSchema) {
				return []
			}
			const fields = fieldsFromSchema(this.effectiveSchema, { includeReadOnly: true })
			const specs = []
			for (const col of cols) {
				const field = fields.find((f) => f.key === col.key)
				const ref = field && field.reference
				if (!ref || ref.schema === undefined || ref.schema === null) {
					continue
				}
				const register = ref.register || (typeof this.register === 'string' ? this.register : '')
				const schema = String(ref.schema)
				specs.push({
					key: col.key,
					labelField: col.labelField,
					register,
					schema,
					route: typeof col.route === 'string' && col.route !== '' ? col.route : (col.link === true ? this.detailRouteFor(schema) : null),
					sortByLabel: col.sortByLabel === true,
				})
			}
			return specs
		},

		/**
		 * The rendered columns by key, so a card fact shows what its table
		 * cell shows (label, formatter, widget).
		 *
		 * @return {object} Column definitions keyed by property.
		 */
		cardFieldColumns() {
			const byKey = {}
			for (const col of this.renderedColumns || []) {
				if (col && typeof col === 'object' && typeof col.key === 'string') {
					byKey[col.key] = col
				}
			}
			return byKey
		},

		/**
		 * The property keys the board look's card facts show: the page's
		 * `cardFields`, else the first four list columns. Null without the
		 * look and without `cardFields`, so the card keeps its own default.
		 *
		 * @spec openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-a-record-card-has-a-head-facts-and-one-action
		 * @return {?Array<string>}
		 */
		resolvedCardFields() {
			const cardFields = this.presented('cardFields')
			if (Array.isArray(cardFields) && cardFields.length > 0) {
				return cardFields
			}
			if (!this.isBoardLook) {
				return null
			}
			// A page that declares no columns lets the table derive them from the schema; the card does the same.
			const columns = this.tableColumns.length > 0 ? this.tableColumns : columnsFromSchema(this.effectiveSchema || {})
			return columns
				.map((col) => (typeof col === 'string' ? col : col && col.key))
				.filter((key) => typeof key === 'string' && key !== '' && !key.startsWith('__'))
				.slice(0, 4)
		},

		/**
		 * Columns handed to CnDataTable: `tableColumns`, with each reference
		 * column that has a `labelField` rendered through the `refLabel` cell
		 * widget. Such a column is sortable only with `sortByLabel: true`
		 * (sorting by the key would sort by id, not by what the cell shows).
		 *
		 * @return {Array} The columns to render.
		 * @spec openspec/changes/index-ref-column-labels/tasks.md#task-2
		 */
		renderedColumns() {
			let cols = this.tableColumns
			if (this.refLookSpecs.length > 0) {
				const lookKeys = new Set(this.refLookSpecs.map((spec) => spec.key))
				cols = cols.map((col) => (col && typeof col === 'object' && lookKeys.has(col.key)
					? { ...col, widgetProps: { ...(col.widgetProps || {}), looks: this.refLooks[col.key] || {} } }
					: col))
			}
			if (this.refLabelSpecs.length > 0) {
				const byKey = new Map(this.refLabelSpecs.map((s) => [s.key, s]))
				cols = cols.map((col) => {
					const spec = col && typeof col === 'object' ? byKey.get(col.key) : null
					if (!spec) {
						return col
					}
					return {
						...col,
						widget: 'refLabel',
						widgetProps: { ...(col.widgetProps || {}), labels: this.refLabels[spec.key] || {}, route: spec.route },
						sortable: spec.sortByLabel,
					}
				})
			}
			// An `actions` column: the page's row actions it names, as buttons.
			cols = cols.map((col) => (col && typeof col === 'object' && col.widget === 'actions'
				? { ...col, sortable: false, widgetProps: { ...(col.widgetProps || {}), items: (row) => this.actionColumnItems(col, row), run: this.runColumnAction } }
				: col))
			// The Recent lens owns the order: no column sorts while it is on.
			if (this.recentLensActive) {
				cols = cols.map((col) => (col && typeof col === 'object' ? { ...col, sortable: false } : col))
			}
			if (this.followColumnOn && this.favouriteSchemaSlug !== '') {
				cols = [{ key: FOLLOW_COLUMN_KEY, label: '', sortable: false, width: '48px' }, ...cols]
			}
			return cols
		},

		/**
		 * Whether the follow column renders (`showFollowColumn`, or the deprecated `showFavouriteColumn`).
		 *
		 * @return {boolean}
		 * @spec openspec/changes/one-follow-control/specs/record-follow/spec.md#requirement-index-pages-offer-one-following-lens-and-a-follow-column
		 */
		followColumnOn() {
			return this.showFollowColumn || this.showFavouriteColumn
		},

		/**
		 * Whether the active quick filter is the Recent lens.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/record-favourite-and-follow/tasks.md#task-3
		 */
		recentLensActive() {
			const tabs = this.effectiveQuickFilters || []
			const index = this.activeQuickFilterIndex
			const active = (index !== null && index !== undefined) ? tabs[index] : null
			return !!(active && active.filter && active.filter._recent)
		},

		/**
		 * Schema slug the follow column calls with: the page's own slug in self-fetch
		 * mode, else the schema object's `slug`. Empty when neither is known.
		 *
		 * @return {string}
		 */
		favouriteSchemaSlug() {
			if (typeof this.schema === 'string') {
				return this.schema
			}
			return (this.effectiveSchema && typeof this.effectiveSchema.slug === 'string') ? this.effectiveSchema.slug : ''
		},

		/**
		 * The ids each reference label column needs, from the rows and the facet buckets.
		 *
		 * @return {Object<string, string[]>} Distinct ids per column key.
		 */
		/**
		 * The pills that take their tone and icon from the record they point at
		 * (`resolve: { colorField?, iconField?, register?, schema? }`): badge
		 * columns and the list view's leading and trailing cells
		 * (`widgetProps.resolve`), the board card's pill (`board.card.resolve`)
		 * and the record card's pills (`cardLayout` headPill, footerPill, chips).
		 * Register and schema default to the field's reference in the schema.
		 *
		 * @return {Array<{key: string, register: string, schema: string, colorField: string, iconField: string}>} The specs.
		 * @spec openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-badge-cell-takes-its-tone-and-icon-from-the-referenced-record
		 */
		refLookSpecs() {
			const list = this.listConfig || {}
			const listCells = [list.leading, ...(Array.isArray(list.trailing) ? list.trailing : [list.trailing])]
			const badgeSources = [...this.tableColumns, ...listCells]
				.filter((c) => c && typeof c === 'object' && c.widget === 'badge' && c.widgetProps)
				.map((c) => ({ key: c.key, resolve: c.widgetProps.resolve }))
			// The board card's pill (`board.card.pill` with `board.card.resolve`)
			// and the record card's pills (`cardLayout` headPill, footerPill,
			// chips, each with its own `resolve`).
			const card = this.board && this.board.card && typeof this.board.card === 'object' ? this.board.card : {}
			const layout = this.cardLayout && typeof this.cardLayout === 'object' ? this.cardLayout : {}
			const layoutPills = [layout.headPill, layout.footerPill, ...(Array.isArray(layout.chips) ? layout.chips : [])]
				.filter((def) => def && typeof def === 'object')
				.map((def) => ({ key: def.field, resolve: def.resolve }))
			// The map list's pills (`mapConfig.list.pills`, each with its own `resolve`).
			const mapListPills = (this.mapListEnabled && Array.isArray(this.mapConfig.list.pills) ? this.mapConfig.list.pills : [])
				.filter((def) => def && typeof def === 'object')
				.map((def) => ({ key: def.path, resolve: def.resolve }))
			const seen = new Set()
			const cols = [...badgeSources, { key: card.pill, resolve: card.resolve }, ...layoutPills, ...mapListPills].filter((c) => {
				const wanted = typeof c.key === 'string' && c.key !== '' && c.resolve && typeof c.resolve === 'object'
					&& (c.resolve.colorField || c.resolve.iconField) && !seen.has(c.key)
				if (wanted) {
					seen.add(c.key)
				}
				return wanted
			})
			if (cols.length === 0) {
				return []
			}
			const fields = this.effectiveSchema ? fieldsFromSchema(this.effectiveSchema, { includeReadOnly: true }) : []
			const specs = []
			for (const col of cols) {
				const resolve = col.resolve
				const field = fields.find((f) => f.key === col.key)
				const ref = (field && field.reference) || {}
				const register = resolve.register || ref.register || (typeof this.register === 'string' ? this.register : '')
				const schema = resolve.schema || (ref.schema !== undefined && ref.schema !== null ? String(ref.schema) : '')
				if (!register || !schema) {
					continue
				}
				specs.push({ key: col.key, register, schema, colorField: resolve.colorField || '', iconField: resolve.iconField || '' })
			}
			return specs
		},

		/**
		 * `listConfig` with the referenced records' looks on its badge cells,
		 * as `renderedColumns` does for the table.
		 *
		 * @return {object} The list view's config.
		 * @spec openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-badge-cell-takes-its-tone-and-icon-from-the-referenced-record
		 */
		renderedListConfig() {
			const list = this.listConfig
			if (!list || this.refLookSpecs.length === 0) {
				return list
			}
			const lookKeys = new Set(this.refLookSpecs.map((spec) => spec.key))
			const withLooks = (cell) => (cell && typeof cell === 'object' && lookKeys.has(cell.key)
				? { ...cell, widgetProps: { ...(cell.widgetProps || {}), looks: this.refLooks[cell.key] || {} } }
				: cell)
			return {
				...list,
				...(list.leading ? { leading: withLooks(list.leading) } : {}),
				...(list.trailing ? { trailing: Array.isArray(list.trailing) ? list.trailing.map(withLooks) : withLooks(list.trailing) } : {}),
			}
		},

		/**
		 * The ids each `refLookSpecs` column shows on screen.
		 *
		 * @return {{[key: string]: Array<string>}} Sorted ids by column key.
		 */
		refLookIds() {
			const out = {}
			for (const spec of this.refLookSpecs) {
				const ids = new Set()
				for (const row of this.displayObjects) {
					const v = row ? row[spec.key] : undefined
					;(Array.isArray(v) ? v : [v]).forEach((id) => {
						if (id !== null && id !== undefined && id !== '' && typeof id !== 'object') {
							ids.add(String(id))
						}
					})
				}
				out[spec.key] = [...ids].sort()
			}
			return out
		},

		refLabelIds() {
			const out = {}
			const facets = this.storeFacets || this.resolvedSidebar.facets || {}
			for (const spec of this.refLabelSpecs) {
				const ids = new Set()
				for (const row of this.displayObjects) {
					const v = row ? row[spec.key] : undefined
					;(Array.isArray(v) ? v : [v]).forEach((id) => {
						if (id !== null && id !== undefined && id !== '' && typeof id !== 'object') {
							ids.add(String(id))
						}
					})
				}
				const values = facets[spec.key] && Array.isArray(facets[spec.key].values) ? facets[spec.key].values : []
				values.forEach((fv) => {
					const id = fv && typeof fv === 'object' ? fv.value : fv
					if (id !== null && id !== undefined && id !== '') {
						ids.add(String(id))
					}
				})
				out[spec.key] = [...ids].sort()
			}
			return out
		},

		/**
		 * Facet data for the index sidebar.
		 *
		 * The `sidebar.facets` key is a DATA channel, not a declaration of
		 * which facets exist: its docblock calls it "live facet data" and it
		 * feeds CnIndexSidebar's `facetData` prop unchanged. Which filters the
		 * sidebar offers comes from the schema (`filtersFromSchema` over the
		 * facetable properties), and a filter with no bucket falls back to its
		 * own declarative `options`. So there is nothing to merge here — the
		 * two sources answer the same question, and the fresher one wins.
		 *
		 * A manifest-driven page has no consumer to fill `sidebar.facets`, so
		 * before this read the sidebar was handed the manifest's sidebar config
		 * and every facet rendered "No results" while the response body carried
		 * the buckets.
		 *
		 * Note the store wins even when it is empty (`{}` is truthy), which is
		 * deliberate and the conservative direction: until the first response
		 * lands, offering no options is right, and offering options left over
		 * from a config that never described this query would be worse. Same
		 * precedence `folderSidebarFacetValues` has always used.
		 *
		 * @return {object} `{ fieldName: { values: [...] } }`, possibly empty.
		 */
		effectiveFacetData() {
			const data = this.storeFacets || this.resolvedSidebar.facets || {}
			if (this.refLabelSpecs.length === 0) {
				return data
			}
			// A facet over a reference column lists labels; the value stays the id.
			const out = { ...data }
			for (const spec of this.refLabelSpecs) {
				const facet = data[spec.key]
				const labels = this.refLabels[spec.key] || {}
				if (facet && Array.isArray(facet.values)) {
					out[spec.key] = {
						...facet,
						values: facet.values.map((fv) => {
							const id = fv && typeof fv === 'object' ? fv.value : fv
							const label = labels[String(id)]
							const base = fv && typeof fv === 'object' ? fv : { value: fv }
							return label ? { ...base, label } : base
						}),
					}
				}
			}
			return out
		},

		/**
		 * Whether the rows handed to the folder sidebar are only part of the
		 * result set. True when the list is paged beyond what is loaded and no
		 * facet is available to complete the picture, which is exactly when
		 * folders can be missing and a per-page count would read as a total.
		 *
		 * @return {boolean} True when the folder list is knowingly incomplete.
		 */
		folderSidebarPartial() {
			if (this.folderSidebarFacetValues.length > 0) {
				return false
			}
			const total = Number(this.effectivePagination?.total ?? 0)
			return total > this.effectiveObjects.length
		},

		/**
		 * id/name field names passed to CnFolderSidebar for the custom folder
		 * list. The `register` source is pre-mapped to `{ id, name }` by
		 * `loadFolderRegister`, so it uses the plain keys; a `custom` source
		 * passes the objects through untouched and honours the config's fields.
		 *
		 * @return {string} The id field key.
		 */
		folderPassthroughIdField() {
			if (this.folderSidebar && (this.folderSidebar.source === 'register' || this.folderSidebar.source === 'groups')) {
				return 'id'
			}
			return (this.folderSidebar && this.folderSidebar.idField) || 'id'
		},

		/**
		 * @return {string} The name field key for CnFolderSidebar's custom list.
		 */
		folderPassthroughNameField() {
			if (this.folderSidebar && (this.folderSidebar.source === 'register' || this.folderSidebar.source === 'groups')) {
				return 'name'
			}
			return (this.folderSidebar && this.folderSidebar.nameField) || 'name'
		},

		/**
		 * Inline GeoJSON markers for the map view, built from the CURRENT filtered
		 * `displayObjects` using `mapConfig`. Each feature stashes the row's
		 * `rowKey` in `properties` so a marker click can resolve back to its source
		 * row. Rows without finite, resolvable geometry are skipped silently.
		 *
		 * @return {{ features: object[], popupField: (string|undefined) }}
		 */
		mapMarkers() {
			const features = []
			// With the list beside the map, a pin carries the row's number there.
			const numbers = this.mapListEnabled ? new Map(this.mapList.items.map((item) => [item.row, item.n])) : null
			for (const row of this.displayObjects) {
				const geometry = this.resolveRowGeometry(row)
				if (!geometry) {
					continue
				}
				const markerColor = resolveCssColor(markerColorOf(row, this.mapMarkerColor, this.mapColorRefsById))
				features.push({
					type: 'Feature',
					geometry,
					properties: {
						[this.rowKey]: row[this.rowKey],
						...(markerColor ? { markerColor } : {}),
						...(this.mapConfig.popupField ? { [this.mapConfig.popupField]: row[this.mapConfig.popupField] } : {}),
						...(numbers && numbers.has(row) ? { markerNumber: numbers.get(row), markerActive: this.activeMapKey === String(row[this.rowKey]) } : {}),
					},
				})
			}
			return { features, popupField: this.mapConfig.popupField }
		},

		/**
		 * Whether to cluster the plotted markers. ON unless `mapConfig.clustering`
		 * says otherwise, which is the opposite of `CnMapWidget`'s own default.
		 *
		 * An index map plots the whole filtered result set, and rows sharing one
		 * address is the normal case here, not an edge case — several permits on a
		 * building, a street of complaints. Unclustered, those markers stack at
		 * identical pixels: the topmost swallows every click and the rest are
		 * unreachable with nothing on screen saying they exist. Clustering shows the
		 * count and, since all children stay in one cluster down to max zoom,
		 * markercluster spiderfies them into a fan on click instead of zooming
		 * uselessly. Non-point geometry skips the cluster group entirely, so areas
		 * are unaffected.
		 *
		 * @return {boolean}
		 */
		mapClustering() {
			return this.mapConfig.clustering !== false
		},

		/**
		 * The marker colour rule (`mapConfig.markerColor`), or null.
		 *
		 * @return {object|null} The normalised rule.
		 * @spec openspec/changes/index-map-parity/specs/index-page/spec.md#requirement-a-marker-can-take-its-colour-from-a-field
		 */
		mapMarkerColor() {
			return normalizeMarkerColor(this.mapConfig && this.mapConfig.markerColor)
		},

		/** @return {Map<string, object>} The marker colour source rows by id. */
		mapColorRefsById() {
			return new Map((this.mapColorRefs || []).map((row) => [refIdOf(row), row]))
		},

		/** @return {string} Changes when the marker colour source must be read. */
		mapColorFetchKey() {
			const source = this.mapMarkerColor && this.mapMarkerColor.source
			if (this.currentViewMode !== 'map' || !source) {
				return ''
			}
			return [this.mapMarkerColor.field, source.register || '', source.schema || '', this.effectiveSchema ? 1 : 0].join('|')
		},

		/**
		 * How many rows the map plots when it plots every matching row
		 * (`mapConfig.plotAll`: `true` for 500, or a
		 * number), 0 when it plots the current page.
		 *
		 * @return {number} The limit.
		 * @spec openspec/changes/index-map-parity/specs/index-page/spec.md#requirement-the-map-can-plot-every-matching-row
		 */
		mapPlotAllLimit() {
			return mapPlotAllLimitOf(this.mapConfig)
		},

		/** @return {number} The rows that match the filters. */
		mapMatchTotal() {
			return Math.max(this.displayObjects.length, Number(this.effectivePagination?.total || 0))
		},

		/**
		 * The count line under the map (`mapConfig.count`): `true` for "Showing
		 * {located} of {total} located", or a template with `{located}` and
		 * `{total}` through the host's translate. '' when not asked for.
		 *
		 * @return {string} The line.
		 * @spec openspec/changes/index-map-parity/specs/index-page/spec.md#requirement-the-map-can-say-how-many-rows-it-placed
		 */
		mapCountLine() {
			const count = this.mapConfig && this.mapConfig.count
			if (this.currentViewMode !== 'map' || !count) {
				return ''
			}
			const vars = { located: this.mapMarkers.features.length, total: this.mapMatchTotal }
			if (typeof count === 'string' && count !== '') {
				return this.cnTranslate(count).replace(/\{(located|total)\}/g, (_, key) => String(vars[key]))
			}
			return t('nextcloud-vue', 'Showing {located} of {total} located', vars)
		},

		/**
		 * The note when a map that plots every row hit its limit.
		 *
		 * @return {string} The note, or ''.
		 */
		mapCapNote() {
			const limit = this.mapPlotAllLimit
			if (this.currentViewMode !== 'map' || limit === 0 || this.mapMatchTotal <= this.displayObjects.length) {
				return ''
			}
			return t('nextcloud-vue', 'The map shows the first {limit} of {total}. Narrow the filters to see the rest.', { limit: this.displayObjects.length, total: this.mapMatchTotal })
		},

		/** @return {number|undefined} The map's initial zoom (`mapConfig.zoom`), when a number. */
		mapZoom() {
			const zoom = this.mapConfig && this.mapConfig.zoom
			return typeof zoom === 'number' && Number.isFinite(zoom) ? zoom : undefined
		},

		/** @return {boolean} Whether the map draws its numbered list (`mapConfig.list`). */
		mapListEnabled() {
			const list = this.mapConfig && this.mapConfig.list
			return Boolean(list && typeof list === 'object' && typeof list.title === 'string' && list.title !== '')
		},

		/**
		 * The map list's entries, numbered as the pins, and the rows without a
		 * place. Templates go through the host's translate first.
		 *
		 * @return {{items: Array<object>, missing: Array<object>}}
		 */
		mapList() {
			if (!this.mapListEnabled) {
				return { items: [], missing: [] }
			}
			const list = this.mapConfig.list
			const translated = {
				...list,
				title: this.cnTranslate(list.title),
				sub: Array.isArray(list.sub) ? list.sub.map((s) => this.cnTranslate(s)) : (list.sub ? this.cnTranslate(list.sub) : ''),
				due: list.due ? this.cnTranslate(list.due) : '',
			}
			return mapListItems(this.displayObjects, translated, {
				rowKey: this.rowKey,
				located: (row) => Boolean(this.resolveRowGeometry(row)),
				translate: (text) => this.cnTranslate(text),
				formatters: this.cnFormatters,
				looks: this.refLooks,
			})
		},

		/** @return {string} The list's accessible name. */
		mapListLabel() {
			return t('nextcloud-vue', 'On the map')
		},

		/** @return {string} The card under the list, for the rows without a place. */
		mapMissingTitle() {
			return n('nextcloud-vue', '%n without an address', '%n without an address', this.mapList.missing.length)
		},

		/** @return {string} The link from that card to the table. */
		mapMissingLink() {
			return t('nextcloud-vue', 'Show them in the table')
		},

		/**
		 * Extra (non-background) map layers — WMS / WFS / GeoJSON overlays declared in
		 * `mapConfig.layers`. The background map comes from `mapBasemaps` instead, so
		 * this is empty unless the consumer configured overlays.
		 *
		 * @return {Array<object>}
		 */
		mapLayers() {
			if (Array.isArray(this.mapConfig.layers) && this.mapConfig.layers.length > 0) {
				return this.mapConfig.layers
			}
			return []
		},

		/**
		 * Switchable background maps.
		 *
		 * Defaults to OpenStreetMap standard ONLY. Every extra basemap is an `<img>`
		 * load from a third-party host, which a Nextcloud app's Content-Security-Policy
		 * (`img-src`) blocks unless that app explicitly allowlists the host — so a
		 * richer default would ship dead options to consumers that never widened their
		 * CSP. Apps that want a switcher declare the set in `mapConfig.basemaps` AND
		 * allowlist those hosts (see Dossiq's `relaxCspForMapTiles()`).
		 *
		 * @return {Array<object>}
		 */
		mapBasemaps() {
			if (Array.isArray(this.mapConfig.basemaps) && this.mapConfig.basemaps.length > 0) {
				return this.mapConfig.basemaps
			}
			return [{
				name: t('nextcloud-vue', 'Standard'),
				url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				attribution: '© OpenStreetMap contributors',
			}]
		},

		/**
		 * Initial map centre `[lat, lng]`. Uses the centroid of the plotted markers
		 * when any exist (CnMapWidget's autoFit then tightens to the bounds); falls
		 * back to `mapConfig.center`, then a neutral world view when the set is empty.
		 *
		 * @return {[number, number]}
		 */
		mapCenter() {
			const feats = this.mapMarkers.features
			if (feats.length > 0) {
				let sumLat = 0
				let sumLng = 0
				for (const f of feats) {
					const _p = this.firstLatLng(f.geometry)
					if (!_p) {
						continue
					}
					sumLng += _p.lng
					sumLat += _p.lat
				}
				return [sumLat / feats.length, sumLng / feats.length]
			}
			if (Array.isArray(this.mapConfig.center) && this.mapConfig.center.length === 2) {
				return this.mapConfig.center
			}
			return [0, 0]
		},

		/** Loading flag: store loading in self-fetch mode, else the `loading` prop. */
		effectiveLoading() {
			if (this.isNamedSource) {
				return this.namedLoading
			}
			if (this.sortSourceShown) {
				return this.sortSource.state === 'loading'
			}
			return this.isSelfFetchMode ? !!this.list.loading.value : this.loading
		},

		/**
		 * Whether to replace the page with the full loading spinner. Only on an
		 * INITIAL fetch — i.e. while loading AND there is no data to show yet.
		 * A background refresh (e.g. the on-visibility refetch) keeps the
		 * existing rows on screen and updates them in place instead of flashing
		 * the spinner over already-rendered content (fetchCollection preserves
		 * the prior collection until the new results arrive).
		 */
		showInitialLoader() {
			return this.effectiveLoading && this.effectiveObjects.length === 0
		},

		/**
		 * Refresh-spinner flag for the Actions menu: the `refreshing` prop
		 * OR (self-fetch mode) the internally-tracked refresh. Lets manifest
		 * and self-fetch pages spin the Refresh action without the host
		 * wiring `:refreshing` (it has no fetch promise to await).
		 */
		effectiveRefreshing() {
			return this.refreshing || this.internalRefreshing
		},

		/** Pagination: store pagination in self-fetch mode, else the `pagination` prop. */
		effectivePagination() {
			if (this.sortSourceShown) {
				return this.sortSourceView.pagination
			}
			if (this.selfFetchFailed) {
				return { ...this.list.pagination.value, total: 0, page: 1, pages: 1 }
			}
			// A named source that reports its own total (the search source)
			// gives the count line its number.
			if (this.isNamedSource && this.namedSource && typeof this.namedSource.total === 'function') {
				const total = this.namedSource.total()
				// A source with `pages: true` gets the pager the self-fetched lists draw.
				if (this.namedSource.pages === true) {
					const { page, limit } = this.namedPaging
					return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
				}
				return { ...(this.pagination || {}), total }
			}
			return this.isSelfFetchMode ? this.list.pagination.value : this.pagination
		},

		/**
		 * The saved view the page has applied, or null.
		 *
		 * @return {object|null}
		 */
		appliedSavedView() {
			const id = this.appliedSavedViewId
			if (!id) {
				return null
			}
			return (this.savedViews || []).find((view) => view && (String(view.id) === id || String(view.slug) === id || String(view.uuid) === id)) || null
		},

		/**
		 * The search field's placeholder: the open view's own
		 * (`searchPlaceholderByView`), else the page's or its preset's.
		 *
		 * @spec openspec/changes/search-placeholder-per-view/specs/index-page/spec.md#requirement-the-search-placeholder-can-differ-per-view
		 * @return {string}
		 */
		shownSearchPlaceholder() {
			const byView = this.searchPlaceholderByView
			const own = byView && typeof byView === 'object' ? byView[this.currentViewMode] : ''
			const text = typeof own === 'string' && own !== '' ? own : this.presented('searchPlaceholder')
			return text ? this.cnTranslate(text) : text
		},

		/**
		 * The term a named source searched for, for `{term}` in the title and
		 * the count line ("Zoeken: Lindelaan"), or ''.
		 *
		 * @return {string}
		 */
		sourceTerm() {
			return this.isNamedSource && this.namedSource && typeof this.namedSource.term === 'function' ? String(this.namedSource.term() || '') : ''
		},

		/**
		 * The page title with `{term}` filled in.
		 *
		 * @return {string}
		 */
		shownTitle() {
			const title = this.presented('title')
			// A title with the term is translated here, before the term goes in,
			// so its catalogue entry is found ("Zoeken: {term}").
			return typeof title === 'string' && title.includes('{term}')
				? this.cnTranslate(title).replace(/\{term\}/g, this.sourceTerm)
				: title
		},

		/**
		 * Whether the table marks unread rows. `showUnreadRows` decides when
		 * the page sets it. Otherwise the boards draw every row alike, so under
		 * the board look only a page that offers the Unread lens
		 * (`personalLenses`) marks them; the Nextcloud look always does.
		 *
		 * @spec openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-unread-rows-are-marked-only-where-the-reader-asked-for-them
		 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-page-can-ask-for-its-unread-rows
		 * @return {boolean} True when unread rows read in bold with the dot.
		 */
		marksUnreadRows() {
			if (typeof this.showUnreadRows === 'boolean') {
				return this.showUnreadRows
			}
			if (!this.isBoardLook) {
				return true
			}
			return Array.isArray(this.personalLenses) && this.personalLenses.includes('unread')
		},

		/** Resolved schema OBJECT (for column generation / icons / labels). */
		/**
		 * Whether the table shows its header filters. A self-fetching page
		 * applies them itself, with or without a resolved schema (the columns
		 * then say how each one filters, else a text filter on contains). A
		 * host-fed table shows them when a schema came along, as before, or
		 * when the host listens for `filter-change`; a filter nobody applies
		 * would be a control that does nothing.
		 *
		 * @spec openspec/changes/audit-round-lib-fixes/specs/cn-data-table/spec.md
		 * @return {boolean} True when header filters show.
		 */
		tableHeaderFilters() {
			if (!this.headerFilters) {
				return false
			}
			// A named source that narrows its own rows asks for the buttons.
			if (this.isNamedSource && this.namedSource && this.namedSource.headerFilters === true) {
				return true
			}
			if (this.effectiveSchema || this.isSelfFetchMode) {
				return true
			}
			const vnodeProps = (this.$ && this.$.vnode && this.$.vnode.props) || {}
			return typeof vnodeProps.onFilterChange === 'function' || Array.isArray(vnodeProps.onFilterChange)
		},

		effectiveSchema() {
			if (this.isSelfFetchMode) {
				return this.list.schema.value
			}
			return (this.schema && typeof this.schema === 'object') ? this.schema : null
		},

		/** The form dialog's schema: the edited row's own when it is of another pair. */
		formSchema() {
			return this.rowFormTarget ? this.rowFormSchema : this.effectiveSchema
		},

		/** The form dialog's register, following `formSchema`. */
		formRegister() {
			return this.rowFormTarget ? this.rowFormTarget.register : this.register
		},

		/**
		 * Schema slug for the export-leaf URL — the `schema` prop directly
		 * when it's a string (self-fetch mode's precondition), else the
		 * resolved schema object's `slug`/`name`.
		 */
		exportSchemaSlug() {
			if (typeof this.schema === 'string') {
				return this.schema
			}
			return this.effectiveSchema?.slug || this.effectiveSchema?.name || ''
		},

		/**
		 * Whether the native Export menu renders in the toolbar: opt-in via
		 * `allowExport` AND the resolved schema flagged `exportable: true`.
		 * Default-safe — false unless both hold.
		 */
		showExportMenu() {
			return Boolean(this.allowExport) && this.schemaExportable && Boolean(this.register) && Boolean(this.exportSchemaSlug)
		},

		/**
		 * Whether the schema is flagged exportable, in either place
		 * OpenRegister could keep the flag: the top-level `exportable`, or
		 * `configuration.exportable`. The top-level field wins when both are
		 * set.
		 *
		 * @return {boolean}
		 */
		schemaExportable() {
			const schema = this.effectiveSchema
			if (schema && schema.exportable !== undefined && schema.exportable !== null) {
				return Boolean(schema.exportable)
			}
			return Boolean(schema && schema.configuration && schema.configuration.exportable)
		},

		/**
		 * The sentence the mass-export dialog opens with: which rows it will
		 * export, and how many.
		 *
		 * @return {string}
		 */
		massExportScopeText() {
			const selected = this.internalSelectedIds.length
			if (selected > 0) {
				return selected === 1
					? t('nextcloud-vue', 'Export 1 selected row')
					: t('nextcloud-vue', 'Export {count} selected rows', { count: selected })
			}
			const total = this.effectivePagination && this.effectivePagination.total
			return typeof total === 'number'
				? t('nextcloud-vue', 'Export {count} rows matching the current filter', { count: total })
				: t('nextcloud-vue', 'Export the rows matching the current filter')
		},

		/**
		 * The signed-in NC user id — passed to CnSavedViewsControl to gate
		 * the per-view delete affordance (saved-views-ui).
		 *
		 * @return {string}
		 */
		/**
		 * The page as `savedViewScope` and `viewMatchesScope` take it.
		 *
		 * @return {{ scope: string, register: string, schema: object|string|null }} The page's source.
		 */
		savedViewsPage() {
			return { scope: this.savedViewsScope, register: this.register, schema: this.schema, source: this.entitySource }
		},

		/**
		 * Whether this page offers saved views in its sidebar.
		 *
		 * @return {boolean}
		 */
		savedViewsOffered() {
			return pageOffersSavedViews(this)
		},

		/**
		 * The fetched views that belong on this page.
		 *
		 * @return {Array<object>} The views to offer.
		 */
		visibleSavedViews() {
			return this.savedViews.filter((view) => viewMatchesScope(view, this.savedViewsPage))
		},

		currentSavedViewsUserId() {
			const user = getCurrentUser()
			return (user && user.uid) || ''
		},

		/**
		 * Confirmation message for the delete-saved-view dialog.
		 *
		 * @return {string}
		 */
		deleteViewMessage() {
			if (!this.viewPendingDelete) {
				return ''
			}
			const view = this.viewPendingDelete
			const parts = [t('nextcloud-vue', 'The view "{name}" leaves your list and the menu on the left.', { name: view.name })]
			const audience = normalizeSharedWith(view.sharedWith).map((e) => e.user || e.group)
			if (audience.length > 0) {
				parts.push(t('nextcloud-vue', 'It is shared with {names}; it leaves their lists too.', { names: audience.join(', ') }))
			}
			parts.push(t('nextcloud-vue', 'The items themselves stay. This cannot be undone.'))
			return parts.join(' ')
		},

		/** Sort key / order: list state in self-fetch mode, else the props. */
		effectiveSortKey() {
			if (this.isNamedSource && this.namedSource && this.namedSource.sortsRows === true) {
				return this.namedSort.key || null
			}
			return this.isSelfFetchMode ? this.list.sortKey.value : this.sortKey
		},

		effectiveSortOrder() {
			if (this.isNamedSource && this.namedSource && this.namedSource.sortsRows === true) {
				return this.namedSort.order || 'asc'
			}
			return this.isSelfFetchMode ? this.list.sortOrder.value : this.sortOrder
		},

		/**
		 * Ordered multi-column sort state fed to CnDataTable: the self-fetch
		 * list's `sortKeys` in self-fetch mode, else the host-controlled
		 * `sortKeys` prop.
		 *
		 * @return {Array<{key: string, order: 'asc'|'desc'}>}
		 */
		effectiveSortKeys() {
			return this.isSelfFetchMode ? (this.list.sortKeys.value || []) : this.sortKeys
		},

		/** Search term / visible columns / active facet filters for the embedded sidebar. */
		effectiveSearchValue() {
			if (this.namedSourceSearches) {
				return this.namedSearchTerm || ''
			}
			return this.isSelfFetchMode ? (this.list.searchTerm.value || '') : (this.searchValue || '')
		},

		effectiveVisibleColumns() {
			// A saved view that carries columns wins while applied, then the person's
			// own layout, then the page's columns.
			if (Array.isArray(this.appliedViewColumns)) {
				return this.appliedViewColumns
			}
			if (this.personalColumns && this.personalLayout && Array.isArray(this.personalLayout.columns)) {
				const known = [...this.governedColumns.map((c) => c.key), ...this.declaredColumns.map((c) => (typeof c === 'string' ? c : c.key))]
				const layout = reconcilePersonalColumns(this.personalLayout, known)
				if (layout) {
					return layout.columns
				}
			}
			return this.isSelfFetchMode ? this.list.visibleColumns.value : this.visibleColumns
		},

		/** @return {string[]} The link kinds a copy may take along (`copy.include`, known kinds only). */
		copyIncludeKinds() {
			return copyKindsOf(this.copy && this.copy.include)
		},

		/** @return {string} The register as a slug, for the copy endpoint. */
		copyRegisterSlug() {
			return typeof this.register === 'string' ? this.register : ''
		},

		/** @return {string} The schema as a slug, for the copy endpoint. */
		copySchemaSlug() {
			if (typeof this.schema === 'string') {
				return this.schema
			}
			return (this.effectiveSchema && this.effectiveSchema.slug) || ''
		},

		/**
		 * The row-class function the table takes: a function as given, or the
		 * manifest's rules compiled.
		 *
		 * @return {?(row: object) => string}
		 */
		compiledRowClass() {
			return compileRowClass(this.rowClass)
		},

		/** @return {number} How many leading columns the person pinned (0 while a saved view's columns are applied). */
		pinnedColumnCount() {
			if (!this.personalColumns || Array.isArray(this.appliedViewColumns) || !this.personalLayout) {
				return 0
			}
			return Math.max(0, Math.min(Number(this.personalLayout.pinned) || 0, this.tableColumns.length))
		},

		effectiveActiveFilters() {
			if (this.isSelfFetchMode) {
				return this.list.activeFilters.value || {}
			}
			// A named source's own state wins over the prop, and only once it
			// holds something: a consumer-managed page that ALSO names a
			// source keeps its `activeFilters` until the sidebar is used.
			if (this.isNamedSource && Object.keys(this.namedActiveFilters || {}).length > 0) {
				return this.namedActiveFilters
			}
			return this.activeFilters || {}
		},

		/**
		 * Enum schema columns offered in the header filter menu: one entry per
		 * visible column whose schema property declares an `enum`, with its
		 * values. Empty (so the menu hides) when there is no schema or no enum
		 * column. Drives the `showFilterMenu` funnel button.
		 *
		 * @return {Array<{ key: string, label: string, values: string[] }>}
		 */
		filterableFields() {
			const props = this.effectiveSchema?.properties || {}
			const out = []
			for (const col of this.tableColumns) {
				const key = typeof col === 'string' ? col : col.key
				const def = props[key] || {}
				const colObj = typeof col === 'object' ? col : {}
				// Source the filter values, in priority order: schema enum, a
				// column `enum` hint, or a badge column's colorMap keys (so a
				// status column stays filterable even when the runtime schema
				// doesn't carry the enum).
				let values = null
				if (Array.isArray(def.enum) && def.enum.length) {
					values = def.enum
				} else if (Array.isArray(colObj.enum) && colObj.enum.length) {
					values = colObj.enum
				} else if (colObj.widget === 'badge' && colObj.widgetProps && colObj.widgetProps.colorMap) {
					values = Object.keys(colObj.widgetProps.colorMap)
				}
				if (values && values.length) {
					out.push({ key, label: this.cnTranslate(colObj.label || def.title || key), values: values.map((v) => String(v)) })
				}
			}
			return out
		},

		/**
		 * Ordered column definitions the sidebar's Columns tab governs:
		 * schema-derived columns, the built-in Metadata group (when shown),
		 * and any external columnGroups. Mirrors CnIndexSidebar's column
		 * universe, and doubles as the source of definitions for columns the
		 * user enables that aren't in the configured `columns` list (metadata
		 * fields, schema properties beyond the default set).
		 */
		governedColumns() {
			const defs = []
			if (this.effectiveSchema) {
				// English labels here: `governedColumns` feeds `tableColumns`,
				// which CnDataTable render-translates via its own `cnTranslate`
				// injection. Translating here too would double-translate. The
				// column-picker menu that renders these labels directly applies
				// `cnTranslate` at render instead.
				defs.push(...columnsFromSchema(this.effectiveSchema, {}))
				if (this.resolvedSidebar.showMetadata !== false) {
					defs.push(...METADATA_COLUMNS)
				}
			}
			const groups = this.resolvedSidebar.columnGroups || []
			groups.forEach((g) => defs.push(...(g.columns || [])))
			return defs
		},

		/**
		 * Set of keys the sidebar governs (see `governedColumns`). Used so
		 * tableColumns only hides columns the user can actually toggle back
		 * on — custom columns outside this set are never silently dropped.
		 */
		sidebarGovernedColumnKeys() {
			return new Set(this.governedColumns.map((c) => c.key))
		},

		/**
		 * The columns this page DECLARES it has: the `columns` prop, or a named
		 * source's own list when the manifest set none. This is the membership
		 * list, separate from `tableColumns`, which is what ends up rendered
		 * after the sidebar scope and the user's visible-column set have had
		 * their say over it.
		 *
		 * @return {Array} The declared column list.
		 */
		declaredColumns() {
			// A NAMED SOURCE SUPPLIES ITS OWN COLUMNS when the manifest does not.
			// Without this the adapter's `columns` were defined and never read:
			// an `entitySource` page with no explicit `columns` fell through to
			// `governedColumns`, which derives from a SCHEMA — and a named
			// source has none. The table then rendered its rows with no columns
			// at all, which looks like an empty list rather than a missing
			// config. A manifest that DOES set columns still wins, which is
			// what makes the source a default rather than a constraint.
			return (this.columns && this.columns.length > 0)
				? this.columns
				: ((this.isNamedSource && this.namedSource && this.namedSource.columns) || [])
		},

		/**
		 * Columns handed to CnDataTable. Starts from `declaredColumns`, or from
		 * the active folder-sidebar scope's selection of them (with any
		 * `aggregate` block lacking a `register` defaulted to this page's
		 * `register` slug, so manifests can omit `aggregate.register`). When a
		 * visible-column set exists, governed columns the user toggled off are
		 * hidden, and governed columns the user toggled on that aren't already
		 * in the list (metadata fields, extra schema properties) are appended
		 * using their sidebar definitions. Custom columns outside the sidebar's
		 * universe are untouched.
		 */
		tableColumns() {
			const reg = typeof this.register === 'string' && this.register ? this.register : undefined
			// The active sidebar scope may narrow and reorder the page's
			// declared columns; it cannot add to them.
			let cols = this.activeScopeLayout.columns || this.declaredColumns
			if (reg) {
				cols = cols.map((c) => (
					c && c.aggregate && !c.aggregate.register
						? { ...c, aggregate: { ...c.aggregate, register: reg } }
						: c
				))
			}
			const visible = this.effectiveVisibleColumns
			if (!Array.isArray(visible)) {
				// No visible set at all: a column marked `hidden: true` still
				// starts hidden.
				return cols.filter((c) => !isHiddenByDefault(c))
			}

			const governed = this.sidebarGovernedColumnKeys
			cols = cols.filter((c) => {
				const key = typeof c === 'string' ? c : c.key
				// A column marked `hidden: true` shows only once the visible set
				// names it, also when the sidebar does not govern it.
				if (isHiddenByDefault(c)) {
					return visible.includes(key)
				}
				return !governed.has(key) || visible.includes(key)
			})

			const present = new Set(cols.map((c) => (typeof c === 'string' ? c : c.key)))
			const byKey = new Map(this.governedColumns.map((c) => [c.key, c]))
			// A scope that sets its own columns does not get its folder field back:
			// every row of the scope holds the same value there.
			const scopeField = this.activeScopeLayout.columns ? this.folderFilterKey : ''
			visible.forEach((key) => {
				if (present.has(key) || key === scopeField) {
					return
				}
				const def = byKey.get(key)
				if (def) {
					cols.push({ ...def })
					present.add(key)
				}
			})
			// The person's order (or an applied view's) reads the table left to right.
			if (this.personalColumns && (this.personalLayout || Array.isArray(this.appliedViewColumns))) {
				cols = orderColumns(cols, visible)
			}
			return cols
		},

		/** Resolved icon — explicit prop overrides schema.icon */
		resolvedIcon() {
			if (this.icon) {
				return this.icon
			}
			return this.effectiveSchema?.icon || ''
		},

		/**
		 * Built-in row actions based on show*Action props.
		 *
		 * A NAMED SOURCE changes the defaults, as a contract rather than a
		 * page-by-page opt-out (observed on the fleet's flows pages, where the
		 * menu carried FIVE actions and three of them were broken):
		 *
		 * - View and the schema-form Edit are OFF. A source has no schema, so
		 *   the form modal can only ever render empty; and the source's own
		 *   open/Edit action already navigates to the detail page, which IS
		 *   the view. Rendering the built-ins beside it gave every flow list a
		 *   dead View and an Edit that opened an empty dialog.
		 * - Copy and Delete render only when the source implements them
		 *   (`copyRow` / `deleteRow`): the built-in dialogs' confirm otherwise
		 *   emits into a manifest page with nobody listening, a dialog that
		 *   looks like it acted and did not.
		 *
		 * An EXPLICITLY passed show*Action prop always wins, both ways.
		 */
		defaultActions() {
			return buildDefaultActions({
				flags: this.isNamedSource && this.namedSource
					? {
							view: this.hasExplicitProp('showViewAction') && this.showViewAction,
							edit: this.hasExplicitProp('showEditAction') && this.showEditAction,
							copy: this.hasExplicitProp('showCopyAction')
								? this.showCopyAction
								: typeof this.namedSource.copyRow === 'function',
							del: this.hasExplicitProp('showDeleteAction')
								? this.showDeleteAction
								: typeof this.namedSource.deleteRow === 'function',
						}
					: {
							view: this.showViewAction,
							edit: this.showEditAction,
							copy: this.showCopyAction,
							del: this.showDeleteAction,
						},
				// The View action is always an eye — a universal "view" affordance,
				// independent of the object's schema icon (which is the header icon).
				viewIcon: Eye,
				viewTo: this.viewTo,
				handlers: {
					onView: (row) => this.onView(row),
					onEdit: (row) => {
						if (this.editOpensDetail) {
							/**
							 * @event edit-open Emitted instead of opening the edit modal when
							 * `editOpensDetail` is set — the host navigates to the record's
							 * detail page, where the full record (not just its scalars) is
							 * editable.
							 * @type {object} The row to open.
							 */
							this.$emit('edit-open', row)
							return
						}
						this.openFormFor(row)
					},
					onCopy: (row) => {
						this.actionTargetItem = row
						this.showSingleCopyDialog = true
					},
					onDelete: (row) => {
						this.actionTargetItem = row
						this.showSingleDeleteDialog = true
					},
				},
			})
		},

		/**
		 * Effective customComponents registry — explicit prop wins over
		 * the injected ancestor registry. Used to:
		 * - Resolve `actions[].handler` registry names (REQ-MAD-3,
		 *   manifest-actions-dispatch).
		 * - Resolve the `cardComponent` name for card-grid view (REQ-MCI,
		 *   manifest-card-index).
		 *
		 * @return {object}
		 */
		effectiveCustomComponents() {
			return this.customComponents ?? this.cnCustomComponents ?? {}
		},

		/**
		 * The v2 registry a named handler resolves against before the legacy
		 * customComponents map.
		 *
		 * @return {object}
		 */
		effectiveRegistry() {
			return this.cnRegistry ?? {}
		},

		/**
		 * Merged actions: the declared entries in order, each `"builtin:<id>"` placeholder replaced by that built-in when its toggle is on, then the enabled built-ins not placed.
		 * See `resolveRowActions`.
		 *
		 * REQ-MAD-3 / REQ-MAD-4 / REQ-MAD-5 / REQ-MAD-6 / REQ-MAD-7
		 * (manifest-actions-dispatch) — for any action whose `handler`
		 * is a string, resolve it through `resolveHandler()` so
		 * `CnRowActions` sees the same `{ handler: fn }` shape it does
		 * for built-in defaults. Function-typed handlers (the existing
		 * runtime path) pass through untouched.
		 */
		mergedActions() {
			const ctx = {
				router: this.$router,
				rowKey: this.rowKey,
				registry: this.effectiveRegistry,
				customComponents: this.effectiveCustomComponents,
				// So a row action's toasts translate like the labels around it.
				translate: this.cnTranslate,
				// A row action of `type: "open-modal"` opens its modal here.
				openModal: typeof this.cnOpenModal === 'function' ? this.cnOpenModal : null,
				// A row action of `type: "api-call"` reads the list again after it.
				refresh: () => this.onRefreshEvent(),
			}
			// A named source may supply its own row actions, on the same
			// precedence as its columns: what the manifest declares wins, and the
			// source is the DEFAULT for a page that declares none.
			// Either list may place built-ins with `"builtin:<id>"`; turning one on or off stays the `show*Action` toggles' job.
			const manifestDeclared = this.actions && this.actions.length > 0
			const declaredActions = manifestDeclared
				? this.actions
				: ((this.isNamedSource && this.namedSource && this.namedSource.rowActions) || [])

			const { actions, warnings } = resolveRowActions(declaredActions, this.defaultActions, {
				prepare: (a) => {
					// A SOURCE action may say `action: 'open'`: open this row the
					// way a row click does — the source's own navigation
					// (`openRow`/`detailRoute`), with `edit-open` emitted so a
					// host that configured a row target (`config.rowRoute`) wins.
					// Resolved here because a source is a composable with no router.
					// Source-declared actions only: the manifest grammar for navigation is `type`/`handler`, and stays so.
					if (!manifestDeclared && a.action === 'open' && typeof a.handler !== 'function') {
						return { ...a, handler: (row) => this.openSourceRow(row) }
					}
					return dispatchAction(a, ctx)
				},
			})
			for (const warning of warnings) {
				// A toggle turned off at runtime (permissions, readOnly) legitimately silences a placeholder; the validator flags a statically-off one.
				if (warning.code === 'disabled-placeholder') {
					continue
				}
				// A dropped entry is always named; the placement hints are dev-only.
				if (warning.code === 'invalid-entry' || process.env.NODE_ENV !== 'production') {
					// eslint-disable-next-line no-console
					console.warn(`[CnIndexPage] "${this.title}": ${warning.message}`)
				}
			}
			return actions
		},

		hasRowActions() {
			return this.$slots['row-actions'] || this.mergedActions.length > 0
		},

		/**
		 * The page tabs a named source declares, each `{id, label, to, count?}`.
		 *
		 * @return {Array<object>} The tabs, empty without a source that has them.
		 */
		sourcePageTabs() {
			const source = this.isNamedSource ? this.namedSource : null
			if (!source || typeof source.pageTabs !== 'function') {
				return []
			}
			return (source.pageTabs() || []).filter((tab) => tab && tab.to && tab.label)
		},

		/**
		 * The page tabs to draw: the manifest's `pageTabs`, each with its
		 * `countFrom` count once known, else a named source's own.
		 *
		 * @return {Array<object>} The tabs, `{ id, label, to, count? }`.
		 * @spec openspec/changes/index-page-tabs-notice/specs/index-page/spec.md#requirement-an-index-page-can-link-its-sibling-pages-as-tabs
		 */
		/**
		 * Whether the notice sits under the list card rather than inside it.
		 *
		 * @spec openspec/changes/index-notice-below-card/specs/index-page/spec.md#requirement-an-index-page-notice-can-sit-under-the-list-card
		 * @return {boolean}
		 */
		noticeOnPage() {
			return Boolean(this.notice && this.notice.placement === 'page')
		},

		/**
		 * The notice band's NcNoteCard type: its `variant`, else info.
		 *
		 * @return {string}
		 * @spec openspec/changes/index-page-tabs-notice/specs/index-page/spec.md#requirement-an-index-page-can-show-a-notice-under-its-list
		 */
		noticeType() {
			const variant = this.notice && this.notice.variant
			return ['success', 'warning', 'error'].includes(variant) ? variant : 'info'
		},

		effectivePageTabs() {
			if (!Array.isArray(this.pageTabs) || this.pageTabs.length === 0) {
				return this.sourcePageTabs
			}
			// The index is the tab's place in `pageTabs`, which is how its count
			// is keyed, so the tabs are numbered before any is left out.
			return this.pageTabs
				.map((tab, index) => ({ tab, index }))
				.filter(({ tab }) => tab && typeof tab.label === 'string' && tab.label !== '' && (tab.route || tab.to || tab.href))
				.filter(({ tab }) => this.pageTabVisible(tab))
				.map(({ tab, index }) => {
					const to = tab.route
						? { name: tab.route, ...(tab.params ? { params: tab.params } : {}), ...(tab.query ? { query: tab.query } : {}) }
						: (tab.to || tab.href)
					const count = this.pageTabCounts[index]
					return { id: tab.id || `page-tab-${index}`, label: this.cnTranslate(tab.label), to, ...(typeof count === 'number' ? { count } : {}) }
				})
		},

		/**
		 * What the page tab counts depend on, as one key.
		 *
		 * @return {string}
		 * @spec openspec/changes/index-page-tabs-notice/specs/index-page/spec.md#requirement-an-index-page-can-link-its-sibling-pages-as-tabs
		 */
		pageTabCountKey() {
			const tabs = Array.isArray(this.pageTabs) ? this.pageTabs : []
			const sources = tabs.map((tab) => (tab && tab.countFrom && tab.countFrom.register && tab.countFrom.schema ? tab.countFrom : null))
			return sources.some(Boolean) ? JSON.stringify(sources) : ''
		},

		/**
		 * The numbers on the quick filters: a named source counts its own
		 * tabs (`tabCounts()`), a self-fetching page asks OpenRegister.
		 *
		 * @return {Record<number, number>|null} Counts by tab index.
		 */
		effectiveTabCounts() {
			const source = this.isNamedSource ? this.namedSource : null
			if (source && typeof source.tabCounts === 'function' && !(Array.isArray(this.quickFilters) && this.quickFilters.length > 0)) {
				return source.tabCounts()
			}
			return this.tabCounts
		},

		/**
		 * The footer's free text: the manifest's `footerNote`, else a named
		 * source's own.
		 *
		 * @return {string} The note, translated, or ''.
		 */
		effectiveFooterNote() {
			// The scope's note, else the page's (a preset may have set it),
			// else the named source's.
			const scoped = this.activeScopePresentation ? this.activeScopePresentation.footerNote : undefined
			const footerNote = scoped !== undefined ? scoped : this.footerNote
			if (footerNote) {
				return this.fillConfigTokens(this.cnTranslate(footerNote))
			}
			const source = this.isNamedSource ? this.namedSource : null
			return (source && source.footerNote) || footerNote
		},

		/**
		 * The quick-filter tabs to render: the `quickFilters` prop when it
		 * holds tabs, else the tabs `quickFiltersFrom` made (an empty
		 * `quickFilters` gives way to them, so a saved view can swap a page's
		 * lenses for its own, DqTeamwachtrij), else a named source's own tabs
		 * (`useNamedSource` resolved the same precedence for the LOAD side, so
		 * strip and fetch cannot disagree).
		 *
		 * @return {Array<object>|null} The tabs, or null when there are none.
		 */
		effectiveQuickFilters() {
			const declared = this.presented('quickFilters')
			const tabs = Array.isArray(declared) && declared.length > 0 ? declared : (this.generatedQuickFilters || declared)
			const own = withPersonalLenses(tabs, this.personalLenses)
			if (own && own.length > 0) {
				return own.map((tab) => this.withConfigLabels(tab))
			}
			return (this.isNamedSource && this.namedQuickFilters) || null
		},

		/**
		 * The app config `@config.<key>` tokens resolve against: the `appConfig`
		 * prop over a config an ancestor provides.
		 *
		 * @return {object} The config.
		 */
		effectiveAppConfig() {
			return { ...unwrapAppConfig(this.cnAppConfig), ...(this.appConfig || {}) }
		},

		/**
		 * Whether the Add button renders. A named source that declares
		 * `showAdd: false` suppresses it (a task is created by a flow, never
		 * by a person clicking Add); the source cannot force the button ON,
		 * so an explicit `:show-add="false"` prop always still wins.
		 *
		 * @return {boolean} True when the Add button should render.
		 */
		effectiveShowAdd() {
			if (this.isNamedSource && this.namedSource && this.namedSource.showAdd === false) {
				return false
			}
			return this.showAdd
		},

		/** Whether all visible items are selected */
		allSelected() {
			if (this.effectiveObjects.length === 0 || this.internalSelectedIds.length === 0) {
				return false
			}
			return this.effectiveObjects.every((o) => this.internalSelectedIds.includes(o[this.rowKey]))
		},

		/** Full objects for the selected IDs (used by mass action dialogs) */
		selectedObjects() {
			return this.effectiveObjects.filter((o) => this.internalSelectedIds.includes(o[this.rowKey]))
		},

		/** Column slot names that the parent has provided (for pass-through) */
		slotColumns() {
			return Object.keys(this.$slots)
				.filter((name) => name.startsWith('column-'))
				.map((name) => name.replace('column-', ''))
		},

		/**
		 * `createDefaults`, token-resolved. `resolveDeepTokens` rather than the
		 * shallow filter-map resolver: a seed record is arbitrary JSON, so a
		 * token can sit inside a nested object or an array of them.
		 *
		 * @return {object|null}
		 */
		resolvedCreateDefaults() {
			const seed = this.createDefaults
			if (!seed || typeof seed !== 'object' || Array.isArray(seed)) {
				return null
			}
			return resolveDeepTokens(seed, {})
		},

		/**
		 * The declared header buttons with a label, translated, each with a
		 * stable key and a variant.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 * @spec openspec/changes/screens-index-header-buttons-parity/specs/index-list-board-look/spec.md#requirement-the-add-header-button-carries-a-plus
		 * @spec openspec/changes/header-action-href/specs/header-action-href/spec.md#requirement-a-header-action-with-href-is-a-link-that-runs-and-emits-nothing
		 * @return {Array<{key: string, label: string, action: string, variant: string, icon: string, format: string, link: ({href: string, target: (string|undefined)}|null)}>}
		 */
		resolvedHeaderButtons() {
			const headerButtons = this.presented('headerButtons')
			const declared = Array.isArray(headerButtons) ? headerButtons : []
			const builtInActions = new Set(['add', 'export', 'import', 'refresh', 'save-view', 'actions-menu'])
			return declared
				.filter((button) => button && typeof button === 'object' && typeof button.action === 'string' && button.action !== '')
				.map((button, index) => {
					let label = typeof button.label === 'string' && button.label !== '' ? this.cnTranslate(button.label) : ''
					let icon = typeof button.icon === 'string' ? button.icon : ''
					if (label === '' && button.action === 'add') {
						label = this.resolvedAddLabel
					}
					// The board's primary button reads "+ New request": the Add
					// button takes the plus unless the manifest names an icon.
					if (this.isBoardLook && button.action === 'add' && icon === '') {
						icon = 'Plus'
					}
					// The board's header: Export reads "Download" with its icon and
					// the Actions menu reads "Actions", without the manifest saying so.
					// A labelled Export keeps the icon too, unless it names its own.
					if (this.isBoardLook && button.action === 'export') {
						label = label || t('nextcloud-vue', 'Download')
						icon = icon || 'Download'
					}
					if (label === '' && button.action === 'actions-menu') {
						label = t('nextcloud-vue', 'Actions')
					}
					if (label === '' && button.action === 'save-view') {
						label = t('nextcloud-vue', 'Save view')
					}
					const run = typeof button.run === 'string' ? button.run : ''
					// A button that runs a manifest `href` header action is that link;
					// a `type: "navigate"` or function-handler entry keeps dispatching.
					const actionId = button.action === 'export' ? run : (builtInActions.has(button.action) ? '' : button.action)
					const linked = actionId
						? this.mergedHeaderActions.find((entry) => entry && entry.id === actionId && entry.href && entry._dispatchSuppress && (!entry.type || entry.type === 'handler'))
						: null
					return {
						key: String(button.id || button.action || index),
						label,
						action: button.action,
						variant: button.variant === 'primary' ? 'primary' : 'secondary',
						icon,
						format: button.format === 'excel' ? 'excel' : 'csv',
						run,
						link: linked ? { href: linked.href, target: linked.linkTarget || undefined } : null,
						items: Array.isArray(button.items)
							? button.items.filter((item) => (typeof item === 'string' && item !== '')
								|| (item && typeof item === 'object' && typeof item.heading === 'string' && item.heading !== ''))
							: null,
					}
				})
				.filter((button) => button.label !== '')
				// An Export with nothing to export through is not drawn: a
				// named or endpoint source with no `run` and no `@mass-export`
				// listener.
				.filter((button) => button.action !== 'export' || this.headerExportAvailable(button))
				// The Actions menu lists the page's header actions (or the
				// entries its `items` name), so a menu with nothing to list
				// is not drawn.
				.filter((button) => button.action !== 'actions-menu' || this.headerMenuEntries(button).length > 0)
		},

		/**
		 * The header buttons in the order they render. Under the board look
		 * the order is fixed whatever the manifest declares: export (Download),
		 * the Actions menu, any other secondary button, the buildiq square,
		 * then the primary button. Without the look it is the declared order.
		 *
		 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-index-header-reads-title-count-and-the-board-buttons
		 * @return {Array<object>} The buttons; the buildiq square is `{ key: '__buildiq', action: '__buildiq' }`.
		 */
		orderedHeaderButtons() {
			const buttons = this.resolvedHeaderButtons
			if (!this.isBoardLook) {
				return buttons
			}
			const rank = (button) => {
				if (button.variant === 'primary') {
					return 4
				}
				if (button.action === 'export') {
					return 0
				}
				if (button.action === 'actions-menu') {
					return 1
				}
				return 2
			}
			const sorted = buttons
				.map((button, index) => ({ button, index }))
				.sort((a, b) => (rank(a.button) - rank(b.button)) || (a.index - b.index))
				.map((entry) => entry.button)
			const firstPrimary = sorted.findIndex((button) => button.variant === 'primary')
			const square = { key: '__buildiq', action: '__buildiq', variant: 'secondary', label: '', icon: '' }
			if (firstPrimary === -1) {
				return [...sorted, square]
			}
			return [...sorted.slice(0, firstPrimary), square, ...sorted.slice(firstPrimary)]
		},

		/**
		 * The count the board's Filter menu button carries, as the CSS string its
		 * badge draws (`content: var(--cn-filter-menu-count)`). NcActions has no
		 * slot beside its menu name, so the badge is a pseudo-element; nothing is
		 * set while no filter is active, and no badge is drawn then.
		 *
		 * @spec openspec/changes/screens-filter-menu-count/specs/index-toolbar/spec.md#requirement-the-filter-menu-button-counts-the-active-filters
		 * @return {object|null}
		 */
		filterMenuCountStyle() {
			const count = this.activeFilterChips.length
			return count > 0 ? { '--cn-filter-menu-count': `"${count}"` } : null
		},

		/**
		 * The accessible name of the Filter menu button: "Filter" plus the count
		 * while filters are active (the badge itself is decoration).
		 *
		 * @spec openspec/changes/screens-filter-menu-count/specs/index-toolbar/spec.md#requirement-the-filter-menu-button-counts-the-active-filters
		 * @return {string}
		 */
		filterMenuLabel() {
			const count = this.activeFilterChips.length
			const name = t('nextcloud-vue', 'Filter')
			return count > 0 ? `${name}, ${t('nextcloud-vue', '{count} active', { count })}` : name
		},

		/** @return {string} The field the folder sidebar filters by, or ''. */
		folderFilterKey() {
			return (this.folderSidebar && (this.folderSidebar.filterField || this.folderSidebar.field)) || ''
		},

		/**
		 * The filters the table's header filters show: every active filter but
		 * the selected folder's own, which the Active chip already names, so
		 * the table draws no summary chip for it.
		 *
		 * @return {object} The filters.
		 */
		tableActiveFilters() {
			const filters = this.effectiveActiveFilters || {}
			const key = this.folderFilterKey
			if (!key || this.selectedFolderId === null || this.selectedFolderId === undefined || !Object.hasOwn(filters, key)) {
				return filters
			}
			const { [key]: _folder, ...rest } = filters
			return rest
		},

		/**
		 * The active filters as chips for the board toolbar's second row, one
		 * per filter: "Team: Woo". A filter with no value is not active. A
		 * range, as one `{from, to}` value or as `key[gte]`/`key[lte]` keys, is
		 * one chip; `keys` lists the filter keys it stands for. Several values
		 * of one filter read as a list in the locale ("A en B").
		 *
		 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-toolbar-sits-on-the-ground-in-two-rows
		 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-range-is-one-chip
		 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-several-values-read-as-a-list
		 * @return {Array<{key: string, label: string, keys?: string[]}>}
		 */
		activeFilterChips() {
			if (!this.isBoardLook) {
				return []
			}
			const chips = [...this.searchTermChips, ...this.quickFilterActiveChips]
			const ranges = new Map()
			for (const [key, raw] of Object.entries(this.effectiveActiveFilters || {})) {
				const bound = /^(.+)\[(gte|gt|lte|lt)\]$/.exec(key)
				if (bound) {
					const value = Array.isArray(raw) ? raw[0] : raw
					if (value === null || value === undefined || value === '' || this.isFixedFilter(key, value)) {
						continue
					}
					if (!ranges.has(bound[1])) {
						ranges.set(bound[1], { from: null, to: null, keys: [] })
						chips.push({ key: bound[1], rangeOf: bound[1] })
					}
					const range = ranges.get(bound[1])
					range[bound[2].startsWith('g') ? 'from' : 'to'] = value
					range.keys.push(key)
					continue
				}
				const ends = rangeEnds(raw)
				if (ends) {
					chips.push({ key, label: `${this.activeFilterFieldLabel(key)}: ${this.activeFilterRangeText(ends.from, ends.to, key)}` })
					continue
				}
				const values = (Array.isArray(raw) ? raw : [raw])
					.filter((value) => value !== null && value !== undefined && value !== '')
					.filter((value) => !this.isFixedFilter(key, value))
					.map((value) => this.activeFilterValueLabel(key, value))
				if (values.length === 0) {
					continue
				}
				chips.push({ key, label: `${this.activeFilterFieldLabel(key)}: ${listText(values, getCanonicalLocale() || undefined)}` })
			}
			return chips.map((chip) => {
				if (!chip.rangeOf) {
					return chip
				}
				const range = ranges.get(chip.rangeOf)
				return { key: chip.key, keys: range.keys, label: `${this.activeFilterFieldLabel(chip.rangeOf)}: ${this.activeFilterRangeText(range.from, range.to, chip.rangeOf)}` }
			})
		},

		/**
		 * The Active line's chip for the search term, on a named source that
		 * asks for one (`searchChip`, the search source): "Search term: Lindelaan".
		 *
		 * @spec openspec/changes/search-source-term-in-box/specs/index-page/spec.md#requirement-the-search-page-keeps-its-term-in-the-search-box
		 * @return {Array<{key: string, label: string, searchTerm: true}>}
		 */
		searchTermChips() {
			const term = String(this.namedSearchTerm || '').trim()
			if (!this.namedSourceSearches || this.namedSource.searchChip !== true || term === '') {
				return []
			}
			return [{ key: 'search-term', label: t('nextcloud-vue', 'Search term: {term}', { term }), searchTerm: true }]
		},

		/**
		 * The Active line's chips for the selected quick filters: one per
		 * selected tab that declares an `activeLabel` ("Pipeline: Sales"), run
		 * through the app's translate. A tab without one (an "All" tab) adds no
		 * chip. The chip carries the tab's index so removing it can deselect it.
		 *
		 * @spec openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-a-quick-filter-with-an-active-label-joins-the-active-line
		 * @return {Array<{key: string, label: string, quickFilterIndex: number}>}
		 */
		quickFilterActiveChips() {
			const tabs = this.tabStripEntries || []
			if (tabs.length === 0) {
				return []
			}
			const indices = this.quickFilterMultiple
				? (this.selectedQuickFilterIndices || [])
				: [this.activeQuickFilterIndex]
			return indices
				.filter((index) => typeof index === 'number' && tabs[index] && typeof tabs[index].activeLabel === 'string' && tabs[index].activeLabel !== '')
				.map((index) => ({ key: `quick-filter:${index}`, label: this.cnTranslate(tabs[index].activeLabel), quickFilterIndex: index }))
		},

		/**
		 * Filter keys over a reference property that the Active line must name,
		 * and that no reference column resolves already: one spec each, with the
		 * referenced register and schema off the page schema's `$ref`.
		 *
		 * @spec openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-an-active-chip-names-the-value-not-its-id
		 * @return {Array<{key: string, labelField: string, register: string, schema: string}>}
		 */
		activeFilterRefSpecs() {
			if (!this.isBoardLook || !this.effectiveSchema) {
				return []
			}
			const keys = Object.keys(this.effectiveActiveFilters || {})
			if (keys.length === 0) {
				return []
			}
			const covered = new Set(this.refLabelSpecs.map((spec) => spec.key))
			const fields = fieldsFromSchema(this.effectiveSchema, { includeReadOnly: true })
			const specs = []
			for (const key of keys) {
				if (covered.has(key)) {
					continue
				}
				const field = fields.find((f) => f.key === key)
				const ref = field && field.reference
				if (!ref || ref.schema === undefined || ref.schema === null) {
					continue
				}
				specs.push({
					key,
					labelField: '',
					register: ref.register || (typeof this.register === 'string' ? this.register : ''),
					schema: String(ref.schema),
				})
			}
			return specs
		},

		/**
		 * The ids each active reference filter holds, per filter key, for the
		 * label lookup of the Active line.
		 *
		 * @return {{[key: string]: string[]}} Distinct ids per filter key.
		 */
		activeFilterRefIds() {
			const out = {}
			const keys = new Set([...this.refLabelSpecs, ...this.activeFilterRefSpecs].map((spec) => spec.key))
			for (const [key, raw] of Object.entries(this.effectiveActiveFilters || {})) {
				if (!keys.has(key)) {
					continue
				}
				out[key] = (Array.isArray(raw) ? raw : [raw])
					.filter((id) => id !== null && id !== undefined && id !== '' && typeof id !== 'object')
					.map((id) => String(id))
					.sort()
			}
			return out
		},

		/**
		 * The bulk band shape `bulkBandViews` gives the current view, or null.
		 *
		 * @return {?{lead?: {one?: string, other?: string}, actions?: Array<string|{id: string, label?: string}>, cancel?: boolean, hint?: boolean}}
		 */
		viewBulkBand() {
			const views = this.bulkBandViews
			const shape = views && typeof views === 'object' ? views[this.currentViewMode] : null
			return shape && typeof shape === 'object' ? shape : null
		},

		/**
		 * The bulk actions the band offers: the view's pick and labels, else all.
		 *
		 * @return {Array<object>}
		 */
		viewBulkActions() {
			const shape = this.viewBulkBand
			if (!shape || !Array.isArray(shape.actions)) {
				return this.mergedBulkActions
			}
			return shape.actions
				.map((pick) => {
					const id = typeof pick === 'string' ? pick : (pick && pick.id)
					const action = this.mergedBulkActions.find((entry) => entry && entry.id === id)
					if (!action) {
						return null
					}
					return pick && typeof pick === 'object' && typeof pick.label === 'string' && pick.label !== '' ? { ...action, label: pick.label } : action
				})
				.filter(Boolean)
		},

		/**
		 * The view's lead line counting the selection ("1 zaak geselecteerd"),
		 * or '' for the band's own lead.
		 *
		 * @return {string}
		 */
		viewBulkBandLead() {
			const lead = this.viewBulkBand ? this.viewBulkBand.lead : null
			if (!lead || typeof lead !== 'object') {
				return ''
			}
			const count = this.internalSelectedIds.length
			const template = count === 1 ? lead.one : (lead.other || lead.one)
			return typeof template === 'string' && template !== '' ? this.cnTranslate(template).replace(/\{count\}/g, String(count)) : ''
		},

		/**
		 * The plural the board bulk band names: "With the selected cases".
		 * The page's `bulkNoun`, else the schema's `titlePlural` (or
		 * `plural`), else nothing (the band says "items").
		 *
		 * @return {string}
		 */
		boardBulkNoun() {
			const schema = this.effectiveSchema || {}
			const plural = this.bulkNoun || schema.titlePlural || schema.pluralTitle || schema.plural
			if (typeof plural === 'string' && plural !== '') {
				return this.cnTranslate(plural).toLowerCase()
			}
			return ''
		},

		/**
		 * Whether the buildiq square sits in the page header instead of the
		 * actions bar: under the board look, when the header shows (a hidden
		 * header or a `#header` slot keeps the square in the bar).
		 *
		 * @spec openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-the-buildiq-square-is-one-square-everywhere
		 * @return {boolean}
		 */
		buildiqInHeader() {
			return this.isBoard && this.showTitle && !this.$slots.header
		},

		/**
		 * Index of the header button the buildiq square sits directly before:
		 * the first primary one. -1 puts it after the last button.
		 *
		 * @spec openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-the-buildiq-square-is-one-square-everywhere
		 * @return {number}
		 */
		buildiqBeforeIndex() {
			if (!this.headerButtonsShown) {
				return -1
			}
			return this.resolvedHeaderButtons.findIndex((button) => button.variant === 'primary')
		},

		/**
		 * Whether the header buttons render: there are some, the title shows
		 * (they sit beside it) and no `#header` slot replaces the header.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 * @return {boolean}
		 */
		/**
		 * Whether the page header carries a save-view button, so the toolbar
		 * leaves its own Save view out.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/saved-views-hide-toolbar-save/specs/saved-views/spec.md
		 */
		headerSavesView() {
			return this.headerButtonsShown && (this.resolvedHeaderButtons || []).some((button) => button && button.action === 'save-view')
		},

		headerButtonsShown() {
			return this.showTitle && !this.$slots.header && this.resolvedHeaderButtons.length > 0
		},

		/**
		 * Whether the actions bar shows the saved-views control: opted in
		 * with `allowSavedViews` and not given up for header buttons.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 * @return {boolean}
		 */
		barShowsSavedViews() {
			// Under the board look the saved views stay in the toolbar as chips
			// even when the header carries the buttons.
			return Boolean(this.allowSavedViews) && (!this.headerButtonsShown || this.isBoardLook)
		},

		/**
		 * Whether the actions bar shows the Export menu: `showExportMenu`,
		 * unless a header button took the export over.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 * @return {boolean}
		 */
		barShowsExportMenu() {
			return this.showExportMenu && !this.headerButtonTakes('export')
		},

		/**
		 * The header's description line: `countSubtitle` with the total
		 * filled in when one is known, else `description`.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-an-index-page-title-is-a-manifest-key
		 * @spec openspec/changes/screens-table-footer-and-system-dates-parity/specs/index-list-board-look/spec.md#requirement-the-count-reads-in-the-users-language
		 * @return {string}
		 */
		/**
		 * The header meta note with the list's counts filled in. `{rows:<field>}`
		 * counts the rows whose field is set ("waarvan {rows:coveredFor} als
		 * waarnemer"), and a part in square brackets is left out while a count
		 * in it is zero.
		 *
		 * @spec openspec/changes/page-header-breadcrumb/specs/page-header/spec.md#requirement-a-list-dashboard-or-settings-page-can-show-a-breadcrumb-and-a-meta-note
		 * @return {string}
		 */
		headerMetaText() {
			const headerMeta = this.presented('headerMeta')
			if (!headerMeta) {
				return ''
			}
			const total = this.effectivePagination?.total
			let missing = false
			const rows = Array.isArray(this.headerMetaRows) ? this.headerMetaRows : []
			const isSet = (value) => value !== undefined && value !== null && value !== '' && value !== false && !(Array.isArray(value) && value.length === 0)
			const fill = (part, onCount) => part
				.replace('{shown}', () => onCount(this.effectiveObjects.length))
				.replace('{total}', () => (typeof total === 'number' ? onCount(total) : ''))
				.replace(/\{rows:([\w.-]+)\}/g, (match, field) => onCount(rows.filter((row) => isSet(field.split('.').reduce((at, key) => (at && typeof at === 'object' ? at[key] : undefined), row))).length))
				.replace(/\{count:([\w-]+)\}/g, (match, name) => {
					const value = this.headerMetaCountValues[name]
					if (typeof value !== 'number') {
						missing = true
						return ''
					}
					return onCount(value)
				})
			const text = fill(
				this.cnTranslate(headerMeta).replace(/\[([^\]]*)\]/g, (match, part) => {
					let zero = false
					const filled = fill(part, (count) => {
						zero = zero || count === 0
						return String(count)
					})
					return zero ? '' : filled
				}),
				String,
			)
			return missing ? '' : text
		},

		/**
		 * Whether the header note carries a count, so the board leaves out its
		 * own "{shown} of {total}" line (DqPrivacy, DqContracten).
		 *
		 * @return {boolean}
		 */
		headerMetaCarriesCount() {
			const headerMeta = this.presented('headerMeta')
			return typeof headerMeta === 'string' && /\{(shown|total|count:[\w-]+|rows:[\w.-]+)\}/.test(headerMeta)
		},

		/**
		 * What the header note's other counts depend on, as one key.
		 *
		 * @return {string}
		 */
		headerMetaCountKey() {
			const sources = this.headerMetaCounts && typeof this.headerMetaCounts === 'object' ? this.headerMetaCounts : {}
			const valid = Object.entries(sources).filter(([, from]) => from && from.register && from.schema)
			return valid.length > 0 ? JSON.stringify(valid) : ''
		},

		/**
		 * The header's description line, and on the map with its list the
		 * number of rows on the map after a middle dot ("· 5 met een adres op
		 * de kaart", DqZakenKaart).
		 *
		 * @return {string}
		 */
		headerDescription() {
			const base = this.headerDescriptionBase
			if (this.currentViewMode !== 'map' || !this.mapListEnabled) {
				return base
			}
			const onMap = n('nextcloud-vue', '%n with an address on the map', '%n with an address on the map', this.mapList.items.length)
			return base ? `${base} · ${onMap}` : onMap
		},

		headerDescriptionBase() {
			const total = this.effectivePagination?.total
			// Board look: the count line is a template over the rows on this page
			// and all rows, "{shown} of {total}" unless the page says otherwise.
			if (this.isBoardLook && typeof total === 'number' && total >= 0) {
				const shown = this.effectiveObjects.length
				// The default count line is the library's own string, so it
				// reads "14 van 14" in Dutch; a page's own template goes
				// through the app's label lookup.
				const countText = this.presented('countText')
				// The note after the breadcrumb already says how many there are.
				if (!countText && !this.countSubtitle && this.headerMetaCarriesCount) {
					return this.description
				}
				if (!countText && !this.countSubtitle) {
					return t('nextcloud-vue', '{shown} of {total}', { shown, total })
				}
				if (countText) {
					return this.cnTranslate(countText)
						.replace('{shown}', String(shown))
						.replace('{total}', String(total))
						.replace(/\{term\}/g, this.sourceTerm)
				}
				return this.countLine(this.countSubtitle, total, shown)
			}
			if (this.countSubtitle && typeof total === 'number' && total >= 0) {
				return this.countLine(this.countSubtitle, total, null)
			}
			return this.description
		},

		/** Add button label — derived from schema.title if not explicitly set */
		resolvedAddLabel() {
			const scoped = this.activeScopePresentation ? this.activeScopePresentation.addLabel : undefined
			const addLabel = scoped !== undefined ? scoped : this.addLabel
			if (addLabel) {
				return this.cnTranslate(addLabel)
			}
			// A named source names its own create action. Without this the button
			// falls back to a schema-derived noun, and a named source has no
			// schema — so the control the migration was supposed to preserve
			// simply is not there.
			if (this.isNamedSource && this.namedSource && this.namedSource.addLabel) {
				return this.namedSource.addLabel
			}
			// Two catalogues, deliberately. The NOUN comes from the consumer's
			// schema, so it resolves against the consumer's catalogue via the
			// injected `cnTranslate`; the SENTENCE around it is library chrome, so
			// it resolves against the library's own — exactly the split
			// CnFormDialog already makes for "Create {title}".
			//
			// Getting that wrong is visible rather than subtle: routing the
			// sentence through the host catalogue too produced "Add Urenboeking"
			// on a Dutch instance, because no app catalogue carries a key that
			// belongs to the library.
			const type = this.cnTranslate(this.effectiveSchema?.title || 'Item')
			return t('nextcloud-vue', 'Add {type}', { type })
		},

		/**
		 * Effective sidebar configuration. Returns the sidebar config object
		 * when `sidebar.enabled === true`, otherwise an `{ enabled: false }`
		 * stub so the embedded CnIndexSidebar is not mounted. A page that
		 * offers saved views gets the sidebar unless it switched it off
		 * with `enabled: false`: the saved views live in its Search tab.
		 */
		resolvedSidebar() {
			if (this.sidebar && this.sidebar.enabled !== false && (this.sidebar.enabled || !this.allowSavedViews)) {
				return this.sidebar
			}
			if (this.allowSavedViews && !(this.sidebar && this.sidebar.enabled === false)) {
				return { ...(this.sidebar || {}), enabled: true }
			}
			return { enabled: false }
		},

		/**
		 * Whether a Search/Columns sidebar is configured for this page (mirrors
		 * the mount gate used by `shouldRenderInlineSidebar` /
		 * `publishHoistedSidebar`). Drives the actions-bar toggle visibility.
		 *
		 * @return {boolean}
		 */
		hasSidebar() {
			return !!this.resolvedSidebar.enabled && this.resolvedSidebar.show !== false
		},

		/**
		 * Whether the board toolbar draws the Filter button as a menu: the
		 * board look, `filterMenu` on, something to filter by, and no filter
		 * sidebar (whose toggle is that button otherwise).
		 *
		 * @return {boolean}
		 */
		boardFilterMenu() {
			return this.isBoardLook && this.filterMenu && !this.hasSidebar && this.filterableFields.length > 0
		},

		/**
		 * Whether the funnel menu sits in the table header: `filterMenu` with
		 * values to offer, unless the toolbar's Filter button is that menu.
		 *
		 * @return {boolean}
		 */
		showHeaderFilterMenu() {
			return this.filterMenu && this.filterableFields.length > 0 && !this.boardFilterMenu
		},

		/** Search props forwarded to the embedded CnIndexSidebar (defaults applied per CnIndexSidebar). */
		sidebarSearchProps() {
			return (this.sidebar && this.sidebar.search) || {}
		},

		/**
		 * Whether the embedded sidebar should render inline inside the
		 * cn-index-page wrapper. False when CnAppRoot has provided a
		 * real `cnIndexSidebarConfig` holder — in that case CnAppRoot
		 * mounts the sidebar at NcContent level (correct NcAppSidebar
		 * parent). True when no CnAppRoot ancestor exists (legacy
		 * apps), so the embedded sidebar still renders even though
		 * its visual position is sub-optimal.
		 */
		shouldRenderInlineSidebar() {
			if (!this.resolvedSidebar.enabled || this.resolvedSidebar.show === false) {
				return false
			}
			// CnAppRoot ancestor present → hoist takes over.
			return !this.cnHostsIndexSidebar
		},

		/**
		 * Snapshot of every prop the hoisted CnIndexSidebar needs.
		 * Reactive — the sidebar in CnAppRoot re-renders whenever
		 * any of these change.
		 */
		hoistedSidebarProps() {
			return {
				open: this.sidebarOpen,
				schema: this.effectiveSchema,
				title: this.title,
				icon: this.resolvedIcon,
				searchValue: this.effectiveSearchValue,
				visibleColumns: this.effectiveVisibleColumns,
				activeFilters: this.effectiveActiveFilters,
				columnGroups: this.resolvedSidebar.columnGroups || [],
				filterFields: this.resolvedSidebar.fields || null,
				facetData: this.effectiveFacetData,
				showMetadata: this.resolvedSidebar.showMetadata !== false,
				personalColumns: this.personalColumns,
				pinnedCount: this.pinnedColumnCount,
				sortOptions: this.sidebarSortOptions,
				currentSort: this.currentSortKeys,
				currentSortValue: this.sortSource.value,
				savedViews: this.savedViewsForSidebar,
				activeTab: this.sidebarActiveTab,
				...this.sidebarSearchProps,
			}
		},

		/**
		 * Resolved card component for card-grid view mode. Returns
		 * `null` when `cardComponent` is empty OR when the name is not
		 * in the registry (the latter also logs `console.warn`).
		 *
		 * `null` makes the template fall through to `CnCardGrid`'s
		 * default `CnObjectCard` rendering — exactly the legacy path.
		 *
		 * @return {object|null}
		 */
		resolvedCardComponent() {
			if (!this.cardComponent) {
				return null
			}
			const resolved = this.resolveNamedComponent(this.cardComponent)
			if (!resolved) {
				// eslint-disable-next-line no-console
				console.warn(`[CnIndexPage] cardComponent "${this.cardComponent}" not found in the registry or customComponents. Falling back to CnObjectCard.`)
				return null
			}
			return resolved
		},

		/**
		 * Custom list-row component resolved against the customComponents
		 * registry, or `null` when `listComponent` is empty / unknown (default
		 * `CnObjectRow` is used). Mirrors `resolvedCardComponent`.
		 *
		 * @return {?object} The resolved component, or null.
		 */
		resolvedListComponent() {
			if (!this.listComponent) {
				return null
			}
			const resolved = this.resolveNamedComponent(this.listComponent)
			if (!resolved) {
				// eslint-disable-next-line no-console
				console.warn(`[CnIndexPage] listComponent "${this.listComponent}" not found in the registry or customComponents. Falling back to CnObjectRow.`)
				return null
			}
			return resolved
		},
	},

	watch: {
		// A lens that asks the source for other rows reads the source again.
		lensSourceParams(now, before) {
			if (JSON.stringify(now) === JSON.stringify(before) || !this.isSelfFetchMode) {
				return
			}
			const option = this.activeSortSource || this.sourceSortOptions.find((o) => o.source.annotate === true)
			if (option) {
				this.resetSortSourcePage()
				this.loadSortSource(option)
			}
		},

		// A new search or filter starts the source rows at page 1.
		'list.searchTerm.value': function() {
			this.resetSortSourcePage()
		},

		'list.activeFilters.value': {
			handler() {
				this.resetSortSourcePage()
			},

			deep: true,
		},

		'$route.query._view': function() {
			this.applyViewModeFromRoute()
		},

		'$route.query.savedView': function(now, before) {
			// Leaving a view's address (a plain link to the page) leaves the view.
			if ((typeof now !== 'string' || now === '') && typeof before === 'string' && before !== '' && before === this.appliedSavedViewId) {
				this.leaveSavedView()
				return
			}
			this.applySavedViewFromRoute()
		},

		activeSavedViewOverridesKey() {
			/**
			 * The applied view's page config overrides changed: a view with
			 * overrides was applied (payload: the overrides) or left (`null`).
			 *
			 * @event view-overrides
			 */
			this.$emit('view-overrides', this.activeSavedViewOverrides)
		},

		routeViewModes() {
			if (this.routeViewPending) {
				this.applyViewModeFromRoute()
			}
		},

		mapColorFetchKey: {
			immediate: true,
			handler(key) {
				if (key !== '') {
					this.loadMapColorSource()
				}
			},
		},

		boardFetchKey: {
			immediate: true,
			handler(key) {
				if (key !== '') {
					this.loadBoardSources()
				}
			},
		},

		effectiveObjects: {
			immediate: true,
			handler(rows) {
				if (!this.collectionUrl || !this.isSelfFetchMode || !Array.isArray(rows)) {
					return
				}
				for (const row of rows) {
					const id = row?.id ?? row?.['@self']?.id
					if (id !== undefined && id !== null) {
						this.collectionRowsById.set(id, row)
					}
				}
			},
		},

		// A column or form field bound to a property the schema lacks is told to the host once.
		effectiveSchema: {
			immediate: true,
			handler(schema) {
				reportBindingProblems(schema, { register: this.register, columns: this.declaredColumns, includeFields: this.includeFields })
			},
		},

		// Resolve the labels of reference columns in one batch per schema.
		refLabelIds: {
			immediate: true,
			deep: true,
			handler() {
				this.loadRefLabels()
			},
		},

		// Read the colour and icon of the records badge columns point at.
		refLookIds: {
			immediate: true,
			deep: true,
			handler() {
				this.loadRefLooks()
			},
		},

		// The Active line names a referenced value, not its id.
		activeFilterRefIds: {
			deep: true,
			handler() {
				this.loadRefLabels()
			},
		},

		quickFiltersFromKey: {
			immediate: true,
			/** @spec openspec/changes/index-quick-filters-from/specs/index-page/spec.md#requirement-quick-filters-can-come-from-a-field-s-values */
			handler() {
				this.loadGeneratedQuickFilters()
			},
		},

		headerMetaCountKey: {
			immediate: true,
			handler() {
				this.loadHeaderMetaCounts()
			},
		},

		pageTabCountKey: {
			immediate: true,
			/** @spec openspec/changes/index-page-tabs-notice/specs/index-page/spec.md#requirement-an-index-page-can-link-its-sibling-pages-as-tabs */
			handler() {
				this.loadPageTabCounts()
			},
		},

		filterStripCountKey: {
			immediate: true,
			/** @spec openspec/changes/screens-filter-strip/specs/index-filter-strip/spec.md#requirement-an-index-page-can-draw-a-second-filter-strip */
			handler() {
				this.loadFilterStripCounts()
			},
		},

		countRequestKey: {
			immediate: true,
			/** @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views */
			handler() {
				this.loadFilterCounts()
			},
		},

		// Remember the whole folder set whenever no folder narrows the query.
		folderSidebarLiveFacetValues: {
			immediate: true,
			handler(values) {
				if (this.selectedFolderId === null || this.selectedFolderId === undefined) {
					this.folderSidebarAllValues = values
				}
			},
		},

		viewMode(val) {
			this.currentViewMode = val
		},

		// Entering calendar mode fetches one page sized to the month; leaving
		// removes the month range and restores the page size, so the table is
		// never left narrowed.
		// The board does the same at BOARD_PAGE_SIZE, so it shows every row
		// rather than the table's first page.
		currentViewMode(mode, previous) {
			if (!this.isSelfFetchMode) {
				return
			}
			let listSize = this.list.pageSize.value
			if (previous === 'calendar') {
				this.calendarRange = null
				listSize = this.calendarPrevPageSize || 20
				this.calendarPrevPageSize = null
			} else if (previous === 'board') {
				listSize = this.boardPrevPageSize || 20
				this.boardPrevPageSize = null
			}
			const leftMapPlotAll = previous === 'map' && this.mapPrevPageSize !== null
			if (leftMapPlotAll) {
				listSize = this.mapPrevPageSize
				this.mapPrevPageSize = null
			}
			let size = null
			if (mode === 'calendar') {
				this.calendarPrevPageSize = listSize
				size = CALENDAR_PAGE_SIZE
			} else if (mode === 'board') {
				this.boardPrevPageSize = listSize
				size = BOARD_PAGE_SIZE
			} else if (mode === 'map' && this.mapPlotAllLimit > 0 && !this.isNamedSource) {
				this.mapPrevPageSize = listSize
				size = this.mapPlotAllLimit
			} else if (previous === 'calendar' || previous === 'board' || leftMapPlotAll) {
				size = listSize
			}
			if (size !== null && typeof this.list.onPageSizeChange === 'function') {
				this.list.onPageSizeChange(size)
			}
		},

		selectedIds(val) {
			this.internalSelectedIds = [...val]
		},

		/**
		 * Tenant change pipeline (multi-tenancy-context).
		 * When the bound `activeOrganisation` prop changes, push the
		 * new UUID into the bound object store (when there is one)
		 * AND into the shared `useTenantContext()` context so every
		 * other tenant-aware surface stays consistent.
		 */
		activeOrganisation: {
			handler(next) {
				if (!next) {
					return
				}
				const uuid = next.uuid || null
				// Update the object store when one is bound — sub-store
				// methods may not exist on non-OR stores; guard with typeof.
				const store = this.list?.store ?? this.selfObjectStore ?? null
				if (store && typeof store.setActiveTenantOrganisation === 'function') {
					store.setActiveTenantOrganisation(uuid)
				}
			},

			deep: false,
		},

		/**
		 * Keep the hoisted sidebar in sync with reactive props.
		 * The watcher fires whenever any of the props snapshot
		 * (`hoistedSidebarProps`) changes; we re-write the entire
		 * config so Vue's NcAppSidebar in CnAppRoot picks up the
		 * new values. Cheap because it's just an object swap.
		 */
		hoistedSidebarProps: {
			handler() {
				this.publishHoistedSidebar()
			},

			deep: false,
		},

		shouldRenderInlineSidebar() {
			// When the gate flips (e.g. sidebar.show toggled), keep
			// the hoist in sync.
			this.publishHoistedSidebar()
		},

		// The gate itself, which neither watcher above catches: under a
		// CnAppRoot host `shouldRenderInlineSidebar` is false in BOTH states,
		// and `hoistedSidebarProps` carries none of `enabled` / `show`. So
		// toggling the sidebar on or off in CnEditSidebarModal — which mutates
		// `config.sidebar` in place — left the hoisted panel exactly as it was
		// until the page was reloaded.
		hasSidebar() {
			this.publishHoistedSidebar()
		},

		// Re-push AI context when relevant props change
		register() {
			this.pushAiContext()
		},

		schema() {
			this.pushAiContext()
		},

		// In self-fetch mode, a same-component route-param change (e.g. the
		// `:id` of `/forms/:id/submissions`) must re-resolve `config.filter`
		// and re-fetch. useListView's `fixedFilters` getter re-reads $route on
		// each fetch; this watcher triggers the re-fetch.
		'$route.params': {
			deep: true,
			handler() {
				if (this.isSelfFetchMode && typeof this.list.refresh === 'function') {
					this.list.refresh(1)
				}
			},
		},

		// A same-path `$route.query` change (e.g. a dashboard deep-link
		// `/cases?caseType=X`) must also re-fetch — `fixedFilters` merges the
		// query into the fetch (see useSelfFetchList.resolveQueryFilters).
		'$route.query': {
			deep: true,
			handler() {
				if (this.isSelfFetchMode && typeof this.list.refresh === 'function') {
					this.list.refresh(1)
				}
			},
		},

		/**
		 * Leaving the narrow full-detail layout puts the list back where it
		 * was. The element was hidden, so the browser kept no scroll height
		 * for it and would otherwise return the handler to row 1 of 400.
		 *
		 * @param {string} next The layout now.
		 * @param {string} previous The layout before it.
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		splitLayout(next, previous) {
			if (previous === 'detail' && next !== 'detail') {
				this.restoreListScroll()
			}
		},

		// When `?action=create` is injected into the query via router navigation
		// (e.g. a "New Case" button on another page), auto-open the create dialog
		// so the user lands on the index page with the form already open.
		'$route.query.action': {
			handler(val) {
				if (val === 'create') {
					this.maybeOpenCreateFromQuery()
				}
			},
		},
	},

	/**
	 * Measure the viewport, follow a resize, and read this person's own
	 * row order for this list.
	 *
	 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
	 */
	mounted() {
		this.openSortSource()
		this.measureSplitViewport()
		if (this.splitViewEnabled && typeof window !== 'undefined') {
			window.addEventListener('resize', this.measureSplitViewport)
		}
		if (typeof window !== 'undefined') {
			window.addEventListener(OBJECTS_CHANGED_EVENT, this.onObjectsChanged)
		}
		this.loadManualOrder()
		this.startLive()
		this.loadPersonalColumns()
		this.publishHoistedSidebar()
		this.pushAiContext()
		this.maybeOpenCreateFromQuery()
		if (this.folderSidebar) {
			this.loadFolderRegister()
			this.loadFolderGroups()
			// Reflect a deep-link filter (e.g. ?caseType=<id>) as the active folder.
			const key = this.folderSidebar.filterField || this.folderSidebar.field
			const active = key && this.effectiveActiveFilters[key]
			if (active) {
				this.selectedFolderId = Array.isArray(active) ? active[0] : active
			}
		}
	},

	created() {
		this.applyViewModeFromRoute()
		this.pushAiContext()
		if (this.savedViewsOffered) {
			this.fetchSavedViews()
		}
		this.selfActions = createSelfModeActions({
			isSelfFetchMode: () => this.isSelfFetchMode,
			selfObjectStore: () => this.selfObjectStore,
			rowTarget: (row) => this.rowTypeTarget(row),
			knownRow: (id) => this.collectionRowsById.get(id),
			selfObjectType: () => this.selfObjectType,
			list: () => this.list,
			selectedIds: () => this.internalSelectedIds,
			register: () => this.register,
			schema: () => this.schema,
			effectiveObjects: () => this.effectiveObjects,
			effectiveSchema: () => this.effectiveSchema,
			massActionNameField: () => this.massActionNameField,
			editItem: () => this.editItem,
			emit: (event, payload) => this.$emit(event, payload),
			afterCreateSuccess: (saved) => this.afterCreateSuccess(saved),
			setResults: {
				singleDelete: (r) => this.setSingleDeleteResult(r),
				massDelete: (r) => this.setMassDeleteResult(r),
				singleCopy: (r) => this.setSingleCopyResult(r),
				massCopy: (r) => this.setMassCopyResult(r),
				massImport: (r) => this.setImportResult(r),
				massExport: (r) => this.setExportResult(r),
				form: (r) => this.setFormResult(r),
				formValidation: (fieldErrors, message) => this.setFormValidationErrors(fieldErrors, message),
			},
		})
	},

	/**
	 * Drop the window listeners and the hoisted sidebar.
	 *
	 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
	 */
	beforeUnmount() {
		this.stopLive()
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', this.measureSplitViewport)
			window.removeEventListener(OBJECTS_CHANGED_EVENT, this.onObjectsChanged)
		}
		// Clear the holder so the hoisted sidebar disappears when
		// the user navigates away from the index page.
		if (this.cnHostsIndexSidebar && this.cnIndexSidebarConfig) {
			this.cnIndexSidebarConfig.value = null
		}
		applyAiContext(this.cnAiContext, 'custom')
	},

	methods: {
		/**
		 * On mount: open on a source option the page defaults to
		 * (`default: true`, unless the address carries an order of its own),
		 * and read an annotating source's rows for the other orders.
		 *
		 * @return {void}
		 * @spec openspec/changes/sidebar-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
		 */
		openSortSource() {
			if (!this.isSelfFetchMode || this.sourceSortOptions.length === 0) {
				return
			}
			const query = (this.$route && this.$route.query) || {}
			const preferred = this.sourceSortOptions.find((o) => o.default === true)
			if (preferred && !query._order) {
				this.sortSource = { ...this.sortSource, value: String(preferred.value), page: 1 }
				this.loadSortSource(preferred)
				return
			}
			const annotating = this.sourceSortOptions.find((o) => o.source.annotate === true)
			if (annotating) {
				this.loadSortSource(annotating)
			}
		},

		/**
		 * Read a source option's rows. A failure while that option is chosen
		 * orders the self-fetched list by the option's `order` instead.
		 *
		 * @param {object} option The sort option.
		 * @return {Promise<void>}
		 * @spec openspec/changes/sidebar-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
		 */
		async loadSortSource(option) {
			const source = option.source
			this.sortSource = { ...this.sortSource, state: 'loading' }
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const res = await axios.get(generateUrl(source.url), { params: { ...(source.params || {}), ...this.lensSourceParams } })
				this.sortSource = { ...this.sortSource, rows: rowsFromSourceBody(res ? res.data : null, source), state: 'ready' }
			} catch (error) {
				this.sortSource = { ...this.sortSource, rows: [], state: 'failed' }
				// eslint-disable-next-line no-console
				console.error(`[CnIndexPage] the sort option "${option.value}" could not load ${source.url}`, error)
				if (this.sortSource.value === String(option.value)) {
					const keys = orderToSortKeys(option.order)
					if (keys.length > 0 && typeof this.list.onSort === 'function') {
						this.list.onSort({ key: keys[0].key, order: keys[0].order, keys })
					}
				}
			}
		},

		/**
		 * Back to the first page of the source rows, after a new search or filter.
		 *
		 * @return {void}
		 */
		resetSortSourcePage() {
			if (this.sortSource.page !== 1) {
				this.sortSource = { ...this.sortSource, page: 1 }
			}
		},

		/**
		 * A presentation value: the active scope's when it declares the key,
		 * else this page's own prop (which a query preset may have set).
		 *
		 * @param {string} key One of the query preset keys.
		 * @return {unknown} The value.
		 * @spec openspec/changes/index-scope-presentation/specs/index-page/spec.md#requirement-a-preset-or-a-scope-sets-the-list-s-presentation
		 */
		presented(key) {
			const scoped = this.activeScopePresentation
			return scoped[key] !== undefined ? scoped[key] : this.ownPresentation[key]
		},

		/**
		 * Whether a filter value is one of the query pairs that chose the
		 * preset, so it shows no removable chip.
		 *
		 * @param {string} key The filter key.
		 * @param {unknown} value One filter value.
		 * @return {boolean}
		 * @spec openspec/changes/index-scope-presentation/specs/index-page/spec.md#requirement-the-query-that-chose-a-preset-is-not-a-removable-filter
		 */
		isFixedFilter(key, value) {
			const fixed = this.fixedFilters
			if (!fixed || !Object.hasOwn(fixed, key)) {
				return false
			}
			return String(fixed[key]) === String(value)
		},

		/**
		 * The manifest page that shows one object of a schema, for a linked
		 * label. Null without a manifest or a matching detail page.
		 *
		 * @param {string} schema Schema slug of the referenced objects.
		 * @return {string|null} The page id.
		 */
		detailRouteFor(schema) {
			const pages = this.cnManifest && Array.isArray(this.cnManifest.pages) ? this.cnManifest.pages : []
			const page = pages.find((p) => p && p.type === 'detail' && p.config && String(p.config.schema) === String(schema))
			return page ? page.id : null
		},

		/**
		 * Fetch the labels the reference columns need: one request per
		 * referenced schema, for the rows on screen. A failure leaves ids as is.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/index-ref-column-labels/tasks.md#task-2
		 */
		async loadRefLabels() {
			const specs = [...this.refLabelSpecs, ...this.activeFilterRefSpecs]
			if (specs.length === 0) {
				return
			}
			if (!this._refLabelResolver) {
				this._refLabelResolver = createRefLabelResolver(() => {
					try {
						return (this.list && this.list.objectStore) || useObjectStore()
					} catch {
						return null
					}
				})
			}
			await Promise.all(specs.map(async (spec) => {
				const known = this.refLabels[spec.key] || {}
				const wanted = new Set([...(this.refLabelIds[spec.key] || []), ...(this.activeFilterRefIds[spec.key] || [])])
				const ids = [...wanted].filter((id) => !Object.hasOwn(known, id))
				if (ids.length === 0) {
					return
				}
				const found = await this._refLabelResolver.resolve(spec.register, spec.schema, ids, spec.labelField)
				this.refLabels = { ...this.refLabels, [spec.key]: { ...(this.refLabels[spec.key] || {}), ...found } }
			}))
		},

		/**
		 * Read the colour and icon names `refLookSpecs` columns need, for the
		 * rows on screen, with the same resolver as the labels. A failure
		 * leaves the badge as declared.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-badge-cell-takes-its-tone-and-icon-from-the-referenced-record
		 */
		async loadRefLooks() {
			if (this.refLookSpecs.length === 0) {
				return
			}
			if (!this._refLabelResolver) {
				this._refLabelResolver = createRefLabelResolver(() => {
					try {
						return (this.list && this.list.objectStore) || useObjectStore()
					} catch {
						return null
					}
				})
			}
			const read = (spec, ids, name) => (name
				? this._refLabelResolver.resolve(spec.register, spec.schema, ids, name, { strict: true }).catch(() => ({}))
				: Promise.resolve({}))
			await Promise.all(this.refLookSpecs.map(async (spec) => {
				const known = this.refLooks[spec.key] || {}
				const ids = (this.refLookIds[spec.key] || []).filter((id) => !Object.hasOwn(known, id))
				if (ids.length === 0) {
					return
				}
				const [colors, icons] = await Promise.all([read(spec, ids, spec.colorField), read(spec, ids, spec.iconField)])
				const found = {}
				ids.forEach((id) => {
					found[id] = { color: (colors && colors[id]) || null, icon: (icons && icons[id]) || null }
				})
				this.refLooks = { ...this.refLooks, [spec.key]: { ...(this.refLooks[spec.key] || {}), ...found } }
			}))
		},

		/**
		 * Whether a saved view shows its record count (`viewCounts`).
		 *
		 * @param {string} id The view id.
		 * @return {boolean} True when the view opted in.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
		 */
		viewWantsCount(id) {
			if (this.viewCounts === true) {
				return true
			}
			return Array.isArray(this.viewCounts) && this.viewCounts.map(String).includes(String(id))
		},

		/**
		 * Build the `quickFiltersFrom` tabs: the field's distinct values with
		 * their counts in one grouped request, labelled through the
		 * reference-label resolver when the values are record ids. A failed
		 * request draws no tabs.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/index-quick-filters-from/specs/index-page/spec.md#requirement-quick-filters-can-come-from-a-field-s-values
		 */
		async loadGeneratedQuickFilters() {
			const key = this.quickFiltersFromKey
			const schema = this.exportSchemaSlug
			if (key === '' || !this.register || !schema) {
				this.generatedQuickFilters = null
				return
			}
			const from = this.quickFiltersFrom
			const params = (this.$route && this.$route.params) || {}
			const ctx = typeof this.selfFetchTokenCtx === 'function' ? this.selfFetchTokenCtx() : {}
			let groups
			try {
				groups = await fetchGroupedCounts({ register: this.register, schema, groupBy: from.field, filter: resolveFilterMap(this.filter, params, ctx) }, ctx)
			} catch {
				groups = []
			}
			let labels = {}
			if (from.register && from.schema && from.valueField && groups.length > 0) {
				labels = await labelsByField({ register: from.register, schema: from.schema, field: from.valueField, values: groups.map((g) => g.key), labelField: from.labelField || '' }).catch(() => ({}))
			} else if (from.register && from.schema && groups.length > 0) {
				if (!this._quickFilterLabelResolver) {
					this._quickFilterLabelResolver = createRefLabelResolver(() => {
						try {
							return (this.list && this.list.objectStore) || useObjectStore()
						} catch {
							return null
						}
					})
				}
				labels = await this._quickFilterLabelResolver.resolve(from.register, from.schema, groups.map((g) => g.key), from.labelField || '').catch(() => ({}))
			}
			if (key !== this.quickFiltersFromKey) {
				return
			}
			if (groups.length === 0) {
				this.generatedQuickFilters = null
				return
			}
			const sorted = [...groups].sort((a, b) => b.count - a.count)
			const total = sorted.reduce((sum, g) => sum + g.count, 0)
			this.generatedQuickFilters = [
				{ label: from.allLabel || t('nextcloud-vue', 'All'), filter: {}, default: true, count: total },
				...sorted.map((g) => ({ label: (labels && labels[g.key]) || g.key, filter: { [from.field]: g.key }, count: g.count })),
			]
		},

		/**
		 * Whether Nextcloud says the user administers this instance; false
		 * when the user cannot be read.
		 *
		 * @return {boolean}
		 */
		viewerIsAdmin() {
			try {
				return getCurrentUser()?.isAdmin === true
			} catch {
				return false
			}
		},

		/**
		 * Whether a manifest page tab shows to this user: an `adminOnly` tab to
		 * an instance admin, a tab with a `permission` to a user who holds it
		 * (as a menu entry: with no permissions known, it shows). This only
		 * decides whether the tab is drawn. It is not access control; the
		 * page behind the tab must enforce its own access on the server.
		 *
		 * @param {object} tab The tab declaration.
		 * @return {boolean} True when the tab is drawn.
		 */
		pageTabVisible(tab) {
			if (tab.adminOnly === true && !this.viewerIsAdmin()) {
				return false
			}
			if (tab.permission) {
				const held = Array.isArray(this.cnPermissions) ? this.cnPermissions : []
				if (held.length > 0 && !held.includes(tab.permission)) {
					return false
				}
			}
			return true
		},

		/**
		 * Read the totals of the lists `headerMetaCounts` names, one list
		 * request each. A failed count is null and leaves the note out.
		 *
		 * @return {Promise<void>}
		 */
		async loadHeaderMetaCounts() {
			const key = this.headerMetaCountKey
			if (key === '') {
				this.headerMetaCountValues = {}
				return
			}
			const ctx = typeof this.selfFetchTokenCtx === 'function' ? this.selfFetchTokenCtx() : {}
			const values = {}
			await Promise.all(JSON.parse(key).map(async ([name, from]) => {
				values[name] = await fetchListTotal(from.register, from.schema, from.filter || {}, ctx).catch(() => null)
			}))
			if (key === this.headerMetaCountKey) {
				this.headerMetaCountValues = values
			}
		},

		/**
		 * Count the lists behind the manifest page tabs (`countFrom`), one list
		 * request each. A failed count shows no number.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/index-page-tabs-notice/specs/index-page/spec.md#requirement-an-index-page-can-link-its-sibling-pages-as-tabs
		 */
		async loadPageTabCounts() {
			const key = this.pageTabCountKey
			if (key === '') {
				this.pageTabCounts = {}
				return
			}
			const ctx = typeof this.selfFetchTokenCtx === 'function' ? this.selfFetchTokenCtx() : {}
			const counts = {}
			await Promise.all(this.pageTabs.map(async (tab, index) => {
				const from = tab && tab.countFrom
				if (from && from.register && from.schema) {
					counts[index] = await fetchListTotal(from.register, from.schema, from.filter || {}, ctx).catch(() => null)
				}
			}))
			if (key === this.pageTabCountKey) {
				this.pageTabCounts = counts
			}
		},

		/**
		 * Read the counts of the `filterStrip` pills in one grouped request,
		 * narrowed by the page filter and the active quick filter. A failed
		 * count leaves that pill without a number.
		 *
		 * @spec openspec/changes/screens-filter-strip/specs/index-filter-strip/spec.md#requirement-an-index-page-can-draw-a-second-filter-strip
		 * @return {Promise<void>}
		 */
		async loadFilterStripCounts() {
			const requestKey = this.filterStripCountKey
			const schema = this.exportSchemaSlug
			if (requestKey === '' || !this.register || !schema) {
				this.filterStripCounts = null
				return
			}
			const field = this.filterStrip.field
			const params = (this.$route && this.$route.params) || {}
			const ctx = typeof this.selfFetchTokenCtx === 'function' ? this.selfFetchTokenCtx() : {}
			const base = { ...resolveFilterMap(this.filter, params, ctx), ...resolveFilterMap(this.filterStripTabFilter, params, ctx) }
			const entries = [
				{ key: 'all', filter: {} },
				...this.filterStripValues.map((option, index) => ({ key: `v${index}`, filter: { [field]: option.value } })),
			]
			let counts
			try {
				counts = await fetchFilterCounts({ register: this.register, schema, entries, baseFilter: base, ctx })
			} catch {
				counts = {}
			}
			if (requestKey !== this.filterStripCountKey) {
				return
			}
			this.filterStripCounts = counts
		},

		/**
		 * A pill of the `filterStrip` was picked: filter the list on that value,
		 * or clear the field's filter for All.
		 *
		 * @param {string} value The value, '' for All.
		 * @return {void}
		 */
		onFilterStripPick(value) {
			this.onFilterEvent({ key: this.filterStrip.field, values: value === '' ? [] : [value] })
		},

		/**
		 * Fetch the record counts for the filters and views that asked for
		 * one. Filters that narrow the same single field share one grouped
		 * request. A failed count leaves that entry without a number.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
		 */
		async loadFilterCounts() {
			const requestKey = this.countRequestKey
			if (this.isNamedSource) {
				await this.loadNamedSourceCounts(requestKey)
				return
			}
			const schema = this.exportSchemaSlug
			if (requestKey === '' || !this.register || !schema) {
				this.tabCounts = null
				this.savedViewCounts = null
				return
			}
			const params = (this.$route && this.$route.params) || {}
			const ctx = typeof this.selfFetchTokenCtx === 'function' ? this.selfFetchTokenCtx() : {}
			const counts = await fetchFilterCounts({
				register: this.register,
				schema,
				entries: this.countEntries.map((entry) => ({ key: entry.key, filter: resolveFilterMap(entry.filter, params, ctx) })),
				baseFilter: resolveFilterMap(this.filter, params, ctx),
				ctx,
			})
			if (requestKey !== this.countRequestKey) {
				return
			}
			const tabCounts = {}
			const viewCounts = {}
			for (const [key, value] of Object.entries(counts)) {
				if (key.startsWith('tab:')) {
					tabCounts[Number(key.slice(4))] = value
				} else {
					viewCounts[key.slice(5)] = value
				}
			}
			this.tabCounts = tabCounts
			this.savedViewCounts = viewCounts
		},

		/**
		 * The quick-filter counts of a named source (`entitySource`): each tab
		 * that asks is counted by the source's own `count(config)`, with the
		 * tab's filter over `sourceConfig`. A source without `count` shows
		 * none; a failed count leaves that tab without a number.
		 *
		 * @param {string} requestKey The `countRequestKey` this load answers.
		 * @return {Promise<void>}
		 * @spec openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-a-named-source-counts-its-quick-filters
		 */
		async loadNamedSourceCounts(requestKey) {
			const count = this.namedSource ? this.namedSource.count : null
			if (requestKey === '' || typeof count !== 'function') {
				this.tabCounts = null
				this.savedViewCounts = null
				return
			}
			const params = (this.$route && this.$route.params) || {}
			const ctx = typeof this.selfFetchTokenCtx === 'function' ? this.selfFetchTokenCtx() : {}
			const tabCounts = {}
			await Promise.all(this.countEntries
				.filter((entry) => entry.key.startsWith('tab:'))
				.map(async (entry) => {
					const config = resolveFilterMap({ ...(this.sourceConfig || {}), ...(entry.filter || {}) }, params, ctx)
					try {
						const total = await count(config)
						if (Number.isFinite(total)) {
							tabCounts[Number(entry.key.slice(4))] = total
						}
					} catch {
						// No number for this tab.
					}
				}))
			if (requestKey !== this.countRequestKey) {
				return
			}
			this.tabCounts = tabCounts
			this.savedViewCounts = null
		},

		// ── Split view (case-page-and-list-as-a-place) ──────────────────

		/**
		 * Measure the viewport so the narrow fallback follows a resize and
		 * not only a reload. Measured rather than read off a media query
		 * because the breakpoint is the page's own declaration, not a global.
		 *
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		measureSplitViewport() {
			if (typeof window !== 'undefined' && Number.isFinite(window.innerWidth)) {
				this.splitViewportWidth = window.innerWidth
			}
		},

		/**
		 * Remember where the list is scrolled to.
		 *
		 * The list never unmounts, so the browser keeps the scroll on its
		 * own in the split layout. It does NOT keep it across the narrow
		 * layout, where the element is hidden and has no scroll height at
		 * all, so the position is held here and put back on the way out.
		 *
		 * @param {Event} [event] The scroll event.
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		onListScroll(event) {
			const top = event?.target?.scrollTop
			if (Number.isFinite(top)) {
				this.splitScrollTop = top
			}
		},

		/**
		 * Put the list back where it was.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		async restoreListScroll() {
			await this.$nextTick()
			const el = this.$refs.listScroll
			if (el && Number.isFinite(this.splitScrollTop) && this.splitScrollTop > 0) {
				el.scrollTop = this.splitScrollTop
			}
		},

		/**
		 * Close the pane and go back to the list's own address.
		 *
		 * The list is already mounted and already at row 180, so this is a
		 * route change and nothing else: no refetch, no remount, no reset.
		 *
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		closeSplitPane() {
			/**
			 * @event split-close Emitted when the split pane is closed. The host returns to the list address.
			 */
			this.$emit('split-close')
			const router = this.$router
			const target = this.splitCloseRoute || this.$route?.meta?.cnPageId || null
			if (router && target) {
				router.push({ name: target, query: this.$route?.query || {} }).catch(() => {})
			}
			this.restoreListScroll()
		},

		/**
		 * A record was saved in the pane: replace its row where it sits.
		 *
		 * Deliberately not a refetch. Refetching the page would be correct
		 * and would also scroll the handler back to the top of four hundred
		 * cases, which is the failure the split view was built to end.
		 *
		 * @param {object} saved The saved record.
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		onSplitPaneSaved(saved) {
			const id = rowIdOf(saved, this.rowKey) ?? (this.splitId || null)
			if (id === null || !saved || typeof saved !== 'object') {
				return
			}
			this.splitRowPatches = { ...this.splitRowPatches, [id]: saved }
			/**
			 * @event split-saved Emitted after a record saved in the pane was written onto its row in the list.
			 * @type {object}
			 */
			this.$emit('split-saved', saved)
		},

		// ── Manual order (case-page-and-list-as-a-place) ────────────────

		/**
		 * The key this list's manual order is held under.
		 *
		 * @return {string} The preference key.
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		manualOrderPreferenceKey() {
			return manualOrderKey(this.manualOrderId || this.objectType || this.schema || 'default')
		},

		/**
		 * Read this person's order for this list out of their preferences.
		 *
		 * A read that fails leaves the list in its loaded order rather than
		 * blocking it: an order nobody can read is a nicety, and a list that
		 * refuses to render because of one is not.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		async loadManualOrder() {
			if (!this.manualOrder) {
				return
			}
			const read = this.cnUserPreferences?.read
			if (typeof read !== 'function') {
				return
			}
			try {
				const stored = await read(this.manualOrderPreferenceKey(), [])
				this.manualOrderIds = Array.isArray(stored) ? stored.map(String) : []
			} catch {
				this.manualOrderIds = []
			}
		},

		/**
		 * Write this person's order back, and tell the host.
		 *
		 * @param {Array<string>} ids The new order.
		 * @return {Promise<void>}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		async persistManualOrder(ids) {
			this.manualOrderIds = ids
			/**
			 * @event manual-order-change Emitted when this person reorders the list by hand. Payload is the row ids in their order.
			 * @type {Array<string>}
			 */
			this.$emit('manual-order-change', ids)
			const write = this.cnUserPreferences?.write
			if (typeof write === 'function') {
				try {
					await write(this.manualOrderPreferenceKey(), ids)
				} catch {
					// A preference that could not be written is a preference
					// that will not survive the reload. The list is still in
					// the order the person just chose, so nothing is said.
				}
			}
		},

		/**
		 * Move a row one place up or down. The keyboard half of the drag, and
		 * the one the drag itself calls, so the two cannot disagree.
		 *
		 * @param {string} id The row being moved.
		 * @param {number} delta -1 for up, 1 for down.
		 * @return {Promise<void>}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		moveRowByHand(id, delta) {
			return this.persistManualOrder(moveInOrder(visibleIdsOf(this.displayObjects, this.rowKey), id, delta))
		},

		/**
		 * Place a dragged row at an index.
		 *
		 * @param {string} id The row being dragged.
		 * @param {number} toIndex The index it was dropped at.
		 * @return {Promise<void>}
		 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
		 */
		dropRowByHand(id, toIndex) {
			return this.persistManualOrder(dropInOrder(visibleIdsOf(this.displayObjects, this.rowKey), id, toIndex))
		},

		/**
		 * Resolve a component the page config names — `cardComponent`,
		 * `listComponent` — out of the v2 registry (any kind carrying a
		 * `component`, as a slot lookup does) and then the legacy
		 * customComponents map.
		 *
		 * @param {string} name The registered component name.
		 * @return {object|null} The component, or null when nothing answers.
		 */
		resolveNamedComponent(name) {
			const entry = this.effectiveRegistry[name]
			if (entry && entry.component) {
				return entry.component
			}
			return this.effectiveCustomComponents[name] || null
		},

		/**
		 * Whether a handler name matches something registered that is not
		 * callable — a named component where a function belongs. Tells a
		 * typo (silent emit-only) apart from a mis-registration (warned).
		 *
		 * @param {string} name The handler name from the manifest.
		 * @return {boolean}
		 */
		namesSomethingUnusable(name) {
			const candidates = [this.effectiveRegistry[name], this.resolvedCustomComponents[name]]
			return candidates.some((v) => v !== undefined && v !== null)
		},

		/**
		 * Resolve a declarative `headerActions[]` entry's `handler`
		 * field into the final dispatchable shape. Mirrors the
		 * row-level `actions[].handler` keyword set used by
		 * manifest-actions-dispatch — `navigate`, `emit`, `none`, or a
		 * registry name (resolved through `resolveRegisteredHandler`).
		 *
		 * @spec openspec/changes/header-action-href/specs/header-action-href/spec.md#requirement-a-header-action-with-href-is-a-link-that-runs-and-emits-nothing
		 * @param {object} entry Raw headerActions entry.
		 * @return {object} Possibly-mutated copy: an `href` becomes a
		 *   resolved link with `linkTarget`, no handler (a function one
		 *   included) and `_dispatchSuppress: true`; function-typed
		 *   handlers untouched; `'emit'` and unknown registry names
		 *   strip the `handler` (emit-only fall-through); `'navigate'`
		 *   becomes a `$router.push` thunk (with the entry's literal
		 *   `params` map when present); `'none'` becomes a no-op +
		 *   `_dispatchSuppress: true`; a registry name resolves to a
		 *   `fn({ actionId })` thunk.
		 */
		resolveHeaderHandler(entry) {
			if (!entry) {
				return entry
			}
			// An `href` makes the entry a link, which only navigates: it
			// carries no handler, and the page emits nothing for it.
			if (typeof entry.href === 'string' && entry.href !== '') {
				const link = headerActionAsLink(entry)
				return link.href ? { ...link, linkTarget: link.target, _dispatchSuppress: true } : link
			}
			const handler = entry.handler
			if (typeof handler === 'function') {
				return { ...entry }
			}
			// `type: "navigate"` with a `target` URL is a link: the bar and the
			// header's Actions menu render it as a real anchor, an external URL
			// in a new tab.
			if (typeof handler !== 'string' && entry.type === 'navigate' && typeof entry.target === 'string' && entry.target !== '' && !entry.href) {
				return isExternalActionTarget(entry.target)
					? { ...entry, href: entry.target, linkTarget: '_blank' }
					: { ...entry, href: entry.target }
			}
			if (typeof handler !== 'string') {
				// No handler declared — emit-only fall-through.
				return { ...entry }
			}
			if (handler === 'navigate') {
				if (!entry.route) {
					// eslint-disable-next-line no-console
					console.warn(`CnIndexPage: headerActions[].id "${entry.id}" handler:"navigate" requires "route"; falling back to emit-only`)
					const { handler: _ignored, ...rest } = entry
					return { ...rest }
				}
				const route = entry.route
				const router = this.$router
				// Literal params let a header action navigate to a detail route
				// with fixed params, e.g. a "New X" button → `{ id: "new" }`.
				const params = (entry.params && typeof entry.params === 'object') ? entry.params : null
				const location = params ? { name: route, params } : { name: route }
				// A resolvable route renders as a real link in the bar, which does
				// the navigating; the entry then carries no handler to push again.
				if (routeHref(location, router)) {
					const { handler: _ignored, ...rest } = entry
					return { ...rest, to: location }
				}
				const out = { ...entry }
				out.handler = () => {
					if (router && typeof router.push === 'function') {
						router.push(location)
					}
				}
				return out
			}
			if (handler === 'emit') {
				const { handler: _ignored, ...rest } = entry
				return { ...rest }
			}
			if (handler === 'none') {
				return { ...entry, handler: () => {}, _dispatchSuppress: true }
			}
			// Registry name lookup.
			const resolved = resolveRegisteredHandler(handler, this.effectiveRegistry, this.resolvedCustomComponents)
			if (typeof resolved === 'function') {
				const id = entry.id
				return { ...entry, handler: () => resolved({ actionId: id }) }
			}
			if (this.namesSomethingUnusable(handler)) {
				// eslint-disable-next-line no-console
				console.warn(`CnIndexPage: headerActions[].handler "${handler}" resolved to a non-function in the registry or customComponents; falling back to emit-only`)
				const { handler: _ignored, ...rest } = entry
				return { ...rest }
			}
			// Unknown registry name — silent emit-only fall-through.
			const { handler: _ignored, ...rest } = entry
			return { ...rest }
		},

		/**
		 * Click dispatch from CnActionsBar's `@bulk-action`.
		 *
		 * 🔴 THE SELECTION IS PASSED, NEVER LOOKED UP. Everything a bulk
		 * action does is defined by which rows were selected, and the strip
		 * that raised the event is the thing that knows. A handler that reads
		 * the selection from somewhere else is one re-render away from acting
		 * on a different set than the user saw highlighted.
		 *
		 * Resolution mirrors `headerActions[]`:
		 *   - a function handler is called with `{ actionId, selectedIds, count }`
		 *   - `open-modal` (with `target`) opens the registered modal, with the
		 *     selection merged into its props
		 *   - a registry name resolves through the v2 registry, then the
		 *     legacy `customComponents`
		 *   - anything else falls through to emit-only
		 *
		 * `bulk-action` is emitted either way, so a host can listen instead of
		 * declaring a handler.
		 *
		 * @param {{id: string, action: string, selectedIds: Array, count: number}} payload Bar payload.
		 */
		onBulkAction(payload) {
			const id = payload && (payload.id ?? payload.action)
			const selectedIds = (payload && Array.isArray(payload.selectedIds)) ? payload.selectedIds : []
			const count = selectedIds.length
			const entry = this.mergedBulkActions.find((e) => e.id === id)

			if (entry) {
				const handler = entry.handler
				const scope = { actionId: id, selectedIds, count }

				if (typeof handler === 'function') {
					handler(scope)
				} else if (handler === 'open-modal' || (!handler && entry.target)) {
					this.openBulkModal(entry, selectedIds, count)
				} else if (typeof handler === 'string' && handler !== 'emit' && handler !== 'none') {
					const resolved = resolveRegisteredHandler(handler, this.effectiveRegistry, this.resolvedCustomComponents)
					if (typeof resolved === 'function') {
						resolved(scope)
					} else if (this.namesSomethingUnusable(handler)) {
						// eslint-disable-next-line no-console
						console.warn(`CnIndexPage: bulkActions[].handler "${handler}" resolved to a non-function in the registry or customComponents; falling back to emit-only`)
					}
				}

				if (entry._dispatchSuppress || entry.handler === 'none') {
					return
				}
			}

			/**
			 * @event bulk-action A declarative bulk action was triggered from the selection strip. Payload: `{ action, id, selectedIds, count }`. The SELECTION travels with it, because an action that has to go and find out what was selected is one re-render away from acting on a different set than the user saw highlighted.
			 */
			this.$emit('bulk-action', { action: id, id, selectedIds, count })
		},

		/**
		 * Open a bulk action's modal with the selection in its props.
		 *
		 * The selection is merged UNDER the entry's own props, so a manifest
		 * that names a `selectedIds` prop of its own still wins — but it also
		 * means such a manifest silently stops receiving the live selection,
		 * which is why the collision is warned about rather than allowed
		 * quietly.
		 *
		 * @param {object} entry The bulk action entry.
		 * @param {Array} selectedIds The current selection.
		 * @param {number} count Its length.
		 */
		openBulkModal(entry, selectedIds, count) {
			const target = entry.target
			if (!target) {
				// eslint-disable-next-line no-console
				console.warn(`CnIndexPage: bulkActions[].id "${entry.id}" handler:"open-modal" requires "target"; falling back to emit-only`)
				return
			}
			const own = (entry.props && typeof entry.props === 'object') ? entry.props : {}
			if (Object.hasOwn(own, 'selectedIds')) {
				// eslint-disable-next-line no-console
				console.warn(`CnIndexPage: bulkActions[].id "${entry.id}" declares its own "selectedIds" prop, which shadows the live selection; the modal will not see what the user selected.`)
			}
			/**
			 * @event open-modal A bulk action of type `open-modal` asks the host to open a registered modal. Payload: `{ target, props }`, where `props` carries `selectedIds` and `count` merged UNDER the action's own props.
			 */
			this.$emit('open-modal', { target, props: { selectedIds, count, ...own } })
		},

		/**
		 * Whether a shown header button takes `action` over from the bar.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 * @param {string} action The action, e.g. `add`.
		 * @return {boolean}
		 */
		headerButtonTakes(action) {
			return this.headerButtonsShown && this.resolvedHeaderButtons.some((button) => button.action === action)
		},

		/**
		 * The entries of the header's Actions menu (`headerButtons[]` with
		 * `action: "actions-menu"`). Without `items` they are the page's header
		 * actions, as before. `items` names them, in order: `header-actions`
		 * (all of them), the id of one header action, or a built-in of the
		 * actions bar's own menu, which the bar drops while header buttons show:
		 * `import`, `export`, `refresh`, `copy-selected`, `delete-selected`
		 * (disabled until a row is selected) and `documentation` (a link to
		 * `documentationUrl`, left out when the page has none). An unknown name
		 * is left out. `{ heading }` and `separator` group the entries: an
		 * entry of `kind` `heading` or `separator`, drawn only when an entry
		 * follows it.
		 *
		 * @spec openspec/changes/screens-index-header-actions-menu/specs/index-header/spec.md#requirement-the-header-actions-menu-lists-what-its-items-name
		 * @spec openspec/changes/screens-index-header-menu-headings/specs/index-header/spec.md#requirement-the-header-actions-menu-can-draw-group-headings-and-separators
		 * @spec openspec/changes/header-action-href/specs/header-action-href/spec.md#requirement-a-header-action-with-href-is-a-link-that-runs-and-emits-nothing
		 * @param {{items?: Array<(string|{heading: string})>|null, format?: string}} button The resolved header button.
		 * @return {Array<{key: string, label: string, kind?: ('heading'|'separator'), icon?: string, href?: string, linkTarget?: string, disabled?: boolean, title?: string, iconComponent?: object, run?: () => void}>}
		 */
		headerMenuEntries(button) {
			const fromAction = (entry) => ({
				key: String(entry.id),
				label: entry.label ? this.cnTranslate(entry.label) : '',
				icon: entry.icon && typeof entry.icon === 'string' && !entry.icon.startsWith('icon-') ? entry.icon : '',
				href: typeof entry.href === 'string' && entry.href !== '' ? entry.href : '',
				linkTarget: entry.linkTarget || '',
				// A `handler: "navigate"` entry whose route resolves carries `to`
				// (resolveHeaderHandler drops its handler): the menu draws it as
				// an in-app link, as the actions bar does, so it navigates.
				link: !entry.href && entry.to && !entry.disabled ? resolveItemActionLink({ to: entry.to }, null, this.$router) : null,
				disabled: Boolean(entry.disabled),
				run: () => this.onHeaderAction({ action: entry.id, id: entry.id }),
			})
			const names = button && Array.isArray(button.items) ? button.items : ['header-actions']
			const noSelection = this.internalSelectedIds.length < 1
			const builtIns = {
				import: () => ({ key: 'import', label: t('nextcloud-vue', 'Import'), icon: 'Import', iconComponent: ImportIcon, run: () => { this.showImportDialog = true } }),
				export: () => ({ key: 'export', label: t('nextcloud-vue', 'Export'), icon: 'Export', iconComponent: Export, run: () => this.onHeaderButton({ action: 'export', format: button.format }) }),
				refresh: () => ({ key: 'refresh', label: t('nextcloud-vue', 'Refresh'), icon: 'Refresh', run: () => this.onRefreshEvent() }),
				'copy-selected': () => ({
					key: 'copy-selected',
					label: t('nextcloud-vue', 'Copy selected'),
					icon: 'ContentCopy',
					disabled: noSelection,
					title: noSelection ? t('nextcloud-vue', 'Select 1 or more items to copy') : '',
					run: () => { this.showMassCopyDialog = true },
				}),

				'delete-selected': () => ({
					key: 'delete-selected',
					label: t('nextcloud-vue', 'Delete selected'),
					icon: 'TrashCanOutline',
					iconComponent: TrashCanOutline,
					disabled: noSelection,
					title: noSelection ? t('nextcloud-vue', 'Select 1 or more items to delete') : '',
					run: () => { this.showMassDeleteDialog = true },
				}),

				documentation: () => (this.documentationUrl
					? { key: 'documentation', label: this.documentationLabel || t('nextcloud-vue', 'Documentation'), icon: 'BookOpenVariantOutline', href: this.documentationUrl, linkTarget: '_blank' }
					: null),
			}
			const entries = []
			const seen = new Set()
			const push = (entry) => {
				if (entry && entry.label !== '' && !seen.has(entry.key)) {
					seen.add(entry.key)
					entries.push(entry)
				}
			}
			// A group heading (`{ heading }`) or a `separator` is kept as a mark
			// and only drawn when an entry follows it (see groupMenuEntries).
			let mark = 0
			for (const name of names) {
				if (name && typeof name === 'object') {
					mark += 1
					entries.push({ key: `__heading-${mark}`, kind: 'heading', label: this.cnTranslate(name.heading) })
				} else if (name === 'separator') {
					mark += 1
					entries.push({ key: `__separator-${mark}`, kind: 'separator', label: '' })
				} else if (name === 'header-actions') {
					this.mergedHeaderActions.forEach((entry) => push(fromAction(entry)))
				} else if (Object.hasOwn(builtIns, name)) {
					push(builtIns[name]())
				} else {
					const entry = this.mergedHeaderActions.find((candidate) => candidate.id === name)
					if (entry) {
						push(fromAction(entry))
					}
				}
			}
			return this.groupMenuEntries(entries)
		},

		/**
		 * Tidy the marks of the header's Actions menu: a heading or separator
		 * with no entry after it (before the next mark or the end) is dropped,
		 * a separator never opens the menu, two separators in a row are one,
		 * and a heading followed by a separator before any entry is dropped. So a group whose entries are all left out (no documentation
		 * URL, an unknown id) leaves no empty heading or double rule behind,
		 * and a menu of marks only has no entries and is not drawn.
		 *
		 * @spec openspec/changes/screens-index-header-menu-headings/specs/index-header/spec.md#requirement-the-header-actions-menu-can-draw-group-headings-and-separators
		 * @param {Array<{key: string, kind?: string}>} entries The entries with their marks, in order.
		 * @return {Array<{key: string, kind?: string}>} The entries to draw.
		 */
		groupMenuEntries(entries) {
			const out = []
			let separator = null
			let heading = null
			for (const entry of entries) {
				if (entry.kind === 'separator') {
					// A rule ends the group before it: a heading not yet followed
					// by an entry is dropped with it.
					separator = entry
					heading = null
					continue
				}
				if (entry.kind === 'heading') {
					heading = entry
					continue
				}
				if (separator && out.length > 0) {
					out.push(separator)
				}
				if (heading) {
					out.push(heading)
				}
				separator = null
				heading = null
				out.push(entry)
			}
			return out
		},

		/**
		 * An in-app link of the header's Actions menu was clicked: a plain click
		 * goes through the router (a modified click is left to the browser),
		 * and the entry is reported as a header action, as the actions bar does.
		 *
		 * @spec openspec/changes/screens-index-header-actions-menu/specs/index-header/spec.md#requirement-the-header-actions-menu-lists-what-its-items-name
		 * @param {{key: string, link: object}} entry The menu entry.
		 * @param {MouseEvent} event The click.
		 * @return {void}
		 */
		onHeaderMenuLinkClick(entry, event) {
			if (isModifiedClick(event)) {
				return
			}
			followItemActionLink(event, entry.link, this.$router)
			this.$emit('header-action', { action: entry.key, id: entry.key })
		},

		/**
		 * A header button was clicked: run its built-in action, or dispatch
		 * it as the `headerActions` entry with that id. A button that is a
		 * link is left to the browser.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 * @spec openspec/changes/header-action-href/specs/header-action-href/spec.md#requirement-a-header-action-with-href-is-a-link-that-runs-and-emits-nothing
		 * @param {{action: string, format: string, link?: object}} button The resolved button.
		 * @return {void}
		 */
		onHeaderButton(button) {
			if (button.link) {
				return
			}
			if (button.action === 'add') {
				this.onAddClick()
			} else if (button.action === 'export') {
				if (button.run) {
					this.onHeaderAction({ action: button.run, id: button.run })
				} else if (this.register && this.exportSchemaSlug) {
					this.onExportClick(button.format)
				} else if (this.isNamedSource && !this.hasMassExportListener()) {
					this.downloadNamedRows()
				} else {
					this.showExportDialog = true
				}
			} else if (button.action === 'import') {
				this.showImportDialog = true
			} else if (button.action === 'refresh') {
				this.onRefreshEvent()
			} else if (button.action === 'save-view') {
				this.showSaveViewDialog = true
			} else {
				this.onHeaderAction({ action: button.action, id: button.action })
			}
		},

		/**
		 * Whether a header Export has something to export through. Any page
		 * listing OpenRegister objects (self-fetch or the consumer's
		 * `objects`) keeps it; a named or endpoint source (`entitySource`)
		 * needs a `run` naming one of the page's header actions, or a
		 * `@mass-export` listener.
		 *
		 * @spec openspec/changes/index-header-export-source/specs/index-page/spec.md#requirement-a-header-export-is-drawn-only-when-it-can-export
		 * @param {{run?: string}} button The resolved header button.
		 * @return {boolean}
		 */
		headerExportAvailable(button) {
			if (!this.isNamedSource || (button && button.run) || this.hasMassExportListener()) {
				return true
			}
			// A named source exports the rows it holds as CSV (downloadNamedRows).
			return this.renderedColumns.some((col) => col && typeof col.key === 'string' && col.key !== '')
		},

		/**
		 * Whether the consumer listens to `@mass-export`.
		 *
		 * @return {boolean}
		 */
		hasMassExportListener() {
			const props = this.$ && this.$.vnode && this.$.vnode.props
			return Boolean(props && typeof props.onMassExport === 'function')
		},

		/**
		 * Download the rows of a named or endpoint source as CSV: every row the
		 * source holds for the current query, with the table's columns. Such a
		 * source has no server export, and a Download that does nothing is
		 * worse than none.
		 *
		 * @spec openspec/changes/index-named-source-export/specs/index-named-source-export/spec.md#requirement-a-named-source-list-downloads-its-rows
		 * @return {void}
		 */
		downloadNamedRows() {
			const csv = rowsToCsv(this.namedRows, this.renderedColumns)
			const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
			const url = URL.createObjectURL(blob)
			const link = document.createElement('a')
			const name = String(this.title || this.entitySource || 'export').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export'
			link.href = url
			link.download = `${name}.csv`
			document.body.appendChild(link)
			link.click()
			link.remove()
			URL.revokeObjectURL(url)
		},

		/**
		 * Click dispatch from CnActionsBar's `@header-action`. Looks
		 * up the resolved entry by id, invokes its handler if any,
		 * and (unless the entry is `'none'`-suppressed) emits
		 * `@header-action({ action: id, id })` upward.
		 *
		 * @param {{action: string, id: string}} payload Bar payload.
		 */
		onHeaderAction(payload) {
			const id = payload && (payload.id ?? payload.action)
			const entry = this.mergedHeaderActions.find((e) => e.id === id)
			if (entry && typeof entry.handler === 'function') {
				entry.handler()
			} else {
				const dialogRun = this.dialogHeaderRuns.find((e) => e.id === id)
				if (dialogRun && typeof dialogRun.run === 'function') {
					dialogRun.run()
				}
			}
			if (entry && entry._dispatchSuppress) {
				return
			}
			this.$emit('header-action', { action: id, id })
		},

		/**
		 * The `countSubtitle` line for a total. A string goes through the host
		 * translate; `{ singular, plural }` takes the form for the total
		 * through the app's plural translation, or by `total === 1` when no app
		 * id is provided. `{total}` (and `{shown}` when given) are filled in.
		 *
		 * @spec openspec/changes/index-count-plural/specs/index-header/spec.md#requirement-the-count-line-takes-a-singular-and-a-plural-form
		 * @param {string|{singular: string, plural: string}} subtitle The declared line.
		 * @param {number} total The collection's total.
		 * @param {number|null} shown The rows on this page, or null to leave `{shown}` alone.
		 * @return {string} The line, '' for a declaration without both forms.
		 */
		countLine(subtitle, total, shown) {
			return countLine(subtitle, total, { shown, translate: this.cnTranslate, appId: this.cnAppId })
		},

		/**
		 * An `open-form` header action saved a record: the list reloads so the
		 * new row shows.
		 *
		 * @spec openspec/changes/index-header-open-form/specs/index-header/spec.md#requirement-an-index-header-action-can-open-the-create-form
		 * @return {void}
		 */
		onHeaderActionCreated() {
			this.onRefreshEvent()
		},

		pushAiContext() {
			applyAiContext(this.cnAiContext, 'index', {
				register: this.register,
				schema: this.schema,
				effectiveSchema: this.effectiveSchema,
			})
		},

		// ── List-event handlers ──────────────────────────────────────────────
		// In self-fetch mode each routes to the useListView instance (re-fetch);
		// in every mode the event still bubbles via $emit so a host that wants
		// to observe (or take over) keeps working — unchanged for consumers.
		/**
		 * @param {string} value Search term from the sidebar / header.
		 * @return {void}
		 */
		onSearchEvent(value) {
			if (this.namedSourceSearches) {
				this.namedSearchTerm = value || ''
			}
			if (this.isSelfFetchMode && typeof this.list.onSearch === 'function') {
				this.list.onSearch(value)
				this.persistViewStateToRoute(this.currentViewState())
			}
			this.$emit('search', value)
		},

		/**
		 * Quick-filter tab change. Updates the active index — the `setup()`
		 * watcher then triggers `list.refresh(1)` so the new tab's filter
		 * flows into the next fetch.
		 *
		 * @param {number} index Zero-based tab index (from CnQuickFilterBar).
		 * @return {void}
		 */
		onQuickFilterChange(index) {
			// `activeQuickFilterIndex` is a setup-returned ref; the
			// Vue 2 ref-unwrap proxy makes plain assignment work.
			this.activeQuickFilterIndex = index
			this.$emit('quick-filter-change', index)
		},

		/**
		 * Multi-select quick-filter change (`quickFilterMultiple`). Updates the
		 * selected-index array; the `setup()` watcher re-fetches with the
		 * OR-ed union of the selected tabs' filters.
		 *
		 * @param {number[]} indices Selected tab indices (from CnQuickFilterBar).
		 * @return {void}
		 */
		onQuickFilterMultiChange(indices) {
			this.selectedQuickFilterIndices = Array.isArray(indices) ? indices : []
			this.$emit('quick-filter-change', this.selectedQuickFilterIndices)
		},

		/**
		 * An order chosen in the index sidebar's Sort section. An option with
		 * an endpoint `source` is chosen by its value; any other goes the way a
		 * header click goes: the self-fetched list sorts (`_order`, kept in the
		 * address), and `sort` is emitted for a host that sorts itself.
		 *
		 * @param {Array<{key: string, order: string}>} keys The chosen order.
		 * @param {string} [value] The chosen option's value.
		 * @return {void}
		 */
		onSidebarSortChange(keys, value) {
			if (value !== undefined && this.selectSortOption(value)) {
				return
			}
			if (!Array.isArray(keys) || keys.length === 0) {
				return
			}
			this.onSortEvent({ key: keys[0].key, order: keys[0].order, keys })
		},

		/**
		 * Choose a sort option by its value: an option with an endpoint
		 * `source` lists the endpoint's rows; any other applies its order. A
		 * saved view's `sortOption` selects through here.
		 *
		 * @param {string} value The option's value.
		 * @return {boolean} Whether an option of that value was chosen.
		 * @spec openspec/changes/sidebar-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
		 */
		selectSortOption(value) {
			const option = (this.sortSelectOptions || []).find((o) => o && o.value !== undefined && String(o.value) === String(value))
			if (!option) {
				return false
			}
			if (this.sourceSortOptions.includes(option) && this.isSelfFetchMode) {
				this.sortSource = { ...this.sortSource, value: String(option.value), page: 1 }
				this.loadSortSource(option)
				this.$emit('sort-change', String(option.value))
				return true
			}
			const keys = orderToSortKeys(option.order !== undefined ? option.order : option.value)
			if (keys.length === 0) {
				return false
			}
			this.onSortEvent({ key: keys[0].key, order: keys[0].order, keys })
			return true
		},

		/**
		 * A quick filter with `@config.<key>` in its `label` or `activeLabel`
		 * (`"Residence @config.municipality"`): the label translated first, then
		 * each token replaced by its configured value. A key the config does
		 * not hold leaves its token in place. Other tabs pass unchanged.
		 *
		 * @param {object} tab A quick-filter tab.
		 * @return {object} The tab, with its labels resolved.
		 */
		withConfigLabels(tab) {
			if (!tab || typeof tab !== 'object') {
				return tab
			}
			const hasToken = (value) => typeof value === 'string' && value.includes('@config.')
			if (!hasToken(tab.label) && !hasToken(tab.activeLabel)) {
				return tab
			}
			const fill = (value) => (hasToken(value) ? this.fillConfigTokens(this.cnTranslate(value)) : value)
			return { ...tab, label: fill(tab.label), activeLabel: fill(tab.activeLabel) }
		},

		/**
		 * A text with each `@config.<key>` replaced by the app config's value;
		 * a key the config does not hold leaves its token in place.
		 *
		 * @param {string} text The text, already translated.
		 * @return {string} The text with the config values in.
		 * @spec openspec/changes/pl4-cell-rules/specs/pl4-cell-rules/spec.md#requirement-a-token-can-take-a-config-value
		 */
		fillConfigTokens(text) {
			const config = this.effectiveAppConfig
			return String(text).replace(/@config\.([A-Za-z0-9_.-]*[A-Za-z0-9_])/g, (token, key) => {
				const found = this.getByPath(config, key)
				return found === undefined || found === null || found === '' ? token : String(found)
			})
		},

		/**
		 * @param {{key: string, order: string, keys?: Array<{key: string, order: string}>}} payload Sort change from CnDataTable.
		 * @return {void}
		 */
		onSortEvent(payload) {
			// An order by keys (a column header, a field in the Sort section)
			// leaves an endpoint-ranked order.
			if (this.sortSource.value) {
				this.sortSource = { ...this.sortSource, value: '', page: 1 }
			}
			if (this.isNamedSource && this.namedSource && this.namedSource.sortsRows === true) {
				this.namedSort = { key: (payload && payload.key) || '', order: (payload && payload.order) || 'asc' }
			}
			if (this.isSelfFetchMode && typeof this.list.onSort === 'function') {
				this.list.onSort(payload)
				this.persistViewStateToRoute(this.currentViewState())
			}
			this.$emit('sort', payload)
		},

		/**
		 * Self-fetch mode's current filters/search/sort, straight from
		 * useListView's own reactive state — the shape `persistViewStateToRoute`
		 * and the saved-views helpers (`buildViewCreatePayload`,
		 * `extractViewState`) all share.
		 *
		 * @return {{filters: object, search: string, sortKey: ?string, sortOrder: string, sortKeys: Array<{key: string, order: string}>}}
		 */
		currentViewState() {
			return {
				filters: this.list.activeFilters.value,
				search: this.list.searchTerm.value,
				sortKeys: this.list.sortKeys?.value || [],
				sortKey: this.list.sortKey.value,
				sortOrder: this.list.sortOrder.value,
			}
		},

		/**
		 * The spelling a filter goes back into the query as. A value that arrived
		 * as an `@`-token keeps the TOKEN for as long as it still resolves to
		 * what is active — otherwise a shared `?assignee=@me` link would be
		 * rewritten to one named uid on the first filter change and stop meaning
		 * "me" for whoever opens it next.
		 *
		 * @param {string} key The filter key, as it sits in the query.
		 * @param {unknown} value The resolved value now active.
		 * @return {unknown} The token, or the value.
		 */
		filterQuerySpelling(key, value) {
			const raw = this.$route.query[key]
			if (typeof raw !== 'string' || raw.charAt(0) !== '@') {
				return value
			}
			const ctx = typeof this.selfFetchTokenCtx === 'function' ? this.selfFetchTokenCtx() : {}
			return String(resolveFilterValue(raw, ctx)) === String(value) ? raw : value
		},

		/**
		 * The "Also search inside files" switch was toggled: refetch (via the
		 * watcher in self-fetch mode), keep the state in the route, and tell a
		 * consumer-managed host.
		 *
		 * @param {boolean} value The switch's new state.
		 * @return {void}
		 */
		onContentSearchToggle(value) {
			this.contentSearch = !!value
			/**
			 * @event content-search Emitted when the "Also search inside files" switch changes, so a consumer-managed page can add `_content_search` to its own query.
			 * @type {boolean}
			 */
			this.$emit('content-search', this.contentSearch)
			if (this.isSelfFetchMode) {
				this.persistViewStateToRoute(this.currentViewState())
			}
		},

		/**
		 * Persist filters + search + sort into `$route.query` in one replace,
		 * so a reload or a shared/bookmarked link reproduces the exact same
		 * view. Self-fetch mode only. The page's own filter keys are cleared and
		 * re-applied wholesale each call rather than merged (otherwise a cleared
		 * filter would never leave the query); a non-reserved key it never
		 * claimed is left alone. Best-effort: a duplicate-navigation rejection
		 * (same resulting path/query) is swallowed.
		 *
		 * @param {{filters?: object, search?: string, sortKey?: ?string, sortOrder?: string, sortKeys?: Array<{key: string, order: string}>}} state Current view state.
		 * Without `savedView` the address keeps the applied view it names while
		 * the filters are still the view's: a sort, a search or the view's own
		 * sort option shows the same view's records.
		 *
		 * @param {{savedView?: string}} [options] The saved view the address keeps naming, or `''` for none.
		 * @return {void}
		 * @spec openspec/changes/saved-view-kept-in-route/specs/saved-view-kept-in-route/spec.md#requirement-the-address-keeps-naming-the-applied-view
		 */
		persistViewStateToRoute(state, { savedView } = {}) {
			if (!this.$router || !this.$route) {
				return
			}
			const query = { ...this.$route.query }
			if (savedView === undefined) {
				const named = this.appliedSavedViewId !== '' && query.savedView === this.appliedSavedViewId
				savedView = named && this.viewFiltersKey(state.filters) === this.appliedViewFiltersKey ? this.appliedSavedViewId : ''
			}
			// The menu entry of a saved view is active while the address names
			// it; any other change to the filters is no longer that view.
			if (savedView !== '') {
				query.savedView = savedView
			} else {
				delete query.savedView
			}
			for (const key of this.persistedFilterKeys) {
				delete query[key]
			}
			const written = []
			for (const [key, value] of Object.entries(state.filters || {})) {
				if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
					continue
				}
				query[key] = this.filterQuerySpelling(key, value)
				written.push(key)
			}
			this.persistedFilterKeys = written
			if (state.search) {
				query._search = state.search
			} else {
				delete query._search
			}
			if (this.searchInFiles && this.contentSearch) {
				query.contentSearch = '1'
			} else {
				delete query.contentSearch
			}
			const sortKeys = Array.isArray(state.sortKeys) && state.sortKeys.length
				? state.sortKeys
				: (state.sortKey ? [{ key: state.sortKey, order: state.sortOrder || 'asc' }] : [])
			if (sortKeys.length) {
				query._order = JSON.stringify(sortKeys.map((k) => ({ key: k.key, order: k.order || 'asc' })))
			} else {
				delete query._order
			}
			this.$router.replace({ query }).catch(() => {})
		},

		/**
		 * Filters as one comparable key: empty values dropped, every value a
		 * sorted list of strings, the keys sorted.
		 *
		 * @param {object} filters The filters.
		 * @return {string}
		 * @spec openspec/changes/saved-view-kept-in-route/specs/saved-view-kept-in-route/spec.md#requirement-the-address-keeps-naming-the-applied-view
		 */
		viewFiltersKey(filters) {
			const out = {}
			for (const key of Object.keys(filters || {}).sort()) {
				const value = filters[key]
				const values = (Array.isArray(value) ? value : [value]).filter((v) => v !== undefined && v !== null && v !== '').map(String).sort()
				if (values.length > 0) {
					out[key] = values
				}
			}
			return JSON.stringify(out)
		},

		/**
		 * "Clear all" from the sidebar: reset search, every active filter, the
		 * sort and the folder-sidebar selection in one fetch + one route
		 * replace, rather than one of each per field. Self-fetch mode only; a
		 * consumer-managed page gets the bare event to handle itself.
		 *
		 * The SORT goes too, and that is the whole point: applying a saved view
		 * sets a sort the reader never chose and cannot see the origin of, so a
		 * clear that left it behind left the list in a state with no control
		 * anywhere on the page to undo it.
		 *
		 * @return {void}
		 */
		onClearFilters() {
			// "Clear all" on the Active line also undoes the quick filters it
			// listed (a tab without an `activeLabel` is not a filter there).
			for (const chip of this.quickFilterActiveChips) {
				this.deselectQuickFilterChip(chip.quickFilterIndex)
			}
			// Clearing the view brings the person's own columns back.
			this.appliedViewColumns = null
			this.appliedSavedViewId = ''
			this.applyViewSortOption(null)
			if (this.isNamedSource && Object.keys(this.namedActiveFilters || {}).length > 0) {
				this.namedActiveFilters = {}
				this.persistNamedFiltersToRoute({})
			}
			if (this.searchTermChips.length > 0) {
				this.namedSearchTerm = ''
			}
			if (!this.isSelfFetchMode) {
				this.$emit('clear-filters')
				return
			}
			this.list.activeFilters.value = {}
			this.list.searchTerm.value = ''
			this.list.sortKeys.value = []
			this.list.sortKey.value = null
			this.list.sortOrder.value = 'asc'
			if (this.folderSidebar) {
				this.selectedFolderId = null
			}
			this.list.refresh(1)
			this.persistViewStateToRoute(this.currentViewState())
			this.$emit('clear-filters')
		},

		/**
		 * Read the rows `mapConfig.markerColor.source` points at, once.
		 *
		 * @return {Promise<void>}
		 */
		async loadMapColorSource() {
			const rule = this.mapMarkerColor
			if (!rule || !rule.source || this.mapColorRefs !== null) {
				return
			}
			const property = this.effectiveSchema?.properties?.[rule.field] || null
			const target = referenceTargetOf(rule.source, { register: this.register, property })
			if (!target.register || !target.schema) {
				return
			}
			let rows
			try {
				rows = await fetchReferenceObjects({ ...target, filter: rule.source.filter || {} })
			} catch {
				rows = []
			}
			this.mapColorRefs = Array.isArray(rows) ? rows : []
		},

		/**
		 * Fetch what the board view needs: the rows of a reference column
		 * field (once per field) and the narrowing select's options.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-columns-can-be-the-rows-a-field-references
		 */
		async loadBoardSources() {
			const active = this.boardActiveColumnField
			if (active && active.kind === 'reference' && !Object.hasOwn(this.boardRefs, active.field)) {
				const property = this.effectiveSchema?.properties?.[active.field] || null
				const target = referenceTargetOf(active.source, { register: this.register, property })
				if (target.register && target.schema) {
					let rows
					try {
						rows = await fetchReferenceObjects({ ...target, filter: active.source?.filter || {} })
					} catch {
						rows = []
					}
					if (active.source?.itemsPath) {
						rows = flattenItemRefs(rows, { itemsPath: active.source.itemsPath, keyField: active.source.keyField || 'name' })
					}
					this.boardRefs = { ...this.boardRefs, [active.field]: rows }
				}
			}
			const narrow = this.boardNarrow
			if (narrow && this.boardNarrowOptions.length === 0) {
				const property = this.effectiveSchema?.properties?.[narrow.field] || null
				const target = referenceTargetOf(narrow.source || {}, { register: this.register, property })
				let rows
				try {
					rows = await fetchReferenceObjects({ ...target, filter: narrow.source?.filter || {} })
				} catch {
					rows = []
				}
				const labelField = narrow.source?.labelField || 'title'
				this.boardNarrowOptions = rows
					.map((row) => ({ value: refIdOf(row), label: String(row?.[labelField] ?? row?.name ?? row?.title ?? refIdOf(row)) }))
					.filter((option) => option.value !== '')
					.sort((a, b) => a.label.localeCompare(b.label))
			}
		},

		/**
		 * The column switch changed.
		 *
		 * @param {string} field The column field picked.
		 * @return {void}
		 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-a-board-can-switch-the-field-its-columns-come-from
		 */
		onBoardColumnFieldChange(field) {
			this.boardColumnFieldChoice = field
			/**
			 * @event board-column-field-change The board's column switch picked another field. Payload: the field name.
			 */
			this.$emit('board-column-field-change', field)
		},

		/**
		 * The narrowing select changed: it sets the page filter on its field,
		 * so the cards narrow with the columns and the active filter shows.
		 *
		 * @param {string} value The parent id, '' for all.
		 * @return {void}
		 */
		onBoardNarrowChange(value) {
			this.onFilterEvent({ key: this.boardNarrow.field, values: value === '' ? [] : [value] })
		},

		/**
		 * A paged board's "Show N more": ask for the next page.
		 *
		 * @return {void}
		 * @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-a-long-column-is-cut-with-a-show-more-button
		 */
		onBoardLoadMore() {
			if (this.boardLoadsAll) {
				this.list.loadMore()
				return
			}
			const page = Number(this.pagination?.page || 1)
			if (page < Number(this.pagination?.pages || 1)) {
				this.onPageEvent(page + 1)
			}
		},

		/**
		 * @param {number} page Requested page from CnPagination.
		 * @return {void}
		 */
		onPageEvent(page) {
			if (this.sortSourceShown) {
				this.sortSource = { ...this.sortSource, page: Number(page) || 1 }
				this.$emit('page-changed', page)
				return
			}
			if (this.isSelfFetchMode && typeof this.list.onPageChange === 'function') {
				this.list.onPageChange(page)
			}
			if (this.isNamedSource && this.namedSource && this.namedSource.pages === true) {
				this.namedPaging = { ...this.namedPaging, page }
			}
			this.$emit('page-changed', page)
		},

		/**
		 * Page-size pick from CnPagination. In self-fetch mode the list refetches
		 * page 1 at the new size — the event alone left the select changing and
		 * the table not, since a manifest page has no host listening.
		 *
		 * @param {number} size Requested page size.
		 * @return {void}
		 */
		onPageSizeEvent(size) {
			if (this.isSelfFetchMode && typeof this.list.onPageSizeChange === 'function') {
				this.list.onPageSizeChange(size)
			}
			if (this.isNamedSource && this.namedSource && this.namedSource.pages === true) {
				this.namedPaging = { page: 1, limit: size }
			}
			this.$emit('page-size-changed', size)
		},

		/**
		 * @param {{key: string, values: Array}} payload Facet-filter change from the sidebar.
		 * @return {void}
		 */
		onFilterEvent(payload) {
			if (this.isSelfFetchMode && typeof this.list.onFilterChange === 'function') {
				this.list.onFilterChange(payload.key, payload.values)
				this.persistViewStateToRoute(this.currentViewState())
			}
			// A named source keeps its own filter state: nothing else holds it,
			// and the `activeFilters` PROP only reaches pages with a consumer
			// component behind them. A manifest page has none, which is why
			// its sidebar used to render controls that narrowed nothing.
			if (this.isNamedSource) {
				this.setNamedFilter(payload.key, payload.values)
			}
			this.$emit('filter-change', payload)
		},

		/**
		 * The board toolbar's filter chip was removed: clear that one filter.
		 *
		 * @param {{key: string}} chip The chip from `activeFilterChips`.
		 * @return {void}
		 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-toolbar-sits-on-the-ground-in-two-rows
		 */
		onRemoveActiveFilter(chip) {
			if (chip && chip.searchTerm === true) {
				this.onSearchEvent('')
				return
			}
			if (chip && typeof chip.quickFilterIndex === 'number') {
				this.deselectQuickFilterChip(chip.quickFilterIndex)
				return
			}
			if (chip && Array.isArray(chip.keys) && chip.keys.length > 0) {
				for (const key of chip.keys) {
					this.onFilterEvent({ key, values: [] })
				}
				return
			}
			if (chip && typeof chip.key === 'string') {
				this.onFilterEvent({ key: chip.key, values: [] })
			}
		},

		/**
		 * The field an Active chip names: the page's `filterLabels` label, the
		 * schema property's title, the sidebar field's title, else the key.
		 *
		 * @param {string} key The filter key.
		 * @return {string} The translated field name.
		 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-page-names-its-filters
		 */
		activeFilterFieldLabel(key) {
			const named = this.filterLabels && this.filterLabels[key]
			if (named && typeof named.label === 'string' && named.label !== '') {
				return this.cnTranslate(named.label)
			}
			const prop = this.effectiveSchema?.properties?.[key]
			if (prop && typeof prop.title === 'string' && prop.title !== '') {
				return this.cnTranslate(prop.title)
			}
			const field = declaredFilterFields({ sidebar: this.sidebar, sourceConfig: this.sourceConfig })[key]
			if (field && typeof field.title === 'string' && field.title !== '') {
				return this.cnTranslate(field.title)
			}
			return this.cnTranslate(key)
		},

		/**
		 * The text of a range chip: in words for a range from today when the
		 * page's `filterLabels` entry sets `relative`, else its date ends in
		 * the person's locale.
		 *
		 * @param {unknown} from The lower end, or null.
		 * @param {unknown} to The upper end, or null.
		 * @param {string} key The filter key the range is on.
		 * @return {string} The text.
		 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-range-is-one-chip
		 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-range-from-today-is-named-in-words
		 */
		activeFilterRangeText(from, to, key) {
			const named = this.filterLabels && this.filterLabels[key]
			if (named && named.relative === true) {
				const words = relativeRangeText(from, to, {
					translate: (text) => t('nextcloud-vue', text),
					translatePlural: (one, many, count) => n('nextcloud-vue', one, many, count),
				})
				if (words !== null) {
					return words
				}
			}
			return rangeChipText(from, to, {
				translate: (text, vars) => t('nextcloud-vue', text, vars),
				locale: getCanonicalLocale() || undefined,
			})
		},

		/**
		 * Undo a quick filter from the Active line. With several tabs selectable
		 * the tab leaves the selection; with one, the page goes back to its
		 * default tab when that tab names no active filter itself, and else to no
		 * tab at all, so the chip does not come straight back.
		 *
		 * @param {number} index The tab index the chip stands for.
		 * @return {void}
		 * @spec openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-a-quick-filter-with-an-active-label-joins-the-active-line
		 */
		deselectQuickFilterChip(index) {
			if (this.quickFilterMultiple) {
				this.onQuickFilterMultiChange((this.selectedQuickFilterIndices || []).filter((i) => i !== index))
				return
			}
			if (this.activeQuickFilterIndex !== index) {
				return
			}
			const tabs = this.tabStripEntries || []
			let fallback = tabs.findIndex((tab) => tab && tab.default === true)
			if (fallback < 0 && tabs.length > 0) {
				fallback = 0
			}
			const fallbackNamed = fallback >= 0 && typeof tabs[fallback].activeLabel === 'string' && tabs[fallback].activeLabel !== ''
			this.onQuickFilterChange(fallback >= 0 && fallback !== index && !fallbackNamed ? fallback : null)
		},

		/**
		 * The text an Active chip shows for one filter value: the page's
		 * `filterLabels` value, the referenced object's label, the facet
		 * bucket's label, the schema's `oneOf` title, the sidebar field's
		 * `enumLabels`, else the value itself.
		 *
		 * @param {string} key The filter key.
		 * @param {unknown} value One value of that filter.
		 * @return {string} The label.
		 * @spec openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-an-active-chip-names-the-value-not-its-id
		 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-page-names-its-filters
		 */
		activeFilterValueLabel(key, value) {
			const id = String(value)
			const named = this.filterLabels && this.filterLabels[key] && this.filterLabels[key].values
			if (named && typeof named[id] === 'string' && named[id] !== '') {
				return this.cnTranslate(named[id])
			}
			const refs = this.refLabels[key]
			if (refs && typeof refs[id] === 'string' && refs[id] !== '') {
				return refs[id]
			}
			const facet = this.effectiveFacetData && this.effectiveFacetData[key]
			const bucket = facet && Array.isArray(facet.values)
				? facet.values.find((fv) => fv && typeof fv === 'object' && String(fv.value) === id)
				: null
			if (bucket && typeof bucket.label === 'string' && bucket.label !== '') {
				return this.cnTranslate(bucket.label)
			}
			const prop = this.effectiveSchema?.properties?.[key]
			const options = prop && Array.isArray(prop.oneOf) ? prop.oneOf : []
			const option = options.find((o) => o && String(o.const) === id && typeof o.title === 'string')
			if (option) {
				return this.cnTranslate(option.title)
			}
			const field = declaredFilterFields({ sidebar: this.sidebar, sourceConfig: this.sourceConfig })[key]
			const enumLabel = field && field.enumLabels && field.enumLabels[id]
			if (typeof enumLabel === 'string' && enumLabel !== '') {
				return this.cnTranslate(enumLabel)
			}
			return id
		},

		/**
		 * A header filter was applied or cleared. One column can own several
		 * query parameters (a range is `key[gte]` and `key[lte]`), so they are
		 * applied together: one fetch, one route update.
		 *
		 * @param {{key: string, params: object}} payload From CnDataTable's `column-filter`.
		 * @return {void}
		 * @spec openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md#requirement-a-header-filter-speaks-the-sidebars-query-language
		 */
		onColumnFilterEvent(payload) {
			const params = (payload && payload.params) || {}
			const entries = Object.entries(params).map(([key, values]) => [key, Array.isArray(values) ? values : []])
			if (this.isSelfFetchMode) {
				const next = { ...this.list.activeFilters.value }
				for (const [key, values] of entries) {
					if (values.length === 0) {
						delete next[key]
					} else {
						next[key] = values
					}
				}
				this.list.activeFilters.value = next
				this.list.refresh(1)
				this.persistViewStateToRoute(this.currentViewState())
			}
			for (const [key, values] of entries) {
				if (this.isNamedSource) {
					this.setNamedFilter(key, values)
				}
				this.$emit('filter-change', { key, values })
			}
		},

		/**
		 * A picker of the endpoint's facets changed: filter on the value, or
		 * take the filter off for the All choice.
		 *
		 * @param {string} field The facet's field.
		 * @param {string} value The chosen value, '' for All.
		 * @return {void}
		 */
		onSourceFacetChange(field, value) {
			this.setNamedFilter(field, value === '' ? [] : [value])
		},

		/**
		 * Record one sidebar choice on a named-source page and mirror it into
		 * the URL.
		 *
		 * The ref is REPLACED rather than mutated in place so the watcher in
		 * `useNamedSource` fires on the first change too, and the reload it
		 * triggers is the only place the new query is built.
		 *
		 * @param {string} key The sidebar field key.
		 * @param {Array|object|null} values The chosen values, or a `{ from, to }` range.
		 *
		 * @return {void}
		 */
		setNamedFilter(key, values) {
			const next = { ...(this.namedActiveFilters || {}) }
			const asQuery = namedFilterToQuery(values)
			if (asQuery === '') {
				delete next[key]
			} else {
				next[key] = values
			}
			this.namedActiveFilters = next
			this.persistNamedFiltersToRoute(next)
		},

		/**
		 * Write the active named-source filters into `$route.query`.
		 *
		 * So a filtered view can be SHARED, which is half of what a search
		 * field is for: the colleague who opens the link sees the same list,
		 * because `namedFiltersFromRoute` reads it back on mount.
		 *
		 * `replace`, not `push`: narrowing a list is not a place in the
		 * history, and a back button that steps through six filter choices
		 * never reaches the page before them. A rejected navigation (the same
		 * path and query) is swallowed, matching `persistSortToRoute`.
		 *
		 * @param {object} filters The active `{ key: values }` map.
		 *
		 * @return {void}
		 */
		persistNamedFiltersToRoute(filters) {
			if (!this.$router || !this.$route) {
				return
			}
			const properties = declaredFilterFields(this)
			const query = { ...this.$route.query }
			for (const key of Object.keys(properties)) {
				if (properties[key] && properties[key].facetable === true) {
					delete query[key]
				}
			}
			for (const [key, values] of Object.entries(filters || {})) {
				const value = namedFilterToQuery(values)
				if (value !== '') {
					query[key] = value
				}
			}
			this.$router.replace({ query }).catch(() => {})
		},

		/**
		 * Folder selection from the opt-in folder sidebar: filter the list by the
		 * config's `filterField` (or `field`); a null id clears it.
		 *
		 * @param {(string|number|null)} folderId The selected folder id (null = All).
		 * @return {void}
		 */
		/**
		 * The actions one row offers: this page's declared actions narrowed to
		 * the ones the server says this caller may run on that record. The
		 * order, label and icon stay the page's.
		 *
		 * @param {object} row The row.
		 * @return {Array<object>} The actions to render for that row.
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		/**
		 * Move the keyboard's focus one row, staying inside the list.
		 *
		 * @param {number} delta 1 for the next row, -1 for the previous one.
		 * @return {void}
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		moveFocusedRow(delta) {
			const rows = this.displayObjects || []
			if (rows.length === 0) {
				this.focusedRowIndex = -1
				return
			}
			const next = this.focusedRowIndex + delta
			this.focusedRowIndex = Math.min(Math.max(next, 0), rows.length - 1)
		},

		/**
		 * Select or deselect the focused row.
		 *
		 * @return {void}
		 */
		toggleFocusedRowSelection() {
			const row = this.focusedRow
			if (!row) {
				return
			}
			const id = row[this.rowKey]
			const selected = this.internalSelectedIds.includes(id)
			this.onSelect(selected
				? this.internalSelectedIds.filter((other) => other !== id)
				: [...this.internalSelectedIds, id])
		},

		/**
		 * The first action a row's menu shows and enables: the page's order, narrowed by what the server allows, by `visible` / `visibleWhen`, and by `disabled`.
		 * The keyboard therefore never runs what the menu hides or greys out.
		 *
		 * @param {object} row The row.
		 * @return {(object|null)} The action, or null.
		 * @spec openspec/changes/row-action-builtin-placement/specs/index-page/spec.md
		 */
		primaryRowActionFor(row) {
			return this.rowActionsFor(row).find((action) => isRowActionVisible(action, row)
				&& !(typeof action.disabled === 'function' ? action.disabled(row) : action.disabled)) || null
		},

		/**
		 * Run the focused row's primary action (see `primaryRowActionFor`).
		 *
		 * @return {void}
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		runPrimaryRowAction() {
			const row = this.focusedRow
			if (!row) {
				return
			}
			const first = this.primaryRowActionFor(row)
			if (!first) {
				return
			}
			if (typeof first.handler === 'function') {
				first.handler(row)
			}
			this.onRowAction(rowActionPayload(first, row))
		},

		/**
		 * Handle a key pressed on the list.
		 *
		 * @param {KeyboardEvent} event The event.
		 * @return {void}
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		onListKeydown(event) {
			if (!this.listShortcuts) {
				return
			}
			const shortcut = shortcutFor(event)
			if (!shortcut) {
				return
			}
			const run = this.listShortcutHandlers[shortcut.id]
			if (typeof run !== 'function') {
				return
			}
			event.preventDefault()
			run()
		},

		/**
		 * Open the quick edit on one row.
		 *
		 * @param {object} row The row.
		 * @return {void}
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		openQuickEdit(row) {
			if (this.quickEditFields.length === 0 || !row) {
				return
			}
			this.quickEditServerRow = null
			this.quickEditRow = row
		},

		/**
		 * Write a quick edit's patch onto its row in the list.
		 *
		 * The patch goes through the same row-patch map a record saved in the
		 * split pane goes through, so the list keeps its scroll, its selection
		 * and its page for the same reason it already did: nothing about the
		 * list changed, one row's fields did.
		 *
		 * @param {object} payload The dialog's payload.
		 * @param {(string|number)} payload.id The row id.
		 * @param {object} payload.patch The fields to write.
		 * @return {void}
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		onQuickEditSave({ id, patch }) {
			if (id === undefined || id === null || !patch || Object.keys(patch).length === 0) {
				this.quickEditRow = null
				return
			}
			const current = this.splitRowPatches[id] || {}
			this.splitRowPatches = { ...this.splitRowPatches, [id]: { ...current, ...patch } }
			this.quickEditRow = null
			/**
			 * @event quick-edit-save Emitted with the fields a quick edit wrote onto a row.
			 * @type {{id: (string|number), patch: object}}
			 */
			this.$emit('quick-edit-save', { id, patch })
		},

		/**
		 * The buttons an `actions` column shows on a row: the row actions its
		 * `widgetProps.actions` names (by id, else by label), in that order,
		 * that are visible for the row.
		 *
		 * @param {object} col The column.
		 * @param {object} row The row.
		 * @return {Array<{key: string, label: string, variant: string, disabled: boolean}>}
		 * @spec openspec/changes/table-actions-column/specs/index-page/spec.md#requirement-a-column-can-show-row-actions-as-buttons
		 */
		actionColumnItems(col, row) {
			const wanted = Array.isArray(col.widgetProps && col.widgetProps.actions) ? col.widgetProps.actions : []
			const available = this.rowActionsFor(row)
			return wanted
				.map((ref) => available.find((action) => action.id === ref) || available.find((action) => action.label === ref))
				.filter((action) => action && isRowActionVisible(action, row))
				.map((action, index) => ({
					key: action.id || action.label,
					label: this.cnTranslate(action.label),
					variant: action.variant || (index === 0 ? 'secondary' : 'tertiary'),
					disabled: typeof action.disabled === 'function' ? !!action.disabled(row) : action.disabled === true,
				}))
		},

		/**
		 * Run one `actions` column button: its handler, then the same `action`
		 * event a row menu entry emits.
		 *
		 * @param {string} key The action's id, else its label.
		 * @param {object} row The row.
		 * @return {void}
		 * @spec openspec/changes/table-actions-column/specs/index-page/spec.md#requirement-a-column-can-show-row-actions-as-buttons
		 */
		runColumnAction(key, row) {
			const action = this.rowActionsFor(row).find((entry) => (entry.id || entry.label) === key)
			if (!action) {
				return
			}
			if (typeof action.handler === 'function') {
				action.handler(row)
			}
			this.onRowAction(rowActionPayload(action, row))
		},

		/**
		 * Take the server's version of a row after a conflict. Nothing of this
		 * person's edit is written, and the row in the list is refreshed to
		 * what the server holds, so the screen and the record agree.
		 *
		 * @param {object} saved The record as the server holds it.
		 * @return {void}
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		onQuickEditKeepTheirs(saved) {
			const id = saved && saved[this.rowKey]
			if (id !== undefined && id !== null) {
				this.splitRowPatches = { ...this.splitRowPatches, [id]: saved }
			}
			this.quickEditRow = null
			this.quickEditServerRow = null
		},

		rowActionsFor(row) {
			return withoutViewWhenRowOpensDetail(
				availableRowActions(this.mergedActions, row, this.rowActionField),
				this.rowOpensDetailFor(row),
			)
		},

		/**
		 * The row's own name, for the row menu button's accessible name
		 * ("Actions for <title>"): the `nameFormatter`, else the
		 * `massActionNameField`, else the row's title or name.
		 *
		 * @param {object} row The row.
		 * @return {string} The name, or ''.
		 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-table-is-a-white-card-with-one-row-menu
		 */
		rowTitleFor(row) {
			if (!row) {
				return ''
			}
			const named = typeof this.nameFormatter === 'function' ? this.nameFormatter(row) : row[this.massActionNameField]
			const value = named ?? row.title ?? row.name ?? ''
			return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
		},

		/**
		 * Whether a click on this row navigates to the record's detail page.
		 * When it does, the row menu offers Edit and not View (viewing is what
		 * the click already does). A `viewTo` that answers null for the row
		 * means this record has no detail page, so it keeps View.
		 *
		 * @param {object} row The row.
		 * @return {boolean} True when the row opens a detail page.
		 * @spec openspec/changes/row-menu-edits-when-the-row-opens-the-detail/specs/index-page/spec.md
		 */
		rowOpensDetailFor(row) {
			if (!this.rowClickOpens) {
				return false
			}
			if (typeof this.viewTo === 'function') {
				return Boolean(row) && this.viewTo(row) !== null && this.viewTo(row) !== undefined
			}
			return true
		},

		/**
		 * Why the server refused an action on a row, when it said. Available on
		 * request rather than rendered, because a menu that lists what you may
		 * not do is a menu that takes longer to read.
		 *
		 * @param {object} row The row.
		 * @param {object} action The declared action.
		 * @return {string} The refusal reason, or ''.
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		rowActionRefusal(row, action) {
			return refusalReasonFor(action, row, this.rowActionField)
		},

		/**
		 * The actions the server allowed on a row that this page does not
		 * declare. Nothing renders them. They are here so a page can see what
		 * it is ignoring without the menu growing a button nobody wrote.
		 *
		 * @param {object} row The row.
		 * @return {string[]} The undeclared action ids.
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		rowActionsNotDeclared(row) {
			return undeclaredRowActions(this.mergedActions, row, this.rowActionField)
		},

		onFolderSelect(folderId) {
			this.selectedFolderId = folderId
			const key = (this.folderSidebar && (this.folderSidebar.filterField || this.folderSidebar.field)) || ''
			const folder = this.activeScope
			const target = (folder && typeof folder.schema === 'string' && folder.schema !== '')
				? { schema: folder.schema, register: (typeof folder.register === 'string' && folder.register !== '') ? folder.register : '' }
				: null
			const previous = this.activeFolderSchema
			const switched = (target ? `${target.register}|${target.schema}` : '') !== (previous ? `${previous.register}|${previous.schema}` : '')
			if (switched) {
				// A row or dialog from the old schema means nothing under the new one.
				this.resetSelectionAndDialogs()
			}
			this.activeFolderSchema = target
			if (target) {
				// The folder picks a schema, not a value of the page's own field; the
				// object-type change refetches, so only drop a leftover folder filter.
				if (key && this.list && this.list.activeFilters.value[key] !== undefined) {
					const { [key]: _dropped, ...rest } = this.list.activeFilters.value
					this.list.activeFilters.value = rest
				}
			} else if (key) {
				this.onFilterEvent({ key, values: (folderId === null || folderId === undefined) ? [] : [folderId] })
			}
			this.applyScopeSort()
			/**
			 * @event folder-change Emitted when a folder is selected in the sidebar.
			 * @type {(string|number|null)} The selected folder id (null = All).
			 */
			this.$emit('folder-change', folderId)
		},

		/**
		 * Clear the row selection and close any form, delete or copy dialog.
		 * Used when the loaded schema changes under them.
		 *
		 * @return {void}
		 * @spec openspec/changes/cnindexpage-folder-schema/tasks.md#task-3
		 */
		resetSelectionAndDialogs() {
			this.onSelect([])
			this.showSingleDeleteDialog = false
			this.showSingleCopyDialog = false
			this.showFormDialogVisible = false
			this.actionTargetItem = null
		},

		/**
		 * Put the active scope's `defaultSort` on the list and refetch with it.
		 *
		 * The scope's sort is applied through the list's own `sortKeys`, the
		 * same state a header click writes, rather than through a second sort
		 * path — so the fetch carries it and the header shows it as sorted.
		 * A scope declaring no sort leaves whatever is active alone: that is a
		 * scope with nothing to say about sorting, not a scope asking for the
		 * sort to be cleared.
		 *
		 * @return {void}
		 * @spec openspec/changes/index-columns-per-scope/specs/index-page/spec.md
		 */
		applyScopeSort() {
			const sortKeys = this.activeScopeLayout.sortKeys
			if (!sortKeys.length || !this.isSelfFetchMode || !this.list) {
				return
			}
			if (this.list.sortKeys) {
				this.list.sortKeys.value = sortKeys.map((entry) => ({ ...entry }))
			}
			if (typeof this.list.refresh === 'function') {
				this.list.refresh(1)
			}
		},

		/**
		 * Load the Nextcloud groups for `folderSidebar.source: 'groups'`, each
		 * with its member count. `folderSidebar.groups` (`[{ id, parent? }]`)
		 * picks and orders them and nests a group under its `parent`;
		 * `folderSidebar.parentsFrom` reads that list from records instead.
		 * Without either every group shows, by name. A refused request lists none.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/index-groups-users-source/specs/index-page/spec.md#requirement-an-index-page-can-list-nextcloud-groups-and-their-members
		 * @spec openspec/changes/group-parents-from-records/specs/index-page/spec.md#requirement-a-groups-pane-can-read-its-tree-from-records
		 */
		async loadFolderGroups() {
			const cfg = this.folderSidebar
			if (!cfg || cfg.source !== 'groups') {
				return
			}
			try {
				const { default: axios } = await import('@nextcloud/axios')
				const groups = await fetchGroups(axios, { search: cfg.search || '', limit: cfg.limit || 200 })
				const declared = Array.isArray(cfg.groups)
					? cfg.groups.filter((entry) => entry && entry.id)
					: await this.groupParentsFromRecords(cfg.parentsFrom)
				if (!declared) {
					this.folderGroupList = [...groups].sort((a, b) => a.name.localeCompare(b.name))
					return
				}
				const byId = new Map(groups.map((group) => [group.id, group]))
				this.folderGroupList = declared
					.filter((entry) => byId.has(String(entry.id)))
					.map((entry) => ({ ...byId.get(String(entry.id)), parentId: entry.parent ? String(entry.parent) : null }))
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('[CnIndexPage] failed to load the Nextcloud groups', e)
				this.folderGroupList = []
			}
		},

		/**
		 * The groups pane's tree read from records (`folderSidebar.parentsFrom`:
		 * `{ register, schema, groupField?, parentField? }`): each record names a
		 * group (`groupField`, default `group`) and the group above it
		 * (`parentField`, default `parent`): a group id, or the id of another
		 * record, read as that record's group. In the `groups` shape. Null without
		 * the option, when the records cannot be read or when none names a
		 * group, so the pane lists every group flat.
		 *
		 * @param {object|undefined} from The `parentsFrom` config.
		 * @return {Promise<Array<{id: string, parent: string|null}>|null>} The entries, or null.
		 * @spec openspec/changes/group-parents-from-records/specs/index-page/spec.md#requirement-a-groups-pane-can-read-its-tree-from-records
		 */
		async groupParentsFromRecords(from) {
			if (!from || !from.register || !from.schema) {
				return null
			}
			const groupField = from.groupField || 'group'
			const parentField = from.parentField || 'parent'
			try {
				const body = await cnFetchJson(
					`/apps/openregister/api/objects/${encodeURIComponent(from.register)}/${encodeURIComponent(from.schema)}`,
					{ query: { _limit: from.limit || 500 } },
				)
				const records = (Array.isArray(body?.results) ? body.results : []).filter((record) => record && record[groupField])
				if (records.length === 0) {
					return null
				}
				const groupOfRecord = new Map(records.map((record) => [String(record.id ?? record['@self']?.id ?? ''), String(record[groupField])]))
				return records.map((record) => {
					const parent = record[parentField] ? String(record[parentField]) : null
					return { id: String(record[groupField]), parent: parent === null ? null : (groupOfRecord.get(parent) ?? parent) }
				})
			} catch {
				return null
			}
		},

		/**
		 * Load the folder list from an OpenRegister register/schema for a
		 * `folderSidebar.source === 'register'` config. Maps each object to
		 * `{ id: <idField|@self.uuid>, name: <nameField|title> }`.
		 *
		 * @return {Promise<void>}
		 */
		async loadFolderRegister() {
			const cfg = this.folderSidebar
			if (!cfg || cfg.source !== 'register' || !cfg.register || !cfg.schema) {
				return
			}
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: cfg.register, schema: cfg.schema })
				const res = await axios.get(url, { params: { _limit: cfg.limit || 200 } })
				const body = (res && res.data && (res.data.results || res.data)) || []
				// A response that is not a list is an empty folder list, not a
				// crash: the pane then shows only "All" rather than logging a
				// TypeError that names this component for the server's shape.
				const rows = Array.isArray(body) ? body : []
				const idField = cfg.idField || '@self.uuid'
				const nameField = cfg.nameField || 'title'
				const layouts = {}
				rows.forEach((row) => {
					const id = this.getByPath(row, idField)
					const carried = row && row['x-index']
					if (id !== null && id !== undefined && carried && typeof carried === 'object') {
						layouts[String(id)] = carried
					}
				})
				this.folderRowLayouts = layouts
				this.folderRegisterList = rows
					.map((row) => ({ id: this.getByPath(row, idField), name: this.getByPath(row, nameField) || this.getByPath(row, idField) }))
					.filter((f) => f.id !== null && f.id !== undefined)
					.sort((a, b) => String(a.name).localeCompare(String(b.name)))
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('[CnIndexPage] failed to load folder register', e)
				this.folderRegisterList = []
				this.folderRowLayouts = {}
			}
		},

		/**
		 * Whether a given value is currently an active facet filter for a field.
		 *
		 * @param {string} key The schema field key.
		 * @param {string} val The enum value.
		 * @return {boolean} True when the value is in the active filter set.
		 */
		isFilterActive(key, val) {
			const current = this.effectiveActiveFilters[key]
			return Array.isArray(current) && current.includes(val)
		},

		/**
		 * Toggle one enum value in a field's facet filter, then apply it through
		 * the standard filter path (`onFilterEvent`).
		 *
		 * @param {string} key The schema field key.
		 * @param {string} val The enum value to toggle.
		 * @return {void}
		 */
		toggleFilter(key, val) {
			const current = Array.isArray(this.effectiveActiveFilters[key]) ? this.effectiveActiveFilters[key] : []
			const values = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
			this.onFilterEvent({ key, values })
		},

		/**
		 * Whether a governed column is currently visible. A null visible-column set
		 * means "all governed columns visible" (the initial state).
		 *
		 * @param {string} key The column key.
		 * @return {boolean} True when the column is shown in the table.
		 */
		isColumnVisible(key) {
			const visible = this.effectiveVisibleColumns
			return Array.isArray(visible) ? visible.includes(key) : true
		},

		/**
		 * Toggle a governed column on/off from the table-header column menu, then
		 * apply it through the same path as the sidebar (`onColumnsEvent`).
		 *
		 * @param {string} key The column key to toggle.
		 * @return {void}
		 */
		toggleColumn(key) {
			const base = Array.isArray(this.effectiveVisibleColumns)
				? this.effectiveVisibleColumns
				: this.governedColumns.map((c) => c.key)
			const next = base.includes(key) ? base.filter((k) => k !== key) : [...base, key]
			this.onColumnsEvent(next)
		},

		/**
		 * @param {Array} columns Visible-column change from the sidebar.
		 * @return {void}
		 */
		onColumnsEvent(columns) {
			if (this.isSelfFetchMode && this.list.visibleColumns) {
				this.list.visibleColumns.value = columns
			}
			this.keepPersonalColumns(columns, this.pinnedColumnCount)
			this.$emit('columns-change', columns)
		},

		/**
		 * The preference key this list's column layout is held under. The list id
		 * is the manual-order id, else the page's route name (the manifest page id),
		 * else the object type or schema.
		 *
		 * @return {string} The key, `columns.<list id>`.
		 */
		personalColumnsPreferenceKey() {
			const route = this.$route && typeof this.$route.name === 'string' ? this.$route.name : ''
			return personalColumnsKey(this.manualOrderId || route || this.objectType || this.schema || 'default')
		},

		/**
		 * Keep the person's column layout: held while a view's columns are applied
		 * (the view is a lens, not a preference), otherwise stored in their preferences.
		 *
		 * @param {string[]} columns The visible columns in their order.
		 * @param {number} pinned How many leading columns are pinned.
		 * @return {void}
		 * @spec openspec/changes/index-column-order-and-pinning/tasks.md#task-4
		 */
		keepPersonalColumns(columns, pinned) {
			if (!this.personalColumns || !Array.isArray(columns)) {
				return
			}
			if (Array.isArray(this.appliedViewColumns)) {
				this.appliedViewColumns = columns
				return
			}
			this.personalLayout = { columns, pinned }
			this.persistPersonalColumns()
		},

		/**
		 * The person moved a column in the sidebar's Order and pin list.
		 *
		 * @param {string[]} columns The visible columns in their new order.
		 * @return {void}
		 */
		onColumnsReorder(columns) {
			this.onColumnsEvent(columns)
		},

		/**
		 * The person pinned or unpinned a column.
		 *
		 * @param {number} count How many leading columns are pinned now.
		 * @return {void}
		 */
		onPinChange(count) {
			if (!this.personalColumns || Array.isArray(this.appliedViewColumns)) {
				return
			}
			const columns = this.personalLayout ? this.personalLayout.columns : (Array.isArray(this.effectiveVisibleColumns) ? this.effectiveVisibleColumns : this.tableColumns.map((c) => (typeof c === 'string' ? c : c.key)))
			this.keepPersonalColumns(columns, count)
		},

		/**
		 * Reset columns: forget the person's layout and show the page's own columns.
		 *
		 * @return {void}
		 */
		onColumnsReset() {
			this.personalLayout = null
			this.appliedViewColumns = null
			if (this.isSelfFetchMode && this.list.visibleColumns) {
				this.list.visibleColumns.value = null
			}
			const write = this.cnUserPreferences?.write
			if (this.personalColumns && typeof write === 'function') {
				Promise.resolve(write(this.personalColumnsPreferenceKey(), null)).catch(() => {})
			}
			this.$emit('columns-change', null)
		},

		/**
		 * Write the layout to the person's preferences. A failed write leaves the
		 * layout in place for this session and says nothing.
		 *
		 * @return {Promise<void>}
		 */
		async persistPersonalColumns() {
			const write = this.cnUserPreferences?.write
			if (typeof write !== 'function' || !this.personalLayout) {
				return
			}
			try {
				await write(this.personalColumnsPreferenceKey(), {
					columns: this.personalLayout.columns,
					pinned: this.personalLayout.pinned,
				})
			} catch {
				// Not stored; the layout still stands until the page reloads.
			}
		},

		/**
		 * Read the person's column layout for this list on mount.
		 *
		 * @return {Promise<void>}
		 */
		async loadPersonalColumns() {
			const read = this.cnUserPreferences?.read
			if (!this.personalColumns || typeof read !== 'function') {
				return
			}
			try {
				const stored = await read(this.personalColumnsPreferenceKey(), null)
				if (stored && Array.isArray(stored.columns) && !this.personalLayout) {
					this.personalLayout = { columns: stored.columns.map(String), pinned: Number(stored.pinned) || 0 }
				}
			} catch {
				// An unreadable preference leaves the page's own columns.
			}
		},

		/**
		 * Refresh the list when `dispatchObjectsChanged` names this page's
		 * register and schema, by slug or id. A part missing on either side matches.
		 *
		 * @param {CustomEvent} event The objects-changed event.
		 * @return {void}
		 */
		onObjectsChanged(event) {
			// A collection list can hold rows of any pair, so any change may show in it.
			if (this.isSelfFetchMode && this.collectionUrl) {
				this.onRefreshEvent()
				return
			}
			const detail = (event && event.detail) || {}
			const schema = this.effectiveSchema
			const schemaIds = [this.schema, schema && schema.id, schema && schema.slug]
				.filter((v) => v !== undefined && v !== null && v !== '' && typeof v !== 'object')
				.map(String)
			if (detail.register && this.register && detail.register !== String(this.register)) {
				return
			}
			if (detail.schema && schemaIds.length > 0 && !schemaIds.includes(detail.schema)) {
				return
			}
			this.onRefreshEvent()
		},

		/**
		 * The object store live updates come through.
		 *
		 * @return {object} The store.
		 */
		liveStore() {
			return (this.list && this.list.objectStore) || useObjectStore()
		},

		/**
		 * Subscribe to the `live` object types and read the list again after a change.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/pl4-index-live/specs/pl4-index-live/spec.md#requirement-an-index-page-follows-live-changes
		 */
		async startLive() {
			const types = Array.isArray(this.live) ? this.live.filter((type) => typeof type === 'string' && type !== '') : []
			const store = types.length > 0 ? this.liveStore() : null
			if (!store || typeof store.subscribe !== 'function') {
				return
			}
			const handles = []
			for (const type of types) {
				try {
					handles.push(await store.subscribe(type))
				} catch {
					// A type the store cannot follow; the list still reads on refresh.
				}
			}
			this.liveHandles = handles
			this.liveUnwatch = this.$watch(() => store.liveLastEventAt, () => this.onLiveEvent())
		},

		/**
		 * Read the list again once changes stop arriving for half a second.
		 */
		onLiveEvent() {
			clearTimeout(this.liveTimer)
			this.liveTimer = setTimeout(() => this.onRefreshEvent(), 500)
		},

		/**
		 * Let go of the live subscriptions.
		 */
		stopLive() {
			clearTimeout(this.liveTimer)
			if (typeof this.liveUnwatch === 'function') {
				this.liveUnwatch()
			}
			const store = this.liveHandles.length > 0 ? this.liveStore() : null
			if (store && typeof store.unsubscribe === 'function') {
				this.liveHandles.forEach((handle) => store.unsubscribe(handle))
			}
			this.liveHandles = []
		},

		/** @return {Promise<void>} */
		async onRefreshEvent() {
			this.$emit('refresh')
			if (this.isSelfFetchMode && typeof this.list.refresh === 'function') {
				this.internalRefreshing = true
				try {
					await this.list.refresh()
				} finally {
					this.internalRefreshing = false
				}
			}
		},

		/**
		 * Publish (or clear) the embedded CnIndexSidebar config to
		 * the `cnIndexSidebarConfig` holder so CnAppRoot can mount
		 * it at NcContent level. No-op when no CnAppRoot ancestor
		 * exists — in that case `shouldRenderInlineSidebar` keeps
		 * the inline render alive.
		 */
		publishHoistedSidebar() {
			if (!this.cnHostsIndexSidebar || !this.cnIndexSidebarConfig) {
				return
			}
			if (!this.resolvedSidebar.enabled || this.resolvedSidebar.show === false) {
				this.cnIndexSidebarConfig.value = null
				return
			}
			this.cnIndexSidebarConfig.value = {
				// markRaw: the holder is CnAppRoot `data()`, so it is deeply
				// reactive and would proxy the component definition itself.
				component: markRaw(CnIndexSidebar),
				props: this.hoistedSidebarProps,
				listeners: {
					'update:open': (val) => {
						this.sidebarOpen = val
					},

					search: (event) => this.onSearchEvent(event),
					'columns-change': (event) => this.onColumnsEvent(event),
					'columns-reorder': (event) => this.onColumnsReorder(event),
					'pin-change': (event) => this.onPinChange(event),
					'columns-reset': () => this.onColumnsReset(),
					'filter-change': (event) => this.onFilterEvent(event),
					'clear-filters': () => this.onClearFilters(),
					'sort-change': (keys, value) => this.onSidebarSortChange(keys, value),
					'saved-view': (event) => this.onSavedViewAction(event),
					'tab-change': (tab) => {
						this.sidebarActiveTab = tab
					},
				},
			}
		},

		/**
		 * Intercepts CnRowActions' and CnContextMenu's bubbled `@action` so `handler: "none"` actions are dropped before re-emit.
		 * A built-in is matched by its id, an app action by its label.
		 *
		 * @param {{action: string, row: object, id?: string, builtin?: boolean}} payload The bubbled action payload.
		 */
		onRowAction(payload) {
			const matched = payload.builtin === true
				? this.mergedActions.find((a) => a.builtin === true && a.id === payload.id)
				: this.mergedActions.find((a) => a.builtin !== true && a.label === payload.action)
			if (matched && matched._dispatchSuppress) {
				return
			}
			/**
			 * @event action A row action was chosen from a row's actions menu, its right-click menu or the keyboard primary action. Payload: `action` (the label), the row, the action's `id` when it has one, and `builtin: true` for a built-in View / Edit / Copy / Delete. Its handler has already run.
			 * @type {{ action: string, row: object, id?: string, builtin?: boolean }}
			 */
			this.$emit('action', payload)
		},

		/**
		 * A card moved on the board.
		 *
		 * The list is refreshed rather than patched in place: the transition
		 * may have changed more than the status (a date armed, an assignee
		 * cleared), and a board that only moved the card would show a row that
		 * disagrees with the table beside it.
		 *
		 * @param {object} move The `{ card, toKey }` the board emitted.
		 * @return {Promise<void>} Nothing.
		 */
		async onBoardMoved(move) {
			/**
			 * @event board-move A card moved through the host's transition.
			 * @type {object}
			 */
			this.$emit('board-move', move)
			await this.onRefreshEvent()
		},

		/**
		 * Row/card click: toggles selection when `selectable` (covers the custom
		 * `cardComponent` path), otherwise emits `row-click` for navigation. A
		 * ctrl/cmd/shift click opens a named source's row in a new tab.
		 *
		 * The `@event` block below sits directly against its `$emit`, and must
		 * stay there. vue-docgen binds an event's description to the emit it
		 * IMMEDIATELY precedes.
		 *
		 * @param {object} row The clicked row object
		 * @param {MouseEvent|KeyboardEvent} [event] The originating click event.
		 */
		onRowClick(row, event) {
			if (!this.routeClickedRow(row, event)) {
				return
			}
			/**
			 * @event row-click Emitted on a row/card click for navigation. Fires when `selectable` is false, OR when `rowClickToView` is set and something can open the row (selection then happens via the checkbox). Payload: `(row, event)` — the clicked row and the native click event (absent for a keyboard shortcut or map marker), so a host can open the row in a new tab on a ctrl/cmd/shift click with `openRowTarget`. A middle click emits `row-aux-click` instead.
			 * @type {object} The clicked row object.
			 */
			this.$emit('row-click', ...(event ? [row, event] : [row]))
		},

		/**
		 * Row/card middle click: opens a named source's row in a new tab and
		 * emits `row-aux-click`, not `row-click`, so a host whose `row-click`
		 * listener navigates never moves the current tab away.
		 *
		 * @param {object} row The clicked row object
		 * @param {MouseEvent} event The originating auxclick event.
		 */
		onRowAuxClick(row, event) {
			if (!this.routeClickedRow(row, event)) {
				return
			}
			/**
			 * @event row-aux-click Emitted on a row/card middle click, under the same conditions as `row-click`, so a host can open the row in a new tab with `openRowTarget`. Payload: `(row, event)` — the clicked row and the native auxclick event.
			 * @type {object} The clicked row object.
			 */
			this.$emit('row-aux-click', row, event)
		},

		/**
		 * The shared part of a row click and a middle click: on a selectable
		 * page a plain click toggles selection instead, and a named source opens
		 * its own row.
		 *
		 * @param {object} row The clicked row object
		 * @param {MouseEvent|KeyboardEvent} [event] The originating event.
		 * @return {boolean} Whether the click navigates, so the caller emits.
		 */
		routeClickedRow(row, event) {
			if (this.selectable && !this.rowClickOpens) {
				if (!event || event.button === undefined || event.button === 0) {
					this.onSelect(this.toggleIdInArray(this.internalSelectedIds, row[this.rowKey]))
				}
				return false
			}
			// A named source knows where its rows live. Emitting only would leave
			// the click inert on a manifest page, which has no listener to bind —
			// the very shape that left three apps with a dead `@rowClick`.
			//
			// `rowRoute` wins over everything: an app that declares its own
			// page for these rows means it. The source's `openRow` is the
			// right default precisely because a task's page is usually
			// openregister's, and it is wrong for an app that ships one of
			// its own. This cannot be done by listening to `row-click`,
			// because `openRow` calls `window.location.assign()` and the
			// host's push never lands.
			//
			// A ctrl/cmd/shift or middle click opens a new tab instead, from
			// `rowRoute`, the source's `rowTarget(row)` or `detailRoute`. A source
			// with only `openRow` opens the row in place on a ctrl/cmd/shift
			// click and ignores a middle click. The event is marked so the host
			// hearing `row-click` does not open a second tab.
			if (this.isNamedSource) {
				const id = row?.id || row?.uuid
				const source = this.namedSource
				const newTab = isNewTabClick(event)
				const openTarget = (target) => markNewTabHandled(event, openRowTarget(event, target, this.$router))
				if (this.rowRoute) {
					if (id && newTab) {
						openTarget({ name: this.rowRoute, params: { id: String(id) } })
					} else if (id) {
						this.$router.push({ name: this.rowRoute, params: { id: String(id) } })
					}
				} else if (source && typeof source.openRow === 'function' && !newTab) {
					source.openRow(row)
				} else if (source && typeof source.rowTarget === 'function') {
					openTarget(source.rowTarget(row))
				} else if (source && typeof source.openRow === 'function') {
					// No new-tab target: a modified click still opens the row in place.
					if (event?.button !== 1) {
						source.openRow(row)
					}
				} else if (source && source.detailRoute && id) {
					if (newTab) {
						openTarget({ path: `${source.detailRoute}/${id}` })
					} else {
						this.$router.push(`${source.detailRoute}/${id}`)
					}
				}
			}
			return true
		},

		/**
		 * Whether a value is a DOM event. A custom list/card component's
		 * `click` may carry the item, the native event, or both.
		 *
		 * @param {unknown} value A `click` listener argument.
		 * @return {boolean}
		 */
		isDomEvent(value) {
			return typeof Event !== 'undefined' && value instanceof Event
		},

		/**
		 * Mousedown on a custom list/card component's root: when a middle click
		 * opens the row, keep the browser from starting autoscroll.
		 *
		 * @param {MouseEvent} event The mousedown event.
		 * @return {void}
		 */
		onCustomItemMouseDown(event) {
			if (!this.selectable || this.rowClickOpens) {
				preventMiddleClickAutoscroll(event)
			}
		},

		/**
		 * Middle click on a custom list/card component's root: open the row
		 * like a middle click on a built-in card would. Skipped when something
		 * inside the component already opened it in a new tab.
		 *
		 * @param {object} row The component's row.
		 * @param {MouseEvent} event The auxclick event.
		 * @return {void}
		 */
		onCustomItemAuxClick(row, event) {
			if (isRowMiddleClick(event) && !isNewTabHandled(event)) {
				this.onRowAuxClick(row, event)
			}
		},

		/**
		 * Resolve a marker click on the map back to its source row and route it
		 * through `onRowClick`, so `@row-click` fires with the identical payload a
		 * table/card click would emit — giving uniform detail-page navigation
		 * across all three view modes.
		 *
		 * @param {{ feature: object }} payload CnMapWidget marker-click payload.
		 */
		onMarkerClick(payload) {
			const feature = payload && payload.feature
			const key = feature && feature.properties ? feature.properties[this.rowKey] : undefined
			if (key === undefined || key === null) {
				return
			}
			const row = this.displayObjects.find((o) => o[this.rowKey] === key)
			if (row) {
				this.onRowClick(row)
			}
		},

		/**
		 * Extract a `{ lat, lng }` pair from a row using `mapConfig`. Prefers a
		 * GeoJSON Point on `geoField` (`coordinates: [lng, lat]`), else reads the
		 * dotted `latField` / `lngField` paths. Returns null when the geometry is
		 * missing or non-finite, so callers can skip the row.
		 *
		 * @param {object} row The source object.
		 * @return {{ lat: number, lng: number } | null}
		 */
		resolveRowLatLng(row) {
			if (!row) {
				return null
			}
			const cfg = this.mapConfig || {}
			if (cfg.geoField) {
				let geo = this.getByPath(row, cfg.geoField)
				// OpenRegister often stores geometry as a JSON-encoded string on
				// object metadata; parse it before reading `coordinates`.
				if (typeof geo === 'string') {
					try {
						geo = JSON.parse(geo)
					} catch {
						geo = null
					}
				}
				const coords = geo && Array.isArray(geo.coordinates) ? geo.coordinates : null
				if (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
					return { lat: Number(coords[1]), lng: Number(coords[0]) }
				}
			}
			const lat = Number(this.getByPath(row, cfg.latField))
			const lng = Number(this.getByPath(row, cfg.lngField))
			if (Number.isFinite(lat) && Number.isFinite(lng)) {
				return { lat, lng }
			}
			return null
		},

		/**
		 * Resolve a row's GeoJSON geometry for the map view. Prefers a full
		 * geometry on `geoField`: a Point renders as a marker, a Polygon /
		 * MultiPolygon / LineString renders as an area/line — so location cases
		 * plot as both points AND areas. `geoField` is parsed from a JSON string
		 * when OpenRegister stores it encoded. Falls back to a Point built from
		 * `latField` / `lngField`. Returns null when nothing resolvable is present.
		 *
		 * @param {object} row The source object.
		 * @return {object|null} A GeoJSON geometry object, or null.
		 */
		resolveRowGeometry(row) {
			if (!row) {
				return null
			}
			const cfg = this.mapConfig || {}
			const GEO_TYPES = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection']
			if (cfg.geoField) {
				let geo = this.getByPath(row, cfg.geoField)
				if (typeof geo === 'string') {
					try {
						geo = JSON.parse(geo)
					} catch {
						geo = null
					}
				}
				if (geo && GEO_TYPES.includes(geo.type)) {
					const hasShape = geo.type === 'GeometryCollection'
						? Array.isArray(geo.geometries)
						: Array.isArray(geo.coordinates)
					if (hasShape) {
						return geo
					}
				}
			}
			const lat = Number(this.getByPath(row, cfg.latField))
			const lng = Number(this.getByPath(row, cfg.lngField))
			if (Number.isFinite(lat) && Number.isFinite(lng)) {
				return { type: 'Point', coordinates: [lng, lat] }
			}
			return null
		},

		/**
		 * Dig out the first `[lng, lat]` coordinate pair from any GeoJSON geometry
		 * (Point, Polygon ring, GeometryCollection, …) for a rough centroid.
		 *
		 * @param {object} geometry A GeoJSON geometry.
		 * @return {{lat: number, lng: number}|null}
		 */
		firstLatLng(geometry) {
			if (!geometry) {
				return null
			}
			if (geometry.type === 'GeometryCollection') {
				for (const g of (geometry.geometries || [])) {
					const p = this.firstLatLng(g)
					if (p) {
						return p
					}
				}
				return null
			}
			let c = geometry.coordinates
			while (Array.isArray(c) && Array.isArray(c[0])) {
				c = c[0]
			}
			if (Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
				return { lat: Number(c[1]), lng: Number(c[0]) }
			}
			return null
		},

		/**
		 * Read a possibly-dotted property path off an object (e.g. `@self.geo.lat`).
		 * Returns undefined on any missing segment. No path = undefined.
		 *
		 * @param {object} obj The object to read from.
		 * @param {string} path Dot-separated property path.
		 * @return {unknown} The resolved value or undefined.
		 */
		getByPath(obj, path) {
			if (!obj || !path) {
				return undefined
			}
			if (Object.hasOwn(obj, path)) {
				return obj[path]
			}
			return path.split('.').reduce((acc, seg) => (acc === null || acc === undefined ? undefined : acc[seg]), obj)
		},

		/**
		 * Whether the consumer explicitly passed a prop, in either spelling.
		 *
		 * Needed where a named source changes a prop's EFFECTIVE default: the
		 * declared default is unchanged (the prop interface must not break),
		 * so the value alone cannot distinguish "left to default" from
		 * "explicitly asked for the default".
		 *
		 * @param {string} name The camelCase prop name.
		 * @return {boolean} True when the prop was passed explicitly.
		 */
		hasExplicitProp(name) {
			const props = this.$.vnode.props || {}
			const kebab = name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())
			return (name in props) || (kebab in props)
		},

		/**
		 * Open a named-source row: the source's own navigation, then
		 * `edit-open` for the host.
		 *
		 * This is what the source-action grammar `action: 'open'` resolves to
		 * (see `mergedActions`). Navigation order is deliberate: the source's
		 * `openRow`/`detailRoute` push happens FIRST, so when the host also
		 * navigates (CnPageRenderer binds `@edit-open` → `onRowOpen`, which
		 * honours `config.rowRoute`), the host's push lands last and wins —
		 * the configured target beats the source's default, and a page with
		 * no host listener still navigates.
		 *
		 * @param {object} row The row to open.
		 * @return {void}
		 */
		openSourceRow(row) {
			if (this.isNamedSource && this.namedSource && typeof this.namedSource.openRow === 'function') {
				this.namedSource.openRow(row)
			} else if (this.isNamedSource && this.namedSource && this.namedSource.detailRoute) {
				const id = row?.id || row?.uuid
				if (id && this.$router) {
					this.$router.push(`${this.namedSource.detailRoute}/${id}`)
				}
			}
			this.$emit('edit-open', row)
		},

		/**
		 * Whether a page tab is the page being shown.
		 *
		 * @param {object} tab The page tab.
		 * @return {boolean} True for the current page.
		 */
		isActivePageTab(tab) {
			if (tab.to && typeof tab.to === 'object') {
				return !!this.$route && tab.to.name !== undefined && this.$route.name === tab.to.name
			}
			const path = this.$route && this.$route.path
			return !!path && String(path).replace(/\/+$/, '') === String(tab.to).replace(/\/+$/, '')
		},

		/**
		 * The href of a page tab, resolved through the router when there is one.
		 *
		 * @param {object} tab The page tab.
		 * @return {string} The href.
		 */
		pageTabHref(tab) {
			if (this.$router && typeof this.$router.resolve === 'function') {
				const resolved = this.$router.resolve(tab.to)
				if (resolved && resolved.href) {
					return resolved.href
				}
			}
			return tab.to
		},

		/**
		 * Follow a page tab on the app's router. A ctrl/cmd/shift or middle
		 * click keeps the browser's own new-tab behaviour.
		 *
		 * @param {object} tab The page tab.
		 * @param {MouseEvent} event The click.
		 * @return {void}
		 */
		onPageTabClick(tab, event) {
			if (!this.$router || isNewTabClick(event) || this.isActivePageTab(tab)) {
				if (this.isActivePageTab(tab)) {
					event.preventDefault()
				}
				return
			}
			event.preventDefault()
			this.$router.push(tab.to).catch(() => {})
		},

		/**
		 * Handle the built-in View action — emits a dedicated `view` event.
		 * Kept distinct from `row-click` because the two are conceptually
		 * different: a row click might mean select/expand/drilldown, while
		 * View always means "open the detail view of this row".
		 *
		 * @param {object} row The row whose View action was triggered
		 */
		onView(row) {
			this.$emit('view', row)
		},

		/**
		 * Handle the Add button click. If the consumer listens to `@add`,
		 * emit the event (backward compatible). Otherwise open the form dialog.
		 */
		onAddClick() {
			// A NAMED SOURCE CREATES BY NAVIGATING, not by the form dialog. That
			// dialog builds an OpenRegister object from a schema; a flow is not
			// one, which is why the page it replaces set `show-add="false"` and
			// rendered its own button. An explicit @add listener still wins.
			if (
				!this.$.vnode.props?.onAdd
				&& this.isNamedSource
				&& this.namedSource
				&& this.namedSource.addRoute
			) {
				// With `addLinkTo` set, Add is a link that already navigated.
				if (!this.addLinkTo) {
					this.$router.push(this.namedSource.addRoute)
				}
				return
			}
			// `$.vnode.props`, not `$attrs`: `add` is a declared emit, and Vue
			// keeps declared emits out of `$attrs`.
			if (this.$.vnode.props?.onAdd) {
				this.$emit('add')
			} else if (!this.openCreateModal() && this.showFormDialog) {
				this.editItem = null
				this.showFormDialogVisible = true
			}
		},

		/**
		 * Open the built-in create dialog when the route carries `?action=create`.
		 * Called on `mounted()` and whenever `$route.query.action` changes, so it
		 * works both on initial navigation and on same-page deep-links (e.g. a
		 * "New Case" button on a sibling page that routes here with the query).
		 *
		 * After opening the dialog the query param is cleared via
		 * `$router.replace` so a page refresh does not re-open it and browser
		 * history stays clean. No-op when there is no router, when `showFormDialog`
		 * is false (consumer manages its own dialog), or when the query param is
		 * absent / not `'create'`.
		 */
		maybeOpenCreateFromQuery() {
			if (!this.$route || !this.$route.query || this.$route.query.action !== 'create') {
				return
			}
			if (!this.openCreateModal()) {
				if (!this.showFormDialog) {
					return
				}
				this.openFormDialog(null)
			}
			// Clear the query param; guard against redundant navigation errors.
			if (this.$router) {
				const query = { ...this.$route.query }
				delete query.action
				const nav = this.$router.replace({ query })
				// $router.replace returns a Promise in Vue Router 3 but may
				// return undefined in mocked / legacy environments — guard.
				if (nav && typeof nav.catch === 'function') {
					nav.catch(() => {})
				}
			}
		},

		/**
		 * The calendar moved to another month: ask for that window.
		 *
		 * @param {{rangeStart: string, rangeEnd: string}} range The visible grid window as ISO dates.
		 */
		onCalendarRange(range) {
			this.calendarRange = range
			if (this.isSelfFetchMode && typeof this.list.refresh === 'function') {
				this.list.refresh(1)
			}
		},

		/**
		 * "+N" on a busy day: show that day's records in the table.
		 *
		 * @param {string} iso The day, `YYYY-MM-DD`.
		 */
		onCalendarDaySelect(iso) {
			const cal = this.calendar || {}
			if (this.isSelfFetchMode && cal.dateField) {
				const next = { ...this.list.activeFilters.value }
				if (cal.endDateField) {
					next[`${cal.dateField}[lte]`] = [iso]
					next[`${cal.endDateField}[gte]`] = [iso]
				} else {
					next[`${cal.dateField}[gte]`] = [iso]
					next[`${cal.dateField}[lte]`] = [iso]
				}
				this.list.activeFilters.value = next
			}
			this.onViewModeChange('table')
		},

		/**
		 * Handle view mode toggle.
		 *
		 * @param {string} mode 'table' or 'cards'
		 */
		onViewModeChange(mode) {
			this.routeViewPending = false
			this.currentViewMode = mode
			this.$emit('view-mode-change', mode)
		},

		/**
		 * Open in the mode the address names (`?_view=board`), when the page
		 * offers it. The key starts with `_`, like `_search` and `_page`, so it
		 * is never read as a list filter. A menu entry's `query` can so open a
		 * list as its board, on the one page that lists the schema
		 * (screens-board-reference-columns). A mode the page offers only later
		 * (the map, once rows with a geometry are in) opens when it arrives,
		 * unless the reader picked a view first.
		 *
		 * @return {void}
		 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-the-address-can-open-a-list-in-a-view-mode
		 * @spec openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-the-address-opens-a-view-mode-that-arrives-later
		 */
		applyViewModeFromRoute() {
			const wanted = this.$route?.query?._view
			if (typeof wanted !== 'string' || wanted === '' || wanted === this.currentViewMode) {
				this.routeViewPending = false
				return
			}
			if (this.routeViewModes.includes(wanted)) {
				this.currentViewMode = wanted
				this.routeViewPending = false
				return
			}
			this.routeViewPending = true
		},

		/**
		 * Handle selection changes from CnDataTable/CnCardGrid.
		 * Updates internal state and re-emits for parent.
		 *
		 * @param {Array} ids Array of selected row IDs
		 */
		onSelect(ids) {
			this.internalSelectedIds = ids
			this.$emit('select', ids)
		},

		// --- Mass action handlers ---

		async onMassDeleteConfirm(ids) {
			if (await this.selfActions.handleMassDelete(ids)) {
				return
			}
			this.$emit('mass-delete', ids)
		},

		async onMassCopyConfirm(payload) {
			if (await this.selfActions.handleMassCopy(payload)) {
				return
			}
			this.$emit('mass-copy', payload)
		},

		async onMassExportConfirm(payload) {
			if (await this.selfActions.handleMassExport(payload)) {
				return
			}
			this.$emit('mass-export', payload)
		},

		/**
		 * Native Export menu entry click (`allowExport` + `schema.exportable`).
		 * Navigates the browser to OpenRegister's export leaf, passing the
		 * list's own query (without paging) so the file holds the rows the
		 * table is filtered to.
		 *
		 * @param {'csv'|'excel'} format The requested export format.
		 */
		onExportClick(format) {
			// The query the list itself sends, so the file follows the table:
			// search, sort, facet filters, the page filter and the quick filter.
			// A host-managed list has no such query, so it keeps the route's.
			const query = this.isSelfFetchMode && typeof this.list.buildParams === 'function'
				? this.list.buildParams(1)
				: ((this.$route && this.$route.query) || {})
			const url = buildExportUrl(this.register, this.exportSchemaSlug, query, format)
			window.location.assign(url)
		},

		// ── Saved views (saved-views-ui) ─────────────────────────────────────

		/**
		 * Fetch the current user's saved views (own + public) from
		 * OpenRegister's views API. Called from created() when the page
		 * offers saved views.
		 */
		async fetchSavedViews() {
			this.savedViewsLoading = true
			try {
				this.savedViews = await useSavedViewsApi().fetchViews()
				// An empty answer is also what a misread response gives, so it
				// never empties the menu: entries are dropped only against a
				// list that came back with views in it.
				if (this.savedViews.length > 0) {
					this.syncSavedViewMenu()
				}
				this.applySavedViewFromRoute()
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error('CnIndexPage: failed to fetch saved views', error)
			} finally {
				this.savedViewsLoading = false
			}
		},

		/**
		 * Apply a saved view. Self-fetch mode's facet/folder filters and
		 * search/sort live in useListView's own reactive state, not the route
		 * query, so apply them there directly. Otherwise (consumer-managed
		 * store mode) fall back to `$router.replace` — same precedent as the
		 * `?action=create` query cleanup, and dropping the whole previous
		 * query implicitly resets `_page` to 1.
		 *
		 * @param {object} view The View API object to apply.
		 * @param {{keepSavedViewKey?: boolean}} [options] Keep `?savedView=<id>` in the address, as a menu entry's link does.
		 */
		onApplySavedView(view, { keepSavedViewKey = false } = {}) {
			this.appliedSavedViewId = view && (view.id || view.slug) ? String(view.id || view.slug) : ''
			const state = extractViewState(view)
			if (view && view.seeded === true) {
				const ctx = typeof this.selfFetchTokenCtx === 'function' ? this.selfFetchTokenCtx() : {}
				state.filters = resolveFilterTokens(state.filters, ctx)
			}
			this.appliedViewFiltersKey = this.viewFiltersKey(state.filters)
			// A view that carries columns wins while it is applied; one without leaves the person's own layout.
			const viewColumns = view && view.query && Array.isArray(view.query.columns) ? view.query.columns.map(String) : []
			this.appliedViewColumns = viewColumns.length > 0 ? viewColumns : null
			if (this.isSelfFetchMode) {
				// Set state directly (not via onFilterEvent/onSearchEvent per key)
				// so applying a view is one fetch + one route replace, not one
				// of each per changed field — and a filter the view doesn't
				// carry is actually cleared, not left over from before.
				this.list.activeFilters.value = { ...state.filters }
				this.list.searchTerm.value = state.search || ''
				const keys = state.sortKeys
				this.list.sortKeys.value = keys
				this.list.sortKey.value = keys[0]?.key ?? null
				this.list.sortOrder.value = keys[0]?.order ?? 'asc'
				this.list.refresh(1)
				// Through `persistViewStateToRoute` rather than a raw replace,
				// because it is what records the keys this view wrote — without
				// that, a later "clear all" has nothing to delete them by.
				this.persistViewStateToRoute(state, { savedView: keepSavedViewKey ? this.appliedSavedViewId : '' })
				this.applyViewSortOption(savedViewOverrides(view))
				this.$emit('apply-view', view)
				return
			}
			if (!this.$router) {
				return
			}
			const query = buildRouteQueryFromViewState(state)
			if (keepSavedViewKey) {
				query.savedView = this.appliedSavedViewId
			}
			const nav = this.$router.replace({ query })
			if (this.isNamedSource) {
				this.namedActiveFilters = namedFiltersFromQuery(query, this)
			}
			// Swallow the duplicate-navigation rejection (Vue Router 3)
			// when the applied view matches the current query.
			if (nav && typeof nav.catch === 'function') {
				nav.catch(() => {})
			}
			this.applyViewSortOption(savedViewOverrides(view))
			this.$emit('apply-view', view)
		},

		/**
		 * Persist the current state as a named view via OpenRegister's views
		 * API (CnSaveViewDialog `@confirm`). Self-fetch mode reads its active
		 * filters/search/sort straight from useListView's own state (they
		 * never reach the route query); otherwise falls back to the route
		 * query. On success the new view joins the list and the dialog
		 * closes; on failure the dialog stays open with the error surfaced.
		 *
		 * @param {{ name: string, isPublic: boolean }} payload Dialog payload.
		 */
		/**
		 * Toast, without letting the toast fail the thing it reports on.
		 *
		 * The import is dynamic so a page that never toasts does not carry the
		 * chunk, and everything is swallowed: a chunk that will not load must
		 * not turn a save that worked into an error, nor add an unhandled
		 * rejection on top of one that already failed.
		 *
		 * @param {'success'|'error'} kind Which toast to show.
		 * @param {string} message The message, already translated.
		 * @return {Promise<void>}
		 */
		async toastSavedView(kind, message) {
			try {
				const dialogs = await import('@nextcloud/dialogs')
				const show = kind === 'error' ? dialogs.showError : dialogs.showSuccess
				if (typeof show === 'function') {
					show(message)
				}
			} catch {
				// No toast. What it was reporting on happened either way.
			}
		},

		/**
		 * Put a saved view that changed elsewhere (its alert) back in the list,
		 * matched on its id or uuid.
		 *
		 * @param {object} view The saved view as the server returned it.
		 * @return {void}
		 */
		replaceSavedView(view) {
			if (!view || typeof view !== 'object') {
				return
			}
			const same = (other) => other && ((view.id !== undefined && other.id === view.id) || (view.uuid && other.uuid === view.uuid))
			this.savedViews = (this.savedViews || []).map((other) => (same(other) ? view : other))
		},

		async onSaveViewConfirm({ name, isPublic, sharedWith, presentation }) {
			const state = this.isSelfFetchMode
				? this.currentViewState()
				: extractViewStateFromRouteQuery((this.$route && this.$route.query) || {})
			const payload = buildViewCreatePayload({
				name,
				description: '',
				isPublic,
				isDefault: false,
				state,
				scope: savedViewScope(this.savedViewsPage),
				register: this.register,
				schema: this.schema,
				sharedWith,
				presentation,
			})
			try {
				const view = await useSavedViewsApi().createView(payload)
				if (!view) {
					// A 2xx carrying no view. Axios has thrown on every real error
					// by now, so nothing else marks this one, and the list below is
					// not appended to: claiming success sends the person looking
					// for a view that is not in it.
					throw new Error(t('nextcloud-vue', 'The server did not return the saved view'))
				}
				this.savedViews = [...this.savedViews, view]
				this.showSaveViewDialog = false
				this.sidebarActiveTab = 'filters-tab'
				this.sidebarOpen = true
				this.toastSavedView('success', t('nextcloud-vue', 'View "{name}" saved', { name }))
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error('CnIndexPage: failed to save view', error)
				// Both, and they say different things: the dialog stays open
				// carrying the reason, because that is where the name and the
				// toggle still are to correct and retry; the toast says the save
				// did not happen, because a dialog that simply stayed open reads
				// as one that has not been submitted yet.
				this.$refs.saveViewDialog?.setError(error?.response?.data?.error || error?.message)
				this.toastSavedView('error', t('nextcloud-vue', 'Could not save the view "{name}"', { name }))
			}
		},

		/**
		 * Open the presentation dialog for a view the user may edit
		 * (CnSavedViewsControl `@presentation-request`).
		 *
		 * @param {object} view The View API object.
		 * @spec openspec/changes/view-presentation-picker/tasks.md#task-3
		 */
		onPresentationViewRequest(view) {
			this.viewPendingPresentation = view
		},

		/**
		 * Save a changed presentation (CnSavedViewPresentationDialog `@confirm`).
		 * The body carries `presentation` only, so a writer never sends
		 * `sharedWith` or `owner`. A refusal keeps the dialog open.
		 *
		 * @param {object} presentation The presentation in OpenRegister's shape.
		 * @spec openspec/changes/view-presentation-picker/tasks.md#task-3
		 */
		async onPresentationViewConfirm(presentation) {
			const view = this.viewPendingPresentation
			if (!view) {
				return
			}
			try {
				const saved = await useSavedViewsApi().patchView(view.id, { presentation })
				this.savedViews = this.savedViews.map((v) => (v.id === view.id ? { ...v, ...(saved || { presentation }) } : v))
				this.viewPendingPresentation = null
				this.toastSavedView('success', t('nextcloud-vue', 'View "{name}" updated', { name: view.name }))
			} catch (error) {
				const data = error?.response?.data
				this.$refs.presentationViewDialog?.setError((data && (data.error || data.message)) || error?.message)
			}
		},

		/**
		 * One saved-view intent from the sidebar's Search tab.
		 *
		 * @param {{action: string, view: (object|null)}} event The intent.
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-6
		 */
		onSavedViewAction({ action, view } = {}) {
			const handlers = {
				apply: () => this.onApplySavedView(view),
				save: () => { this.showSaveViewDialog = true },
				edit: () => this.onEditViewRequest(view),
				share: () => this.onShareViewRequest(view),
				presentation: () => this.onPresentationViewRequest(view),
				update: () => this.onUpdateViewRequest(view),
				copy: () => this.onCopyViewRequest(view),
				menu: () => this.onToggleSavedViewInMenu(view),
				delete: () => this.onDeleteViewRequest(view),
			}
			if (handlers[action]) {
				handlers[action]()
			}
		},

		/**
		 * Add a saved view to the app menu, or take it out. Stored per user
		 * by CnAppRoot; the view itself is not touched, so a view shared
		 * with this user can be added as well as an own one.
		 *
		 * @param {object} view The view.
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-7
		 */
		onToggleSavedViewInMenu(view) {
			const menu = this.cnSavedViewMenu
			if (!view || !menu || typeof menu.toggle !== 'function' || this.savedViewPage === '') {
				return
			}
			const badge = this.savedViewMenuBadge(view)
			menu.toggle({ id: String(view.id || view.slug), page: this.savedViewPage, name: view.name, ...(typeof view.icon === 'string' && view.icon !== '' ? { icon: view.icon } : {}), ...(badge ? { badge } : {}) })
		},

		/**
		 * The count a view's menu entry shows, from its `overrides.badge`:
		 * `{ count: { register, schema, filter }, counterVariant? }`, or null.
		 *
		 * @param {object} view The view.
		 * @return {{count: object, counterVariant?: string}|null}
		 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-view-in-the-menu-can-show-a-count
		 */
		savedViewMenuBadge(view) {
			const overrides = savedViewOverrides(view)
			const badge = overrides ? overrides.badge : null
			const filters = view && view.query && typeof view.query.filters === 'object' ? view.query.filters : {}
			const locked = overrides && overrides.lockedFilters && typeof overrides.lockedFilters === 'object' ? overrides.lockedFilters : {}
			return savedViewBadge(badge, { register: this.register, schema: schemaSlug(this.schema), filter: this.filter }, { ...locked, ...filters })
		},

		/**
		 * Select the sort option a view names (`overrides.sortOption`), or,
		 * given none, undo the one the previous view selected.
		 *
		 * @param {object|null} overrides The view's overrides.
		 * @return {void}
		 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-view-can-select-a-sort-option
		 */
		applyViewSortOption(overrides) {
			const wanted = overrides && typeof overrides.sortOption === 'string' ? overrides.sortOption : ''
			if (wanted !== '' && this.selectSortOption(wanted)) {
				this.viewSortOption = wanted
				return
			}
			if (this.viewSortOption !== '' && this.sortSource && this.sortSource.value === this.viewSortOption) {
				this.sortSource = { ...this.sortSource, value: '', page: 1 }
			}
			this.viewSortOption = ''
		},

		/**
		 * Leave the applied view: the page's own config comes back. The filters
		 * stay as they are, as after any other change to them.
		 *
		 * @return {void}
		 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-view-can-override-the-page-config-while-it-is-active
		 */
		leaveSavedView() {
			this.appliedSavedViewId = ''
			this.appliedViewColumns = null
			this.applyViewSortOption(null)
		},

		/**
		 * Bring this page's menu entries in line with the views it can show:
		 * current names, and none for a view deleted or no longer shared.
		 *
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-7
		 */
		syncSavedViewMenu() {
			const menu = this.cnSavedViewMenu
			if (!menu || typeof menu.sync !== 'function' || this.savedViewPage === '') {
				return
			}
			menu.sync(this.savedViewPage, [...this.defaultFilterViews, ...this.visibleSavedViews].map((view) => ({ ...view, menuBadge: this.savedViewMenuBadge(view) })))
		},

		/**
		 * Apply the saved view the address names (`?savedView=<id>`, what a
		 * menu entry links to), once the list holding it has loaded.
		 *
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-7
		 */
		applySavedViewFromRoute() {
			const id = this.$route && this.$route.query ? this.$route.query.savedView : undefined
			if (typeof id !== 'string' || id === '' || id === this.appliedSavedViewId) {
				return
			}
			const view = this.viewsForControl.find((v) => String(v.id) === id || String(v.slug) === id)
			if (view) {
				this.onApplySavedView(view, { keepSavedViewKey: true })
			}
		},

		/**
		 * Open the edit dialog for an own view (CnSavedViewsControl `@edit-request`).
		 *
		 * @param {object} view The View API object.
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-3
		 */
		onEditViewRequest(view) {
			this.viewPendingEdit = view
		},

		/**
		 * Save a rename, and the current filters when asked
		 * (CnSavedViewEditDialog `@confirm`). The PATCH carries `name`, plus
		 * `query` only when the criteria are replaced, so nothing else on the
		 * view is rewritten from this tab's copy. A refusal keeps the dialog open.
		 *
		 * @param {{ name: string, replaceCriteria: boolean }} payload The dialog payload.
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-3
		 */
		async onEditViewConfirm({ name, replaceCriteria }) {
			const view = this.viewPendingEdit
			if (!view) {
				return
			}
			const body = { name }
			if (replaceCriteria === true) {
				const state = this.isSelfFetchMode
					? this.currentViewState()
					: extractViewStateFromRouteQuery((this.$route && this.$route.query) || {})
				body.query = buildViewCreatePayload({
					name,
					state,
					scope: savedViewScope(this.savedViewsPage),
					register: this.register,
					schema: this.schema,
				}).query
				// New criteria keep the view's page config overrides.
				if (view.query && view.query.overrides) {
					body.query.overrides = view.query.overrides
				}
			}
			try {
				const saved = await useSavedViewsApi().patchView(view.id, body)
				this.savedViews = this.savedViews.map((v) => (v.id === view.id ? { ...v, ...(saved || body) } : v))
				this.syncSavedViewMenu()
				this.viewPendingEdit = null
				this.toastSavedView('success', t('nextcloud-vue', 'View "{name}" saved', { name }))
			} catch (error) {
				const data = error?.response?.data
				this.$refs.editViewDialog?.setError((data && (data.error || data.message)) || error?.message)
			}
		},

		/**
		 * Open the share dialog for an own view (CnSavedViewsControl `@share-request`).
		 *
		 * @param {object} view The View API object to share.
		 * @spec openspec/changes/saved-views-shared-by-role/tasks.md#task-2
		 */
		onShareViewRequest(view) {
			this.viewPendingShare = view
		},

		/**
		 * Save a changed audience (CnSavedViewShareDialog `@confirm`). A failure
		 * keeps the dialog open with the server's message.
		 *
		 * @param {Array<{group: string, mode: string}>} sharedWith The audience, `[]` to stop sharing.
		 * @spec openspec/changes/saved-views-shared-by-role/tasks.md#task-2
		 */
		async onShareViewConfirm(sharedWith) {
			const view = this.viewPendingShare
			if (!view) {
				return
			}
			try {
				const saved = await useSavedViewsApi().patchView(view.id, { sharedWith: normalizeSharedWith(sharedWith) })
				const next = saved || { ...view, sharedWith: normalizeSharedWith(sharedWith) }
				this.savedViews = this.savedViews.map((v) => (v.id === view.id ? { ...v, ...next } : v))
				this.viewPendingShare = null
				this.toastSavedView('success', t('nextcloud-vue', 'Sharing of "{name}" saved', { name: view.name }))
			} catch (error) {
				this.$refs.shareViewDialog?.setError(error?.response?.data?.error || error?.response?.data?.message || error?.message)
			}
		},

		/**
		 * Save the current state to a view shared with write access
		 * (CnSavedViewsControl `@update-request`). The body carries the query
		 * and presentation only: never `sharedWith` or `owner`, so the
		 * audience cannot be changed from here.
		 *
		 * @param {object} view The shared View API object.
		 * @spec openspec/changes/saved-views-shared-by-role/tasks.md#task-3
		 */
		async onUpdateViewRequest(view) {
			const state = this.isSelfFetchMode
				? this.currentViewState()
				: extractViewStateFromRouteQuery((this.$route && this.$route.query) || {})
			const payload = buildViewCreatePayload({
				name: view.name,
				description: view.description || '',
				isPublic: view.isPublic === true,
				isDefault: false,
				state,
				scope: savedViewScope(this.savedViewsPage),
				register: this.register,
				schema: this.schema,
			})
			if (view.query && view.query.overrides) {
				payload.query.overrides = view.query.overrides
			}
			try {
				const saved = await useSavedViewsApi().updateView(view.id, payload)
				if (saved) {
					this.savedViews = this.savedViews.map((v) => (v.id === view.id ? saved : v))
				}
				this.toastSavedView('success', t('nextcloud-vue', 'View "{name}" updated', { name: view.name }))
			} catch (error) {
				this.toastSavedView('error', error?.response?.data?.error || error?.response?.data?.message || t('nextcloud-vue', 'Could not update the view "{name}"', { name: view.name }))
			}
		},

		/**
		 * "Save as my view" on a read-only shared view
		 * (CnSavedViewsControl `@copy-request`): a personal copy with the same
		 * name and query. The original stays untouched.
		 *
		 * @param {object} view The shared View API object.
		 * @spec openspec/changes/saved-views-shared-by-role/tasks.md#task-3
		 */
		async onCopyViewRequest(view) {
			const payload = {
				name: view.name,
				description: view.description || '',
				isPublic: false,
				isDefault: false,
				query: view.query && typeof view.query === 'object' ? view.query : {},
			}
			try {
				const copy = await useSavedViewsApi().createView(payload)
				if (!copy) {
					throw new Error(t('nextcloud-vue', 'The server did not return the saved view'))
				}
				this.savedViews = [...this.savedViews, copy]
				this.toastSavedView('success', t('nextcloud-vue', 'View "{name}" saved', { name: view.name }))
			} catch (error) {
				this.toastSavedView('error', error?.response?.data?.error || error?.message || t('nextcloud-vue', 'Could not save the view "{name}"', { name: view.name }))
			}
		},

		/**
		 * Open the delete-confirmation dialog for a saved view
		 * (CnSavedViewsControl `@delete-request`).
		 *
		 * @param {object} view The View API object to delete.
		 */
		onDeleteViewRequest(view) {
			this.viewPendingDelete = view
		},

		/**
		 * Delete the pending view after confirmation (CnConfirmDialog
		 * `@confirm`), then report back via the dialog's setResult()
		 * contract and remove it from the local list.
		 */
		async onDeleteViewConfirm() {
			const view = this.viewPendingDelete
			if (!view) {
				return
			}
			try {
				await useSavedViewsApi().deleteView(view.id)
				this.savedViews = this.savedViews.filter((v) => v.id !== view.id)
				this.syncSavedViewMenu()
				this.$refs.deleteViewConfirmDialog?.setResult({ success: true })
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error('CnIndexPage: failed to delete view', error)
				this.$refs.deleteViewConfirmDialog?.setResult({ error: error?.response?.data?.error || error?.message || 'Failed to delete view' })
			}
		},

		async onMassImportConfirm(payload) {
			if (await this.selfActions.handleMassImport(payload)) {
				return
			}
			this.$emit('mass-import', payload)
		},

		_setResult(refName, resultData) {
			this.$refs[refName]?.setResult(resultData)
		},

		/**
		 * @param {{ success?: boolean, error?: string }} resultData Result data to pass to the dialog
		 * @public
		 */
		setMassDeleteResult(resultData) {
			this._setResult('massDeleteDialog', resultData)
		},

		/**
		 * @param {{ success?: boolean, error?: string }} resultData Result data to pass to the dialog
		 * @public
		 */
		setMassCopyResult(resultData) {
			this._setResult('massCopyDialog', resultData)
		},

		/**
		 * @param {{ success?: boolean, error?: string }} resultData Result data to pass to the dialog
		 * @public
		 */
		setExportResult(resultData) {
			this._setResult('exportDialog', resultData)
		},

		/**
		 * @param {{ success?: boolean, error?: string }} resultData Result data to pass to the dialog
		 * @public
		 */
		setImportResult(resultData) {
			this._setResult('importDialog', resultData)
		},

		/**
		 * @param {{ success?: boolean, error?: string }} resultData Result data to pass to the dialog
		 * @public
		 */
		setDeleteResult(resultData) {
			this._setResult('massDeleteDialog', resultData)
		},

		/**
		 * @param {{ success?: boolean, error?: string }} resultData Result data to pass to the dialog
		 * @public
		 */
		setCopyResult(resultData) {
			this._setResult('massCopyDialog', resultData)
		},

		// --- Single-object dialog handlers ---

		async onSingleDeleteConfirm(id) {
			// A named source deletes through its own hook. Emit-only would
			// leave the confirm inert on a manifest page (nobody listens),
			// which is why the Delete action only renders when the hook
			// exists — see `defaultActions`.
			if (this.isNamedSource && this.namedSource && typeof this.namedSource.deleteRow === 'function') {
				try {
					await this.namedSource.deleteRow(this.actionTargetItem || { id }, this.sourceConfig || {})
					this.setSingleDeleteResult({ success: true })
					this.$emit('delete', id)
				} catch (err) {
					this.setSingleDeleteResult({ error: (err && err.message) || 'Delete failed' })
				}
				return
			}
			if (await this.selfActions.handleSingleDelete(id)) {
				return
			}
			this.$emit('delete', id)
		},

		async onSingleCopyConfirm(payload) {
			// Same contract as delete: the source owns the copy, or there is
			// no Copy action to confirm.
			if (this.isNamedSource && this.namedSource && typeof this.namedSource.copyRow === 'function') {
				try {
					await this.namedSource.copyRow(
						this.actionTargetItem || { id: payload && payload.id },
						payload && payload.newName,
						this.sourceConfig || {},
					)
					this.setSingleCopyResult({ success: true })
					this.$emit('copy', payload)
				} catch (err) {
					this.setSingleCopyResult({ error: (err && err.message) || 'Copy failed' })
				}
				return
			}
			if (await this.selfActions.handleSingleCopy(payload)) {
				return
			}
			this.$emit('copy', payload)
		},

		// Lets an `advanceOn: "object-created"` walkthrough step auto-advance.
		// No dispatch site existed anywhere before this, so that advanceOn
		// type could never fire. `@self.register`/`@self.schema` are numeric
		// DB ids, not the slugs a manifest's advanceOn declares, so override
		// them with this page's own slug props before dispatching.
		notifyWalkthroughObjectCreated(created) {
			if (typeof window === 'undefined' || !created) {
				return
			}
			dispatchObjectCreated({ register: this.register, schema: this.exportSchemaSlug, object: created })
		},

		/**
		 * Toast and navigate after a create the built-in dialog confirmed, per
		 * `createSuccessMessage` / `createSuccessRoute`. Both default off, so a
		 * page that declares neither behaves exactly as before.
		 *
		 * Runs on every create path (store, self-store, `createOverride`), which
		 * is what makes the built-in Add button a peer of a manifest
		 * `open-form` header action: that action has always toasted and
		 * navigated, so the same create reached two different endings depending
		 * on which button opened it.
		 *
		 * @param {object} saved The created object, as the save path returned it.
		 * @return {Promise<void>}
		 */
		async afterCreateSuccess(saved) {
			// Callers do not await this — a toast and a navigation are not the
			// save — so nothing here may reject: an unhandled rejection from a
			// failed chunk load would surface as an error on a create that
			// actually succeeded.
			if (this.createSuccessMessage) {
				try {
					const { showSuccess } = await import('@nextcloud/dialogs')
					if (typeof showSuccess === 'function') {
						showSuccess(this.cnTranslate(this.createSuccessMessage))
					}
				} catch {
					// No toast; the record is saved either way.
				}
			}
			if (!this.createSuccessRoute) {
				return
			}
			try {
				// `buildOnSuccessRoute` reads the id through `savedObjectId`, so a
				// response that carries it as `uuid` or `@self.id` still deep-links.
				const location = buildOnSuccessRoute(this.createSuccessRoute, saved)
				if (location && this.$router) {
					this.$router.push(location).catch(() => {})
				}
			} catch {
				// The record is saved; staying on the list beats an error toast.
			}
		},

		async onFormConfirm(formData) {
			// Opt-in create-override hook: an app supplies a custom async create
			// handler (e.g. a contact-aware endpoint that fills a required FK)
			// that owns persistence instead of saveObject. Create-only; edits
			// always fall through to the normal store / self-store path.
			if (!this.editItem && typeof this.createOverride === 'function') {
				try {
					const created = await this.createOverride(formData, {
						register: this.register,
						schema: this.schema,
						objectType: this.objectType || this.selfObjectType,
						effectiveSchema: this.effectiveSchema,
					})
					if (created) {
						this.setFormResult({ success: true })
						/**
						 * @event create Emitted after a create is confirmed (store, self-store, or createOverride).
						 * @type {object} The created object.
						 */
						this.$emit('create', created)
						this.notifyWalkthroughObjectCreated(created)
						if (this.list && typeof this.list.refresh === 'function') {
							this.list.refresh()
						}
						this.afterCreateSuccess(created)
					} else {
						this.setFormResult({ error: 'Save failed' })
					}
				} catch (err) {
					this.setFormResult({ error: (err && err.message) || 'Save failed' })
				}
				return
			}
			if (this.store) {
				if (!this.objectType) {
					// eslint-disable-next-line no-console
					console.warn('[CnIndexPage] store prop is set but objectType is missing. Cannot save to store.')
					return
				}
				const saved = await this.store.saveObject(this.objectType, formData)
				if (saved) {
					const wasCreate = !this.editItem
					this.setFormResult({ success: true })
					this.$emit(wasCreate ? 'create' : 'edit', saved)
					if (wasCreate) {
						this.notifyWalkthroughObjectCreated(saved)
						this.afterCreateSuccess(saved)
					}
				} else {
					const err = this.store.getError?.(this.objectType)
					if (err && err.isValidation) {
						// Keep the form visible so the user can fix the invalid data.
						this.setFormValidationErrors(err.fields, err.message || 'Validation failed')
					} else {
						this.setFormResult({ error: (err && err.message) || 'Save failed' })
					}
				}
				return
			}
			if (await this.selfActions.handleFormSave(formData)) {
				return
			}
			this.$emit(this.editItem ? 'edit' : 'create', formData)
		},

		closeSingleDelete() {
			this.showSingleDeleteDialog = false
			this.actionTargetItem = null
		},

		closeSingleCopy() {
			this.showSingleCopyDialog = false
			this.actionTargetItem = null
		},

		closeFormDialog() {
			this.showFormDialogVisible = false
			this.editItem = null
			this.rowFormTarget = null
			this.rowFormSchema = null
		},

		/**
		 * @param {{ success?: boolean, error?: string }} resultData Result data to pass to the dialog
		 * @public
		 */
		setSingleDeleteResult(resultData) {
			this._setResult('singleDeleteDialog', resultData)
		},

		/**
		 * @param {{ success?: boolean, error?: string }} resultData Result data to pass to the dialog
		 * @public
		 */
		setSingleCopyResult(resultData) {
			this._setResult('singleCopyDialog', resultData)
		},

		/**
		 * @param {{ success?: boolean, error?: string }} resultData Result data to pass to the dialog
		 * @public
		 */
		setFormResult(resultData) {
			this._setResult('formDialog', resultData)
			// A saved write may change a label a reference column shows.
			if (resultData && resultData.success && this._refLabelResolver) {
				this._refLabelResolver.invalidate()
				this.refLabels = {}
				this.refLooks = {}
				this.loadRefLabels()
				this.loadRefLooks()
			}
		},

		/**
		 * Show a validation error in the form dialog while keeping the form
		 * visible (so the user can fix the data), instead of replacing it with
		 * a result note. Use this for 400/422 responses; use setFormResult for
		 * terminal success/failure.
		 *
		 * @param {object} [fieldErrors] Per-field error messages keyed by field key
		 * @param {string} [message] Form-level message shown above the fields
		 * @public
		 */
		setFormValidationErrors(fieldErrors, message) {
			this.$refs.formDialog?.setValidationErrors(fieldErrors || {}, message)
		},

		// --- Context menu handlers ---

		onRowContextMenu({ row, event }) {
			this.contextMenuShownRow = row
			this.openContextMenu({ item: row, event })
		},

		/**
		 * Programmatically open the form dialog.
		 *
		 * @param {object|null} item Pass null for create mode, or an object for edit mode
		 * @public
		 */
		openFormDialog(item = null) {
			return this.openFormFor(item)
		},

		/**
		 * Open the form dialog for an item. A row of another pair (collectionUrl)
		 * opens with its own schema; everything else opens at once, as before.
		 *
		 * @param {object|null} item The row to edit, or null to create.
		 * @return {Promise<void>|void}
		 */
		openFormFor(item) {
			const target = item ? this.rowTypeTarget(item) : null
			if (!target) {
				this.rowFormTarget = null
				this.rowFormSchema = null
				this.editItem = item
				this.showFormDialogVisible = true
				return
			}
			const store = this.selfObjectStore
			return Promise.resolve(store.getSchema?.(target.type) || store.fetchSchema?.(target.type))
				.catch(() => null)
				.then((schema) => {
					if (!schema) {
						this.toastSavedView('error', t('nextcloud-vue', 'Could not load the form for this item.'))
						return
					}
					this.rowFormTarget = target
					this.rowFormSchema = schema
					this.editItem = item
					this.showFormDialogVisible = true
				})
		},

		/**
		 * The row's own pair when it differs from the page's in a collectionUrl list.
		 *
		 * @param {object} row The row.
		 * @return {{register: string, schema: string, type: string}|null} The pair, or null.
		 */
		rowTypeTarget(row) {
			return resolveRowTarget({
				collectionUrl: this.isSelfFetchMode ? this.collectionUrl : '',
				register: this.register,
				schema: this.schema,
				primarySchema: this.effectiveSchema,
				primaryRegister: this.selfObjectStore?.getRegister?.(this.selfObjectType) || null,
				store: this.selfObjectStore,
			}, row)
		},

		/**
		 * Open the `createModal` registry modal, when one is set and a CnAppRoot
		 * ancestor can mount it.
		 *
		 * @return {boolean} Whether the modal was opened.
		 */
		openCreateModal() {
			if (!this.createModal || typeof this.cnOpenModal !== 'function') {
				return false
			}
			this.cnOpenModal(this.createModal)
			return true
		},

		/**
		 * Programmatically open the single-item delete dialog.
		 *
		 * @param {object} item The item to delete
		 * @public
		 */
		openDeleteDialog(item) {
			this.actionTargetItem = item
			this.showSingleDeleteDialog = true
		},

		/**
		 * Pure helper used by the cardComponent dispatch path to toggle
		 * an id in the selected-ids array. Kept inline rather than
		 * pulled into a util because the only call site is the
		 * cardComponent `@select` listener template above.
		 *
		 * @param {Array} ids Current selection
		 * @param {string|number} id The id to toggle
		 * @return {Array} New array with `id` toggled in/out
		 */
		toggleIdInArray(ids, id) {
			if (ids.includes(id)) {
				return ids.filter((existing) => existing !== id)
			}
			return [...ids, id]
		},
	},
}
</script>

<!-- Styles in css/index-page.css -->
