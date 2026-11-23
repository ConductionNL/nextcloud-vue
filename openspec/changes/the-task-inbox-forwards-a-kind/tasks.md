# Tasks: the-task-inbox-forwards-a-kind

- [x] 1.1 `kind` joins `ALLOWED_PARAMS` in `useTaskInboxStore`, with the
  reason beside it.
- [x] 1.2 The `tasks` source declares `kind` in `searchFields`, single-valued.
- [x] 2.1 Jest: the kind is forwarded, an unknown key is still dropped, and
  the sidebar field maps onto the argument.
