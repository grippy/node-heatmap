/*
<!-- add static/jquery library; also include JSON library -->
<script src="http://path/to/app/static/jquery-v1.4.4.js" type="text/javascript"></script>

<!-- add socket.io from webserver -->
<script src="http://path/to/app/socket.io/socket.io.js" type="text/javascript"></script>

<!-- add -->
<script src="http://path/to/app/static/api/v1.0/client.js" type="text/javascript"></script>


<body>
    <!-- must appear as the first body child node!! otherwise recorded coordinates may be inacurate-->
    <div id="heatmap"></div>
    
    
    <!-- feel the heat! -->
    <script type="text/javascript">
        heatmap.init()
    </script>
</body>


*/

var heatmap = {
    href:null,
    init:function(params){
        // copy params over
		var href=document.location.href
		if (href.indexOf('#')>-1) href= href.split('#')[0]
	 	this.href=href;
	 	var self = this;
	 	window.socket = new io.Socket(); 
		window.socket.connect();
		window.socket.on('connect', function(){
			// register this url...
			window.socket.send(JSON.stringify({action:'connection', href: self.href}))
		})
		window.socket.on('message', function(data){
		    // log incomming message...
			// document.getElementById('log').innerHTML+= data +'<br />'
		})
		window.socket.on('disconnect', function(){})

        // add window click event
		$(document).click(this.on_click_event)
    },
    
    coords:function(e, action){
		var now = new Date();
		var offset = $('#heatmap').offset()
		var x=e.pageX, 
			y=e.pageY, 
			obw=$(document.body).outerWidth(true), 
			obh=$(document.body).outerHeight(true)
		var o = {
			'href':this.href,
			// 'tz_offset':now.getTimezoneOffset(),
			'time': now.getTime(),
			// 'offset': $('#heatmap').offset(),
			'action': action,
			// 'x': e.pageX,
			// 'y': e.pageY,
			'vpw': $(window).width(),
			'vph': $(window).height(),
			'ax': Math.floor(e.pageX - offset.left),
			'ay': Math.floor(e.pageY - offset.top),
			'save':true
		};
		if (o.ax < 0 || o.ax > obw || o.ay > obh){
			o.save = false
		}
		return o;        
    },
	log:function(s){
		$('#log').prepend('<div>' + s + '</div>')
	},
    on_click_event:function(e){
			var o = heatmap.coords(e, 'click')
			if (o.save) {
				var coord = JSON.stringify(o)
				try{
				    heatmap.log(coord)
				} catch(e){
				    
				}
				window.socket.send(coord)
			}
        
    },
    end:function(){}
    
}