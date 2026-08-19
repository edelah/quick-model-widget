# quick-model-widget

A real DSH Web plugin that adds a compact model + reasoning quick-switcher to the composer. It keeps the last three distinct choices in browser `localStorage`.

## Behavior

- Existing choices keep their position when selected.
- New choices append on the right.
- Adding a fourth distinct choice removes the oldest item on the left.
- Each button uses DSH's existing host-backed model selection path.
- The normal full model selector remains available.

## Install from this checkout

```bash
dsh plugin --profile web add link:/home/ubuntu/debug/quick-model-widget
```

Restart the DSH web process, then refresh `http://127.0.0.1:3080`.

## Install from GitHub

After publishing this folder to a public repository:

```bash
dsh plugin --profile web add github:user/quick-model-widget
```

or:

```bash
dsh plugin --profile web add git+https://github.com/user/quick-model-widget.git
```

The package declares both `dsh.bundle` (to add its row to the profile) and `dsh.client` (to serve and load the browser bundle).

## Remove

```bash
dsh plugin --profile web remove quick-model-widget
```

Restart DSH after adding or removing a profile plugin.

## Files

- `src/client.js` — readable Client plugin source.
- `lib/client.js` — browser bundle loaded by DSH.
- `lib/index.js` — no-op Host half required by DSH composition.
- `cordis.patch.yml` — profile row added during installation.
- `quick-model-widget.js` — reusable selection/history helpers.
