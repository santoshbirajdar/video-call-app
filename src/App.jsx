import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  MessageSquare, Users, Share2, Settings, 
  Send, X, Copy, MonitorUp, Shield, MoreVertical,
  Loader2, AlertCircle
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
  arrayUnion,
  collection
} from 'firebase/firestore';

// --- Configuration Handling ---

// 1. CHANGE THIS TO YOUR REAL FIREBASE CONFIG
// You get this from Firebase Console > Project Settings > General > Your Apps
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
  // Check if running in the AI Sandbox
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
    appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    isConfigured = true;
  } else {
    // Running in Vercel/Localhost
    // Check if the user has replaced the placeholder text
    if (YOUR_FIREBASE_CONFIG.apiKey !== "REPLACE_WITH_YOUR_API_KEY") {
      firebaseConfig = YOUR_FIREBASE_CONFIG;
      isConfigured = true;
    }
  }
} catch (e) {
  console.error("Config Error:", e);
}

// Initialize Firebase only if configured
let app, auth, db;
if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// --- WebRTC Configuration ---
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/30",
    secondary: "bg-gray-700 hover:bg-gray-600 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-red-500/30",
    ghost: "bg-transparent hover:bg-gray-700/50 text-gray-300 hover:text-white",
    icon: "p-3 rounded-full aspect-square", 
  };
  const finalClass = `${baseStyle} ${variants[variant]} ${className}`;

  return (
    <button onClick={onClick} className={finalClass} disabled={disabled}>
      {Icon && <Icon size={20} />}
      {children}
    </button>
  );
};

// Setup Guide Component (Shown if keys are missing)
const ConfigErrorScreen = () => (
  <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 font-sans">
    <div className="max-w-md w-full bg-gray-800 border border-red-500/30 p-8 rounded-3xl shadow-2xl text-center">
      <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle size={32} />
      </div>
      <h1 className="text-2xl font-bold mb-4">App Not Configured</h1>
      <p className="text-gray-400 mb-6">
        You have deployed the app, but you haven't added your Firebase API keys to the code yet.
      </p>
      <div className="bg-gray-900 p-4 rounded-xl text-left text-sm font-mono text-gray-300 mb-6 overflow-x-auto">
        <p className="text-gray-500 mb-2">// src/App.jsx (Lines 28-35)</p>
        <p>const YOUR_FIREBASE_CONFIG = &#123;</p>
        <p className="text-green-400">  apiKey: "PASTE_HERE",</p>
        <p className="text-green-400">  authDomain: "...",</p>
        <p>  ...</p>
        <p>&#125;;</p>
      </div>
      <p className="text-sm text-gray-500">
        Edit <code>src/App.jsx</code> in your project, paste your keys, run <code>git push</code>, and this screen will disappear.
      </p>
    </div>
  </div>
);

// 2. Welcome/Lobby Screen
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
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 bg-gray-800/50 p-8 rounded-3xl shadow-2xl border border-gray-700 backdrop-blur-sm">
        
        {/* Left: Preview */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-inner border border-gray-700 group">
            {localStream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover transform -scale-x-100" 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                 {permissionError ? (
                   <>
                    <VideoOff size={48} className="text-red-500" />
                    <p className="text-sm text-red-400 text-center px-4">{permissionError}</p>
                   </>
                 ) : (
                   <>
                    <div className="animate-pulse"><Video size={48} /></div>
                    <p>Loading Camera...</p>
                   </>
                 )}
              </div>
            )}
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Mic size={16} className="text-white" />
              <Video size={16} className="text-white" />
            </div>
          </div>
          <div className="text-center text-gray-400 text-sm">
            Check your hair and audio before joining
          </div>
        </div>

        {/* Right: Form */}
        <div className="flex flex-col justify-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Video size={24} />
              <span className="font-bold text-xl tracking-wide">VideoConnect</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Get Started</h1>
            <p className="text-gray-400">Video call your friends and family for free.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 transition-all"
              />
            </div>
            
            <div className="pt-2">
              <div className="flex gap-3">
                <Button 
                  onClick={() => onCreate(name || 'Host')} 
                  className="flex-1 py-3"
                  disabled={!localStream || isConnecting}
                >
                  {isConnecting ? <Loader2 className="animate-spin" /> : 'Create New Room'}
                </Button>
              </div>
              <div className="flex items-center gap-4 my-4">
                <div className="h-px bg-gray-700 flex-1"></div>
                <span className="text-gray-500 text-sm">OR</span>
                <div className="h-px bg-gray-700 flex-1"></div>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter Room ID to Join"
                  className="flex-1 bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all"
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

// 3. The Main Call Screen
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
    // Fallback for iframe environments where navigator.clipboard might be blocked
    const textArea = document.createElement("textarea");
    textArea.value = roomId;
    
    // Ensure it's not visible but part of the DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    
    document.body.removeChild(textArea);
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-blue-400">
             <Video size={24} />
             <span className="font-bold text-lg hidden md:block">VideoConnect</span>
          </div>
          <div className="h-6 w-px bg-gray-600 hidden md:block"></div>
          <div className="flex flex-col">
            <span className="font-medium text-sm md:text-base flex items-center gap-2">
              Room ID: <span className="font-mono bg-gray-700 px-2 py-0.5 rounded">{roomId}</span>
              <button onClick={copyRoomId} className="text-gray-400 hover:text-white" title="Copy ID">
                {copied ? <span className="text-green-400 text-xs">Copied!</span> : <Copy size={14} />}
              </button>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${isWaiting ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
             <div className={`w-2 h-2 rounded-full ${isWaiting ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
             {isWaiting ? 'Waiting for others...' : 'Connected'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full">
            
            {/* Remote Participant */}
            <div className="bg-gray-800 rounded-2xl overflow-hidden relative shadow-lg border border-gray-700 group min-h-[200px] md:h-full">
              {remoteStream ? (
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-850 text-gray-400 p-6 text-center">
                   <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mb-4 animate-pulse">
                      <Users size={32} />
                   </div>
                   <h3 className="text-xl font-bold text-white mb-2">Waiting for friend...</h3>
                   <p className="mb-6 max-w-xs">Share the Room ID with them so they can join this call.</p>
                   <button 
                     onClick={copyRoomId}
                     className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-all"
                   >
                     {copied ? 'Copied!' : 'Copy Room ID'}
                     {!copied && <Copy size={18} />}
                   </button>
                </div>
              )}
              
              {remoteStream && (
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2">
                  <span>Remote User</span>
                </div>
              )}
            </div>

            {/* Local User (You) */}
            <div className="bg-gray-800 rounded-2xl overflow-hidden relative shadow-lg border border-blue-500/30 group min-h-[200px] md:h-full">
              <div className="w-full h-full bg-gray-900 relative">
                 <video 
                   ref={localVideoRef} 
                   autoPlay 
                   muted 
                   playsInline 
                   className={`w-full h-full object-cover transform -scale-x-100 ${isVideoOff ? 'hidden' : 'block'}`} 
                 />
                 {isVideoOff && (
                   <div className="w-full h-full flex items-center justify-center bg-gray-800">
                     <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-400 border-2 border-gray-600">
                       {userName.charAt(0).toUpperCase()}
                     </div>
                   </div>
                 )}
              </div>
              
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2">
                <span>{userName} (You)</span>
                {isMuted && <MicOff size={14} className="text-red-400" />}
              </div>
            </div>

        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="h-20 bg-gray-800 border-t border-gray-700 flex items-center justify-center gap-4 shrink-0 relative z-20">
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all duration-200 ${
              isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          <button 
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all duration-200 ${
              isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
             {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          <button 
            onClick={onLeave}
            className="ml-4 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium flex items-center gap-2 transition-all shadow-lg hover:shadow-red-600/30"
          >
            <PhoneOff size={20} />
            <span className="hidden md:inline">End Call</span>
          </button>
        </div>
      </div>
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

  // Refs for WebRTC to avoid closure staleness
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
      
      // Create PeerConnection
      pc.current = new RTCPeerConnection(servers);

      // Add Local Tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.current.addTrack(track, localStream);
        });
      }

      // Handle Remote Tracks
      pc.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          track.onmute = () => console.log("Remote track muted");
          track.onunmute = () => console.log("Remote track unmuted");
        });
        setRemoteStream(event.streams[0]);
        setIsWaiting(false);
      };

      // Firestore Refs
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', `rooms/${roomId}`);
      
      // Handle ICE Candidates
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
        // --- CALLER LOGIC ---
        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        const roomWithOffer = {
          offer: {
            type: offerDescription.type,
            sdp: offerDescription.sdp,
          },
          callerCandidates: [],
          calleeCandidates: [],
          createdAt: new Date()
        };

        await setDoc(roomRef, roomWithOffer);

        // Listen for Answer
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
        }, (err) => console.error("Snapshot error:", err));

      } else {
        // --- CALLEE LOGIC ---
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

        // Listen for Caller Candidates
        unsubRef.current = onSnapshot(roomRef, (snapshot) => {
          const data = snapshot.data();
          if (data?.callerCandidates) {
            data.callerCandidates.forEach((candidate) => {
               pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {});
            });
          }
        }, (err) => console.error("Snapshot error:", err));
      }
      
      setIsConnecting(false);
      setUserData({ name: isCaller ? 'Host' : 'Guest', roomId });
      setStep('call');
      
    } catch (err) {
      console.error("Connection Error:", err);
      setIsConnecting(false);
      alert(`Connection failed: ${err.message}. \n\nCheck your Firebase Console > Firestore Database > Rules are set to public.`);
    }
  };

  const handleCreate = async (name) => {
    if (!user) return;
    // Simple numeric ID for easier sharing
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
    // window.location.reload(); // Simplest way to clear WebRTC state completely
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