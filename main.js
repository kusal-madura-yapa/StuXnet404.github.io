// app ID
let APP_ID = '39facf61f9764699be6fe4787dd77b26';
// token for the channel
let token = null ;
// channel UID for each user in the channel
let uid = String (Math.floor(Math.random() * 10000));
// clent 
let client ;
// channel two users connect to the same channel
let channel;

let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get('room');
if (!roomId) {
    window.location.href = 'lobby.html';}

// this will be the local stream get the cam and mic on ur computer   your
let localStream = null;
// this will be the remote stream get the cam and mic on remote users computer Userse
let remoteStream = null;
// this will be the peer connection
let peerConnection = null;

// servers for the peer connection
const servers = {
    iceServers: [
        {
            // get the stun server from google
            urls: ['stun:stun.l.1.google.com:19302','stun:stun.2.1.google.com:19302']
        }
    ]
}

// this function will be called when the page is loaded
let init = async () => {

    client = await AgoraRTM.createInstance(APP_ID)
    // uid need to be a string 
    await client.login({uid,token})

    channel = client.createChannel('main')
    await channel.join()

    channel.on('MemberJoined', handleuserJoined)
    // when user leave the meeting 
    channel.on('MemberLeft', handleUserLeft)

    client.on('MessageFromPeer', handleMessageFromPeer)

    localStream= await navigator.mediaDevices.getUserMedia({video:true,audio:false}); // requesrt the mic and cam
    // onece u had accsess to 
    document.getElementById("user-1").srcObject = localStream; // set the local video to the local stream

    

}

// this function will be called when the user leave the channel
let handleUserLeft = (MemberId) => {
    document.getElementById("user-2").style.display = "none"; // set the local video to the local stream
}

let handleMessageFromPeer = async (message,MemberId) => {
    // get the message from the peer
    message = JSON.parse(message.text);

    if (message.type == 'offer') {
        // if the message is offer create the answer
        createAnswer(MemberId,message.offer);
    }else if (message.type == 'answer') {
        // if the message is answer set it to the peer connection
        addAnswer(message.answer);
    }else if (message.type == 'candidate') {
        if (peerConnection) {
            // if the message is candidate add it to the peer connection
            peerConnection.addIceCandidate(message.candidate);
        }
    }
}

// this function will be called when the user join the channel
let handleuserJoined = async (MemberId) => {
    console.log('new user joined',MemberId);
    // create the offer
    createOffer(MemberId);
}


let createpeerConnection = async (MemberId) => {

    // create the offer
    peerConnection = new RTCPeerConnection(servers);

    // add the remote stream to the peer connection
    remoteStream =  new MediaStream();
        // onece u had accsess to 
    
        document.getElementById("user-2").srcObject = remoteStream; // set the local video to the local stream
        document.getElementById("user-2").style.display = "block"; // set the local video to the local stream



    if (!localStream) {
        localStream= await navigator.mediaDevices.getUserMedia({video:true,audio:false}); // requesrt the mic and cam
        // onece u had accsess to 
        document.getElementById("user-1").srcObject = localStream; // set the local video to the local stream
    }

    // local track add to the peer connection loop over the local stream tracks
    localStream.getTracks().forEach((track )=> {
        peerConnection.addTrack(track,localStream);
    })

    // remote track add to the remote stream loop over the remote stream tracks
    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track); 
        });

    }

    //request the ice candidate by stun server
    peerConnection.onicecandidate = async (event) => {
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate','candidate':event.candidate})},MemberId)

        }
    }
}


let createOffer = async (MemberId) => {

    await createpeerConnection(MemberId);

    // create a offer 
    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    client.sendMessageToPeer({text:JSON.stringify({'type':'offer','offer':offer })},MemberId)



}


// create the answer
let createAnswer = async (MemberId,offer) => {
    await createpeerConnection(MemberId);
    await peerConnection.setRemoteDescription(offer);
    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    client.sendMessageToPeer({text:JSON.stringify({'type':'answer','answer':answer })},MemberId)

}

// set the answer to the peer connection
let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer);
        
    }
}

let leaveChannel = async () => {
    await channel.leave();
    await client.logout();
}

// if the user leave the meeting call the leave channel function
 window.addEventListener('beforeunload',leaveChannel);

//  when you open the page it will call the init function
init();