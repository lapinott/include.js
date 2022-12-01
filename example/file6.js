window.includer.once();

//window.include("file1.js");//cross ref
window.include("file7.js");
window.include("file8.js");
window.include("file4.js");//somewhere else in the hierarchy but not cross-ref
window.include("file8.js");//discarded
//window.include("file88.js");//404
//window.include("an-image.png");//bad extension
window.include("https://code.jquery.com/jquery-3.6.1.js");

window.includer.ready(function(){
	
	O7.log();
	O8.log();
	console.log($);
	
	//an_error(); //this error generates more errors because it prevents O6 to be defined

	window.O6 = new function() {
		this.log = function() {
			console.log("I am O6");
		}
	}
	
	an_error(); //this error is only local to file6
});

out_of_callback_error();//this error can't be caught sadly...