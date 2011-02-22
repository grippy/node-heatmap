# Dependencies
v0.0.1

redis >= 2.0.0
cairo >= 1.10.2

redis-node (v0.4.0) (https://github.com/bnoguchi/redis-node)
node-canvas (0.4.3) (https://github.com/LearnBoost/node-canvas; requires cairo graphics package.)
socket.io-node (0.6.13) (https://github.com/LearnBoost/Socket.IO-node)

# Installation

To install node-heatmap, run these commands:
	
	$ git clone https://github.com/grippy/node-heatmap
	$ cd node-heatmap
		$ git submodule update --init
	$ cd app/node-canvans
		$ git submodule update --init
		$ node-waf configure build

# Application Config

'config/environment.js' contains three sections you can update (development, testing, and production).

	exports.development = {
		redis_db:0,
		redis_host:'127.0.0.1',
		redis_port:6379,
		app_port:8000,
		app_stats_offset:0,
		admin_port:9000
	}

Production also features an additional parameter for spawning a socket slave to serve requests from:

	exports.production = {
	    redis_db:0,
	    redis_host:'127.0.0.1',
	    redis_port:6379,
	    app_port:8000,
		app_slaves:2,
		app_stats_offset:-8,
	    admin_port:9000
		
	}

The number of slaves should be equal to: # processor cores * # processors - 1 (main application listening on the port #8000)
