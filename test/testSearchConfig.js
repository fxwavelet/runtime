var runtime = require('../index');

var plugins = runtime.resolvePlugins([
	__dirname + '/plugins'
]);

runtime.start(__dirname, plugins.config, function() {
	console.log('Usage:')
	for (var i = 0; i < plugins.help.length; i++) {
		console.log(plugins.help[i]);
	}
});