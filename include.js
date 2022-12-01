//include.js
//Copyright (c) 2022 Julien Matthey
//All rights reserved
//Fingerprint: c4363eaab61389de8af4215270bd3d7f

/*
	An includer for .js and .css files.
	
	This code is protected by a md5 fingerprint. Reverse lookup will tell me who you claim you are,
	and if you are not who you claim you are, that's an issue. :-)
	
	If you would like a licensed copy (free or paid), you can contact me here: julien@turtlespeak.net
*/

window.includer = new function() {
	var instance = this;
	
	//private
	{
		this.internal = {};
		
		//url stuff
		{
			this.internal.url_tokens = {
				"$(root)": null,
			};
			
			this.internal.set_url_token = function(token, value) {
				if (instance.internal.url_tokens[token] !== undefined) {
					instance.internal.url_tokens[token] = value;
					return true;
				}
				else
					return false;
			}
			
			this.internal.expand_url = function(url) {
				for (var token in instance.internal.url_tokens) {
					if (url.indexOf(token) !== -1) {
						var replace = instance.internal.url_tokens[token];
						if (replace == "" || replace === null || replace === undefined) //do not allow !!false tokens
							throw "include.js: tried to use unset url token \"" + token + "\".";

						url = url.replace(token, replace);
					}
				}
				var match = new RegExp("\\$\\(.+\\)").exec(url);//check for unexpanded token
				if (match !== null)
					throw "include.js: unexpanded url token \"" + match[0] + "\" in url \"" + url + "\".";
				
				return url;
			};
		}
			
		/*
			url object, constructed with an url string
		*/
		this.internal.url = function(url_s) {
			var instance_ = this;
			this.url_s = instance.internal.expand_url(url_s);//only for relative file:// paths but ok...
			
			this.scheme = null;
			this.path = null;
			this.path_absolute = null;
			this.path_relative = null;
			
			this.filename = null;
			this.extension = null;
			this.parent_path = null;
			
			;(function(){//fetch
				var regexp_str =				//taken from urlfs::urlfs_url_t
					"(\\w[\\w\\d\\+\\.-]*)://"	//scheme
				regexp_str +=
					"((.+?)@)?"					//user
				regexp_str +=
					"([^:/\\?#\\r\\n]+)?"		//host==authority
				regexp_str +=
					"(:(\\d+))?"				//port
				regexp_str +=
					"(/([^\\?#\\r\\n]*))?"		//path
				regexp_str +=
					"(\\?([^#\\r\\n]*))?"		//query
				regexp_str +=
					"(#(.*))?"					//fragment
					
				var re = new RegExp(regexp_str);
				var match = re.exec(instance_.url_s);
				if (match === null) {//scheme-less ~url_s are assumed to use the "file" protocol
					instance_.scheme = "file";
					instance_.path = instance_.url_s === "" ? "anonymous" : instance_.url_s;
				}
				else {
					instance_.scheme = match[1];
					instance_.path = match[8];//root char stripped
				}
				
				instance_.filename = instance_.path.split("/").pop().split("\\").pop();
				var split = instance_.filename.split(".");
				instance_.extension = split.length === 1 ? "" : split.pop();
				var tree = instance_.path.split("/");
				if (tree.length === 1) tree = tree[0].split("\\");
				instance_.parent_path = tree.slice(0, -1).join("/");
			})();
			
			;(function(){//path relative or absolute
				var regexp_str =
					"^(\\w:)?/";//works for windows and *nix
				
				var re = new RegExp(regexp_str, "i");
				var match = re.exec(instance_.path);
				instance_.path_absolute = match !== null;
				instance_.path_relative = !instance_.path_absolute;
			})();
			
			this.get = function() {//returns url_s or path for "file" urls
				if (instance_.scheme === "file")
					return instance_.path;
				else
					return instance_.url_s;
			}
			
			//matching
			{
				this.strong_match = function(url) {
					return url.scheme === instance_.scheme && url.path === instance_.path;
				}
				
				this.weak_match = function(url) {
					if (url.filename === instance_.filename) {//filename matching for "file://" only
						if (instance.internal.options.print_weak_match_warnings)
							console.warn("\"" + instance_.url_s + "\" weak matched against \"" + url.url_s + "\"");
						return true;
					}
					else
						return false;
				}
				
				this.match = function(url) {
					if (instance.internal.options.file_urls_relative_path_matching && "file" === instance_.scheme && "file" === url.scheme && (instance_.path_relative || url.path_relative))
						return url.weak_match(instance_);
					else
						return url.strong_match(instance_);
				}
			}
		}
		
		/*
			files represent a file resource and are uniquely identified by their url
		*/
		this.internal.file = function(url) {
			var instance_ = this;
			
			this.filename = url.filename;//debug view
			this.url = url;
			this.is_once = false;//can only be determined after the file was loaded and parsed
			this.include_count = 0;
			
			instance.internal.files.push(this);
		}
		
		this.internal.files = [];//debug view
		
		/*
			node_ids represent an include node id and are uniquely determined by their file and index
		*/
		this.internal.node_id = function(file, index) {
			var instance_ = this;
			
			this.file = file;
			this.index = index;//index for multiple inclusions
			this.filename = this.file.url.filename;//debug view
			
			//matching
			{
				this.strong_match = function(node_id) {
					return instance_.index == node_id.index && instance_.file.url.strong_match(node_id.file.url);
				}
				this.weak_match = function(node_id) {
					return instance_.index == node_id.index && instance_.file.url.weak_match(node_id.file.url);
				}
				this.match = function(node_id) {
					return instance_.index == node_id.index && instance_.file.url.match(node_id.file.url);
				}
			}
		}
			
		/*
			nodes represent an include node and are uniquely identified by their node_id
		*/
		this.internal.node = function(node_id) {
			var instance_ = this;
			
			this.id = node_id;//=identity
			this.filename = this.id.file.url.filename;//debug view
			this.parent = null;
			this.children = [];
			this.ready_callbacks = [];
			
			this.count = {
				ready_callbacks_exec: 0, ready_callbacks_error: 0,
			};
			
			this.time = {
				append: 0, load: 0, load_error: 0, delta: 0,
			};
			
			this.on = {
				load: function(){}, error: function(){},//set as Promise resolve/reject functions
			};
			
			this.is = {
					processed/*=loaded or load_error*/: false, loaded: false, load_error: false, cross_ref_error: false, include_guarded: false, ready: false/*ready callbacks handled*/, js_callback_error: false,
			};
			
			/*
				recursive node search function, matching on node_id
				returns exactly 1 node or null
			*/
			this.search = function(node_id) {
				if (instance_.id.match(node_id)) {
					return instance_;
				}
				else {
					for (var c = 0; c < instance_.children.length; c++) {
						var node = instance_.children[c].search(node_id);
						if (node !== null)
							return node;
					}
					return null;
				}
			}
			
			/*
				recursive file search function, matching on url
				returns exactly 1 file or null
			*/
			this.search_file = function(url) {
				if (instance_.id.file.url.match(url)) {
					return instance_.id.file;
				}
				else {
					for (var c = 0; c < instance_.children.length; c++) {
						var file = instance_.children[c].search_file(url);
						if (file !== null)
							return file;
					}
				}
				return null;
			}
			
			/*
				recursive url search function, matching on url
				returns the number of matches
			*/
			this.search_url = function(url, carry) {
				carry = carry === undefined ? {matches:0} : carry;
				
				if (instance_.id.file.url.match(url)) {
					carry.matches++;
				}
				
				for (var c = 0; c < instance_.children.length; c++)
					instance_.children[c].search_url(url, carry);
				
				return carry.matches;
			}
			
			/*
				returns the largest index set for a file
				if the file can't be found, returns -1
			*/
			this.last_index = function(url) {
				return instance_.search_url(url) - 1;
			}

			/*
				recursive file search function in self and parents, matching on file
				returns true if the file is found
			*/
			this.has_file = function(file) {
				if (instance_.id.file.url.match(file.url))
					return true;
				
				if (instance_.parent !== null && instance_.parent.has_file(file))
					return true;

				return false;
			}
			
			/*
				recursive load_error function in self or childs
			*/
			this.load_error = function() {
				for (var c = 0; c < instance_.children.length; c++) {
					if (instance_.children[c].load_error())
						return true;
				}
				
				return instance_.is.load_error;
			}
			
			/*
				recursive cross_ref_error function in self or childs
			*/
			this.cross_ref_error = function() {
				for (var c = 0; c < instance_.children.length; c++) {
					if (instance_.children[c].cross_ref_error())
						return true;
				}
				
				return instance_.is.cross_ref_error;
			}
			
			/*
				recursive callback error count
			*/
			this.callback_error_count = function(carry) {
				carry = carry === undefined ? {count:0} : carry;
				
				carry.count += instance_.count.ready_callbacks_error;
				for (var c = 0; c < instance_.children.length; c++)
					instance_.children[c].callback_error_count(carry);
				
				return carry.count;
			}
			
			/*
				recursive ready function in self and childs
			*/
			this.ready = function() {
				for (var c = 0; c < instance_.children.length; c++) {
					if (!instance_.children[c].ready())
						return false;
				}
				return instance_.is.ready;
			}
			
			/*
				recursive ready function in childs
			*/
			this.cready = function() {
				for (var c = 0; c < instance_.children.length; c++) {
					if (!instance_.children[c].ready())
						return false;
				}
				return true;
			}
			
			/*
				callbacks execution function. ignores callbacks if self or child
				have load_error or cross_ref_error
			*/
			this.execute_ready_callbacks = function() {
				if (!instance_.load_error() && !instance_.cross_ref_error()) {
					for (var c = 0; c < instance_.ready_callbacks.length; c++) {
						console.info("ready callback fired in \"" + instance_.id.file.url.filename + "\"");
						try {//run user code and catch error(s)
							++instance_.count.ready_callbacks_exec;
							instance_.ready_callbacks[c]();
						}
						catch(err) {
							instance_.is.js_callback_error = true;
							++instance_.count.ready_callbacks_error;
							console.warn("\"" + instance_.id.file.url.filename + "\": error detected in callback:");
							console.error(err);
						}
					}
				}
				else {
					for (var c = 0; c < instance_.ready_callbacks.length; c++)
						console.warn("ready callback ignored in \"" + instance_.id.file.url.filename + "\"");
				}
			}
			
			/*
				recursive résumé print function
			*/
			this.print = function(level) {
				var l = level === undefined ? 0 : level;
				var hint = ".".repeat(l);
				var message = hint + " " + instance_.id.file.url.filename;
				message += instance_.id.file.include_count > 1 ? ":" + instance_.id.index : "";
				message += instance_.is.loaded ? " | loaded in " + instance_.time.delta.toFixed(1) + "ms" : "";
				message += instance_.is.load_error ? " |%c load_error%c" : "";
				message += instance_.is.include_guarded ? " |%c include guarded%c" : "";
				if (instance_.is.loaded && !instance_.is.include_guarded) {
					message += " | ready callbacks: ";
					message += instance_.ready_callbacks.length !== 0 ? instance_.count.ready_callbacks_exec + "/" + instance_.ready_callbacks.length : "none";
				}
				
				var n = instance_.children.length;
				if (n !== 0) console.group(message);
				else {
					if (instance_.is.load_error) console.log(message, "color:red", "color:inherit");
					else if (instance_.is.include_guarded) console.log(message, "color:#777", "coloe:inherit");
					else console.log(message);
				}
				
				for (var c = 0; c < instance_.children.length; c++)
					instance_.children[c].print(l + 1);
				
				if (n !== 0) console.groupEnd();
			}
			
			/*
				load file data function
			*/
			this.load = function() {
				var de = null;
				switch(instance_.id.file.url.extension) {
					case "js": {
						de = document.createElement("script");
						de.type = "text/javascript";
						de.src = instance_.id.file.url.get() + "?index=" + instance_.id.index;
						//de.async = true;
						break;
					}
					case "css": {
						de = document.createElement("link");
						de.rel = "stylesheet";
						de.type = "text/css";
						de.href = instance_.id.file.url.get();
						//de.async = true;
						break;
					}
					default: {
						instance_.is.processed = true;
						instance_.is.load_error = true;
						instance_.on.error("bad extension");
						break;
					}
				}
				
				if (de !== null) {
					de.onload = function(e) {
						instance_.is.processed = true;
						instance_.is.loaded = true;
						instance_.time.load = window.performance.now();
						instance_.time.delta = instance_.time.load - instance_.time.append;
						instance_.on.load(e);
					}
					de.onerror = function(e) {
						instance_.is.processed = true;
						instance_.is.load_error = true;
						instance_.time.load = window.performance.now();
						instance_.time.delta = instance_.time.load - instance_.time.append;
						instance_.on.error("file not found");
					}
					
					instance_.time.append = window.performance.now();
					document.head.appendChild(de);
				}
			}
		}

		/*
			root node
		*/
		this.internal.root_node = null;

		/*
			current node
		*/
		this.internal.current_node = function() {
			var url = new instance.internal.url(document.currentScript !== null ? document.currentScript.src : "anonymous");
			var file = instance.internal.root_node.search_file(url) || new instance.internal.file(url);
			var last_index = document.currentScript !== null ? document.currentScript.src.split("?index=").pop() : 0;
			var node_id = new instance.internal.node_id(file, last_index);

			return instance.internal.root_node.search(node_id) || instance.internal.root_node;
		}

		/*
			loader
		*/
		this.internal.loader = new function() {
			var instance_ = this;
			
			this.is = {
				loading: false,
			};
			
			this.load_order = [];//debug view
			
			this.time = {
				start:0,//load_next()
				end: 0,//delete root
			};
			
			this.get_next = function(node, carry) {//recursively fetch the next node to load
				carry = carry === undefined ? {node:null} : carry;
				
				if (!node.is.processed) {
					carry.node = node;
				}
				for (var c = node.children.length - 1; c >= 0; c--)//parse in reverse order; the last match is the node we want
					instance_.get_next(node.children[c], carry);
					
				return carry.node;
			}
			
			this.load_next = function() {//load next node; stop when we reached the root node; it doesn't really matter the order we load the nodes in at this point...
				instance_.is.loading = true;
				var node = instance_.get_next(instance.internal.root_node);
				instance_.load_order.push(node.id.file.url.filename);
				if (node === instance.internal.root_node) {//root
					node.is.processed = true;
					node.is.loaded = true;
					instance_.end();
				}
				else//not root
					node.load();
			}
			
			this.start = function() {
				//console.log(document.currentScript);//debug view
				instance_.time.start = window.performance.now();
				instance.internal.options.collapsed ? console.groupCollapsed("loader") : console.group("loader");
				instance_.load_next();
			}
			
			this.bump = function() {
				if (!instance_.is.loading)
					instance_.start();
			}
			
			this.end = function() {
				instance_.is.loading = false;
				instance_.time.end = window.performance.now();
				{
					console.group("load order");
					console.log(instance_.load_order);
					console.groupEnd();
					console.group("node hierarchy");
					instance.internal.root_node.print();
					console.groupEnd();
					console.group("root node:");
					console.log(instance.internal.root_node);
					console.groupEnd();
					console.log("%celapsed time: " + (instance_.time.end - instance_.time.start).toFixed(1) + "ms", "font-weight:bold");
					console.groupEnd();//loader
				}
				
				//executer
				if (!instance.internal.root_node.load_error() && !instance.internal.root_node.cross_ref_error())
					instance.internal.executer.start();
				else {
					instance.internal.shutdown();
					console.warn("load_error(s) and/or cross_ref_error(s) happened. callbacks ignored.");
				}
			}
		}
		
		/*
			executer (callbacks)
		*/
		this.internal.executer = new function() {
			var instance_ = this;
			
			this.execute_order = [];//debug view
			
			this.time = {
				start:0,
				end:0,
			}
			
			this.get_next = function(node, carry) {//recursively fetch the next node to execute
				carry = carry === undefined ? {node:null} : carry;
				
				if (!node.is.ready && node.cready()) {
					carry.node = node;
				}
				for (var c = node.children.length - 1; c >= 0; c--)//parse in reverse order; the last match is the node we want
					instance_.get_next(node.children[c], carry);
					
				return carry.node;
			}
			
			this.execute_next = function() {//recursive execute function
				var node = instance_.get_next(instance.internal.root_node);
				instance_.execute_order.push(node.id.file.url.filename);
				if (node === instance.internal.root_node) {//root
					node.is.ready = true;
					instance_.end();
				}
				else {//not root
					node.execute_ready_callbacks();
					node.is.ready = true;
					instance_.execute_next();
				}
			}
			
			this.start = function() {
				instance_.time.start = window.performance.now();
				instance.internal.options.collapsed ? console.groupCollapsed("executer") : console.group("executer");
				instance_.execute_next();
			}
			
			this.end = function() {
				instance_.time.end = window.performance.now();
				{
					console.group("execute order");
					console.log(instance_.execute_order);
					console.groupEnd();
					console.group("node hierarchy");
					instance.internal.root_node.print();
					console.groupEnd();
					console.group("root node:");
					console.log(instance.internal.root_node);
					console.groupEnd();
					console.log("%celapsed time: " + (instance_.time.end - instance_.time.start).toFixed(1) + "ms", "font-weight:bold");
					console.groupEnd();//executer
					console.log("%ccallback error count: " + instance.internal.root_node.callback_error_count(), "font-weight:bold");
				}
				//finished
				instance.internal.shutdown();
			}
		}
		
		/*
			top level lazy init function
		*/
		this.internal.lazy_init = function() {
			if (instance.internal.root_node === null) {
				instance.internal.root_node = new instance.internal.node(new instance.internal.node_id(new instance.internal.file(new instance.internal.url("root")), 0));
				instance.internal.options.collapsed ? console.groupCollapsed("include.js") : console.group("include.js");
			}
		}
		
		/*
			top level shutdown function
		*/
		this.internal.shutdown = function() {
			var dl = instance.internal.loader.time.end - instance.internal.loader.time.start;
			var de = instance.internal.executer.time.end - instance.internal.executer.time.start;
			{
				console.groupCollapsed("🦄 elapsed time: " + (dl + de).toFixed(1) + "ms");
				console.log("loader: " + dl.toFixed(1) + "ms");
				console.log("executer: " + de.toFixed(1) + "ms");
				console.groupEnd();
				instance.internal.options.collapsed ? console.groupCollapsed("files") : console.group("files");
				console.log(instance.internal.files);
				console.groupEnd();
				console.groupEnd();//include.js
				console.log("have a nice day");
			}
			instance.internal.root_node.execute_ready_callbacks();//root node callbacks out the console groups
			instance.internal.root_node = null;
			instance.internal.loader.load_order = [];
			instance.internal.executer.execute_order = [];
		}
		
		/*
			exceptions
		*/
		this.internal.exceptions = new function(){
			this.internal_error = function(e){this.e = e;};
			this.include_guard = function(e){this.e = e;};
		}
		
		/*
			options
		*/
		this.internal.options = {
			print_weak_match_warnings: true,
			file_urls_relative_path_matching: true,
			collapsed: true,
		};
	}
	
	//public
	{
		this.set_root = function(root) {
			instance.internal.set_url_token("$(root)", root);
		}
		
		this.set_file_urls_relative_path_matching = function(file_urls_relative_path_matching) {
			instance.internal.options.file_urls_relative_path_matching = file_urls_relative_path_matching;
		}
		
		this.set_collapsed = function(collapsed) {
			instance.internal.options.collapsed = collapsed;
		}
		
		this.set_print_weak_match_warnings = function(print_weak_match_warnings) {
			instance.internal.options.print_weak_match_warnings = print_weak_match_warnings;
		}
		
		this.include = function(url_s) {
			instance.internal.lazy_init();
			
			var node_url = new instance.internal.url(url_s);
			var node_file = instance.internal.root_node.search_file(node_url) || new instance.internal.file(node_url);
			var current_node = instance.internal.current_node();
			/*
				cross reference detection
				we need to check this here because it can produce cyclic inclusions
				we set the current node to cross_ref_error
			*/
			if (current_node.has_file(node_file)) {
				current_node.is.cross_ref_error = true;
				console.error("\"" + current_node.id.file.url.filename + "\": cross reference detected: \"" + node_file.url.filename + "\" (include \"" + node_file.url.url_s + "\" ignored)");
			}
			/*
				push new node
			*/
			else {
				var node_last_index = instance.internal.root_node.last_index(node_url);
				var node_id = new instance.internal.node_id(node_file, node_last_index + 1);
				var node = new instance.internal.node(node_id);
				
				node.parent = current_node;
				current_node.children.push(node);
				node.id.file.include_count++;

				new Promise(function(resolve, reject) {
					node.on.load = function(e) { resolve(e); };
					node.on.error = function(e) { reject(e); };
					
					instance.internal.loader.bump();//wake up bruh
				})
				.then(function(e) {//we are guaranteed to have parsed the "include" directives of "node" when "node.on.load" kicks (verified with the debugger)
					console.info("\"" + current_node.id.file.url.filename + "\": \"" + node.id.file.url.filename + "\" loaded in " + node.time.delta.toFixed(1) + "ms.");
					instance.internal.loader.load_next();
				})
				.catch(function(err) {
					console.error("\"" + current_node.id.file.url.filename + "\": " + "failed to load \"" + node.id.file.url.filename + "\" (" + err + ": \"" + node.id.file.url.url_s + "\")");
					instance.internal.loader.load_next();
				});
			}
		}
		
		this.ready = function(callback) {
			if (instance.internal.root_node === null) {//callbacks defined with no include directives at all
				instance.internal.lazy_init();
				instance.internal.loader.bump();
			}
			else {
				var current_node = instance.internal.current_node();

				current_node.ready_callbacks.push(callback);
				console.info("ready callback registered for \"" + current_node.id.file.url.filename + "\"");
			}
		}
		
		this.once = function() {
			var current_node = instance.internal.current_node();
			
			if (!current_node.id.file.is_once) {//if it's the first call to "once()" for this file, we need to set its is_once flag to true
				current_node.id.file.is_once = true;
			}
			else {//if the flag is set, it means we have to stop execution for this file/node; we also notify the include node
				current_node.is.include_guarded = true;
				throw new instance.internal.exceptions.include_guard("\"" + current_node.id.file.url.filename + "\" is already included.");
			}
		}
	}
}

//shortcut [url_s = url_string]
window.include = function(url_s) {
	window.includer.include(url_s);
}
