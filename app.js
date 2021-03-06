'use strict'

require('consoleplusplus');
var express = require('express')
var jade = require('jade');
var path = require('path');
var bodyParser = require('body-parser');
var app = express();
var fsGrubber = require('./fs-grubber.js');
var exGrubber = require('./ex-grubber.js');
var grbs = {
	fs: fsGrubber,
	ex: exGrubber
};

app.set('port', (process.env.PORT || 8080));
app.set('views', path.resolve(__dirname, 'views'));
app.set('public', path.resolve(__dirname, 'public'));
app.set('json spaces', 4);

app.use(express.static( app.get('public') ));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function(err, req, res, next){
	res.status(err.status || 500);
	console.error('Internal error(%d): %s',res.statusCode,err.message);
	res.send({ error: 'Error is occured!!! -> ' + err.message });
	return;
});
app.use(function(req, res, next){
	console.info('%s %s', req.method, req.url);
	next();
});

app.get('/', function(req, res) {
	res.send( jade.renderFile(path.resolve(app.get('views'), 'index.jade')));
}).post('/', function(req, res) {
	res.redirect(['/films?type=', req.body && req.body.type].join(''));
});

app.get('/films', function(req, res) {
	var rType = req.query && req.query.type;
	new Promise(function(resolve, reject) {
		grbs[rType].films.init(function(data) {
			data.error ? reject(data.error) : resolve(data.list);
		});
	})
	.then(function(list) {
		res.send(jade.renderFile(
			path.resolve(app.get('views'), 'films/index.jade'), { list: list, type: rType }
		));
	})
	.catch(function(e) {
		console.error('Error is occured on /films - ', e);
		res.redirect('/404?appError=' + e);
	});
});

app.get('/getStream', function(req, res) {
	var rType = req.query && req.query.type;
	new Promise(function(resolve, reject) {
		grbs[rType].films.getStream(req.query.url, function(data) {
			data.error ? 
				reject(data.error) : 
				resolve(typeof data.stream == 'object' ? data.stream[0] : data.stream);
		});	
	})
	.then(function(stream) {
		console.debug('Stream: ', stream);
		res.json(stream);
	})
	.catch(function(e) {
		console.error('Error is occured on /getStream - ', e);
		// res.redirect('/404?appError=' + e);
	});
});

app.get('/404', function(req, res) {
	res.send(jade.renderFile(
		path.resolve(app.get('views'), '404.jade'), { error: req.query && req.query.appError }
	));
});

app.listen(app.get('port'), function() {
	console.info('Listening on %s', app.get('port'));
});

