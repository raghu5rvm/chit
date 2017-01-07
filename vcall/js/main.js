/***********************************************************************
 * Initial setup-------------------variables
 **********************************************************************/
var rm = null,///room
	m = 0,
	n = 0,
	socket = io.connect(), 
	peerConn = null,
//    getv = true,
	configuration = null,
    lvideo = document.getElementById('lvideo'),
    rvideo = document.getElementById('rvideo'),
    phBtn = document.getElementById('endBtn'),
    sendBtn=document.getElementById('sendBtn'),
	audio = new Audio("../alert.mp3"),
    myid=getCookie('myid')
    frndid =getCookie('frndid');
    console.log("myid is  "+myid+"    frined id is   "+frndid);
	sendBtn.disable=true;
	document.getElementById('myid').innerHTML    = myid;
	document.getElementById('frndid').innerHTML  = frndid;
	
	phBtn.addEventListener('click', phone);
	///checking if video call's enabled.....................................
/*	var addr=document.URL,
		temp=addr.split('?');
		///alert(addr+' is addr and temp= '+temp[0]+' and '+temp[1]);
		if(temp[1]==='false'){getv=false;//alert(getv)
			}	
*/
/***********************************************************************
 * room set..........
 * ********************************************************************/

if(!rm){
	if(myid!='notfound' | frndid!='notfound'){
		rm=frndid+myid;
		console.log('Checking room ' + rm);
		socket.emit('create or join', myid, frndid);
}else{
	alert('redirecting to login page...');
	window.location.assign("../index.html");
	}
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

socket.emit('create or join',myid,frndid);
if (location.hostname.match(/localhost|127\.0\.0/)) {
    socket.emit('ipaddr');
	}

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
                audio: true,
                video: true,
                data: false
            };      
			peerConn.onclose=function (){endcall};
			peerConn.onaddstream = function(event){
			console.log("in function onaddStreeeeeeeeeeeeeeeeeeeeeeeam..........");
			m=1;
			phBtn.style.background="#d9534f";
			phBtn.innerHTML="End";
			console.log("after assigning to r video"+event.stream);
			rvideo.src=URL.createObjectURL(event.stream);
			console.log("after assigning to r video"+event.stream);
		   };        
     //var	getUserMedia= navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || getUserMedia;
     stream = getUserMedia({ audio: true, video: true }, function (stream) { 
			           lvideo.src = window.URL.createObjectURL(stream); 
			           peerConn.addStream(stream);
			           lvideo.muted=true;
			           console.log("video stream added sucessfully\n");
				      }, function(error) {trace("getUserMedia error:---------------------------------------------------- ", error);}	
				    );		       
	
	///end current call.................................................
	  
        peerConn.ondatachannel = function (event) {
			 console.log('ondatachannel:', event.channel);
			 n=1;
			 dataChannel = event.channel;
			 onDataChannelCreated(dataChannel);
				
		}

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
        sendBtn.addEventListener('click', sendText);
        console.log('Got offer. Sending answer to peer.');
        peerConn.setRemoteDescription(new RTCSessionDescription(message), function(){}, logError);
        peerConn.createAnswer(onLocalSessionCreated, logError);
        ///for chating    
        } 
    else if (message.type === 'answer') {	  
        console.log('Got answer.');
        peerConn.setRemoteDescription(new RTCSessionDescription(message), function(){}, logError);
        console.log("---------------------got answer--------------------------------------------");
    } 
    else if (message.type === 'candidate' && message.remoteroom===rm) {
        peerConn.addIceCandidate(new RTCIceCandidate({candidate: message.candidate}));
		console.log("---------------------candidate added-----------------------------------------");
		}
    
    else if (message === 'bye' ) {
		 console.log("--------------------- this is byeeeeeeeeeee -----------------------------------------");
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
function phone(){
	if(m===0){
		sendBtn.addEventListener('click', sendText);
		m=1;
		phBtn.style.background="#d9534f";
		phBtn.innerHTML="End";
		var dcOpt= {
			reliable:false,
			maxRetrasmitTime:1000
		};
	    console.log('Creating Data Channel');
        dataChannel = peerConn.createDataChannel("chat",dcOpt);
        onDataChannelCreated(dataChannel);
        console.log('Creating an offer');
		n=1;
		peerConn.createOffer(onLocalSessionCreated, logError);		
		
		}
	else {
		m=0;
		phBtn.style.background="#65D269";
		phBtn.innerHTML="Call";
		endCall();
		window.location.reload();
		}

};
function endCall(){
	if(rvideo){
		sendMessage('bye');
		peerConn.close();
		rvideo.pause();
		rvideo.src='';
		rvideo.load();
		}
		stream=null;
	};

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
		
	///for chating

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
	var msgb=document.getElementById("mbox_c");
		audio.play();
		msgb.insertAdjacentHTML("beforeend",'<li><div class="message-data"><span class="message-data-name" style="margin-left:3%;">'+frndid+'</span></div><div class="message my-message">'+event.data+'</div></li>');
		document.getElementById("cbox").scrollTop = document.getElementById("cbox").scrollHeight;		
		///msgb.scrollTop=msgb.scrollHeight;
	}


function sendText(){
	var text = document.getElementById("message-to-send").value.replace(/\n/g,'<br/>');
	if(text!='')
	{
		document.getElementById("message-to-send").value="";
		msgb=document.getElementById("mbox_c");
		msgb.insertAdjacentHTML("beforeend",'<li class="clearfix"><div class="message-data align-right"><span class="message-data-name" style="margin-right:3%;" >'+myid+'</span></div><div class="message other-message float-right">'+text+'</div></li>');
		//msgb.scrollTop=msgb.scrollHeight;
		document.getElementById("cbox").scrollTop = document.getElementById("cbox").scrollHeight;		
		dataChannel.send(text);
	}	
 }

