var http = require('http'),
    sys = require('sys'),
    fs = require('fs'),
    url = require('url'),
    qs = require("querystring"),
    io = require('./app/socket.io-node/'),
    Template = require('./app/template').Template,
    views = require('./app/template').views,
    Canvas = require('./app/node-canvas');



/*////////////////////////////////////////////////////////////////////////////////*/
/* grab the config */
var config = require('./app/config').init()
var redis = config.redis

/*////////////////////////////////////////////////////////////////////////////////*/
/* helper functions */

function watch_files(){
    sys.puts("=> Watching files") 
	var watch = require('./app/autoexit').watch;
	watch(__dirname,".js", function(){sys.puts('=> JS File changed. Restarting...')});
	watch(__dirname,".html", function(){sys.puts('=> HTML File changed. Restarting...')});
}
/*////////////////////////////////////////////////////////////////////////////////*/
/* static files */
var static_jquery = fs.readFileSync("static/jquery-v1.4.4.js").toString();
var re_static_heatmaps = new RegExp('/static/heatmaps/[a-zA-Z0-9%]*.png')

server = http.createServer(function(req, res){ 
    // your normal server code 
    sys.print(new Date().toString() + ' ')
    
        req.addListener('data', function(chunk){})
        req.addListener('end', function(){
            var uri = url.parse(req.url),
                path = uri.pathname,
                params = (uri.query != undefined) ? qs.parse(uri.query) : {};
                sys.print(path + ' ')
                 if(path=='/static/jquery-v1.4.4.js'){
                     res.writeHead(200, {'Content-Type': 'text/javascript', "Content-Length":static_jquery.length}); 
                     res.write(static_jquery)
                     res.end()
                 } else if (path == '/favicon.ico') {
                    res.writeHead(200, {'Content-Type': 'image/vnd.microsoft.icon'}); 
                    res.write('')
                    res.end()
                } else if (re_static_heatmaps.test(path)) {
                    var fn = path.replace('/', '')
                    var file = fs.readFileSync(fn).toString();
                    res.writeHead(200, {'Content-Type': 'image/png', "Content-Length":file.length, 'Cache-Control': 'no-cache'});                     
                    res.write(file)
                    res.end()
                } else if (path == '/heatmap') {
                    
                    redis.hgetall(params.href, function(err, results){
                        
                        if (err) throw err;
                        
                        res.writeHead(200, {'Content-Type': 'text/html'}); 
                        
                        if (results){
                            sys.puts(sys.inspect(results))
                            var grid = new Grid()
                            var x, y, v, coords
                            for (var p in results){
                                coords = p.split(',')
                                x = parseInt(coords[0], 10)
                                y = parseInt(coords[1], 10)
                                v = parseInt(results[p], 10)
                                grid.plot(x, y, v)
                            }
                            grid.render()
                            res.write(views.heatmap.parse({src: grid.png}))

                            // res.writeHead(200, {'Content-Type': 'application/json'})
                            // res.write(JSON.stringify({heatmap:grid.png}))
                            // data:image/png;base64,
                        
                            var heatmap_dir = __dirname + '/static/heatmaps'
                            var file_name = heatmap_dir + '/' + qs.escape(params.href) + '.png'
                            // write file to disk...

                            res.write('<br />local: ')
                            res.write(file_name)
                            res.write('<br />http: ')
                            res.write(file_name.replace(__dirname, ''))
                            var out = fs.createWriteStream(file_name), 
                                stream = grid.canvas.createPNGStream();

                                stream.on('data', function(chunk){
                                    out.write(chunk);
                                });
                                stream.on('end', function(){
                                    out.end();
                                });
                        } else {
                            
                            var Canvas = require('./app/node-canvas')
                              , canvas = new Canvas(320, 320)
                              , ctx = canvas.getContext('2d')
                              , fs = require('fs');

                            // Create gradients
                            var lingrad = ctx.createLinearGradient(0,0,0,150);
                            lingrad.addColorStop(0, '#00ABEB');
                            lingrad.addColorStop(0.5, '#fff');
                            lingrad.addColorStop(0.5, '#26C000');
                            lingrad.addColorStop(1, '#fff');

                            var lingrad2 = ctx.createLinearGradient(0,50,0,95);
                            lingrad2.addColorStop(0.5, '#000');
                            lingrad2.addColorStop(1, 'rgba(0,0,0,0)');

                            // assign gradients to fill and stroke styles
                            ctx.fillStyle = lingrad;
                            ctx.strokeStyle = lingrad2;

                            // draw shapes
                            ctx.fillRect(10,10,130,130);
                            ctx.strokeRect(50,50,50,50);

                            res.write(views.heatmap.parse({src: canvas.toDataURL()}))
                        }
                        sys.print('\n')
                        res.end()
                    })
                    
                } else {
                    res.writeHead(200, {'Content-Type': 'text/html'}); 
                    res.write(views.index.parse({}))
                    sys.print('\n')
                    res.end()
                 }

        })

    
});
server.listen(config.app_port);
  
// socket.io 
var socket = io.listen(server);

socket.on('connection', function(client){

    var sid = client.sessionId;
    // client.broadcast({ announcement: client.sessionId + ' connected' });
    // sys.puts(sys.inspect(client))
    // client.broadcast(client.sessionId + ': connected' );
    
    
    client.on('message', function(m){

        try{
            var msg = JSON.parse(m)
            sys.puts('action: ' + msg.action)
            
            if (msg.action == 'mousemove' || msg.action=='click'){
                
                // add this url to the heatmaps?
                // redis.sismember('heatmaps', msg.href, function(err, success){
                //     sys.puts(err)
                //     if (success == 0){
                //         redis.sadd('heatmaps', msg.href, function(err, success){
                //             sys.puts(err)
                //             sys.puts(success)
                //         })
                //     }
                // })
                var k = msg.ax.toString() + ',' + msg.ay.toString()
                sys.puts(k)
                // bump the grid count for this x,y
                redis.hincrby(msg.href, k, (msg.action=='click') ? 5 : 1)
            } else if(msg.action == 'connection'){
                // redis.setnx(sid, msg.href, function(err, success){
                //     sys.puts(success)
                // })
                // record this connection as a page view
                redis.hincrby('heatmap/pageviews', msg.href, 1)
            }
        } catch(e){
            
        }
    });
    client.on('disconnect', function(h){
        // batch process this session
        
        // delete session id to free up memory
        // redis.del(sid, function(err, success){})
        
        
        
        // client.broadcast(sid + ': disconnected');
        // sys.puts(sid)

        // redis.get(sid, function(err, href){
        //     sys.puts(href)
        //     redis.incr(href, function(err, success){
        //         sys.puts('incr cb')
        //         sys.puts(success)
        //     
        //     
        //         // bump counter
        //     })
        // })
        
        // get the href associated with this session.

        
        
        
    });
});

// watch files?
watch_files()
////////////////////////////////////////////////////////////////////////

function Grid(){
    return this;
}

Grid.prototype = {
    w:0,
    h:0,
    range:0,
    coords:{},
    png:null,
    
    push:function(x, y){
        // do we need to 
        // if (w > this.w) this.w = w;
        // if (h > this.h) this.h = h;
        // this.plot(x, y)
    },
    
    plot:function(x, y, v){
        // see if we need to bump the w or h
        if (x > this.w) this.w=x
        if (y > this.h) this.h=y
        
        // boost the x,y and then fill the spread...
        sys.puts('Plot:' + x + ',' + y)
        var key = x.toString() + ',' + y.toString()
        if (this.coords[key] == undefined) this.coords[key] = 0;
        this.coords[key] += v
        if (this.coords[key] > this.range){
            this.range=this.coords[key]
        }
        // fill the spread
        // for (var i=x-2; i < x+3; i++){
        //     for (var j=y-2; j < y+3; j++){
        //         // if (i>0 && j>0 && i < this.w && j < this.h){
        //             k = i.toString() + ',' + j.toString()
        //             sys.puts('Plot:' + k)
        //             if (this.coords[k] == undefined) this.coords[k] = 0;
        //             if (key != k) this.coords[k] += 1
        //         // }
        //     }
        // }
        
    },
    rgb:function(v){
        var hue_range = this.range / 6
        var blue = hue_range * 1,
            lt_blue = hue_range * 2,
            green = hue_range * 3,
            yellow = hue_range * 4,
            orange = hue_range * 5,
            red = hue_range * 6
        var color;
        if (v <= blue){
            // 1 blue - 0,0,255
            // color = [0,0,255,1]
        } else if (v > blue && v <= lt_blue) {
            // 2 light blue - 0,255,255
            color = [0,255,255,1]
        } else if (v > lt_blue && v <= green) {
            // 3 green - 128,255,0
            color = [128,255,0,1]
        } else if (v > green && v <= yellow) {
            // 4 yellow - 255,255,0
            color = [255,255,0,1]
        } else if (v > yellow && v <= orange) {
            // 5 orange - 255,128,0
            color = [255,128,0,1]
        } else if (v > orange  && v <= red) {
            // 6 red - 255,0,0
            color = [255,0,0,1]
        }
        if (color) {
            return color.join(',')
        }
        return color;
    },
    render:function(){
        // bring the heat
        this.canvas = new Canvas(this.w, this.h)
        this.ctx = this.canvas.getContext('2d');
        this.ctx.globalAlpha = 1 // 0.5;        
        
        var ub = this.range
        var coords, x, y, v, rgb;
        
        // need to sort the points asc
        
        var points = []
        for (var p in this.coords){
            v = this.coords[p]
            if (v > 1) points.push([p, v])
        }
        points.sort(function(a, b){return a[1] - b[1]})
        // sys.puts(sys.inspect(points))
        
        for (var i=0, ii=points.length, p; i < ii;i++){
            p=points[i]
            coords = p[0].split(',')
            x = parseInt(coords[0], 10)
            y = parseInt(coords[1], 10)
            v = parseInt(p[1], 10)
            
            sys.puts('Render:' + x + ',' + y + ' : ' + v)
            rgb = this.rgb(v)
            if (rgb){
                sys.puts(rgb)
                this.ctx.beginPath();
                this.ctx.fillStyle = 'rgba('+rgb+')';
                this.ctx.arc(x,y,10,0,Math.PI*2,true);
                this.ctx.fill();
            }
            
        }
        this.png = this.canvas.toDataURL();
    }
}

