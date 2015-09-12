/**
 * start the runtime
 * @param home  the home path of your application, usually pass __dirname in your app entry js
 * @param configuration architect config path, could be a requirable folder/js/json or an object, or a function that returns config object
 * @param printUsage  [option] function to print your application usage
 */
var argv = require('minimist')(process.argv.slice(2));

var packageJson = require('./package.json');

global._runtimeVersion = packageJson.version;

function start(home, configuration, printUsage) {
  global.home = home;
  global._home = home;

  var path = require('path');
  var architect = require('architect');

  /* inject application arguments */
  if (argv.h) {
    if (printUsage) {
      printUsage();
    }
    console.log();
    console.log('Runtime options:');
    console.log('-c config, the architect config file path');
    console.log('-d debug, enable debug');
    console.log('-h help, print usage');
    console.log();
    return;
  }

  var config = './config.json'; // default config file
  if (argv.c || typeof configuration == 'string') {
    config = require(argv.c || home + '/' + configuration);
  } else if (typeof configuration == 'function') {
    config = configuration();
  } else if (typeof configuration == 'object') {
    config = configuration;
  }

  var tree = architect.resolveConfig(config, home);
  for (var i = 0; i < tree.length; i++) {
    tree[i].argv = argv;
  }

  /* run application */
  var architectApp = architect.createApp(tree, function (err, app) {
    if (err) {
      console.log(err);
    }
  }).on('error', function (err) {
    console.error(err.stack);
  });
  global.runtime = architectApp;
  global._runtime = architectApp;

  /* analyse plugin dependency for dev tool */
  if (argv.d) {
    // _serviceToPlugin and _plugins global variables are only available when debug mode is enabled
    global._serviceToPlugin = {};
    global._plugins = {};

    var servicesBuf = [];
    architectApp
      .on('plugin', function (plugin) {
        console.info('registering plugin', plugin.packagePath);

        var pluginName = path.basename(plugin.packagePath);
        // update service to plugin map
        for (var i = 0; i < servicesBuf.length; i++) {
          global._serviceToPlugin[servicesBuf[i]] = pluginName;
        }

        // update plugins
        global._plugins[pluginName] = plugin;

        servicesBuf = [];
      }).on('service', function (name, service) {
        servicesBuf.push(name);
        console.info('registering service', name);
      });
  }
}

function resolvePlugins(searchPaths, config, help, filter) {
  if (!config) {
    config = {};
  }

  if (!help) {
    help = {};
  }

  var bindings = {};
  var dependencies = {};

  for (var i = 0; i < searchPaths.length; i++) {
    searchPluginInPath(bindings, dependencies, config, help, searchPaths[i], filter);
  }

  // find unbinded plugins and remove them
  if (filter.binding) {
    for (var key in filter.bindings) {
      // remove unused plugin from config
      if (!bindings.hasOwnProperty(key)) {
        if (argv.d) {
          console.log('Service', key, 'is not found in plugin!');
        }
        continue;
      }
      for (var i = 0; i < bindings[key].length; i++) {
        if (bindings[key][i] != filter.bindings[key]) {
          delete config[bindings[key][i]];
        }
      }

      bindings[key] = [filter.binding[key]];
    }
  }

  if (filter.apps) {
    for (var key in config) {
      if (config.hasOwnProperty(key) && (key.indexOf('fx-red') == 0)) {
        filter.apps.push(key);
      }
    }
  }

  if (filter.apps) {
    for (var i = 0; i < filter.apps.length; i++) {
      traverse(config, dependencies, bindings, filter.apps[i], function (plugin) {
        if (!plugin.hasOwnProperty('ref')) {
          plugin.ref = 1;
        } else {
          plugin.ref++;
        }
      })
    }
  }

  // generate output config
  var outputConfig = [];
  for (var key in config) {
    if (config.hasOwnProperty(key) && config[key].hasOwnProperty("packagePath")) {
      if (filter.apps && (!config[key].ref || config[key].ref == 0) && key.indexOf('fx-red') != 0) {
        if (argv.d) {
          console.warn('Remove unreferenced plugin:', key);
        }
        continue;
      }
      outputConfig.push(config[key]);
    }
  }

  // generate output help
  var outputHelp = [];
  for (var key in help) {
    if (help.hasOwnProperty(key)) {
      outputHelp.push(key + ": " + help[key]);
    }
  }

  return {
    config: outputConfig,
    help: outputHelp,
    bindings: bindings,
    dependencies: dependencies
  };
}

function searchPluginInPath(bindings, dependencies, config, help, searchPath, filter) {
  var argv = require('minimist')(process.argv.slice(2));

  var fs = require('fs');
  var path = require('path');

  var folders = fs.readdirSync(searchPath).filter(function (file) {
    if (fs.statSync(path.join(searchPath, file)).isDirectory()) {
      if (!filter) {
        return true;
      }

      return (!filter.whiteList || filter.whiteList.indexOf(file) >= 0)
        && (!filter.blackList || filter.blackList.indexOf(file) < 0 );
    } else {
      return false;
    }
  });

  var packageFile = null;
  var packageJson = null;
  for (var i = 0; i < folders.length; i++) {
    var file = folders[i];
    packageFile = path.join(searchPath, file, 'package.json');

    if (config.hasOwnProperty(file)) {
      if (argv.d) {
        console.log('Config already exists for plugin: ', path.join(searchPath, file));
      }
    }

    if (fs.existsSync(packageFile)) {
      packageJson = require(packageFile);
      if (packageJson.hasOwnProperty('plugin')) {
        // resolve bindings and dependencies
        if (packageJson['plugin'].hasOwnProperty('provides')) {
          for (var j = 0; j < packageJson['plugin']['provides'].length; j++) {
            var service = packageJson['plugin']['provides'][j];
            if (!bindings.hasOwnProperty(service)) {
              bindings[service] = [];
            }

            bindings[service].push(file);
          }
        }

        if (packageJson['plugin'].hasOwnProperty('consumes')) {
          dependencies[file] = packageJson['plugin']['consumes'];
        }

        // resolve plugin config
        if (packageJson.hasOwnProperty('plugin-config')) {
          if (!config.hasOwnProperty(file)) {
            config[file] = packageJson['plugin-config'];
          } else {
            copyProperty(packageJson['plugin-config'], config[file], false);
          }
          config[file].packagePath = path.join(searchPath, file);
        } else {
          if (!config.hasOwnProperty(file)) {
            config[file] = {};
          } else {
            copyProperty(packageJson['plugin-config'], config[file], false);
          }
          config[file].packagePath = path.join(searchPath, file);
        }

        // resolve plugin help
        if (packageJson.hasOwnProperty('plugin-args')) {
          var args = packageJson['plugin-args'];
          for (var arg in args) {
            if (args.hasOwnProperty(arg)) {
              if (help.hasOwnProperty(arg)) {
                if (argv.d) {
                  console.log('skip duplicated argument definition, ', arg);
                }
                continue;
              }
              help[arg] = args[arg];
            }
          }
        }
      }
    }
  }
}

function copyProperty(src, dest, override) {
  for (var key in src) {
    if (src.hasOwnProperty(key)) {
      if (override) {
        dest[key] = src[key];
      } else {
        if (!dest.hasOwnProperty(key)) {
          dest[key] = src[key];
        }
      }
    }
  }
}

// traverse the dependency tree from root plugin
function traverse(config, dependencies, bindings, root, visit) {
  // a stack
  var stack = new Array();
  stack.push(root);

  while (stack.length > 0) {
    var plugin = stack.pop();

    visit(config[plugin]);

    // get all children
    if (!dependencies.hasOwnProperty(plugin)) {
      console.error('Could not find plugin', plugin);
      break;
    }
    var consumes = dependencies[plugin];

    for (var i = 0; i < consumes.length; i++) {
      if (!bindings.hasOwnProperty(consumes[i]) || bindings[consumes[i]].length == 0) {
        console.error('Could not find service implementation', consumes[i]);
        break;
      }

      stack.push(bindings[consumes[i]][0]);
    }
  }
}

module.exports = {
  start: start,
  resolvePlugins: resolvePlugins
};