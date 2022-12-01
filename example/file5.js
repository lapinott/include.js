window.includer.once();

//window.include("file1.js");//cross reference

window.includer.ready(function(){

	window.O5 = new function() {
		this.log = function() {
			console.log("I am O5");
		}
	}
});