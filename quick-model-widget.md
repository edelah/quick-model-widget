# DSH quick model widget

The widget source is in [`quick-model-widget.js`](./quick-model-widget.js).

It is a Client-side UI addition to DSH's existing model-selection package, not a separate Cordis plugin package. The running GUI currently loads the patched compiled bundle at:

`/usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-model-selection/lib/client.js`

The source file in this folder is the readable version of the widget logic and styling. The installed bundle is the runtime copy because this DSH installation exposes the compiled package rather than its original package workspace source.
