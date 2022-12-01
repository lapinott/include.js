window.includer.once();

window.include("dir1/file2.js");
window.include("file6.js");//before or after file3, doesn't break anything
window.include("dir1/file3.js");
window.include("file6.js");
//window.include("file1.js");//cross-ref

for (var i = 0; i < 10; i++) {
	window.include("file9.js");//counter increment | comment/uncomment includer.once() in file9.js to see the results
}

window.includer.ready(function(){
	
	O6.log();
	O2.log();
	O3.log();
	O7.log();

	window.O1 = new function() {
		this.log = function() {
			console.log("I am O1");
		}
	}
});