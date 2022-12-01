window.includer.once();

window.include("./file4.js");
window.include("file5.js");

window.includer.ready(function(){
	
	O4.log();
	O5.log();

	window.O2 = new function() {
		this.log = function() {
			console.log("I am O2");
		}
	}
});

window.includer.ready(function(){
	
	console.log("another ready callback...");
});