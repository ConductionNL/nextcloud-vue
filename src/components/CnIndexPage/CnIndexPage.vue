<template>
	<div class="cn-index-page"
		:class="lookClass"
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
			:title="title"
			:description="headerDescription"
			:icon="resolvedIcon"
			:showTitle="showTitle">
			<CnPageHeader
				:title="title"
				:description="headerDescription"
				:icon="showTitleIcon && !isBoardLook ? resolvedIcon : ''"
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
								<NcActionButton
									v-for="entry in mergedHeaderActions"
									:key="entry.id"
									:disabled="Boolean(entry.disabled)"
									@click="onHeaderAction({ action: entry.id, id: entry.id })">
									<template v-if="entry.icon && typeof entry.icon === 'string' && !entry.icon.startsWith('icon-')" #icon>
										<CnIcon :name="entry.icon" :size="20" />
									</template>
									{{ entry.label ? cnTranslate(entry.label) : entry.label }}
								</NcActionButton>
							</NcActions>
							<NcButton
								v-else
								:variant="button.variant"
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

		<!-- Actions bar -->
		<CnActionsBar
			:layout="isBoardLook ? 'board' : 'nextcloud'"
			:activeFilterChips="activeFilterChips"
			:showBuildiqButton="!buildiqInHeader"
			:bulkNoun="boardBulkNoun"
			:bulkHint="bulkHint"
			:pagination="effectivePagination"
			:objectCount="effectiveObjects.length"
			:selectable="selectable"
			:selectedIds="internalSelectedIds"
			:addLabel="resolvedAddLabel"
			:addIcon="resolvedIcon"
			:inlineActionCount="inlineActionCount"
			:showMassImport="showMassImport"
			:showMassExport="showMassExport"
			:showMassCopy="showMassCopy"
			:showMassDelete="showMassDelete"
			:viewMode="currentViewMode"
			:showViewToggle="showViewToggle"
			:availableViewModes="effectiveToggleModes"
			:cardsLabel="cardsLabel"
			:tableLabel="tableLabel"
			:listLabel="listLabel"
			:cardsIcon="cardsIcon"
			:tableIcon="tableIcon"
			:showMap="showMapSegment"
			:mapLabel="mapLabel"
			:mapIcon="mapIcon"
			:listIcon="listIcon"
			:showSortSelect="showSortSelect"
			:sortOptions="sortSelectOptions"
			:sortValue="sortSelectValue"
			:showSearch="inlineSearch || isBoardLook"
			:searchValue="effectiveSearchValue"
			:searchPlaceholder="searchPlaceholder"
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
			:bulkActions="mergedBulkActions"
			:documentationUrl="documentationUrl"
			:documentationLabel="documentationLabel || undefined"
			@sortChange="$emit('sort-change', $event)"
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
			<template v-if="$slots['after-search'] || searchInFiles" #after-search>
				<NcCheckboxRadioSwitch
					v-if="searchInFiles"
					:modelValue="contentSearch"
					type="switch"
					class="cn-index-page__content-search"
					data-testid="cn-index-content-search"
					@update:modelValue="onContentSearchToggle">
					{{ t('nextcloud-vue', 'Also search inside files') }}
				</NcCheckboxRadioSwitch>
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
				<!-- Saved views (opt-in via `allowSavedViews`): lists the user's
				     OpenRegister saved-search views; applying one writes its stored
				     filters/search/sort into the route query. -->
				<CnSavedViewsControl
					v-if="barShowsSavedViews"
					:views="viewsForControl"
					:loading="savedViewsLoading"
					:currentUserId="currentSavedViewsUserId"
					:counts="savedViewCounts"
					:selectedViewId="appliedSavedViewId"
					@apply="onApplySavedView"
					@saveRequest="showSaveViewDialog = true"
					@shareRequest="onShareViewRequest"
					@presentationRequest="onPresentationViewRequest"
					@updateRequest="onUpdateViewRequest"
					@copyRequest="onCopyViewRequest"
					@deleteRequest="onDeleteViewRequest" />
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
			<template v-if="tabStripEntries && tabStripEntries.length > 0" #filters>
				<CnQuickFilterBar
					inline
					:tabs="tabStripEntries"
					:mode="quickFilterMode"
					:maxVisible="quickFilterMaxVisible"
					:multiple="quickFilterMultiple"
					:activeIndex="activeQuickFilterIndex"
					:selectedIndices="selectedQuickFilterIndices"
					:counts="tabCounts"
					@update:activeIndex="onQuickFilterChange"
					@update:selectedIndices="onQuickFilterMultiChange" />
			</template>
		</CnActionsBar>

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
			:dialogTitle="t('nextcloud-vue', 'Delete view')"
			:message="deleteViewMessage"
			:confirmLabel="t('nextcloud-vue', 'Delete')"
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
			:schema="effectiveSchema"
			:confirm="onFormConfirm"
			:close="closeFormDialog"
			:refresh="onRefreshEvent">
			<CnFormDialog
				v-if="showFormDialogVisible && !useAdvancedFormDialog"
				ref="formDialog"
				:schema="effectiveSchema"
				:item="editItem"
				:register="register"
				:excludeFields="excludeFields"
				:includeFields="includeFields"
				:fieldOverrides="fieldOverrides"
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
				:schema="effectiveSchema"
				:item="editItem"
				:excludeFields="excludeFields"
				:includeFields="includeFields"
				:fieldOverrides="fieldOverrides"
				:nameField="massActionNameField"
				:initialValues="resolvedCreateDefaults"
				@confirm="onFormConfirm"
				@close="closeFormDialog" />
		</slot>

		<!-- Body -->
		<div class="cn-index-page__body" :class="{ 'cn-index-page__body--with-folders': folderSidebar }">
			<!-- Optional folder navigation pane (opt-in via the `folderSidebar`
			     config). Selecting a folder filters the list by the config's
			     `filterField`; "All" clears it. -->
			<div v-if="folderSidebar" class="cn-index-page__folder-pane">
				<CnFolderSidebar
					:source="folderSidebarSource"
					:folders="folderSidebarFolders"
					:objects="effectiveObjects"
					:groupBy="folderSidebar.groupBy || folderSidebar.field || ''"
					:facetValues="folderSidebarFacetValues"
					:partial="folderSidebarPartial"
					:filesPath="folderSidebar.filesPath || '/'"
					:selectedId="selectedFolderId"
					:allLabel="folderSidebar.allLabel || undefined"
					:title="folderSidebar.title || ''"
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

				<!-- Loading state — initial fetch only; a background refresh keeps the table visible -->
				<div v-if="showInitialLoader" class="cn-index-page__loading">
					<!-- name gives NcLoadingIcon a non-empty aria-label (WCAG role-img-alt); empty name ships an unlabeled role="img" -->
					<NcLoadingIcon :size="32" :name="loadingText" />
				</div>

				<!-- Error state: the latest self-fetch failed (e.g. a search term the server rejects) -->
				<div v-else-if="selfFetchFailed"
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
						<CnEmptyContent :name="resolvedEmptyText">
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
					:rowClickToView="rowClickOpens"
					:selectedIds="internalSelectedIds"
					:rowKey="rowKey"
					:emptyText="emptyText"
					:excludeColumns="excludeColumns"
					:includeColumns="includeColumns"
					:columnOverrides="columnOverrides"
					:rowClass="rowClass"
					:filterable="tableHeaderFilters"
					:activeFilters="effectiveActiveFilters"
					:filterRegister="typeof register === 'string' ? register : ''"
					@columnFilter="onColumnFilterEvent"
					@sort="onSortEvent"
					@select="onSelect"
					@rowClick="onRowClick"
					@rowAuxClick="onRowAuxClick"
					@rowContextMenu="onRowContextMenu">
					<!-- Star column (showFavouriteColumn) -->
					<template v-if="showFavouriteColumn" #column-__favourite="{ row }">
						<CnFavouriteToggle
							v-if="row && row['@self'] && typeof row['@self'].favourite === 'boolean'"
							:register="typeof register === 'string' ? register : ''"
							:schema="favouriteSchemaSlug"
							:objectId="String(row['@self'].id || row.id || '')"
							:favourite="row['@self'].favourite === true" />
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
						v-if="(filterMenu && filterableFields.length) || (columnMenu && governedColumns.length)"
						#actions-header>
						<NcActions
							v-if="filterMenu && filterableFields.length"
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
				<CnMapWidget
					v-else-if="currentViewMode === 'map'"
					class="cn-index-page__map"
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
					:statusFieldSchema="boardStatusFieldSchema"
					:statusField="board.statusField || 'status'"
					:cardFields="board.cardFields || []"
					:swimlaneField="board.swimlaneField || ''"
					:dueRule="board.dueRule || null"
					:rowKey="rowKey"
					:runTransition="runTransition"
					:paged="isPaged"
					@cardClick="onRowClick"
					@cardAuxClick="onRowAuxClick"
					@moved="onBoardMoved" />

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
					:config="listConfig"
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

				<!-- Pagination -->
				<CnPagination
					v-if="effectivePagination && (effectivePagination.pages > 1 || (isBoardLook && effectivePagination.total > 0))"
					:variant="isBoardLook ? 'board' : ''"
					:footerNote="footerNote"
					:currentPage="effectivePagination.page || 1"
					:totalPages="effectivePagination.pages || 1"
					:totalItems="effectivePagination.total || 0"
					:currentPageSize="effectivePagination.limit || 20"
					class="cn-index-page__pagination"
					@pageChanged="onPageEvent"
					@pageSizeChanged="onPageSizeEvent" />
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
			v-bind="sidebarSearchProps"
			@update:open="sidebarOpen = $event"
			@search="onSearchEvent"
			@columnsChange="onColumnsEvent"
			@columnsReorder="onColumnsReorder"
			@pinChange="onPinChange"
			@columnsReset="onColumnsReset"
			@filterChange="onFilterEvent"
			@clearFilters="onClearFilters" />
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActionCaption, NcActionCheckbox, NcActions, NcButton, NcCheckboxRadioSwitch, NcLoadingIcon } from '@nextcloud/vue'
import { getCurrentInstance, inject, markRaw, ref } from 'vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import DatabaseSearch from 'vue-material-design-icons/DatabaseSearch.vue'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import Export from 'vue-material-design-icons/Export.vue'
import Eye from 'vue-material-design-icons/Eye.vue'
import FilterOutline from 'vue-material-design-icons/FilterOutline.vue'
import ViewColumnOutline from 'vue-material-design-icons/ViewColumnOutline.vue'
import CnConfirmDialog from '../../dialogs/CnConfirmDialog.vue'
import CnQuickEditDialog from '../../dialogs/CnQuickEditDialog.vue'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import CnEmptyContent from '../CnEmptyContent/CnEmptyContent.vue'
import CnFavouriteToggle from '../CnFavouriteToggle/CnFavouriteToggle.vue'
import { useContextMenu } from '../../composables/index.js'
import { useLook } from '../../composables/useLook.js'
import { copyKindsOf } from '../../composables/useObjectCopy.js'
import { createRefLabelResolver } from '../../composables/useRefLabels.js'
import { useSavedViewsApi } from '../../composables/useSavedViewsApi.js'
import { METADATA_COLUMNS } from '../../constants/metadata.js'
import { useObjectStore } from '../../store/useObjectStore.js'
import { routeHref } from '../../utils/actionLink.js'
import { buildOnSuccessRoute, resolveRegisteredHandler } from '../../utils/actionsDispatcher.js'
import { reportBindingProblems } from '../../utils/diagnostics.js'
import { fetchFilterCounts } from '../../utils/fetchFilterCounts.js'
import { buildExportUrl } from '../../utils/indexExportHelpers.js'
import { openRowTarget } from '../../utils/linkNavigation.js'
import { resolveClaimedTeams, resolveClaimTokens, splitViewsIntoTabs, viewAsTab, viewIdOf } from '../../utils/listLenses.js'
import { LIST_SHORTCUTS, listPaletteCommands, shortcutFor } from '../../utils/listShortcuts.js'
import { multiKeySort } from '../../utils/multiKeySort.js'
import { withPersonalLenses } from '../../utils/personalLenses.js'
import { resolveDeepTokens, resolveFilterValue } from '../../utils/resolveFilterTokens.js'
import { resolveRowActions } from '../../utils/resolveRowActions.js'
import { resolveFilterMap } from '../../utils/routeFilters.js'
import { availableRowActions, DEFAULT_ROW_ACTION_FIELD, refusalReasonFor, undeclaredRowActions, withoutViewWhenRowOpensDetail } from '../../utils/rowActionAvailability.js'
import { isRowActionVisible, rowActionPayload } from '../../utils/rowActionItem.js'
import { isNewTabClick, isNewTabHandled, isRowMiddleClick, markNewTabHandled, preventMiddleClickAutoscroll } from '../../utils/rowAuxClick.js'
import { DEFAULT_ROW_INDICATOR_CAP } from '../../utils/rowIndicators.js'
import { buildRouteQueryFromViewState, buildViewCreatePayload, extractViewState, extractViewStateFromRouteQuery, normalizeSharedWith, savedViewScope, viewMatchesScope } from '../../utils/savedViewHelpers.js'
import { columnsFromSchema, fieldsFromSchema } from '../../utils/schema.js'
import { resolveScopeLayout } from '../../utils/scopeListLayout.js'
import { dispatchObjectCreated } from '../../utils/walkthroughSignals.js'
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
import { CnSavedViewPresentationDialog } from '../CnSavedViewPresentationDialog/index.js'
import { CnSavedViewsControl } from '../CnSavedViewsControl/index.js'
import { CnSavedViewShareDialog } from '../CnSavedViewShareDialog/index.js'
import { CnSaveViewDialog } from '../CnSaveViewDialog/index.js'
import { applyAiContext } from './aiContext.js'
import { buildDefaultActions } from './defaultActions.js'
import { dispatchAction } from './manifestActionDispatch.js'
import { applyManualOrder, dropInOrder, manualOrderKey, moveInOrder, visibleIdsOf } from './manualOrder.js'
import { orderColumns, personalColumnsKey, reconcilePersonalColumns } from './personalColumns.js'
import { createSelfModeActions } from './selfModeActions.js'
import { applyRowPatches, normalisePaneWidth, rowIdOf, splitLayoutFor } from './splitView.js'
import { useNamedSource } from './useNamedSource.js'
import { useSelfFetchList } from './useSelfFetchList.js'

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

/** Key of the synthetic star column (`showFavouriteColumn`). */
const FAVOURITE_COLUMN_KEY = '__favourite'

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
	return (fields && typeof fields === 'object') ? fields : {}
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
	if (!props.entitySource) {
		return {}
	}
	const route = instance && instance.proxy && instance.proxy.$route
	const query = (route && route.query) || {}
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
		CnBuildiqEditButton,
		CnFavouriteToggle,
		NcLoadingIcon,
		CnEmptyContent,
		NcActions,
		NcActionButton,
		NcActionCaption,
		NcActionCheckbox,
		NcButton,
		AlertCircleOutline,
		Close,
		Cog,
		DatabaseSearch,
		Export,
		FilterOutline,
		ViewColumnOutline,
		NcCheckboxRadioSwitch,
		CnPageHeader,
		CnQuickFilterBar,
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
	inject: {
		cnCustomComponents: { default: () => ({}) },
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
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-an-index-page-title-is-a-manifest-key
		 */
		countSubtitle: {
			type: String,
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

		// eslint-disable-next-line vue/no-unused-properties
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
		 * Buttons beside the page title, as the board's "Export" and "New
		 * case" (manifest `config.headerButtons`). Each is `{ label?, action,
		 * variant?, icon?, format?, id? }`: `action` is `add` (the Add flow;
		 * its label defaults to the Add label), `export` (the export leaf in
		 * `format`, `csv` by default, else the export dialog), `import`,
		 * `refresh`, or the id of a `headerActions` entry; `variant` is
		 * `primary` or `secondary` (the default). Shown only with
		 * `showTitle`. When they show, the actions bar drops its Views and
		 * Actions menus, and the Add button and Export menu when a button
		 * takes their action. Empty (the default) changes nothing.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 * @type {Array<{label?: string, action: string, variant?: ('primary'|'secondary'), icon?: string, format?: ('csv'|'excel'), id?: string}>}
		 */
		headerButtons: {
			type: Array,
			default: () => [],
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
		 * unchanged.
		 */
		quickFilters: {
			type: Array,
			default: null,
		},

		/**
		 * Personal lenses appended to the quick filters: any of `favourite`
		 * (`_favourite`), `recent` (`_recent`), `watching` (`_watching`) and
		 * `unread` (`_unread`).
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
		 * Add a first column with a star per row (`CnFavouriteToggle`), bound to
		 * each row's `@self.favourite`. Clicking it does not open the row.
		 * Manifest `config.showFavouriteColumn`.
		 */
		showFavouriteColumn: {
			type: Boolean,
			default: false,
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
		 * Offer an "Also search inside files" switch beside the search box. On,
		 * a search also matches words inside attached files (OpenRegister
		 * `_content_search`), and a row found that way says which file matched.
		 * Manifest: `config.searchInFiles`.
		 */
		searchInFiles: {
			type: Boolean,
			default: false,
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
		 *
		 * @type {{ latField?: string, lngField?: string, geoField?: string, popupField?: string, center?: [number, number] }}
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

		/** Text shown when no items found */
		emptyText: {
			type: String,
			default: 'No items found',
		},

		/** Accessible label for the loading spinner (NcLoadingIcon aria-label) */
		loadingText: {
			type: String,
			default: 'Loading…',
		},

		/** Function returning CSS class(es) for a row */
		rowClass: {
			type: Function,
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
		 * Opt-in flag for the saved-views control (saved-views-ui) rendered
		 * in the toolbar. Defaults to `false` — an app must explicitly
		 * enable it per page. When `true`, a Views dropdown lists the
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
			default: false,
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
		 * Show a standalone sort dropdown in the actions bar (for card/list
		 * views without sortable headers). Emits `@sort-change` with the value.
		 * Fed from the manifest as `pages[].config.showSortSelect`.
		 */
		showSortSelect: {
			type: Boolean,
			default: false,
		},

		/**
		 * Options for the standalone sort dropdown (manifest `config.sortSelectOptions`).
		 *
		 * @type {Array<{ value: string, label: string }>}
		 */
		sortSelectOptions: {
			type: Array,
			default: () => [],
		},

		/** Selected value of the standalone sort dropdown (controlled). */
		sortSelectValue: {
			type: String,
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
		 * Reserved ids (those used by built-ins on the bar — `refresh`,
		 * `import`, `export`, `copy`, `delete`) are dropped from the
		 * merged list with a `console.warn`.
		 *
		 * @type {Array<{ id: string, label: string, icon?: string, handler?: string|(() => void), route?: string, disabled?: boolean }>}
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
		const namedActiveFilters = ref(namedFiltersFromRoute(getCurrentInstance(), props))

		const {
			isNamedSource,
			namedSource,
			namedRows,
			namedLoading,
			namedQuickFilters,
		} = useNamedSource(props, { activeQuickFilterIndex, activeFilters: namedActiveFilters })

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
			currentViewMode: this.viewMode,
			/** The visible calendar window `{ rangeStart, rangeEnd }` (ISO dates), or null outside calendar mode. */
			calendarRange: null,
			/** The page size to restore when leaving calendar mode. */
			calendarPrevPageSize: null,
			/** Resolved labels of reference columns: `{ [columnKey]: { [id]: label|null } }`. */
			refLabels: {},
			/** Count per tab-strip index, for the entries that asked for one; null = none. */
			tabCounts: null,
			/** Count per saved-view id, for the views control; null = none. */
			savedViewCounts: null,
			// The id (or slug) of the saved view that is applied; its chip shows selected under the board look.
			appliedSavedViewId: '',
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
			// Drives the Actions-menu Refresh spinner during a self-fetch
			// refresh, where the host has no promise to bind `:refreshing` to.
			internalRefreshing: false,
			// Search/Columns sidebar open state. Defaults closed so the page
			// content (table / cards) starts at the top and fills the width;
			// opened on demand via the actions-bar toggle.
			sidebarOpen: false,
			// Saved views (saved-views-ui): the fetched view list, its
			// loading flag, the save-dialog toggle, and the view awaiting
			// delete confirmation.
			savedViews: [],
			savedViewsLoading: false,
			showSaveViewDialog: false,
			viewPendingDelete: null,
			/** The own view whose audience is being changed (CnSavedViewShareDialog), or null. */
			viewPendingShare: null,
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

		/** Rows: store collection in self-fetch mode, else the `objects` prop. */
		effectiveObjects() {
			if (this.isNamedSource) {
				return this.namedRows
			}
			if (this.selfFetchFailed) {
				return []
			}
			return this.isSelfFetchMode ? (this.list.objects.value || []) : this.objects
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
			if (!spec || spec.length === 0) {
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
		 * Whether the list holds one page of more.
		 *
		 * The board says so beside its counts: a count of a page shown as
		 * though it were the total is a number somebody quotes in a meeting.
		 *
		 * @return {boolean} True when there is more than this page.
		 */
		isPaged() {
			return Number(this.pagination?.pages || 1) > 1
		},

		/**
		 * The CnFolderSidebar source. A `register` source is fetched by this
		 * component and handed to CnFolderSidebar as a `custom` folder list.
		 *
		 * @return {string} The resolved CnFolderSidebar source.
		 */
		folderSidebarSource() {
			const s = this.folderSidebar && this.folderSidebar.source
			return (s === 'register' || !s) ? 'custom' : s
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
			if (!this.folderSidebar) {
				return { columns: null, sortKeys: [], searchFields: [] }
			}
			return resolveScopeLayout({
				scope: this.activeScope,
				row: this.activeScopeRow,
				pageColumns: this.declaredColumns,
			})
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
			return this.splitSavedViews.control
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
		tabStripEntries() {
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
		 * The property keys the board look's card facts show: the page's
		 * `cardFields`, else the first four list columns. Null without the
		 * look and without `cardFields`, so the card keeps its own default.
		 *
		 * @spec openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-a-record-card-has-a-head-facts-and-one-action
		 * @return {?Array<string>}
		 */
		resolvedCardFields() {
			if (Array.isArray(this.cardFields) && this.cardFields.length > 0) {
				return this.cardFields
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
			// The Recent lens owns the order: no column sorts while it is on.
			if (this.recentLensActive) {
				cols = cols.map((col) => (col && typeof col === 'object' ? { ...col, sortable: false } : col))
			}
			if (this.showFavouriteColumn && this.favouriteSchemaSlug !== '') {
				cols = [{ key: FAVOURITE_COLUMN_KEY, label: '', sortable: false, width: '48px' }, ...cols]
			}
			return cols
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
		 * Schema slug the star column calls with: the page's own slug in self-fetch
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
			if (this.folderSidebar && this.folderSidebar.source === 'register') {
				return 'id'
			}
			return (this.folderSidebar && this.folderSidebar.idField) || 'id'
		},

		/**
		 * @return {string} The name field key for CnFolderSidebar's custom list.
		 */
		folderPassthroughNameField() {
			if (this.folderSidebar && this.folderSidebar.source === 'register') {
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
			for (const row of this.displayObjects) {
				const geometry = this.resolveRowGeometry(row)
				if (!geometry) {
					continue
				}
				features.push({
					type: 'Feature',
					geometry,
					properties: {
						[this.rowKey]: row[this.rowKey],
						...(this.mapConfig.popupField ? { [this.mapConfig.popupField]: row[this.mapConfig.popupField] } : {}),
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
			if (this.selfFetchFailed) {
				return { ...this.list.pagination.value, total: 0, page: 1, pages: 1 }
			}
			return this.isSelfFetchMode ? this.list.pagination.value : this.pagination
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
			return { scope: this.savedViewsScope, register: this.register, schema: this.schema }
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
			return t('nextcloud-vue', 'Delete the view "{name}"? This cannot be undone.', { name: this.viewPendingDelete.name })
		},

		/** Sort key / order: list state in self-fetch mode, else the props. */
		effectiveSortKey() {
			return this.isSelfFetchMode ? this.list.sortKey.value : this.sortKey
		},

		effectiveSortOrder() {
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
				return cols
			}

			const governed = this.sidebarGovernedColumnKeys
			cols = cols.filter((c) => {
				const key = typeof c === 'string' ? c : c.key
				return !governed.has(key) || visible.includes(key)
			})

			const present = new Set(cols.map((c) => (typeof c === 'string' ? c : c.key)))
			const byKey = new Map(this.governedColumns.map((c) => [c.key, c]))
			visible.forEach((key) => {
				if (present.has(key)) {
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
						this.editItem = row
						this.showFormDialogVisible = true
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
		 * The quick-filter tabs to render: the `quickFilters` prop when set,
		 * else a named source's own tabs (`useNamedSource` resolved the same
		 * precedence for the LOAD side, so strip and fetch cannot disagree).
		 *
		 * @return {Array<object>|null} The tabs, or null when there are none.
		 */
		effectiveQuickFilters() {
			const own = withPersonalLenses(this.quickFilters, this.personalLenses)
			if (own && own.length > 0) {
				return own
			}
			return (this.isNamedSource && this.namedQuickFilters) || null
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
		 * @return {Array<{key: string, label: string, action: string, variant: string, icon: string, format: string}>}
		 */
		resolvedHeaderButtons() {
			const declared = Array.isArray(this.headerButtons) ? this.headerButtons : []
			return declared
				.filter((button) => button && typeof button === 'object' && typeof button.action === 'string' && button.action !== '')
				.map((button, index) => {
					let label = typeof button.label === 'string' && button.label !== '' ? this.cnTranslate(button.label) : ''
					let icon = typeof button.icon === 'string' ? button.icon : ''
					if (label === '' && button.action === 'add') {
						label = this.resolvedAddLabel
					}
					// The board's header: Export reads "Download" with its icon and
					// the Actions menu reads "Actions", without the manifest saying so.
					if (this.isBoardLook && label === '' && button.action === 'export') {
						label = t('nextcloud-vue', 'Download')
						icon = icon || 'Download'
					}
					if (label === '' && button.action === 'actions-menu') {
						label = t('nextcloud-vue', 'Actions')
					}
					return {
						key: String(button.id || button.action || index),
						label,
						action: button.action,
						variant: button.variant === 'primary' ? 'primary' : 'secondary',
						icon,
						format: button.format === 'excel' ? 'excel' : 'csv',
					}
				})
				.filter((button) => button.label !== '')
				// The Actions menu lists the page's header actions, so a page
				// with none has nothing to put in it.
				.filter((button) => button.action !== 'actions-menu' || this.mergedHeaderActions.length > 0)
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
		 * The active filters as chips for the board toolbar's second row, one
		 * per filter: "Team: Woo". A filter with no value is not active.
		 *
		 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-toolbar-sits-on-the-ground-in-two-rows
		 * @return {Array<{key: string, label: string}>}
		 */
		activeFilterChips() {
			if (!this.isBoardLook) {
				return []
			}
			const props = this.effectiveSchema?.properties || {}
			const chips = []
			for (const [key, raw] of Object.entries(this.effectiveActiveFilters || {})) {
				const values = (Array.isArray(raw) ? raw : [raw])
					.filter((value) => value !== null && value !== undefined && value !== '')
					.map((value) => String(value))
				if (values.length === 0) {
					continue
				}
				const field = this.cnTranslate((props[key] && props[key].title) || key)
				chips.push({ key, label: `${field}: ${values.join(', ')}` })
			}
			return chips
		},

		/**
		 * The plural the board bulk band names: "With the selected cases".
		 * The schema's `titlePlural` (or `plural`), else the lower-cased
		 * schema title with an `s`, else nothing (the band says "items").
		 *
		 * @return {string}
		 */
		boardBulkNoun() {
			const schema = this.effectiveSchema || {}
			const plural = schema.titlePlural || schema.pluralTitle || schema.plural
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
		 * @return {string}
		 */
		headerDescription() {
			const total = this.effectivePagination?.total
			// Board look: the count line is a template over the rows on this page
			// and all rows, "{shown} of {total}" unless the page says otherwise.
			if (this.isBoardLook && typeof total === 'number' && total >= 0) {
				const template = this.countText || this.countSubtitle || '{shown} of {total}'
				return this.cnTranslate(template)
					.replace('{shown}', String(this.effectiveObjects.length))
					.replace('{total}', String(total))
			}
			if (this.countSubtitle && typeof total === 'number' && total >= 0) {
				return this.cnTranslate(this.countSubtitle).replace('{total}', String(total))
			}
			return this.description
		},

		/** Add button label — derived from schema.title if not explicitly set */
		resolvedAddLabel() {
			if (this.addLabel) {
				return this.cnTranslate(this.addLabel)
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
		 * stub so the embedded CnIndexSidebar is not mounted.
		 */
		resolvedSidebar() {
			if (this.sidebar && this.sidebar.enabled !== false) {
				return this.sidebar
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
		currentViewMode(mode, previous) {
			if (!this.isSelfFetchMode) {
				return
			}
			if (mode === 'calendar') {
				this.calendarPrevPageSize = this.list.pageSize.value
				if (typeof this.list.onPageSizeChange === 'function') {
					this.list.onPageSizeChange(CALENDAR_PAGE_SIZE)
				}
			} else if (previous === 'calendar') {
				this.calendarRange = null
				const restore = this.calendarPrevPageSize || 20
				this.calendarPrevPageSize = null
				if (typeof this.list.onPageSizeChange === 'function') {
					this.list.onPageSizeChange(restore)
				}
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
		this.measureSplitViewport()
		if (this.splitViewEnabled && typeof window !== 'undefined') {
			window.addEventListener('resize', this.measureSplitViewport)
		}
		this.loadManualOrder()
		this.loadPersonalColumns()
		this.publishHoistedSidebar()
		this.pushAiContext()
		this.maybeOpenCreateFromQuery()
		if (this.folderSidebar) {
			this.loadFolderRegister()
			// Reflect a deep-link filter (e.g. ?caseType=<id>) as the active folder.
			const key = this.folderSidebar.filterField || this.folderSidebar.field
			const active = key && this.effectiveActiveFilters[key]
			if (active) {
				this.selectedFolderId = Array.isArray(active) ? active[0] : active
			}
		}
	},

	created() {
		this.pushAiContext()
		if (this.allowSavedViews) {
			this.fetchSavedViews()
		}
		this.selfActions = createSelfModeActions({
			isSelfFetchMode: () => this.isSelfFetchMode,
			selfObjectStore: () => this.selfObjectStore,
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
	 * Drop the resize listener and the hoisted sidebar.
	 *
	 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
	 */
	beforeUnmount() {
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', this.measureSplitViewport)
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
			const specs = this.refLabelSpecs
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
				const ids = (this.refLabelIds[spec.key] || []).filter((id) => !Object.hasOwn(known, id))
				if (ids.length === 0) {
					return
				}
				const found = await this._refLabelResolver.resolve(spec.register, spec.schema, ids, spec.labelField)
				this.refLabels = { ...this.refLabels, [spec.key]: { ...(this.refLabels[spec.key] || {}), ...found } }
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
		 * Fetch the record counts for the filters and views that asked for
		 * one. Filters that narrow the same single field share one grouped
		 * request. A failed count leaves that entry without a number.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
		 */
		async loadFilterCounts() {
			const requestKey = this.countRequestKey
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
		 * @param {object} entry Raw headerActions entry.
		 * @return {object} Possibly-mutated copy: function-typed
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
			const handler = entry.handler
			if (typeof handler === 'function') {
				return { ...entry }
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
		 * A header button was clicked: run its built-in action, or dispatch
		 * it as the `headerActions` entry with that id.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 * @param {{action: string, format: string}} button The resolved button.
		 * @return {void}
		 */
		onHeaderButton(button) {
			if (button.action === 'add') {
				this.onAddClick()
			} else if (button.action === 'export') {
				if (this.register && this.exportSchemaSlug) {
					this.onExportClick(button.format)
				} else {
					this.showExportDialog = true
				}
			} else if (button.action === 'import') {
				this.showImportDialog = true
			} else if (button.action === 'refresh') {
				this.onRefreshEvent()
			} else {
				this.onHeaderAction({ action: button.action, id: button.action })
			}
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
			}
			if (entry && entry._dispatchSuppress) {
				return
			}
			this.$emit('header-action', { action: id, id })
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
		 * @param {{key: string, order: string, keys?: Array<{key: string, order: string}>}} payload Sort change from CnDataTable.
		 * @return {void}
		 */
		onSortEvent(payload) {
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
		 * @return {void}
		 */
		persistViewStateToRoute(state) {
			if (!this.$router || !this.$route) {
				return
			}
			const query = { ...this.$route.query }
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
			// Clearing the view brings the person's own columns back.
			this.appliedViewColumns = null
			this.appliedSavedViewId = ''
			if (this.isNamedSource && Object.keys(this.namedActiveFilters || {}).length > 0) {
				this.namedActiveFilters = {}
				this.persistNamedFiltersToRoute({})
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
		 * @param {number} page Requested page from CnPagination.
		 * @return {void}
		 */
		onPageEvent(page) {
			if (this.isSelfFetchMode && typeof this.list.onPageChange === 'function') {
				this.list.onPageChange(page)
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
			if (chip && typeof chip.key === 'string') {
				this.onFilterEvent({ key: chip.key, values: [] })
			}
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
			this.currentViewMode = mode
			this.$emit('view-mode-change', mode)
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
		 * OpenRegister's views API. Called from created() when
		 * `allowSavedViews` is enabled.
		 */
		async fetchSavedViews() {
			this.savedViewsLoading = true
			try {
				this.savedViews = await useSavedViewsApi().fetchViews()
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
		 */
		onApplySavedView(view) {
			this.appliedSavedViewId = view && (view.id || view.slug) ? String(view.id || view.slug) : ''
			const state = extractViewState(view)
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
				this.persistViewStateToRoute(state)
				this.$emit('apply-view', view)
				return
			}
			if (!this.$router) {
				return
			}
			const nav = this.$router.replace({ query: buildRouteQueryFromViewState(state) })
			// Swallow the duplicate-navigation rejection (Vue Router 3)
			// when the applied view matches the current query.
			if (nav && typeof nav.catch === 'function') {
				nav.catch(() => {})
			}
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
				this.loadRefLabels()
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
			this.editItem = item
			this.showFormDialogVisible = true
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
