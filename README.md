# VSCode Web Extension incorporating Rust WASM

After fighting for a long time with webpack to get it to generate WASM loading code that would work with `vscode` web extensions (see https://code.visualstudio.com/api/extension-guides/web-extensions#web-extension-main-file for why this is non-trivial), I understood that I will need to change the `webpack` WASM loading code. I even found [documentation](https://webpack.js.org/configuration/output/#outputwasmloading) saying it's possible. When I tried, I got an error message saying I just need to call `EnableWasmLoadingPlugin.setEnabled()`, which was very encouraging, however, I couldn't find a way to do that, so I had to patch `webpack` to export it. PR submitted.

To install:

```
git submodule add -b enable-wasm-loader https://github.com/SonOfLilit/webpack
npm i ./webpack
npm i vscode-web-wasm-webpack-plugin
```

In `webpack.config.js`:

```javascript
const wasmPlugin = require("vscode-web-wasm-webpack-plugin");

const webExtensionConfig = {
...
  output: {
    ...
    enabledWasmLoadingTypes: ["async-vscode"],
    wasmLoading: "async-vscode",
  },
  plugins: [
    ...
    new wasmPlugin.ReadFileVsCodeWebCompileAsyncWasmPlugin(),
  ],
...
```

In `web/extension.ts`:

```typescript
export function activate(context: vscode.ExtensionContext) {
  __webpack_public_path__ =
    context.extensionUri.toString().replace("file:///", "") + "/dist/web/";
  // ..

  // the require() must happen after __webpack_public_path__ has been set, so can't happen in the global scope, but it doesn't have to be in this function
  require("rust-wasm").then((rust: any) => {
    vscode.window.showInformationMessage(rust.greet());
  });

  // ..
}
```

If you use typescipt, you will want to add `webpack` to `tsconfig.json`'s exclude list:

```
...
	"exclude": [
		"node_modules",
		"webpack",
		".vscode-test"
	]
...
```

## Talk to me

This was the longest task in the history of my Regex Syntax for Humans project, [Kleenexp](https://github.com/SonOfLilit/kleenexp), longer that writing the compiler or porting it to rust or writing a vscode extension. It took almost a week of banging my head against the wall to find a way to achieve this. So if this was useful to you, please drop me a word to help me feel like I was doing something useful :-)
