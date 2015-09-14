README.md

# fx-runtime 

(runtime)

## Description
**Wavelet** runtime, manages plugins and services. It provides an easy way to find/load plugins in repository.

More about *plugin*, see [Architect](https://github.com/c9/architect).

All plugins are defined in a config file, **Wavelet runtime** provides several ways to load plugins:

- from a config file
- from an array object
- from a function
- resolve config from repository

## API

### runtime.start([String] dir, [String | function | object] config, [function] help)

start application with plugins defined in config

### runtime.resolvePlugins([Array of String] searchPaths, [object] config, [object] help, [object] filter)

resolve plugins from search paths

### runtime.help()

print runtime help


## Usage
Load plugin config file from a config file.
`````javascript
var runtime = require('fx-runtime');
var dir = __dirname; // reference dir for config and plugins
var config = 'your config file, related to your home';

runtime.start(dir, config, function() {
    console.log('Usage: yourapp [Options]');
    console.log('Options:');
    // TODO: add you options here
    console.log('');
});
`````

You can also pass an array object to as the config
`````javascript
var runtime = require('fx-runtime');
var dir = __dirname; // reference dir for config and plugins
var config = [
    {
        packagePath: "plugin A's package path",
        // other options here
    },
    {
        packagePath: "plugin B's package path",
        // other options here
    }
];

runtime.start(dir, config, function() {
    console.log('Usage: yourapp [Options]');
    console.log('Options:');
    // TODO: add you options here
    console.log('');
});
`````

Config argument could be a function too:
`````javascript
var runtime = require('fx-runtime');
var dir = __dirname; // reference dir for config and plugins
var function getConfig() { 
    return [
        {
            packagePath: "plugin A's package path",
            // other options here
        },
        {
            packagePath: "plugin B's package path",
            // other options here
        }
    ]
};

runtime.start(dir, getConfig, function() {
    console.log('Usage: yourapp [Options]');
    console.log('Options:');
    // TODO: add you options here
    console.log('');
});
`````

Automatically resolve config and help
`````javascript
var runtime = require('fx-runtime');

var defaultConfig = require('./config.json');

var pluginPaths = [
    __dirname + '/node_modules'
];

var preDefinedHelp = {
  "--help": "print help"
  // other help information
};

var filter = {
  "whiteList": [], // plugin white list, or set it to null
  "blackList": [] // plugin black list, or set it to null
}

var plugins = runtime.resolvePlugins(pluginPaths, defaultConfig, preDefinedHelp, filter);

runtime.start(__dirname, plugins.config, function() {
    console.log('Usage: wavelet [optins]');
    console.log('Options:');
    // TODO: add your options here

    console.log('Plugin Options:');

    for (var i = 0; i < plugins.help.length; i++) {
        console.log(plugins.help[i]);
    }
    
    console.log('');
});
`````



## Registered global variables
**Wavelet** runtime registers several global variables, you need to avoid overriding them. All global variables have a prefix underscore **_**

### Variable: _runtimeVersion
[String] The runtime version

### Variable: _home 
[String] The location where wavelet is installed, **_home** will be used to locate the config file, the plugins and other resources

### Variable: _runtime
[Object] **_runtime** provides runtime APIs:

#### _runtime.getService([string] service)
get the instance of service or null if not found. Do not use this api unless you have to. This api breaks the plugin dependencies. Best practice: Depend on a plugin that provides this service.

#### _runtime.resolvePlugins([array] searchPath, [object] defaultConfig, [object] defaultHelp)
search plugin configurations and help informations in the search path array. The plugin configuration is defined in package.json file as "plugin-config". The plugin arguments is defined in package.json file as "plugin-args". This API returns an object with two properties: 

- config: the config of plugins
- help: the argument description of plugins

You can pass *config* as the second parameter of *runtime.start*. And print the help out in the third argument of *runtime.start*

Example of plugin package.json file:
`````json
{
  "name": "testPlugin",
  "version": "0.0.1",
  "main": "./index.js",
  "engines": {
    "node": "0.12.*"
  },
  "dependencies": {},
  "plugin": {
    "consumes": [
      "config"  // consume config service
    ],
    "provides": [
      "testService"    // provides testService service
    ]
  },
  "plugin-config": {
    "configString": "StringValue",  // a string config
    "configObject": {
        // this is an object config
    }
  },
  "plugin-args": {
    "--dev": "enable dev mode" // a help message
  }
}

`````


## Plugin
**Wavelet** is based on [architect](https://github.com/c9/architect), and provides additional APIs and tools. An architect plugin could be directly used in **Wavelet**. 

### service
A plugin could **consume** services provided from other plugins, and **provides** services to others.

You can use the online **Wavelet** service registry to find services and the plugins that implement it.
