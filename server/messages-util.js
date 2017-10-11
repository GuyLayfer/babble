/* Babble Project - Server Util */
/* Author: Guy Layfer           */

"use strict";

/*
server api:
messages.addMessage(message:Object) : Number(id)
messages.getMessages(counter:Number) : Array(messages)
messages.deleteMessage(id:String)
*/

var messages = [];
var deletedMsgIds = [];

exports.deleteMessage = function(id) {
    messages[Number(id) - 1] = null;
    deletedMsgIds.push(id);
};

exports.getMessages = function(counter) {
    var i = 0, j = 0;
    while (j < counter && i < messages.length) {
        if (messages[i] != null) {
            j++;
        }
        i++;
    }
    var newMessages = [];
    while (i < messages.length) {
        if (messages[i] != null) {
            newMessages.push(messages[i]);
        }
        i++;
    }
    return newMessages;
};

exports.addMessage = function(message) {
    messages.push(message);
    return messages.length;
};

exports.getMessagesById = function(id) {
    return messages.slice(id);
};

exports.getNextMsgId = function() {
    return messages.length + 1;
};

exports.getLastMsgId = function() {
    return messages.length;
};

exports.getNumOfMsgs = function() {
    return messages.length - deletedMsgIds.length;
};

exports.getDeletedMsgIds = function(counter) {
    return deletedMsgIds.slice(counter);
};

exports.getNumOfDeletedMsgs = function() {
    return deletedMsgIds.length;
};
