CnIndexPage is the top-level schema-driven index page that combines CnActionsBar, CnDataTable/CnCardGrid, CnPagination, and all single/mass-action dialogs in one component.

Full example — table view with CRUD actions:

```vue
<template>
  <div style="height: 500px; overflow: auto; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px;">
    <CnIndexPage
      ref="indexPage"
      :objects="objects"
      :schema="schema"
      :loading="loading"
      :pagination="pagination"
      add-label="Add contact"
      :show-mass-delete="true"
      :show-mass-export="true"
      view-mode="table"
      @create="onCreate"
      @edit="onEdit"
      @delete="onDelete"
      @refresh="onRefresh"
      @page-changed="page = $event" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      loading: false,
      page: 1,
      objects: [
        { id: 1, title: 'Jane Smith', email: 'jane@example.com', status: 'active' },
        { id: 2, title: 'Bob Jones', email: 'bob@example.com', status: 'inactive' },
        { id: 3, title: 'Alice Brown', email: 'alice@example.com', status: 'active' },
      ],
      schema: {
        title: 'Contact',
        properties: {
          title: { type: 'string', title: 'Name' },
          email: { type: 'string', title: 'Email', format: 'email' },
          status: { type: 'string', title: 'Status', enum: ['active', 'inactive'] },
        },
        required: ['title', 'email'],
      },
      pagination: { total: 3, page: 1, pages: 1, limit: 20 },
    }
  },
  methods: {
    async onCreate(formData) {
      await new Promise(r => setTimeout(r, 600))
      this.$refs.indexPage.setFormResult({ success: true })
      this.objects.push({ id: Date.now(), ...formData })
    },
    async onEdit(formData) {
      await new Promise(r => setTimeout(r, 600))
      this.$refs.indexPage.setFormResult({ success: true })
    },
    async onDelete(id) {
      await new Promise(r => setTimeout(r, 600))
      this.$refs.indexPage.setSingleDeleteResult({ success: true })
      this.objects = this.objects.filter(o => o.id !== id)
    },
    onRefresh() { this.loading = true; setTimeout(() => { this.loading = false }, 800) },
  },
}
</script>
```
