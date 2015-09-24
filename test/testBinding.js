var runtime = require('../index');

var plugins = runtime.resolvePlugins([
	__dirname + '/plugins'
], null, null, {
	bindings: {
		"example_service": "example"	// bind example_service to "example" plugin
	}
});

runtime.start(__dirname, plugins.config, function() {
	console.log('Usage:')
	for (var i = 0; i < plugins.help.length; i++) {
		console.log(plugins.help[i]);
	}
});