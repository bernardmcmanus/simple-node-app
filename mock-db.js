'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const Bluebird = require('bluebird');

/**
 * This is a pure JS mock database that mimics basic behavior
 * of most popular noSQL database interfaces (like mongodb).
 */
module.exports = class MockDB {
	constructor(name) {
		if (!name) {
			throw new Error('Database name is required');
		}

		Object.defineProperties(this, {
			name: { value: name },
			dumpfile: { value: `${process.cwd()}/.db_dump-${name}.json` },
			autoIncrementId: {
				get: () => {
					const id = autoIncrementId;
					autoIncrementId++;
					return id;
				}
			}
		});

		let autoIncrementId = this._loadFromFile();

		process.on('SIGINT', () => {
			process.stdin.resume();
			process.exit();
		});

		process.on('exit', () => {
			this._dumpToFile();
			process.exit();
		});
	}

	insert(data) {
		return Bluebird.try(() => {
			const id = this.autoIncrementId;
			const doc = _.chain({ id })
				.assign(data)
				.cloneDeep()
				.value();
			if (this[id]) {
				throw new Error(`Document with id "${id}" already exists!`);
			}
			this[id] = doc;
			return doc;
		});
	}

	select(id) {
		return Bluebird.try(() => {
			const doc = this[id];
			if (!doc) {
				throw new Error(`Document with id "${id}" does not exist!`);
			}
			return doc;
		});
	}

	selectAll() {
		return Bluebird.try(() => this._toArray());
	}

	delete(id) {
		return Bluebird.try(() => {
			const result = { success: false };
			if (this[id]) {
				delete this[id];
				result.success = true;
			}
			return result;
		});
	}

	_toArray() {
		return _.chain(this)
			.toArray()
			.cloneDeep()
			.sort((a, b) => b.id - a.id) // sort descending by id
			.value();
	}

	_loadFromFile() {
		let autoIncrementId = 0;
		const fname = this.dumpfile;
		if (fs.existsSync(fname)) {
			const json = fs.readJsonSync(fname);
			_.forEach(json, (doc) => {
				this[doc.id] = doc;
				autoIncrementId = Math.max(autoIncrementId, doc.id + 1);
			});
		}
		return autoIncrementId;
	}

	_dumpToFile() {
		const fname = this.dumpfile;
		const json = this._toArray();
		fs.writeJsonSync(fname, json);
	}
};
