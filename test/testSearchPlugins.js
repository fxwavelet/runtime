var runtime = require('../index');

var plugins = runtime.searchPlugins([
	__dirname + '/plugins'
]);


console.log(JSON.stringify(plugins.bindings, null, 4));

console.log(JSON.stringify(plugins.plugins, null, 4));