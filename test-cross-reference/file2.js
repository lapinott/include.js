window.include("file1.js", null, true);//cross reference

window.includer.ready(function(){
	
	window.O2 = new function() {
		
		this.print = function() {
			console.log("O2");
		}
	}
	
	O1.print();//cannot print cross-referenced object
});