# DSH quick model widget

The widget is a standalone DSH Web plugin package in this folder.

- Readable Client plugin: [`src/client.js`](./src/client.js)
- Browser bundle: [`lib/client.js`](./lib/client.js)
- Profile bundle patch: [`cordis.patch.yml`](./cordis.patch.yml)
- Package manifest: [`package.json`](./package.json)

The plugin uses DSH's public `session.models` and `session.selectModel` APIs, registers in `conversation.input.right`, and leaves the built-in model selector untouched.
