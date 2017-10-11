/* Babble Project - Server */
/* Author: Guy Layfer      */

"use strict";

var http = require('http');
var urlUtil = require('url');
var queryUtil = require('querystring');
var gravatar = require('gravatar');
var messages = require('./messages-util');

var clientsQueue = []; // for long polling
var connectedClients = new Map(); 
var guestID = 0;

function updatePendingClients(newMessage, deletedMsgId) {
    while(clientsQueue.length > 0) {
        var client = clientsQueue.pop();
        client.writeHead(200);
        client.end(JSON.stringify( {
            usersNum: connectedClients.size,
            msgCounter: messages.getNumOfMsgs(),
            lastMsgId: messages.getLastMsgId(),
            numOfDeletedMsgs: messages.getNumOfDeletedMsgs(),
            newMessages: [newMessage],
            deletedMsgIds: [deletedMsgId]
        }));
    }
}

function removeClient(userId) {
    connectedClients.delete(userId);
    updatePendingClients(null, null);
}

var server = http.createServer(function(request, response) {

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader("Access-Control-Allow-Headers", 'Content-Type');

    if (request.method === 'GET') {
        // long polling / keep alive
        var url = urlUtil.parse(request.url);
        var data = null;
        if (url.query != null) {
            data = queryUtil.parse(url.query);
        }
        if (url.query == null || url.query.indexOf('requestType') == -1) {
            response.writeHead(400);
            response.end();
        } else if (data.requestType == 'longPolling') { // long polling
            if (messages.getLastMsgId() > Number(data.lastMsgId) || 
                connectedClients.size != Number(data.usersNum) ||
                messages.getNumOfDeletedMsgs() > Number(data.numOfDeletedMsgs)) {
                response.writeHead(200);
                response.end(JSON.stringify( {
                    usersNum: connectedClients.size,
                    msgCounter: messages.getNumOfMsgs(),
                    lastMsgId: messages.getLastMsgId(),
                    numOfDeletedMsgs: messages.getNumOfDeletedMsgs(),
                    newMessages: messages.getMessagesById(Number(data.lastMsgId)),
                    deletedMsgIds: messages.getDeletedMsgIds(Number(data.numOfDeletedMsgs))
                }));
            } else {
                clientsQueue.push(response);
            }
        } else if (data.requestType == 'keepAlive') { // keep alive
            const oldTimeoutObj = connectedClients.get(data.userId);
            if (oldTimeoutObj) {
                clearTimeout(oldTimeoutObj);
            }
            const newTimeoutObj = setTimeout(removeClient, 30000, data.userId);
            connectedClients.set(data.userId, newTimeoutObj);
            response.writeHead(200);
            response.end();
        } else {
            response.writeHead(400);
            response.end();
        }

    } else if (request.method === 'POST') {
        // message handling and login handling

        var requestBody = '';
        request.on('data', function(chunk) {
            requestBody += chunk.toString();
        });

        request.on('end', function() {
            // login
            if (request.url.indexOf('/register') != -1) {  
                var userInfo = JSON.parse(requestBody);
                // anonymous user
                if (userInfo.email == '') {
                    var guestName = 'guest' + String(guestID++);
                    const newTimeoutObj = setTimeout(removeClient, 30000, guestName);
                    connectedClients.set(guestName, newTimeoutObj);
                    updatePendingClients(null, null);
                    response.writeHead(200);
                    response.end(guestName);
                // registered user
                } else {
                    if (!connectedClients.has(userInfo.email)) {
                        const newTimeoutObj = setTimeout(removeClient, 30000, userInfo.email);
                        connectedClients.set(userInfo.email, newTimeoutObj);
                        updatePendingClients(null, null);
                    }
                    var gravatarUrl = gravatar.url(userInfo.email, {protocol: 'https', d: 'wavatar'});
                    response.writeHead(200);
                    response.end(gravatarUrl);
                }

            // message
            } else if (request.url.indexOf('/messages') != -1) {  
                var data = JSON.parse(requestBody);
                var date = new Date(data.timestamp);
                var hours = String(date.getHours());
                if (hours.length == 1) {
                    hours = '0' + hours;
                }
                var minutes = String(date.getMinutes());
                if (minutes.length == 1) {
                    minutes = '0' + minutes;
                }
                var newMessage = {
                    name: data.name,
                    email: data.email,
                    gravatarUrl: data.gravatarUrl,
                    timestamp: hours + ':' + minutes,
                    content: data.message,
                    id: String(messages.getNextMsgId()) 
                }
                messages.addMessage(newMessage);
                updatePendingClients(newMessage, null);
                response.writeHead(200);
                response.end(JSON.stringify({id: newMessage.id}));
            } else {
                response.writeHead(404);
                response.end();
            }
        });

    } else if (request.method === 'DELETE') {
        if (request.url.indexOf('/messages/') != -1) {
            var id = request.url.split('/').pop();
            messages.deleteMessage(id);
            updatePendingClients(null, id);
            response.writeHead(200);
            response.end(JSON.stringify(true));
        } else {
            response.writeHead(404);
            response.end();
        }
    } else if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
    } else {
        console.log('wrong method. url = ' + request.url + '. method = ' + request.method);
        response.writeHead(405);
        response.end();
    }
});

server.listen(9000);
console.log('listening...');
