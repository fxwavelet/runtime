module.exports = function(options, imports, register) {
	var example = imports.example_service;

	example.print();

  register();
};