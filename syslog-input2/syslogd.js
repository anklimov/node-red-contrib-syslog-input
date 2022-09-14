/*
 * Copyright (c) 2019 Damien Clark
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 *
 */


module.exports = function(RED) {
	'use strict' ;
	var Syslog = require('simple-syslog-server') ;

	// The Input Node
	function SyslogInputNode(config) {

		// Create a RED node
		RED.nodes.createNode(this, config) ;

		// STORE LOCAL COPIES OF THE NODE CONFIGURATION (AS DEFINED IN THE .HTML)
		this.port = config.port ;
		this.socktype = config.socktype || 'udp' ;
		this.name = config.name ;
		this.address = config.address ;
		this.topic = config.topic ;
		this.clients = [] ;
		this.count = 0 ;
		this.listening = false ;
		this.stat = {fill: 'red', shape: 'ring', text: 'Initialising'} ;

		// If no bind address given, then listen on all interfaces
		// if (this.address === '')
		// 	this.address = null ;

		// Create our syslog server with the given transport
		this.server = Syslog(this.socktype) ;

		// Function to handle received syslog messages from network
		this.server.on('msg', data => {
			this.count++ ;
			var msg = {
				payload: data,
				// If node topic empty, use syslog tag without process id
				topic: this.topic || data.tag.toString().replace(/\[\d+\]$/, '')
			} ;
			this.send(msg) ;
			status(this) ;
		})
		.on('invalid', err => {
			this.count++ ;
			var msg = {
				payload: err,
				topic: 'broken'
			} ;
			this.send(msg) ;
			status(this) ;
		})
		.on('error', err => {
			this.listening = false ;
			status(this, err) ;
		})
		.on('connection', s => {
			var addr = s.address().address ;
			this.log(`Client connected: ${addr}`) ;
			this.clients.push(s) ;
			s.on('end', () => {
				this.log(`Client disconnected: ${addr}`) ;
				// Remove client from our list
				var i = this.clients.indexOf(s) ;
				if(i !== -1)
					this.clients.splice(i, 1) ;
				status(this) ;
			}) ;
			status(this) ;
		})
		.listen({host: this.address, port: this.port})
		.then(() => {
			// We are now listening
			this.listening = true ;
			status(this) ;
			this.log(`Now listening on: ${this.address}:${this.port}`) ;
		})
		.catch(err => {
			if ((err.code == 'EACCES') && (this.port < 1024)) {
				this.error(`Cannot listen on ports below 1024 without root permissions. Select a higher port number: ${err}`) ;
			}
			else { // Some other error so attempt to close server socket
				this.error(`Error listening to ${this.address}:${this.port} - ${err}`) ;
				try {
					if(this.listening)
						this.server.close() ;
				}
				catch (err) {
					this.warn(`Error trying to close server socket ${this.address}:${this.port} - ${err}`) ;
				}
			}
		}) ;


		this.on('close', done => {
			this.log('Node Closed') ;
			if(this.listening) {
				this.server.close()
				.then(() => {
					this.log(`Server socket closed ${this.address}:${this.port}`) ;
					done() ;
				})
				.catch(err => this.warn(`Error trying to close server socket ${this.address}:${this.port} - ${err}`)) ;
			}
			else {
				done() ;
			}
		}) ;

	}

	function status(node, msg) {
		// Determine node state and update status

		msg = msg ? msg.toString() : '' ;

		if(node.socktype === 'tcp') {
			/*
			Green Ring = Listening no connections
			Green Solid = Listening with connections

			Red Ring = Error (not listening not working)
			*/
			node.stat.fill = (node.listening) ? 'green' : 'red' ;
			node.stat.shape = (node.clients.length) ? 'dot' : 'ring' ;
			node.stat.text = msg || `(conn: ${node.clients.length}, msgs: ${node.count})` ;
		}
		else {
			/*
			UDP
			Green Ring = Listening no messages in past 5 minutes
			Green Solid = Listening and messages in past 5 minutes

			Red Ring = Error (not listening not working)
			 */
			node.stat.fill = (node.listening) ? 'green' : 'red' ;
			node.stat.shape = 'dot' ;
			node.stat.text = msg || `(msgs: ${node.count})` ;
		}

		node.status(node.stat) ;
	}

	RED.nodes.registerType('syslog-input2', SyslogInputNode) ;

} ;
