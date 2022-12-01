window.include("file:///file2.js");
window.include("file1.js");//include self (cross reference)

window.includer.ready(function(){
	
	window.O1 = new function() {
		
		this.print = function() {
			console.log("O1");
		}
	}
	
	O2.print();
});