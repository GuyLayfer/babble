/* Babble Project - Client */
/* Author: Guy Layfer      */

/*
Babble API:
Babble.register(userInfo:Object)
Babble.getMessages(counter:Number, callback:Function)
Babble.postMessage(message:Object, callback:Function)
Babble.deleteMessage(id:String, callback:Function)
Babble.getStats(callback:Function)
*/
Babble = {
    lastMsgId: 0,
    numOfDeletedMsgs: -1,
    usersNum: 0,
    msgCounter: 0
};

// keep alive
function keepAlive() {
    var xhr = new XMLHttpRequest();
    var queryStr = 'requestType=keepAlive' + '&userId=';
    var userId = sessionStorage.getItem('guestName');
    if (userId == null) { // registered user
        userId = JSON.parse(localStorage.getItem('babble')).userInfo.email;
    }
    if (userId == null) { // history was deleted
        location.reload();
    } else {
        queryStr += userId;
        xhr.open('GET', 'http://localhost:9000/?' + queryStr);
        xhr.onload = function() { 
            if (xhr.status == 200) {
                setTimeout(keepAlive, 15000);
            } else {
                console.log('keepAlive() status error code: ' + xhr.status);
            }
        };
        xhr.send();
    }
}

function callback(response) {}

Babble.deleteMessage = function(id, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('DELETE', 'http://localhost:9000/messages/' + id);
    xhr.onload = function() {  
        if (xhr.status == 200) {
            callback(JSON.parse(xhr.responseText));
        } else {
            console.log('Babble.deleteMessage() status error code: ' + xhr.status);
        }
    };
    xhr.send();
};

Babble.getMessages = function(counter, callback) {
    var xhr = new XMLHttpRequest();
    var queryStr = 'counter=' + counter;
    xhr.open('GET', 'http://localhost:9000/messages?' + queryStr);
    xhr.onload = function() {  
        if (xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            var messageList = document.getElementById('messageList');
            for (var i in response) {
                if (response[i] == null) {
                    continue;
                }
                var li = document.createElement('li');
                li.id = 'message' + response[i].id;
                var deleteButton = '';
                var guestName = sessionStorage.getItem('guestName');
                if ((!guestName && response[i].email == JSON.parse(localStorage.getItem('babble')).userInfo.email) ||
                    (response[i].email == '' && response[i].name === guestName)) {
                    deleteButton = 
                    '<button class="DelMsgButton" aria-label="delete message" ' +
                    'onclick="Babble.deleteMessage(\'' + response[i].id + '\', callback)">' +
                    '<img class="DelMsgImg" src="images/deleteMessage.png" alt="delete"/></button>';
                }
                var usrInfo = 'Anonymous ';
                if (response[i].email != '') {
                    usrInfo = response[i].name + ' ' +
                            response[i].email + ' ';
                }
                li.innerHTML = usrInfo +
                response[i].timestamp + ' ' +
                deleteButton + '<br/>' +
                '<pre>' + response[i].content + '</pre>';  // for preserving spaces in the text
                messageList.appendChild(li);
                Babble.lastMsgId = response[i].id;
            }
            callback(response);
        } else {
            console.log('Babble.getMessages() status error code: ' + xhr.status);
        }
    };
    xhr.send();
};

Babble.getStats = function(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://localhost:9000/stats');
    xhr.onload = function() { 
        if (xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            if (Babble.msgCounter != response.messages) {
                Babble.msgCounter = response.messages;
                document.getElementById('msgCounter').innerHTML = String(response.messages);
            }
            if (Babble.usersNum != response.users) {
                Babble.usersNum = response.users;
                document.getElementById('usersNum').innerHTML = String(Babble.usersNum);
            }
            callback(response);
        } else {
            console.log('Babble.getStats() status error code: ' + xhr.status);
        }
    };
    xhr.send();
};

// long polling 
function checkUpdates() {
    var xhr = new XMLHttpRequest();
    var queryStr = 'requestType=longPolling' + 
                    '&lastMsgId=' + String(Babble.lastMsgId) +
                    '&numOfDeletedMsgs=' + String(Babble.numOfDeletedMsgs) +
                    '&usersNum=' + String(Babble.usersNum);
    xhr.open('GET', 'http://localhost:9000/?' + queryStr);
    xhr.onload = function() {  //Process received updates and open new long-poll XHR
        if (xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            if (Babble.lastMsgId < response.lastMsgId) {
                var messageList = document.getElementById('messageList');
                for (var i in response.newMessages) {
                    if (response.newMessages[i] == null) {
                        continue;
                    }
                    var li = document.createElement('li');
                    li.id = 'message' + response.newMessages[i].id;
                    li.tabIndex = '1';
                    var deleteButton = '';
                    var guestName = sessionStorage.getItem('guestName');
                    if ((!guestName && response.newMessages[i].email == JSON.parse(localStorage.getItem('babble')).userInfo.email) ||
                        (response.newMessages[i].email == '' && response.newMessages[i].name === guestName)) {
                        deleteButton = 
                        '<button class="DelMsgButton" aria-label="delete message" tabindex="1" ' +
                        'onclick="Babble.deleteMessage(\'' + response.newMessages[i].id + '\', callback)">' +
                        '<img class="DelMsgImg" src="images/deleteMessage.png" alt="delete"/></button>';
                    }
                    var usrInfo = '<img class="UserImg" src="images/anonymous.png"/> <span class="MsgUsername"> Anonymous </span> ';
                    if (response.newMessages[i].email != '') {
                        usrInfo = '<img class="UserImg" src="' + response.newMessages[i].gravatarUrl + '"/> ' +
                                '<span class="MsgUsername">' + response.newMessages[i].name + '</span> ';
                    }
                    li.innerHTML = usrInfo +
                    '<span class="MsgTimestamp">' + response.newMessages[i].timestamp + '</span> ' +
                    deleteButton + '<br/>' +
                    '<pre class="MsgContent">' + response.newMessages[i].content + '</pre>';  // for preserving spaces in the text
                    
                    if (deleteButton != '') {
                        li.querySelector('.DelMsgButton').onblur = function() {
                            this.style.display = "none";
                            this.parentElement.style.backgroundColor = 'white';
                        }
                    } else {
                        li.onblur = function() {
                            this.style.backgroundColor = 'white';
                        }
                    }

                    li.onfocus = function() {
                        var delMsgButton = this.querySelector('.DelMsgButton');
                        if (delMsgButton) {
                            delMsgButton.style.display = "block";
                        }
                        this.style.backgroundColor = '#EBEDEC';
                    }

                    li.onmouseover = function() {
                        var delMsgButton = this.querySelector('.DelMsgButton');
                        if (delMsgButton) {
                            delMsgButton.style.display = "block";
                        }
                        this.style.backgroundColor = '#EBEDEC';
                    }
                    
                    li.onmouseleave = function() {
                        var delMsgButton = this.querySelector('.DelMsgButton');
                        if (delMsgButton) {
                            delMsgButton.style.display = "none";
                        }
                        this.style.backgroundColor = 'white';
                    }

                    messageList.appendChild(li);
                }
                Babble.lastMsgId = response.lastMsgId;
                document.getElementById('msgCounter').innerHTML = String(response.msgCounter);
            }
            if (Babble.numOfDeletedMsgs == -1) {
                Babble.numOfDeletedMsgs = response.numOfDeletedMsgs;
            } else if (Babble.numOfDeletedMsgs < response.numOfDeletedMsgs) {
                var messageList = document.getElementById('messageList');
                for (var i in response.deletedMsgIds) {
                    var li = document.getElementById('message' + response.deletedMsgIds[i]);
                    if (li) {
                        messageList.removeChild(li);
                    }
                }
                Babble.numOfDeletedMsgs = response.numOfDeletedMsgs;
                document.getElementById('msgCounter').innerHTML = String(response.msgCounter);
            }
            if (Babble.usersNum != response.usersNum) {
                Babble.usersNum = response.usersNum;
                document.getElementById('usersNum').innerHTML = String(Babble.usersNum);
            }
        } else {
            console.log('checkUpdates() status error code: ' + xhr.status);
        }
        checkUpdates();
    };
    xhr.send();
}

function runAfterLogin() { 
    if (!sessionStorage.getItem('alreadyRegistered')) {
        sessionStorage.setItem('alreadyRegistered', 'true');
        checkUpdates();  //Issue initial long-poll XHR request
        keepAlive();
    }
}

Babble.register = function(userInfo) {
    document.getElementById('loginOverlay').style.display = "none"; 
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:9000/register');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {  
        if (xhr.status == 200) {
            if (userInfo.email == '') { // receive guest name from server in case of anonymous user
                sessionStorage.setItem('guestName', xhr.responseText);
            } else { // receive gravatar url from server in case of registered user
                sessionStorage.setItem('gravatarUrl', xhr.responseText);
            }
            runAfterLogin();
        } else {
            console.log('Registration Error, returned status: ' + xhr.status);
        }
    };
    xhr.send(JSON.stringify(userInfo));
    localStorage.setItem('babble', JSON.stringify({
        currentMessage: '',
        userInfo: {
            name: userInfo.name, 
            email: userInfo.email
        }
    }));
};

/*
POST 		/messages 				(new message)
message = {name:String, email:String, message:String, timestamp:Number(ms)} 
*/
Babble.postMessage = function(message, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:9000/messages');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {  
        if (xhr.status == 200) {
            callback(JSON.parse(xhr.responseText));
        } else {
            console.log('Babble.postMessage() status error code: ' + xhr.status);
        }
    };
    xhr.send(JSON.stringify(message));

    document.getElementById('msgTxtArea').value = '';
    document.querySelector('.js-growable').querySelector('span').textContent = '';
    var babbleStorage = JSON.parse(localStorage.getItem('babble'));
    babbleStorage.currentMessage = '';
    localStorage.setItem('babble', JSON.stringify(babbleStorage));
};

// message sending
document.getElementById('msgForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var babbleStorage = JSON.parse(localStorage.getItem('babble'));
    var name = sessionStorage.getItem('guestName');
    var email = '';
    var gravatarUrl = '';
    if (!name && !babbleStorage) { // history was deleted
        location.reload();
    } else {
        if (!name) { // registered user
            name = babbleStorage.userInfo.name;
            email = babbleStorage.userInfo.email;
            gravatarUrl = sessionStorage.getItem('gravatarUrl');
        }
        Babble.postMessage({
            name: name, 
            email: email,
            gravatarUrl: gravatarUrl,
            message: document.getElementById('msgTxtArea').value,
            timestamp: Date.now()
        }, callback);
    }
});

// login submit 
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var userInfo = {
        name: document.getElementById('fullName').value, 
        email: document.getElementById('email').value
    };
    Babble.register(userInfo);
});

// anonymous user
document.getElementById('guest').addEventListener('click', function(e) {
    Babble.register({name: '', email: ''});
});

// msgTxtArea onKeydown event handler
document.getElementById('msgTxtArea').addEventListener('keydown', function(e) {
    // send message on enter key and create new line on shift+enter key
    if (e.keyCode == 13 && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('sendMessage').click();
    } else { // save the message textarea content in the local storage
        var babbleStorage = JSON.parse(localStorage.getItem('babble'));
        babbleStorage.currentMessage = document.getElementById('msgTxtArea').value;
        localStorage.setItem('babble', JSON.stringify(babbleStorage));
    }
});

// first operations of the script
function firstOps() {
    if (!localStorage.getItem('babble')) {
        localStorage.setItem('babble', JSON.stringify({
            currentMessage: '',
            userInfo: {name: '', email: ''}
        }));
    }

    var babbleStorage = JSON.parse(localStorage.getItem('babble'));
    if (sessionStorage.getItem('alreadyRegistered')) { // the page was reloaded
        checkUpdates();  //Issue initial long-poll XHR request
        keepAlive();
        document.getElementById('msgTxtArea').value = babbleStorage.currentMessage;
    } else { // it's the first load of the page
        if (babbleStorage.userInfo.email != '') { // automaic login using localStorage
            Babble.register(babbleStorage.userInfo);
        } else {
            document.getElementById('loginOverlay').style.display = "block";
        }
    }
}

firstOps();

// Growable Textarea
function makeGrowable(container) {
	var area = container.querySelector('textarea');
	var clone = container.querySelector('span');
	area.addEventListener('input', function(e) {
		clone.textContent = area.value;
	});
}

makeGrowable(document.querySelector('.js-growable'));

