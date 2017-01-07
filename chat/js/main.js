/***********************************************************************
 * Initial setup-------------------variables
 **********************************************************************/
var rm = null,
	x  = 0,///room
	socket = io.connect(), 
	peerConn,
	dataChannel=null,
	configuration = null,
    myid           = getCookie('myid'),
    frndid   	   = getCookie('frndid'),
    textarea	   = document.getElementById("message-to-send"),
	sendBtn        = document.getElementById("sendBtn"),
	audio		   = new Audio("../alert.mp3"),
	mbox		   = document.getElementById("mbox");
	console.log("myid is  "+myid+"    frined id is   "+frndid);
	sendBtn.disable=true;
	sendBtn.addEventListener('click', sendText);
	textarea.addEventListener('click', start);
	
	
/***********************************************************************
 * room set..........
 * ********************************************************************/



if(myid!='notfound' || frndid!='notfound'){
	document.getElementById('myid').innerHTML=myid+'-';
	document.getElementById('frndid').innerHTML='-'+frndid;
	rm=frndid+myid;
	console.log('Checking room ' + rm);
	socket.emit('create or join', myid, frndid);
}else{
	alert('redirecting to login page...');
	window.location.assign("../index.html");
	}

//----------------------------------------------------------------------


socket.on('ipaddr', function (ipaddr) {
    console.log('Server IP address is: ' + ipaddr);
});
    
socket.on('created', function (room, clientId) {
	rm=room;
	console.log('Created room', room, '- my client ID is', clientId);
	});

socket.on('joined', function (room, clientId) {
	 console.log('This peer has joined room', room, 'with client ID', clientId);
	});

socket.on('full', function (room) {
    alert('Room "' + room + '" is full. We will create a new room for you.');
	});


socket.on('log', function (array) {
  console.log.apply(console, array);
	});



socket.on('message', function (message){
    console.log('Client received message:', message);
    signalingMessageCallback(message);
	});

/*
socket.emit('create or join',myid,frndid);
if (location.hostname.match(/localhost|127\.0\.0/)) {
    socket.emit('ipaddr');
}
* */              ///might not need this function.......................

//----------------------------------------------------------------------


/***********************************************************************
 * Send message to signaling server
 **********************************************************************/

function sendMessage(message){
    console.log('Client sending message: ', message);
    socket.emit('message', message);
}

/*********************************************************************** 
 * WebRTC peer connection and data channel
 **********************************************************************/

///connection is created automatically when page loads..................

createPeerConnection(configuration);	

function createPeerConnection(config) {
    console.log('\nCreating Peer connection\n');
    peerConn = new RTCPeerConnection(config);
    peerConn.session = {
                audio: false,
                video: false,
                data: true
            };
	peerConn.onclose=function(){endCall };
    
    //------------------------------------------------------------------
	// send any ice candidates to the other peer
    peerConn.onicecandidate = function (event) {
    console.log('onIceCandidate event:', event);
    if (event.candidate) {
			sendMessage({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate,
                remoteroom:rm
            });
     } 
        else {
            console.log("End of candidates.\nthis is rvideo");
        }
    };    
	            

}
		
/***********************************************************************
 * Signaling server 
 **********************************************************************/


function signalingMessageCallback(message) {
	     
    if (message.type === 'offer') {
		console.log('Got offer. Sending answer to peer.');
        peerConn.setRemoteDescription(new RTCSessionDescription(message), function(){}, logError);
        peerConn.createAnswer(onLocalSessionCreated, logError);
        peerConn.ondatachannel = function (event) {
            console.log('ondatachannel:', event.channel);
            dataChannel = event.channel;
			onDataChannelCreated(dataChannel);
			x=1;
          } 
	}
    else if (message.type === 'answer') {	  
       console.log('Got answer.');
        peerConn.setRemoteDescription(new RTCSessionDescription(message), function(){}, logError);
        } 
    else if (message.type === 'candidate' && message.remoteroom === rm) {
		       peerConn.addIceCandidate(new RTCIceCandidate({candidate: message.candidate}));
		}
     else if (message === 'bye') {
		 console.log("\nwrong number!!!\n");   
    }
}


function onLocalSessionCreated(desc) {
    console.log('local session created:', desc);
    peerConn.setLocalDescription(desc, function () {
        console.log('sending local description:', peerConn.localDescription);
        sendMessage(peerConn.localDescription);
        console.log("goto:'about:webrtc' in firefox"+peerConn.localDescription);
    }, logError);
}

function logError(err) {
    console.log(err.toString(), err);
}
/***********************************************************************
 * my functional codes..........
 * ********************************************************************/

function onDataChannelCreated(channel) {
    console.log('onDataChannelCreated:', channel);
    channel.onopen = function () {
		sendBtn.disable=false;
        console.log('CHANNEL opened!!!');
    };
    channel.onmessage = receiveMessage;
    channel.onerror =function (){ console.log('datachannel error')};
    channel.onclose =function (){ console.log('datachannel closed')};
}

function receiveMessage(event){
		console.log("received message from datachannel");
	var msgb=document.getElementById("mbox");
		audio.play();
		msgb.insertAdjacentHTML("beforeend",'<li class="last"><div class="message-data"><span class="message-data-name" style="margin-left:3%;">'+frndid+'</span></div><div class="message my-message">'+event.data+'</div></li>');	
		document.getElementById("cbox").scrollTop = document.getElementById("cbox").scrollHeight;		
	}

function getCookie(cname) {
				var name = cname + "=";
				var ca = document.cookie.split(';');
				for(var i=0; i<ca.length; i++) {
					var c = ca[i];
					while (c.charAt(0)==' ')
					 c = c.substring(1);
					 if (c.indexOf(name) == 0)
					  return c.substring(name.length, c.length);
					}
				return "notfound";
			}
function start(){
	if(x===0){
		x=1;
		var dcOpt= {
				reliable:false,
				maxRetrasmitTime:1000
			};
			console.log('Creating Data Channel');
			dataChannel = peerConn.createDataChannel("chat",dcOpt);
			onDataChannelCreated(dataChannel);
			console.log('Creating an offer');
			peerConn.createOffer(onLocalSessionCreated, logError);
			
	}
}

function sendText(){
	var text = document.getElementById("message-to-send").value.replace(/\n/g,'<br/>');
	if(text!='')
	{
		document.getElementById("message-to-send").value="";
		//document.getElementById("message-to-send").focus();
		msgb=document.getElementById("mbox");
		msgb.insertAdjacentHTML("beforeend",'<li class="clearfix"><div class="message-data align-right"><span class="message-data-name" style="margin-right:3%;" >'+myid+'</span></div><div class="message other-message float-right">'+text+'</div></li>');
		//alert(document.getElementById("cbox").scrollHeight);
		document.getElementById("cbox").scrollTop = document.getElementById("cbox").scrollHeight;		
		dataChannel.send(text);	
		}
}

