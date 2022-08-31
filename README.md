# VSCode Web Extension incorporating Rust WASM

After fighting for a long time with webpack to get it to generate WASM loading code that would work with `vscode` web extensions (see https://code.visualstudio.com/api/extension-guides/web-extensions#web-extension-main-file for why this is non-trivial), I understood that I will need to change the `webpack` WASM loading code. I even found [documentation](https://webpack.js.org/configuration/output/#outputwasmloading) saying it's possible. When I tried, I got an error message saying I just need to call `EnableWasmLoadingPlugin.setEnabled()`, which was very encouraging, however, I couldn't find a way to do that, so I had to patch `webpack` to export it. PR submitted.

Here is the plugin I wrote, in case anyone googles how to do the same, with patched Webpack included.

This was the longest task in the history of my Regex Syntax for Humans project, [Kleenexp](https://github.com/SonOfLilit/kleenexp). It took almost a week of banging my head against the wall to find a way to achieve this. So if this was useful to you, please drop me a word to help me feel like I wasn't just wasting my time :-)
