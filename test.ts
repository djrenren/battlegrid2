import nodeDataChannel from "node-datachannel";

// Log Level
nodeDataChannel.initLogger("Debug");

let dc1 = null;
let dc2 = null;

let peer1 = new nodeDataChannel.PeerConnection("Peer1", {
  iceServers: ["stun:stun.l.google.com:19302"],
});

// Set Callbacks
peer1.onLocalDescription((sdp, type) => {
  console.log("Peer1 SDP:", sdp, " Type:", type);
  peer2.setRemoteDescription(sdp, type);
});
peer1.onLocalCandidate((candidate, mid) => {
  console.log("Peer1 Candidate:", candidate);
  peer2.addRemoteCandidate(candidate, mid);
});

let peer2 = new nodeDataChannel.PeerConnection("Peer2", {
  iceServers: ["stun:stun.l.google.com:19302"],
});

// Set Callbacks
peer2.onLocalDescription((sdp, type) => {
  console.log("Peer2 SDP:", sdp, " Type:", type);
  peer1.setRemoteDescription(sdp, type);
});
peer2.onLocalCandidate((candidate, mid) => {
  console.log("Peer2 Candidate:", candidate);
  peer1.addRemoteCandidate(candidate, mid);
});
peer2.onDataChannel((dc) => {
  console.log("Peer2 Got DataChannel: ", dc.getLabel());
  dc2 = dc;
  dc2.onMessage((msg) => {
    console.log("Peer2 Received Msg:", msg);
  });
  dc2.sendMessage("Hello From Peer2");
});

dc1 = peer1.createDataChannel("test");

dc1.onOpen(() => {
  dc1.sendMessage("Hello from Peer1");
});

dc1.onMessage((msg) => {
  console.log("Peer1 Received Msg:", msg);
});

setTimeout(() => {
  dc1.close();
  dc2.close();
  peer1.close();
  peer2.close();
  nodeDataChannel.cleanup();
}, 10 * 1000);
