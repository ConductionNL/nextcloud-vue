# DYNAMIC_KEY_PREFIX

The prefix that namespaces a data-driven field's key inside form data: `'x-prop:'`. A full key is the prefix plus the definition record's id.

```js
import { DYNAMIC_KEY_PREFIX } from '@conduction/nextcloud-vue'

formData[`${DYNAMIC_KEY_PREFIX}${definition.id}`] = 50000
```

Definition records are named by a functional admin, so a definition called `title` or `status` is not merely possible but likely. Without the namespace it would overwrite the real schema property of that name, silently, since a form has no way to tell the two apart once they share a key. Keying by id rather than name also means a definition can be renamed without orphaning the answers already stored against it.

See [fields the data decides](dynamic-form-fields.md).
