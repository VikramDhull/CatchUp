import React, { useContext, useEffect, useRef, useState } from "react";
import { ChatContext } from "../../Context/ChatContext";
import { AuthContext } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const VideoCallPage = () => {
  const { selectedUser } = useContext(ChatContext);
  const { authUser, onlineUsers, socket } = useContext(AuthContext);
  const [inCall, setInCall] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const navigate = useNavigate();

  const PeerConnection = (function () {
    let peerConnection;
    const createPeerConnection = () => {
      const config = {
        iceServers: [{ urls: "stun:stun4.l.google.com:19302" }],
      };
      peerConnection = new RTCPeerConnection(config);

      // add local stream to peer connection
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current);
      });

      // listen to remote stream and add to peer connection
      peerConnection.ontrack = function (event) {
        remoteVideoRef.current.srcObject = event.streams[0];
      };

      // listen for ice candidates
      peerConnection.onicecandidate = function (event) {
        if (event.candidate) {
          socket.emit("icecandidate", {
            from: authUser._id,
            to: selectedUser._id,
            candidate: event.candidate,
          });
        }
      };
      return peerConnection;
    };
    return {
      getInstance: () => {
        if (!peerConnection) {
          peerConnection = createPeerConnection();
        }
        return peerConnection;
      },
      reset: () => {
        peerConnection = null;
      },
    };
  })();

  // socket.on("offer", async ({ from, to, offer }) => {
  //   const pc = PeerConnection.getInstance();
  //   // set remote description
  //   await pc.setRemoteDescription(offer);
  //   const answer = await pc.createAnswer();
  //   await pc.setLocalDescription(answer);
  //   socket.emit("answer", { from, to, answer: pc.localDescription });
  // });

  // socket.on("answer", async ({ from, to, answer }) => {
  //   const pc = PeerConnection.getInstance();
  //   await pc.setRemoteDescription(answer);
  // });

  // socket.on("busy", () => {
  //   toast.error(`${selectedUser.fullName} is currently on another call.`);
  //   navigate("/");
  // });

  // socket.on("icecandidate", async (data) => {
  //   const pc = PeerConnection.getInstance();
  //   try {
  //     await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  //   } catch (error) {
  //     console.error("Error adding received ice candidate", error);
  //   }
  // });

  useEffect(() => {
    const handleOffer = async ({ from, to, offer }) => {
      // if (!onlineUsers.includes(to)) {
      //   const pc = PeerConnection.getInstance();
      //   if (pc) {
      //     pc.close();
      //     PeerConnection.reset();
      //   }
      //   if (localStreamRef.current) {
      //     localStreamRef.current.getTracks().forEach((track) => track.stop());
      //     localStreamRef.current = null;
      //   }
      //   if (remoteVideoRef.current) {
      //     remoteVideoRef.current.srcObject = null;
      //   }
      //   toast.error(`${selectedUser.fullName} is offline`);
      //   return;
      // }
      const pc = PeerConnection.getInstance();
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { from, to, answer: pc.localDescription });
      setInCall(true);
    };

    const handleAnswer = async ({ from, to, answer }) => {
      const pc = PeerConnection.getInstance();
      await pc.setRemoteDescription(answer);
      setInCall(true);
    };

    const handleBusy = () => {
      toast.error(`${selectedUser.fullName} is currently on another call.`);
      navigate("/");
    };

    const handleIceCandidate = async (data) => {
      const pc = PeerConnection.getInstance();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error("Error adding received ice candidate", error);
      }
    };

    const handleEndCall = () => {
      setInCall(false);

      // Stop local media streams for this user
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      navigate("/"); // navigation happens for both users on call end
    };

    const handleOffline = ({ to }) => {
      if (to === selectedUser._id) {
        toast.error(`${selectedUser.fullName} is offline.`);
      }
      navigate("/");
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("busy", handleBusy);
    socket.on("icecandidate", handleIceCandidate);
    socket.on("endcall", handleEndCall);
    socket.on("offline", handleOffline);

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("busy", handleBusy);
      socket.off("icecandidate", handleIceCandidate);
      socket.off("endcall", handleEndCall);
      socket.off("offline", handleOffline);
    };
  }, [selectedUser.fullName]);

  // start call method
  const startcall = async (id) => {
    // console.log(`calling ${id}`);
    const pc = PeerConnection.getInstance();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", {
      from: authUser._id,
      to: id,
      offer: pc.localDescription,
    });
  };

  // end call method
  const endCall = () => {
    const pc = PeerConnection.getInstance();
    if (pc) {
      pc.close();
      PeerConnection.reset();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    socket.emit("endcall", { from: authUser._id, to: selectedUser._id });
    // setInCall(false);
    // navigate("/");
  };

  useEffect(() => {
    const startMyVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;

        // Set the stream directly to the video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // console.log("Local stream started", stream);
      } catch (error) {
        console.error("Error getting user media", error);
      }
    };
    startMyVideo();
  }, []);

  return (
    <>
      <div className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center max-sm:flex-col backdrop-blur-2xl">
        <div className="flex flex-col items-center">
          <div className="relative w-fit inline-block">
            <video
              ref={remoteVideoRef}
              id="remoteVideo"
              autoPlay
              playsInline
              className=" w-192 h-108 bg-gray-800 rounded-lg object-cover"
            ></video>
            <div className="absolute bottom-2 left-2 text-white text-lg px-2 py-1 rounded">
              {selectedUser.fullName}
            </div>
          </div>
        </div>
        <div className="flex">
          <div className="relative w-fit inline-block">
            <video
              ref={localVideoRef}
              id="localVideo"
              autoPlay
              muted
              playsInline
              className="mt-5 w-96 h-54 bg-white rounded-lg shadow-lg object-cover"
            ></video>
            <div className="absolute bottom-1 left-1 text-white text-sm px-2 py-1 rounded">
              (You)
            </div>
          </div>
          <div className="flex items-center ml-5">
            {!inCall ? (
              <button
                onClick={() => startcall(selectedUser._id)}
                className="mt-5 ml-3 mr-3 p-2 pl-5 pr-5 rounded-md text-lg bg-green-600 hover:bg-green-700 cursor-pointer text-white"
              >
                Call
              </button>
            ) : (
              <button
                onClick={() => endCall()}
                className="mt-5 ml-3 mr-3 p-2 pl-5 pr-5 rounded-md text-lg bg-red-600 hover:bg-red-700 cursor-pointer text-white"
              >
                End
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoCallPage;
