module.exports = function(options, imports, register) {
	var argv = options.argv;

	var name = argv.example_name || options.name || 'Anonymous';


  console.log('Hello World!!', name);

  register();
};