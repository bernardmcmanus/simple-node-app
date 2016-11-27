'use strict';

const _ = require('lodash');
const path = require('path');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const MockDB = require('./mock-db');

const PORT = 3000;

const app = express();
const server = http.createServer(app);
const db = new MockDB('test');

// server configuration
app.disable('etag');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '10mb', strict: true, extended: false }));

// serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// serve static files from the node_modules directory
app.use(express.static(path.join(__dirname, 'node_modules')));

// ========== API ENDPOINTS ==========
	// get all cards
	app.get('/card', (req, res, next) => {
		db.selectAll()
			.then(docs => res.json(docs))
			.catch(next);
	});

	// get a single card
	app.get('/card/:id', (req, res, next) => {
		const id = req.params.id;
		db.select(id)
			.then(doc => res.json(doc))
			.catch(next);
	});

	// create a new card
	app.post('/card', (req, res, next) => {
		const json = req.body;
		db.insert(json)
			.then(doc => res.json(doc))
			.catch(next);
	});

	// delete a card
	app.delete('/card/:id', (req, res, next) => {
		const id = req.params.id;
		db.delete(id)
			.then(result => res.json(result))
			.catch(next);
	});
// ===========================================

// handle 404
app.use((req, res, next) => {
	const err = new Error('404 | ' + req.originalUrl);
	console.warn(err.message);
	res.status(404);
	res.json(_.pick(err, 'message', 'stack'));
});

// handle errors and send stacktrace
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(err.status || 500);
	res.json(_.pick(err, 'message', 'stack'));
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}.`));
