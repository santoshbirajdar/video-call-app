import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  Copy, Users, Share2, Shield, Loader2, AlertCircle
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  arrayUnion
} from 'firebase/firestore';

// --- Configuration Handling ---

// 1. YOUR REAL FIREBASE CONFIG (Preserved from your code)
const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBzKjOevnVen8iMnOnYRpZr1yjcnDWTQOo",
  authDomain: "myvideocallapp-3e270.firebaseapp.com",
  projectId: "myvideocallapp-3e270",
  storageBucket: "myvideocallapp-3e270.firebasestorage.app",
  messagingSenderId: "1048980971770",
  appId: "1:1048980971770:web:15e3ce03af741ff779a943",
  measurementId: "G-7NX7QFPTB3"
};

// Logic to select between Sandbox environment and Real World
let firebaseConfig;
let appId = 'video-call-v1';
let isConfigured = false;

try {
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
    appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    isConfigured = true;
  } else {
    if (YOUR_FIREBASE_CONFIG.apiKey !== "REPLACE_WITH_YOUR_API_KEY") {
      firebaseConfig = YOUR_FIREBASE_CONFIG;
      isConfigured = true;
    }
  }
} catch (e) {
  console.error("Config Error:", e);
}

// Initialize Firebase
let app, auth, db;
if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// --- WebRTC Configuration ---
const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ],
  iceCandidatePoolSize: 10,
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/30",
    secondary: "bg-gray-700 hover:bg-gray-600 text-white border border-gray-600",
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const ConfigErrorScreen = () => (
  <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 font-sans">
    <div className="max-w-md w-full bg-gray-800 border border-red-500/30 p-8 rounded-3xl shadow-2xl text-center">
      <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle size={32} />
      </div>
      <h1 className="text-2xl font-bold mb-4">App Not Configured</h1>
      <p className="text-gray-400 mb-6">You have deployed the app, but the Firebase keys seem missing or incorrect.</p>
    </div>
  </div>
);

// --- NEW WELCOME SCREEN (Correct Aspect Ratio) ---
const WelcomeScreen = ({ onJoin, onCreate, localStream, permissionError, isConnecting }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 font-sans">
      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-10 bg-gray-800 p-8 rounded-3xl shadow-2xl border border-gray-700">
        
        {/* Left: Preview Area */}
        <div className="flex flex-col justify-center gap-4">
          <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border border-gray-600">
            {localStream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover transform -scale-x-100" 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-3">
                 {permissionError ? (
                   <>
                    <VideoOff size={48} className="text-red-500" />
                    <p className="text-sm text-red-400 text-center px-6">{permissionError}</p>
                   </>
                 ) : (
                   <>
                    <Loader2 size={48} className="animate-spin text-blue-500" />
                    <p>Initializing Camera...</p>
                   </>
                 )}
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
              {name || 'You'}
            </div>
          </div>
          <p className="text-center text-gray-400 text-sm">Check your audio and video before joining.</p>
        </div>

        {/* Right: Join Controls */}
        <div className="flex flex-col justify-center">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 text-blue-400">
              <div className="p-2 bg-blue-500/10 rounded-lg"><Video size={28} /></div>
              <span className="font-bold text-2xl tracking-tight">VideoConnect</span>
            </div>
            <h1 className="text-4xl font-bold mb-3 text-white">Get Started</h1>
            <p className="text-gray-400 text-lg">Create a room or join an existing one.</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Display Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-600 transition-all"
              />
            </div>
            
            <div className="flex flex-col gap-4 pt-2">
              <Button 
                onClick={() => onCreate(name || 'Host')} 
                className="w-full py-4 text-lg"
                disabled={!localStream || isConnecting}
              >
                {isConnecting ? <Loader2 className="animate-spin" /> : 'Create New Room'}
              </Button>
              
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-700"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">OR JOIN WITH ID</span>
                <div className="flex-grow border-t border-gray-700"></div>
              </div>

              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Room ID"
                  className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all font-mono"
                />
                <Button 
                  variant="secondary"
                  onClick={() => onJoin(name || 'Guest', roomId)}
                  disabled={!roomId || !localStream || isConnecting}
                >
                  Join
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NEW CALL SCREEN (Picture-in-Picture Layout) ---
const CallScreen = ({ userName, roomId, localStream, remoteStream, onLeave, isWaiting }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [copied, setCopied] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const copyRoomId = () => {
    // Fallback copy method
    const textArea = document.createElement("textarea");
    textArea.value = roomId;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="h-screen w-full bg-gray-900 text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="h-16 px-6 bg-gray-800/90 backdrop-blur-md border-b border-gray-700 flex items-center justify-between z-50 absolute top-0 left-0 right-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <Video size={20} className="text-blue-400" />
          </div>
          <h1 className="font-bold text-lg tracking-wide hidden md:block">VideoConnect</h1>
          <div className="h-6 w-px bg-gray-600 mx-2 hidden md:block"></div>
          
          <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-600/50">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Room ID</span>
            <span className="font-mono font-bold text-white">{roomId}</span>
            <button onClick={copyRoomId} className="ml-2 hover:text-blue-400 transition-colors">
              {copied ? <Shield size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isWaiting ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
          <div className={`w-2 h-2 rounded-full ${isWaiting ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
          {isWaiting ? 'Waiting...' : 'Live'}
        </div>
      </header>

      {/* MAIN VIDEO AREA */}
      <main className="flex-1 relative w-full h-full bg-black flex items-center justify-center">
        
        {/* REMOTE STREAM (Full Screen) */}
        {remoteStream ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
        ) : (
          /* WAITING STATE */
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-[0_0_30px_rgba(59,130,246,0.2)]">
              <Users size={40} className="text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Waiting for participant...</h2>
            <p className="text-gray-400 mb-6 max-w-md">
              Share the Room ID <span className="font-mono text-white bg-gray-800 px-2 py-0.5 rounded">{roomId}</span> with a friend to start the call.
            </p>
            <button 
              onClick={copyRoomId}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-all shadow-lg shadow-blue-600/20"
            >
              <Share2 size={18} />
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </button>
          </div>
        )}

        {/* LOCAL STREAM (Picture-in-Picture) */}
        <div className="absolute bottom-24 right-4 md:right-6 w-32 md:w-64 aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700/50 z-10">
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            playsInline 
            className={`w-full h-full object-cover transform -scale-x-100 ${isVideoOff ? 'hidden' : 'block'}`} 
          />
          {isVideoOff && (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-lg">
                 {userName.charAt(0)}
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 text-[10px] font-medium text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
            You {isMuted && '(Muted)'}
          </div>
        </div>
      </main>

      {/* BOTTOM CONTROLS */}
      <footer className="absolute bottom-0 w-full h-20 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center z-50 pb-4">
        <div className="flex items-center gap-4 bg-gray-900/90 backdrop-blur-lg px-6 py-3 rounded-2xl border border-gray-700 shadow-xl">
          
          <button 
            onClick={toggleMute}
            className={`p-3 rounded-xl transition-all ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
            title="Toggle Mute"
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button 
            onClick={toggleVideo}
            className={`p-3 rounded-xl transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
            title="Toggle Video"
          >
            {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>

          <div className="w-px h-8 bg-gray-700 mx-2"></div>

          <button 
            onClick={onLeave}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
          >
            <PhoneOff size={20} />
            <span className="hidden md:inline">End Call</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

// --- Main Application ---

export default function App() {
  if (!isConfigured) {
    return <ConfigErrorScreen />;
  }

  const [step, setStep] = useState('lobby'); 
  const [userData, setUserData] = useState({ name: '', roomId: '' });
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [permissionError, setPermissionError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);
  const [user, setUser] = useState(null);

  const pc = useRef(null);
  const unsubRef = useRef(null);

  // 1. Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth failed", error);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // 2. Media Setup
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        setLocalStream(stream);
        setPermissionError('');
      } catch (err) {
        console.error("Error accessing media:", err);
        setPermissionError("Please allow camera and microphone access to use the app.");
      }
    };
    startCamera();
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 3. WebRTC + Firestore Logic
  const setupWebRTC = async (roomId, isCaller) => {
    try {
      setIsConnecting(true);
      
      pc.current = new RTCPeerConnection(servers);

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.current.addTrack(track, localStream);
        });
      }

      pc.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        setIsWaiting(false);
      };

      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', `rooms/${roomId}`);
      
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          if (isCaller) {
            updateDoc(roomRef, { callerCandidates: arrayUnion(event.candidate.toJSON()) });
          } else {
            updateDoc(roomRef, { calleeCandidates: arrayUnion(event.candidate.toJSON()) });
          }
        }
      };

      if (isCaller) {
        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        const roomWithOffer = {
          offer: { type: offerDescription.type, sdp: offerDescription.sdp },
          callerCandidates: [],
          calleeCandidates: [],
          createdAt: new Date()
        };

        await setDoc(roomRef, roomWithOffer);

        unsubRef.current = onSnapshot(roomRef, (snapshot) => {
          const data = snapshot.data();
          if (!pc.current.currentRemoteDescription && data?.answer) {
            const answer = new RTCSessionDescription(data.answer);
            pc.current.setRemoteDescription(answer);
          }
          if (data?.calleeCandidates) {
            data.calleeCandidates.forEach((candidate) => {
               pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {});
            });
          }
        });

      } else {
        const roomSnapshot = await getDoc(roomRef);
        if (!roomSnapshot.exists()) {
          alert("Room ID not found. Please ask your friend for the correct ID.");
          setIsConnecting(false);
          return;
        }
        
        const roomData = roomSnapshot.data();

        await pc.current.setRemoteDescription(new RTCSessionDescription(roomData.offer));
        const answerDescription = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answerDescription);

        const answer = {
          type: answerDescription.type,
          sdp: answerDescription.sdp,
        };

        await updateDoc(roomRef, { answer });

        unsubRef.current = onSnapshot(roomRef, (snapshot) => {
          const data = snapshot.data();
          if (data?.callerCandidates) {
            data.callerCandidates.forEach((candidate) => {
               pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {});
            });
          }
        });
      }
      
      setIsConnecting(false);
      setUserData({ name: isCaller ? 'Host' : 'Guest', roomId });
      setStep('call');
      
    } catch (err) {
      console.error("Connection Error:", err);
      setIsConnecting(false);
      alert(`Connection failed: ${err.message}`);
    }
  };

  const handleCreate = async (name) => {
    if (!user) return;
    const newRoomId = String(Math.floor(100000 + Math.random() * 900000));
    await setupWebRTC(newRoomId, true);
    setUserData({ ...userData, name, roomId: newRoomId });
  };

  const handleJoin = async (name, roomIdInput) => {
    if (!user) return;
    await setupWebRTC(roomIdInput, false);
    setUserData({ ...userData, name, roomId: roomIdInput });
  };

  const handleLeave = () => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (unsubRef.current) {
      unsubRef.current();
    }
    setRemoteStream(null);
    setStep('lobby');
    setIsWaiting(true);
    window.location.reload();
  };

  return (
    <div className="font-sans bg-gray-900 min-h-screen text-white selection:bg-blue-500/30">
      {step === 'lobby' ? (
        <WelcomeScreen 
          onJoin={handleJoin} 
          onCreate={handleCreate}
          localStream={localStream} 
          permissionError={permissionError}
          isConnecting={isConnecting}
        />
      ) : (
        <CallScreen 
          userName={userData.name} 
          roomId={userData.roomId} 
          localStream={localStream}
          remoteStream={remoteStream}
          onLeave={handleLeave}
          isWaiting={isWaiting}
        />
      )}
    </div>
  );
}
