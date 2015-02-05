var fs = require('fs');
var path = require('path');
var express = require('express');
var parse = require('./parse');

var port = program.port || 3000;

var app = express();

app.listen(port);

module.exports.app = app;