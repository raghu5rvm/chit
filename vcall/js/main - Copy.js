/****************************************************************************
 * Initial setup-------------------variables
 ****************************************************************************/
var isInitiator;
var room = window.location.hash.substring(1);
var socket = io.connect(); 
var url;
var peerConn;
var dataChannel;
var count, total, parts, buf;
var configuration = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]},
 //{"url":"stun:stun.services.mozilla.com"}

    roomURL = document.getElementById('url'),
    lvideo = document.getElementById('lvideo'),
    rvideo = document.getElementById('rvideo'),
    startBtn = document.getElementById('start'),
    callBtn = document.getElementById('call'),
    photo = document.getElementById('photo'),
    photoContext = photo.getContext('2d'),
    trail = document.getElementById('trail'),
    snapBtn = document.getElementById('snap'),
    sendBtn = document.getElementById('send'),
    snapAndSendBtn = document.getElementById('snapAndSend'),
    // Default values for width and height of the photoContext.
    // Maybe redefined later based on user's webcam video stream.
    photoContextW = 300, photoContextH = 150;
	//*************************************************
		console.log("-----------------------------------------------     1     --------------------------------");
	//***************************************************/
// Attach even handlers
lvideo.addEventListener('play', setCanvasDimensions);
snapBtn.addEventListener('click', snapPhoto);
sendBtn.addEventListener('click', sendPhoto);
snapAndSendBtn.addEventListener('click', snapAndSend);
startBtn.addEventListener('click', start);
callBtn.addEventListener('click', send);

// Create a random room if not already present in the URL.
if (!room) {
    room = window.location.hash = randomToken();
		//*************************************************
		console.log("-----------------------------------------------     2     --------------------------------");
	//***************************************************/
}


/****************************************************************************
 * Signaling server 
 ****************************************************************************/

// Connect to the signaling server


socket.on('ipaddr', function (ipaddr) {
    console.log('Server IP address is: ' + ipaddr);
    //*************************************************
		console.log("-----------------------------------     3     --------------------------------");
	//***************************************************/
    updateRoomURL(ipaddr);
    	
});

socket.on('created', function (room, clientId) {
  console.log('Created room', room, '- my client ID is', clientId);
  isInitiator = true;
  	//*************************************************
		console.log("--------------------------------------     5     --------------------------------");
	//***************************************************/
});

socket.on('joined', function (room, clientId) {
  console.log('This peer has joined room', room, 'with client ID', clientId);
  isInitiator = false;
	//*************************************************
		console.log("--------------------------------------     6     --------------------------------");
	//***************************************************/
});

socket.on('full', function (room) {
    alert('Room "' + room + '" is full. We will create a new room for you.');
    window.location.hash = '';
    window.location.reload();
	    //*************************************************
		console.log("--------------------------------------     7     --------------------------------");
	//***************************************************/
    updateRoomURL();

});

socket.on('ready', function () {
	    //*************************************************
		console.log("--------------------------------------     8     --------------------------------");
	//***************************************************/
    //createPeerConnection(isInitiator, configuration);
	show(startBtn);
	hide(callBtn);
})

socket.on('log', function (array) {
  console.log.apply(console, array);
});

socket.on('message', function (message){
    console.log('Client received message:', message);
        //*************************************************
		console.log("--------------------------------------     9     --------------------------------");
	//***************************************************/
    signalingMessageCallback(message);
});

// Join a room
socket.emit('create or join', room);

if (location.hostname.match(/localhost|127\.0\.0/)) {
	    //*************************************************
		console.log("--------------------------------------     10     --------------------------------");
	//***************************************************/
    socket.emit('ipaddr');
}

/**
 * Send message to signaling server
 */
function sendMessage(message){
    console.log('Client sending message: ', message);
        //*************************************************
		console.log("--------------------------------------     11     --------------------------------");
	//***************************************************/
    socket.emit('message', message);
}

/**
 * Updates URL on the page so that users can copy&paste it to their peers.
 */
function updateRoomURL(ipaddr) {
    
    if (!ipaddr) {
        url = location.href
    } else {
        url = location.protocol + '//' + ipaddr + ':2013/#' + room
    }
    roomURL.innerHTML = url;
}


/**************************************************************************** 
 * User media (webcam) 
 ****************************************************************************/

function grabWebCamVideo() {
    console.log('Getting user media (video) ...');
    getUserMedia({video: true, audio:true}, getMediaSuccessCallback, getMediaErrorCallback);
}

function getMediaSuccessCallback(stream) {
    var streamURL = window.URL.createObjectURL(stream);
    console.log('getUserMedia video stream URL:', streamURL);
    //window.stream = stream; // stream available to console
    lvideo.src = streamURL;
    show(snapBtn);
}

function getMediaErrorCallback(error){
    console.log("getUserMedia error:", error);
}


/**************************************************************************** 
 * WebRTC peer connection and data channel
 ****************************************************************************/



function createPeerConnection(isInitiator, config) {
	    //*************************************************
		console.log("--------------------------------------     12     --------------------------------");
	//***************************************************/
    console.log('Creating Peer connection as initiator----->>', isInitiator, '<<------------config:::', config);
    peerConn = new RTCPeerConnection(config);
     //receive video from remote peer
     peerConn.onaddstream = function(event){
			console.log("in function on add Streeeeeeeeeeeeeeeeeeeeeeeammmmmmmmmmmmmmmmm");
		   rvideo.src=URL.createObjectURL(event.stream);
		   console.log(event.track+"hkjhkjhjhkjhkjhkjhhhhhhhhhhhhhhhhhhhhhkjhkjhkjhkjhkjhkjh");
		  }; 
			
    //end of receive code.......
    
     //------------------add video and audio to peer connection----------------------------------------------
       stream = getUserMedia({ audio: false, video: true }, function (stream) { 
			           lvideo.src = window.URL.createObjectURL(stream);  
			           console.log(stream.data+"this is working");
			           peerConn.addStream(stream);
			           console.log("video stream added sucessfully");
				      }, function(error) {trace("getUserMedia error:---------------------------------------------------- ", error);}			       
			       );  
    //-----------------------------------------------------------------------------------------------------

    // send any ice candidates to the other peer
    peerConn.onicecandidate = function (event) {
		    //*************************************************
		console.log("--------------------------------------     14     --------------------------------");
	//***************************************************/
        console.log('onIceCandidate event:', event);
        if (event.candidate) {
            sendMessage({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            });
        } else {
            console.log('End of candidates.');
                //*************************************************
		console.log("--------------------------------------     15     --------------------------------");
	//***************************************************/
        }
    };
    
    /*  //.............................
	 peerConn.ontrack = function(event){
			console.log("in function on add Streeeeeeeeeeeeeeeeeeeeeeeammmmmmmmmmmmmmmmm");
		   rvideo.src=URL.createObjectURL(event.track);
		   console.log(event.track+"hkjhkjhjhkjhkjhkjhhhhhhhhhhhhhhhhhhhhhkjhkjhkjhkjhkjhkjh");
		  }; 
			

	//---------------------------------  */


    if (isInitiator) {
		    //*************************************************
		console.log("--------------------------------------     16     --------------------------------");
	//***************************************************/
        console.log('Creating Data Channel');
        dataChannel = peerConn.createDataChannel("photos");
        onDataChannelCreated(dataChannel);
        console.log('Creating an ooooooffer');
        peerConn.createOffer(onLocalSessionCreated, logError);
    } else {
		    //*************************************************
		console.log("--------------------------------------     17     --------------------------------");
	//***************************************************/
        peerConn.ondatachannel = function (event) {
            console.log('ondatachannel:', event.channel);
            dataChannel = event.channel;
            onDataChannelCreated(dataChannel);
        };
    }
}

function signalingMessageCallback(message) {
	    //*************************************************
		console.log("--------------------------------------     18     --------------------------------");
	//***************************************************/
    if (message.type === 'offer') {
		    //*************************************************
		console.log("--------------------------------------     19     --------------------------------");
	//***************************************************/
        console.log('Got offer. Sending answer to peer.');
        peerConn.setRemoteDescription(new RTCSessionDescription(message), function(){}, logError);
        peerConn.createAnswer(onLocalSessionCreated, logError);

    } else if (message.type === 'answer') {
		    //*************************************************
		console.log("--------------------------------------     20     --------------------------------");
	//***************************************************/
        console.log('Got answer.');
        peerConn.setRemoteDescription(new RTCSessionDescription(message), function(){}, logError);
        console.log("---------------------this is test answer--------------------------------------------");

    } else if (message.type === 'candidate') {
		    //*************************************************
		console.log("--------------------------------------     21     --------------------------------");
	//***************************************************/
        peerConn.addIceCandidate(new RTCIceCandidate({candidate: message.candidate}));
		console.log("---------------------this is test candidate--------------------------------------------");
    } else if (message === 'bye') {
		    //*************************************************
		console.log("--------------------------------------     22     --------------------------------");
	//***************************************************/
        // TODO: cleanup RTC connection?
    }
}


function onLocalSessionCreated(desc) {
	    //*************************************************
		console.log("--------------------------------------     23     --------------------------------");
	//***************************************************/
    console.log('local session created:', desc);
    peerConn.setLocalDescription(desc, function () {
		    //*************************************************
		console.log("--------------------------------------     24     --------------------------------");
	//***************************************************/
        console.log('sending local desc:', peerConn.localDescription);
        sendMessage(peerConn.localDescription);
        console.log("-------------on"+peerConn.localDescription);
    }, logError);
}

function onDataChannelCreated(channel) {
	    //*************************************************
		console.log("--------------------------------------     25     --------------------------------");
	//***************************************************/
    console.log('onDataChannelCreated:', channel);

    channel.onopen = function () {
        console.log('CHANNEL opened!!!');
    };

    channel.onmessage = (webrtcDetectedBrowser == 'firefox') ? 
        receiveDataFirefoxFactory() :
        receiveDataChromeFactory();
}
function receiveDataChromeFactory() {
    
    //*************************************************
		console.log("--------------------------------------     26     --------------------------------");
	//***************************************************/
    return function onmessage(event) {
		    //*************************************************
		console.log("--------------------------------------     27     --------------------------------");
	//***************************************************/
        if (typeof event.data === 'string') {
            buf = window.buf = new Uint8ClampedArray(parseInt(event.data));
            count = 0;
            console.log('Expecting a total of ' + buf.byteLength + ' bytes');
            return;
        }

        var data = new Uint8ClampedArray(event.data);
        buf.set(data, count);

        count += data.byteLength;
        console.log('count: ' + count);

        if (count === buf.byteLength) {
            // we're done: all data chunks have been received
            console.log('Done. Rendering photo.');
            renderPhoto(buf);
        }
    }
}

function receiveDataFirefoxFactory() {
   
	    //*************************************************
		console.log("--------------------------------------     28     --------------------------------");
	//***************************************************/
    return function onmessage(event) {
        if (typeof event.data === 'string') {
            total = parseInt(event.data);
            parts = [];
            count = 0;
            console.log('Expecting a total of ' + total + ' bytes');
            return;
        }

        parts.push(event.data);
        count += event.data.size;
        console.log('Got ' + event.data.size + ' byte(s), ' + (total - count) + ' to go.');

        if (count == total) {
            console.log('Assembling payload')
            var buf = new Uint8ClampedArray(total);
            var compose = function(i, pos) {
                var reader = new FileReader();
                reader.onload = function() { 
                    buf.set(new Uint8ClampedArray(this.result), pos);
                    if (i + 1 == parts.length) {
                        console.log('Done. Rendering photo.');
                        renderPhoto(buf);
                    } else {
                        compose(i + 1, pos + this.result.byteLength);
                    }
                };
                reader.readAsArrayBuffer(parts[i]);
            }
            compose(0, 0);
        }
    }
}


/**************************************************************************** 
 * Aux functions, mostly UI-related
 ****************************************************************************/

function start(){
	
}



function snapPhoto() {
    photoContext.drawImage(lvideo, 0, 0, photoContextW, photoContextH);
    show(photo, sendBtn);
}

function sendPhoto() {
    // Split data channel message in chunks of this byte length.
    var CHUNK_LEN = 64000;

    var img = photoContext.getImageData(0, 0, photoContextW, photoContextH),
        len = img.data.byteLength,
        n = len / CHUNK_LEN | 0;

    console.log('Sending a total of ' + len + ' byte(s)');
    dataChannel.send(len);

    // split the photo and send in chunks of about 64KB
    for (var i = 0; i < n; i++) {
        var start = i * CHUNK_LEN,
            end = (i+1) * CHUNK_LEN;
        console.log(start + ' - ' + (end-1));
        dataChannel.send(img.data.subarray(start, end));
    }

    // send the reminder, if any
    if (len % CHUNK_LEN) {
        console.log('last ' + len % CHUNK_LEN + ' byte(s)');
        dataChannel.send(img.data.subarray(n * CHUNK_LEN));
    }
}

function snapAndSend() {
    snapPhoto();
    sendPhoto();
}

function renderPhoto(data) {
    var canvas = document.createElement('canvas');
    canvas.classList.add('photo');
    trail.insertBefore(canvas, trail.firstChild);

    var context = canvas.getContext('2d');
    var img = context.createImageData(photoContextW, photoContextH);
    img.data.set(data);
    context.putImageData(img, 0, 0);
}

function setCanvasDimensions() {
    if (lvideo.videoWidth == 0) {
        setTimeout(setCanvasDimensions, 200);
        return;
    }
    
    console.log('video width:', lvideo.videoWidth, 'height:', lvideo.videoHeight)

    photoContextW = lvideo.videoWidth / 2;
    photoContextH = lvideo.videoHeight / 2;
    //photo.style.width = photoContextW + 'px';
    //photo.style.height = photoContextH + 'px';
    // TODO: figure out right dimensions
    photoContextW = 300; //300;
    photoContextH = 150; //150;
}

function show() {
    Array.prototype.forEach.call(arguments, function(elem){
        elem.style.display = null;
    });
}

function hide() {
    Array.prototype.forEach.call(arguments, function(elem){
        elem.style.display = 'none';
    });
}

function randomToken() {
    return Math.floor((1 + Math.random()) * 1e16).toString(16).substring(1);
    //*************************************************
		console.log("--------------------------------------     29     --------------------------------");
	//***************************************************/
}

function logError(err) {
    console.log(err.toString(), err);
}




