---
sidebar_position: 3
---

# Detail Page Layout

The layout for viewing and editing a single object, navigated to by clicking a row in the list page.

## Anatomy

```
+-----------------------------------------------------+--------------+
|  <- Back to Clients                                 |  VNG         |
|                                                     |  Realisatie  |
|  VNG Realisatie                        [Edit][Del]  +--------------+
|  -------------------------------------------        |  Details     |
|  Email:    info@vng.nl                              |  Files       |
|  Industry: Government                               |  History     |
|  Status:   Active                                   |              |
|                                                     |  Name:       |
|                                                     |  VNG...      |
+-----------------------------------------------------+--------------+
```

## Pattern

Detail pages are app-specific — there is no single `CnDetailPage` component. Apps compose their own view using store methods and individual components.

The `useDetailView` composable simplifies state management:

```js
import { useDetailView } from '@conduction/nextcloud-vue'

const { object, loading, save, remove } = useDetailView({
  objectStore: useObjectStore(),
  objectType: 'client',
  id: props.clientId,
})
```

## Minimal Implementation

```vue
<template>
  <NcContent app-name="myapp">
    <NcAppNavigation><MainMenu /></NcAppNavigation>

    <NcAppContent>
      <div v-if="object" class="detail-view">
        <div class="detail-view__header">
          <NcButton @click="$router.back()">Back</NcButton>
          <h2>{{ object.name }}</h2>
          <NcButton type="primary" @click="showEdit = true">Edit</NcButton>
          <NcButton type="error" @click="showDelete = true">Delete</NcButton>
        </div>
        <CnObjectCard :object="object" :schema="schema" />
      </div>
      <NcLoadingIcon v-else-if="loading" />
    </NcAppContent>

    <NcAppSidebar :name="object?.name">
      <NcAppSidebarTab name="Files" id="files"><!-- files --></NcAppSidebarTab>
      <NcAppSidebarTab name="History" id="history"><!-- audit trail --></NcAppSidebarTab>
    </NcAppSidebar>
  </NcContent>

  <CnFormDialog
    v-if="showEdit"
    :schema="schema"
    :item="object"
    @confirm="onEditConfirm"
    @close="showEdit = false" />

  <CnDeleteDialog
    v-if="showDelete"
    :item="object"
    @confirm="onDeleteConfirm"
    @close="showDelete = false" />
</template>
```
