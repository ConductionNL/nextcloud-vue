A thread with a reply box:

```vue
<CnConversationThread
  title="Contact with the resident"
  reply-label="Answer to the resident"
  :messages="[
    { id: 1, author: 'Sanne de Vries', time: '2026-10-04T10:52:00', side: 'them',
      text: 'Thank you. I would like to see all documents about the lighting.' },
    { id: 2, time: '2026-10-04T10:24:00', side: 'us',
      text: 'Construction starts in March. There will be lighting along the whole cycle path.' },
  ]" />
```

Read-only, for a closed record:

```vue
<CnConversationThread
  title="Contact"
  :allow-reply="false"
  :messages="[
    { id: 1, author: 'Sanne de Vries', time: '4 Oct, 10:52', side: 'them', text: 'Thank you.' },
  ]" />
```

No messages yet:

```vue
<CnConversationThread title="Contact" :messages="[]" />
```

Posting to an endpoint. The reply goes out as `{ message, ...payload }`. `title-tag`, `placeholder`, `send-label`, `us-label` and `empty-text` adjust the wording, and the `reply-actions` slot adds buttons before Send:

```vue
<CnConversationThread
  title="Contact"
  title-tag="h2"
  placeholder="Write your answer"
  send-label="Send to resident"
  us-label="Municipality"
  empty-text="Nobody has written yet."
  endpoint="/apps/example/api/cases/42/messages"
  :payload="{ channel: 'portal' }"
  :messages="[
    { id: 1, time: '2026-10-04T11:00:00', side: 'us', text: 'We received your request.' },
  ]">
  <template #reply-actions="{ draft }">
    <NcButton :disabled="!draft">Save draft</NcButton>
  </template>
</CnConversationThread>
```
