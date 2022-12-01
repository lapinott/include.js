window.includer.once();

window.include("file6.js");

window.includer.ready(function(){
	
	O6.log();

	window.O3 = new function() {
		this.log = function() {
			console.log("I am O3");
		}
	}
});