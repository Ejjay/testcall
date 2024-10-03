const APP_ID = "035515b6677f4f44a695ae79f7f2701e"
const TOKEN = "007eJxTYGCwLb7j/XlNdtkXC48zyXVvd78KPiTFvWOHf79Bld+tkzoKDAbGpqaGpklmZubmaSZpJiaJZpamianmlmnmaUbmBoapT1v/pjUEMjKcjbjDzMgAgSA+C0NuYmYeAwMAkYohAA=="
const CHANNEL = "main"

const client = AgoraRTC.createClient({mode:'rtc', codec:'vp8'})

let localTracks = []
let remoteUsers = {}

let joinAndDisplayLocalStream = async () => {

    client.on('user-published', handleUserJoined)
    
    client.on('user-left', handleUserLeft)
    
    let UID = await client.join(APP_ID, CHANNEL, TOKEN, null)

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks() 

    let player = `<div class="video-container" id="user-container-${UID}">
                        <div class="video-player" id="user-${UID}"></div>
                  </div>`
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)

    localTracks[1].play(`user-${UID}`)
    
    await client.publish([localTracks[0], localTracks[1]])
}

let joinStream = async () => {
    await joinAndDisplayLocalStream()
    document.getElementById('join-btn').style.display = 'none'
    document.getElementById('stream-controls').style.display = 'flex'
}

let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user 
    await client.subscribe(user, mediaType)

    if (mediaType === 'video'){
        let player = document.getElementById(`user-container-${user.uid}`)
        if (player != null){
            player.remove()
        }

        player = `<div class="video-container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div> 
                 </div>`
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)

        user.videoTrack.play(`user-${user.uid}`)
    }

    if (mediaType === 'audio'){
        user.audioTrack.play()
    }
}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.uid}`).remove()
}

let leaveAndRemoveLocalStream = async () => {
    for(let i = 0; localTracks.length > i; i++){
        localTracks[i].stop()
        localTracks[i].close()
    }

    await client.leave()
    document.getElementById('join-btn').style.display = 'block'
    document.getElementById('stream-controls').style.display = 'none'
    document.getElementById('video-streams').innerHTML = ''
}

let toggleMic = async (e) => {
    if (localTracks[0].muted){
        await localTracks[0].setMuted(false)
        e.target.innerText = 'Mic on'
        e.target.style.backgroundColor = 'cadetblue'
    }else{
        await localTracks[0].setMuted(true)
        e.target.innerText = 'Mic off'
        e.target.style.backgroundColor = '#EE4B2B'
    }
}

let toggleCamera = async (e) => {
    if(localTracks[1].muted){
        await localTracks[1].setMuted(false)
        e.target.innerText = 'Camera on'
        e.target.style.backgroundColor = 'cadetblue'
    }else{
        await localTracks[1].setMuted(true)
        e.target.innerText = 'Camera off'
        e.target.style.backgroundColor = '#EE4B2B'
    }
}

document.getElementById('join-btn').addEventListener('click', joinStream)
document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)

//Screenshare

let isScreenSharing = false;
let screenShareTrack;

let shareScreen = async () => {
  try {
    if (!isScreenSharing) {
      // Create a screen track
      screenShareTrack = await AgoraRTC.createScreenVideoTrack();

      // Publish the screen track to the channel
      await client.publish(screenShareTrack);

      // Display the shared screen
      let player = `<div class="video-container" id="screen-container">
                      <div class="video-player" id="screen-player"></div>
                    </div>`;
      document.getElementById("video-streams").insertAdjacentHTML("beforeend", player);
      screenShareTrack.play("screen-player");

      // Update the button text and disable the button
      document.getElementById("screen-share-btn").textContent = "Stop Sharing";
      document.getElementById("screen-share-btn").disabled = true;

      isScreenSharing = true;
    } else {
      // Unpublish the screen track
      await client.unpublish(screenShareTrack);

      // Remove the screen sharing container
      document.getElementById("screen-container").remove();

      // Update the button text and enable the button
      document.getElementById("screen-share-btn").textContent = "Share Screen";
      document.getElementById("screen-share-btn").disabled = false;

      // Clean up the screen sharing resources
      screenShareTrack.close();
      screenShareTrack = null;

      isScreenSharing = false;
    }
  } catch (error) {
    console.error("Error sharing screen:", error);
    alert("Failed to share screen: " + error.message);
  }
};

// Add an event listener for the "Share Screen" button
document.getElementById("screen-share-btn").addEventListener("click", shareScreen);

// Add an event listener to stop screen sharing when the user leaves the stream
document.getElementById("leave-btn").addEventListener("click", async () => {
  if (isScreenSharing) {
    await client.unpublish(screenShareTrack);
    document.getElementById("screen-container").remove();
    document.getElementById("screen-share-btn").textContent = "Share Screen";
    document.getElementById("screen-share-btn").disabled = false;
    screenShareTrack.close();
    screenShareTrack = null;
    isScreenSharing = false;
  }
  await leaveAndRemoveLocalStream();
});