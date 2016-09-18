var express = require('express');
var app = express();
var http = require('http').Server(app);

var config = require('./config.json')

app.use(express.static(__dirname + '/../client'));

var serverPort = process.env.PORT || config.port;
http.listen(serverPort, function() {
  console.log("Server is listening on port " + serverPort);
});
