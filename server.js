var TwitterStream = require('twitter-node').TwitterNode,
		Mongolian = require("mongolian")

var express = require('express'),
		app = express.createServer(),
		io = require('socket.io').listen(app)


/**
 MongoDB connection
*/
var mongoserver = new Mongolian
var db = mongoserver.db('tweetmap')
var tweets = db.collection('tweets')
tweets.drop(function(err, msg) { console.log("tweets cleared") })
tweets.ensureIndex({ coords : '2d' })


/**
 Twitter
 https://dev.twitter.com/docs/streaming-api/methods
*/
var twitter = new TwitterStream({
	user: 'USER',
	password: 'PASSWORD'
})

twitter.addListener('error', function(error) {
	console.error(error.message)
})


// HUNGARY SouthWest-NorthEast (longitude/latitude pairs)
//twitter.location(16.512451171875, 45.96260622242163, 22.8955078125, 48.469279317167164)

io.sockets.on('connection', function (socket) {
	
	socket.on('coordinates', function(coordinates) {
		lon = coordinates.longitude
		lat = coordinates.latitude
		twitter.location(lon-5, lat-5, lon+5, lat+5)
		twitter.stream()
		console.info("location: " + (lon-5) +", "+ (lat-5) +", "+ (lon+5) +", "+ (lat+5))
	})

})

twitter.addListener('tweet', function(data) {
	if (data.geo) {
		
		var coords = data.geo.coordinates
		var tweet = {
			name: data.user.screen_name,
			coords: [coords[1], coords[0]],
			text: data.text
		}
		
		io.sockets.emit('tweet', tweet) // send to all sockets
		
		tweets.insert(tweet) // save to mongodb
		
		console.info("@" + tweet.name + " [" + tweet.coords + "]: " + tweet.text)
	}
})


/**
 Start the http server
*/
var port = process.env.PORT || 8000
app.use(express.static(__dirname + '/public'))
app.listen(port)
console.info("server started at " + port)

