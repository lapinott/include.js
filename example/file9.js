window.includer.once();
window.include("file8.js");

++window.counter;

window.includer.ready(function(){
	++window.counter;
	console.log("the counter is: " + window.counter);
});