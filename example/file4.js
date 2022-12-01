window.includer.once();

window.O4 = new function() {
	this.log = function() {
		console.log("I am O4");
	}
}

//ready() useless here but works:
window.includer.ready(function(){
	console.log("file4.js callback (printed)");
});