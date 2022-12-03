# include.js

### NOTE: This project is *not* open sourced and is uploaded here for showcase value. If you would like to use it, send me an email <a href="mailto:julien@turtlespeak.net?subject=include.js">here</a> and I will send you a licensed copy. This code is protected by a md5 fingerprint. Reverse lookup will tell me who you claim you are, and if you are not who you claim you are, that's an issue. :-)
### You are allowed to download this code and run the samples - for further usage, <a href="mailto:julien@turtlespeak.net?subject=include.js">send me an email</a>.

***

<em>include.js is a professional-grade javascript includer for javascript and css files that behaves (mostly) like the c/c++ `#include` directive.</em>

The current include context for a file is determined by using `document.currentScript` and adding an index parameter to the script url. This data is used to build a dependency tree. User code *must* be wrapped in `includer.ready(...)` after the include directive(s). It is the only way to delay user code execution until dependecies are loaded. Ready callbacks are then executed along the dependency tree.

Have a look at `example/example.html` to see include.js in action (or inspect the <a href="example/output.png" title="output">output</a> directly).

***

<em>NOTE on `file://` relative paths</em>

Relative path lookup is enabled by default for the `file://` url scheme (and only for that scheme). Relative paths in include directives are always relative to the html document that runs the include.js script. This is because it is the file to which additional `<script>` elements will be appended. It will therefore serve as base for relative path resolving in your browser or application.

***

### main features

- <strong>recursion:</strong> an included file can include more files.
- <strong><em>once</em> directive:</strong> files can be tagged with `window.includer.once()` to set an include guard for that file.
- <strong>url protocols:</strong> supports any protocol natively supported by the html script element (`file://`, `https://`, etc...).
- <strong>late inclusions:</strong> include directives can be fired at runtime after page load.
- <strong>root token:</strong> a root token can be set and used in `file://` urls for absolute or relative path resolving.

### not a feature
- additional include paths.

### objects
- `window.includer`: the main include.js object.
- `window.includer.internal.`
	- `url`: an url object.
	- `file`: file abstraction, identified by url.
	- `node_id`: an include node id, uniquely determined by a file and index.
	- `node`: an include node, identified by node_id.

### relationship between objects
- `file`-`url`:	[1-1]
- `node_id`-`file`:	[n-1]
- `node`-`node_id`:	[1-1]

### public functions
- `window.includer.set_root("absolute-or-relative-path-string")`
	- sets a root path for file urls. The `$(root)` token can then be used in file urls.
- `window.includer.set_file_urls_relative_path_matching(bool)`
	- enables or disables relative path matching for file urls. Enabled by default.
- `window.includer.set_collapsed(bool)`
	- collapses or opens the include.js console output. Enabled by default.
- `window.includer.set_print_weak_match_warnings(bool)`
	- print or dont print a warning when file urls are matched with their relative paths. Disabled by default.
- `window.includer.include("url")`
	- the main include.js function. Takes only 1 argument.
- `window.includer.once()`
	- tags a file to be included only once. Takes no arguments.

### shortcut function
- `window.include("url");`
	- calls `window.includer.include("url")`