/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { 
  Camera, 
  Monitor, 
  Settings, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Cast,
  Maximize2,
  Minimize2,
  Tv,
  Layout,
  RefreshCw,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type Role = 'host' | 'source';

interface PeerData {
  id: string;
  role: Role;
  name: string;
}

// --- Components ---

const HostInterface = ({ socket }: { socket: Socket }) => {
  const [sources, setSources] = useState<PeerData[]>([]);
  const [showDummies, setShowDummies] = useState(false);
  const [peers, setPeers] = useState<{ [id: string]: Peer.Instance }>({});
  const [streams, setStreams] = useState<{ [id: string]: MediaStream }>({});
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [resolution, setResolution] = useState<'HD' | 'FullHD'>('HD');

  const mainVideoRef = useRef<HTMLVideoElement>(null);

  const dummySources: PeerData[] = [
    { id: 'dummy-1', name: 'iPhone 15 Pro (Dummy)', role: 'source' },
    { id: 'dummy-2', name: 'Samsung S24 Ultra', role: 'source' },
    { id: 'dummy-3', name: 'Google Pixel 8 Pro', role: 'source' },
    { id: 'dummy-4', name: 'Xiaomi 14 Ultra', role: 'source' },
    { id: 'dummy-5', name: 'OnePlus 12', role: 'source' },
  ];

  const allSources = showDummies ? [...sources, ...dummySources] : sources;

  useEffect(() => {
    socket.on('peers-update', (allPeers: PeerData[]) => {
      const sourcePeers = allPeers.filter(p => p.role === 'source');
      setSources(sourcePeers);
    });

    socket.on('signal', ({ senderId, signal }: { senderId: string, signal: any }) => {
      setPeers(prev => {
        const peer = prev[senderId];
        if (peer) {
          peer.signal(signal);
        } else {
          const newPeer = createPeer(senderId, false);
          newPeer.signal(signal);
          return { ...prev, [senderId]: newPeer };
        }
        return prev;
      });
    });

    socket.on('source-left', (id: string) => {
      setPeers(prev => {
        if (prev[id]) {
          prev[id].destroy();
          const { [id]: _, ...rest } = prev;
          return rest;
        }
        return prev;
      });
      setStreams(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      if (activeSourceId === id) setActiveSourceId(null);
    });

    return () => {
      socket.off('peers-update');
      socket.off('signal');
      socket.off('source-left');
    };
  }, [socket, activeSourceId]);

  const createPeer = (targetId: string, initiator: boolean) => {
    const peer = new Peer({
      initiator,
      trickle: false,
    });

    peer.on('signal', signal => {
      socket.emit('signal', { targetId, signal });
    });

    peer.on('stream', stream => {
      setStreams(prev => ({ ...prev, [targetId]: stream }));
    });

    peer.on('error', err => console.error('Peer error:', err));

    return peer;
  };

  useEffect(() => {
    sources.forEach(source => {
      if (!peers[source.id]) {
        const newPeer = createPeer(source.id, false); 
        setPeers(prev => ({ ...prev, [source.id]: newPeer }));
      }
    });
  }, [sources]);

  useEffect(() => {
    if (mainVideoRef.current && activeSourceId && streams[activeSourceId]) {
      mainVideoRef.current.srcObject = streams[activeSourceId];
    }
  }, [activeSourceId, streams]);

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0B] text-[#E4E4E7] font-sans p-6 gap-4 overflow-hidden select-none">
      {/* Header Section */}
      <header className="flex items-center justify-between bg-[#18181B] border border-[#27272A] rounded-2xl px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#3B82F6] p-2 rounded-lg">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">STREAMCORE <span className="text-[#3B82F6] text-xs ml-1 opacity-80">Studio v2.5</span></h1>
            <p className="text-xs text-[#A1A1AA]">TikTok Live Multi-Source Interface • {resolution} Output</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 ${sources.length > 0 ? 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-zinc-600'} rounded-full`}></div>
            <span className="text-sm font-mono tracking-tighter">00:42:15</span>
          </div>
          <div className="h-8 w-px bg-[#27272A]"></div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-[#71717A] font-bold tracking-widest">Network Load</span>
            <span className="text-sm font-mono">1.4 MB/s</span>
          </div>
          <button className="bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-2 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2">
            <Cast className="w-4 h-4" /> START LIVE
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        
        {/* Left Column: Source Switcher */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-[#18181B] border border-[#27272A] rounded-3xl p-4 flex flex-col gap-4 overflow-hidden">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-xs font-bold text-[#71717A] uppercase tracking-wider">Mobile Sources ({allSources.length})</h2>
              <button 
                onClick={() => setShowDummies(!showDummies)}
                className={`p-1.5 rounded-lg border transition-all ${showDummies ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-zinc-800/50 border-[#27272A] text-zinc-500 hover:text-zinc-300'}`}
                title="Toggle Dummy Sources"
              >
                <RefreshCw className={`w-3 h-3 ${showDummies ? '' : 'animate-spin-slow'}`} />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 scrollbar-hide">
              {allSources.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 space-y-3 opacity-50 px-4 text-center">
                  <Smartphone className="w-10 h-10 mb-2" />
                  <p className="text-xs font-bold tracking-tight">WAITING FOR SOURCES...</p>
                  <p className="text-[10px] leading-relaxed">Connect your mobile devices using the 'Remote Source' mode.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {allSources.map(source => (
                    <div 
                      key={source.id}
                      onClick={() => setActiveSourceId(source.id)}
                      className={`group relative bg-[#09090B] border-2 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
                        activeSourceId === source.id ? 'border-[#3B82F6]' : 'border-[#27272A] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="aspect-[9/16] bg-[#18181B] relative flex items-center justify-center">
                        {streams[source.id] ? (
                          <video 
                            autoPlay 
                            playsInline 
                            muted 
                            className={`w-full h-full object-cover ${activeSourceId === source.id ? '' : 'grayscale opacity-60'}`}
                            // @ts-ignore
                            ref={el => { if(el && streams[source.id]) el.srcObject = streams[source.id] }}
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${source.id.startsWith('dummy') ? 'from-zinc-900 to-zinc-950' : 'from-black to-zinc-900'}`}>
                             <Video className={`w-6 h-6 ${activeSourceId === source.id ? 'text-blue-500' : 'text-zinc-800'} opacity-20`} />
                             {source.id.startsWith('dummy') && (
                                <div className="absolute inset-x-0 bottom-4 text-center">
                                   <span className="text-[7px] font-black tracking-widest text-zinc-700 uppercase">MOCK</span>
                                </div>
                             )}
                          </div>
                        )}
                        {activeSourceId === source.id && (
                          <div className="absolute top-2 left-2 bg-[#3B82F6] text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg">ACTIVE</div>
                        )}
                      </div>
                      <div className="p-2 bg-[#111114] border-t border-[#27272A]">
                        <p className={`text-[10px] font-bold truncate ${source.id.startsWith('dummy') ? 'text-zinc-500' : 'text-white'}`}>{source.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[8px] text-[#71717A] font-mono">{source.id.slice(0, 4)}</span>
                          <span className={`text-[8px] font-black ${source.id.startsWith('dummy') ? 'text-orange-500/50' : 'text-[#22C55E]'}`}>
                            {source.id.startsWith('dummy') ? 'OFF' : 'HD'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Column: Program Preview */}
        <div className="col-span-6 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-[#18181B] border border-[#27272A] rounded-3xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#27272A] flex justify-between items-center bg-[#111114]">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-[#EF4444] rounded-full"></div>
                 <span className="text-xs font-black text-[#EF4444] tracking-wider uppercase">Program Monitor</span>
              </div>
              <div className="flex bg-[#09090B] rounded-xl p-1 border border-[#27272A]">
                <button 
                  onClick={() => setAspectRatio('16:9')}
                  className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${aspectRatio === '16:9' ? 'bg-[#27272A] text-white shadow-lg' : 'text-[#71717A] hover:text-zinc-400'}`}
                >
                  16:9 DESKTOP
                </button>
                <button 
                  onClick={() => setAspectRatio('9:16')}
                  className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${aspectRatio === '9:16' ? 'bg-[#27272A] text-white shadow-lg' : 'text-[#71717A] hover:text-zinc-400'}`}
                >
                  9:16 VERTICAL
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-[#050505] flex items-center justify-center relative p-8 group">
              <div 
                className={`bg-zinc-900 shadow-2xl relative transition-all duration-500 overflow-hidden ring-1 ring-white/10 ${
                  aspectRatio === '9:16' ? 'h-full aspect-[9/16]' : 'w-full aspect-video'
                }`}
              >
                {activeSourceId && (streams[activeSourceId] || activeSourceId.startsWith('dummy')) ? (
                  <div className="w-full h-full relative">
                    {streams[activeSourceId] ? (
                      <video
                        ref={mainVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        // @ts-ignore
                        ref={el => { if(el && streams[activeSourceId]) el.srcObject = streams[activeSourceId]; mainVideoRef.current = el; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <Video className="w-12 h-12 text-zinc-800 animate-pulse" />
                      </div>
                    )}
                    
                    {/* Source Identity Overlay */}
                    <div className="absolute bottom-6 left-6 z-30">
                       <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl">
                          <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                          <div className="flex flex-col">
                             <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Active Source</span>
                             <span className="text-xs font-bold text-white tracking-tight">{allSources.find(s => s.id === activeSourceId)?.name}</span>
                          </div>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-800 space-y-4">
                    <Video className="w-16 h-16 opacity-5" />
                    <p className="text-[10px] font-black tracking-[0.2em] text-zinc-700">NO SIGNAL DETECTED</p>
                  </div>
                )}

                {/* On Screen Display Overlay */}
                <div className="absolute top-6 left-6 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded text-[10px] font-mono border border-white/10 text-[#3B82F6]">BITRATE: 6420 kbps</div>
                   <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded text-[10px] font-mono border border-white/10 text-white/50">RES: {aspectRatio} HD</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#09090B] border-t border-[#27272A] flex justify-between items-center">
              <div className="flex gap-2">
                <button className="p-2.5 bg-[#18181B] border border-[#27272A] rounded-xl hover:bg-[#27272A] transition-colors"><Settings className="w-4 h-4 text-[#A1A1AA]" /></button>
                <button className="p-2.5 bg-[#18181B] border border-[#27272A] rounded-xl hover:bg-[#27272A] transition-colors"><Layout className="w-4 h-4 text-[#A1A1AA]" /></button>
              </div>
              <div className="flex gap-3">
                <button className="px-6 py-2.5 bg-[#3B82F6] text-[11px] font-bold rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-transform active:scale-95">TRANSITION: FADE (0.5s)</button>
                <button className="px-6 py-2.5 bg-[#27272A] text-[11px] font-bold rounded-xl border border-[#3F3F46] hover:bg-[#3F3F46] transition-all">AUTO-SWITCHER</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Audio & Controls */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          {/* Audio Mixer */}
          <div className="h-1/2 bg-[#18181B] border border-[#27272A] rounded-3xl p-5 flex flex-col">
            <h3 className="text-xs font-bold text-[#71717A] uppercase tracking-widest mb-4">Audio Control</h3>
            <div className="flex-1 flex gap-4 min-h-0">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-1 flex flex-col">
                   <div className="flex-1 bg-[#09090B] border border-[#27272A] rounded-xl flex flex-col-reverse items-center p-2">
                     <div 
                      className={`w-2.5 bg-gradient-to-t rounded-full transition-all duration-500 ${
                        i === 0 ? 'h-[85%] from-[#3B82F6] to-[#60A5FA]' : 
                        i === 1 ? 'h-[10%] from-[#27272A] to-[#3F3F46]' : 
                        'h-[60%] from-[#EF4444] to-[#F87171] shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                      }`}
                     ></div>
                   </div>
                   <span className="text-[9px] text-center mt-3 font-bold text-[#71717A]">{i === 0 ? 'MAIN' : i === 1 ? 'CAM 2' : 'MIC'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Analytics Bento */}
          <div className="flex-1 bg-[#18181B] border border-[#27272A] rounded-3xl p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A] shadow-inner">
                <p className="text-[10px] text-[#71717A] font-bold tracking-widest mb-1 uppercase">Viewers</p>
                <div className="flex items-baseline gap-1">
                   <p className="text-xl font-black text-white">12.4K</p>
                   <span className="text-[9px] text-[#22C55E]">+14%</span>
                </div>
              </div>
              <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A] shadow-inner">
                <p className="text-[10px] text-[#71717A] font-bold tracking-widest mb-1 uppercase">Likes</p>
                <p className="text-xl font-black text-white">482K</p>
              </div>
            </div>
            <div className="flex-1 bg-[#09090B] border border-[#27272A] rounded-2xl p-4 flex flex-col min-h-0 shadow-inner">
              <p className="text-[10px] text-[#71717A] font-bold mb-3 tracking-widest uppercase flex items-center justify-between">
                Live Chat
                <span className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full animate-pulse"></span>
              </p>
              <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-1 scrollbar-hide text-[11px]">
                <p className="animate-in fade-in slide-in-from-bottom-2 duration-300"><span className="font-black text-[#3B82F6] mr-1 underline underline-offset-2">Alex:</span> Mantap bang! Camera jernih.</p>
                <p className="animate-in fade-in slide-in-from-bottom-2 duration-400 opacity-80"><span className="font-black text-[#A855F7] mr-1">Sarah:</span> How do you switch sources?</p>
                <p className="animate-in fade-in slide-in-from-bottom-2 duration-500 opacity-60"><span className="font-black text-[#F59E0B] mr-1 text-orange-400">Rizky:</span> Setup PC keren nian..</p>
                <p className="animate-in fade-in slide-in-from-bottom-2 duration-600 opacity-40"><span className="font-black text-[#EF4444] mr-1">Zacky:</span> Gas terusss!</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="flex justify-between items-center text-[10px] text-[#71717A] px-2 font-mono mt-1">
        <div className="flex gap-8">
          <span className="flex items-center gap-2"><div className="w-1 h-1 bg-[#3B82F6] rounded-full"></div> STORAGE: 124GB FREE</span>
          <span>KEY: TI-••••-••••-M7K2</span>
          <span className="text-[#22C55E] font-bold">● STUDIO ENCRYPTION ACTIVE</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="opacity-50">DROPPED FRAMES: 0 (0.0%)</span>
          <div className="flex gap-0.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`w-1 h-3 ${i < 5 ? 'bg-[#22C55E]' : 'bg-[#EF4444]/20'} transition-colors`}></div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

const SourceInterface = ({ socket }: { socket: Socket }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState(`Phone ${Math.floor(Math.random() * 1000)}`);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer.Instance | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            aspectRatio: 9/16,
            facingMode: 'user'
          },
          audio: true
        });
        setStream(media);
        if (videoRef.current) videoRef.current.srcObject = media;
      } catch (err) {
        console.error("Camera error:", err);
        setError("Could not access camera. Please allow permissions.");
      }
    };

    startCamera();

    socket.on('signal', ({ senderId, signal }: { senderId: string, signal: any }) => {
      if (peerRef.current) {
        peerRef.current.signal(signal);
      }
    });

    return () => {
      socket.off('signal');
      if (peerRef.current) peerRef.current.destroy();
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const connectToHost = () => {
    if (!stream) return;

    socket.emit('join', { role: 'source', name });

    socket.on('peers-update', (peers: PeerData[]) => {
      const host = peers.find(p => p.role === 'host');
      if (host && !peerRef.current) {
        initiatePeer(host.id);
      }
    });
    setConnected(true);
  };

  const initiatePeer = (hostId: string) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream!
    });

    peer.on('signal', signal => {
      socket.emit('signal', { targetId: hostId, signal });
    });

    peer.on('error', err => {
      console.error('Peer error:', err);
      setConnected(false);
      peerRef.current = null;
    });

    peerRef.current = peer;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] flex flex-col font-sans select-none overflow-hidden">
      <div className="relative flex-1 bg-black overflow-hidden">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-800 animate-pulse">
            <Camera className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-xs font-black tracking-widest">{error ? "PERMISSIONS DENIED" : "CHAMBER INITIALIZING..."}</p>
          </div>
        )}
        
        {/* Cinematic Overlays */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        
        {/* HUD: Header */}
        <div className="absolute top-8 left-6 right-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
             <div className="bg-white/5 backdrop-blur-3xl p-3 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
               <Smartphone className="w-6 h-6 text-[#3B82F6]" />
             </div>
             <div className="flex flex-col">
                <h3 className="font-black text-base uppercase tracking-tighter italic">Remote Client <span className="text-[#3B82F6] opacity-50">V1.0</span></h3>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full"></div>
                   <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Live Path Secure</p>
                </div>
             </div>
          </div>
          {connected && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#22C55E]/10 backdrop-blur-2xl px-4 py-2 rounded-full border border-[#22C55E]/30 flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[10px] font-black text-[#22C55E] tracking-widest uppercase">Streaming To Switcher</span>
            </motion.div>
          )}
        </div>

        {/* HUD: Controls */}
        <div className="absolute bottom-10 inset-x-6 z-20">
           <motion.div 
            layout
            className="bg-[#0F0F11]/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/5"
           >
              {!connected ? (
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-600 uppercase ml-1 tracking-[0.3em]">Device Identity</label>
                      <div className="relative group">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-[#3B82F6] transition-colors" />
                        <input 
                          type="text" 
                          value={name} 
                          onChange={e => setName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-12 pr-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all placeholder:text-zinc-700"
                          placeholder="Device Name..."
                        />
                      </div>
                   </div>
                   <button
                    onClick={connectToHost}
                    disabled={!stream}
                    className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-black py-5 rounded-2xl transition-all shadow-[0_20px_40px_rgba(59,130,246,0.25)] active:scale-95 disabled:opacity-20 flex items-center justify-center gap-4 text-sm tracking-widest"
                  >
                    <RefreshCw className="w-5 h-5" /> BROADCAST TO STUDIO
                  </button>
                  <div className="pt-2 px-4 text-center">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                      By broadcasting, you authorize studio.switcher to intercept this camera stream for live program mix.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center space-y-6 py-6">
                  <div className="w-20 h-20 bg-[#3B82F6]/10 rounded-full flex items-center justify-center text-[#3B82F6] ring-1 ring-[#3B82F6]/30 relative">
                     <Cast className="w-10 h-10" />
                     <div className="absolute inset-0 rounded-full border border-[#3B82F6] animate-ping opacity-20 scale-150"></div>
                  </div>
                  <div className="space-y-2 border-y border-white/5 py-6 w-full">
                    <p className="text-xl font-black italic tracking-tighter uppercase">Signal Locked</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] leading-relaxed px-12">
                      Your HD feed is currently being routed to the professional switcher console.
                    </p>
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="text-[10px] font-black text-red-500/60 hover:text-red-500 tracking-[0.4em] uppercase py-2 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}
           </motion.div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleSelectRole = (selectedRole: Role) => {
    if (selectedRole === 'host' && socket) {
      socket.emit('join', { role: 'host', name: 'PC Main Control' });
    }
    setRole(selectedRole);
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] flex items-center justify-center p-8 font-sans select-none">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-8 relative">
           {/* Decorative BG elements */}
           <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#3B82F6]/5 blur-[120px] rounded-full" />
           <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#EF4444]/5 blur-[120px] rounded-full" />

           <div className="col-span-full text-center space-y-4 mb-12">
              <div className="flex items-center justify-center gap-3 mb-2">
                 <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-[#3B82F6]"></div>
                 <Cast className="w-8 h-8 text-[#3B82F6]" />
                 <div className="w-12 h-0.5 bg-gradient-to-l from-transparent to-[#3B82F6]"></div>
              </div>
              <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-b from-white via-white to-zinc-700 bg-clip-text text-transparent tracking-tighter italic">
                STUDIO CORE
              </h1>
              <p className="text-[#71717A] text-xs font-bold tracking-[0.5em] uppercase">Wireless Broadcast Infrastructure</p>
           </div>
           
           <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectRole('host')}
            className="bg-[#18181B] border-2 border-[#27272A] hover:border-[#3B82F6]/50 p-10 rounded-[3rem] flex flex-col items-center text-center space-y-8 transition-all group relative overflow-hidden shadow-2xl"
           >
              <div className="absolute inset-0 bg-[#3B82F6]/0 group-hover:bg-[#3B82F6]/5 transition-colors duration-500"></div>
              <div className="relative p-8 bg-[#1B1B1E] rounded-[2rem] border border-[#27272A] group-hover:border-[#3B82F6]/30 group-hover:text-[#3B82F6] transition-all shadow-inner">
                <Monitor className="w-14 h-14" />
              </div>
              <div className="relative space-y-3 px-4">
                <h2 className="text-3xl font-black tracking-tighter italic uppercase">Broadcaster</h2>
                <p className="text-xs text-[#71717A] font-medium leading-relaxed tracking-wide px-4">Control the live stream, mix multiple camera sources, and manage the program monitor from your workstation.</p>
              </div>
           </motion.button>

           <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectRole('source')}
            className="bg-[#18181B] border-2 border-[#27272A] hover:border-[#EF4444]/50 p-10 rounded-[3rem] flex flex-col items-center text-center space-y-8 transition-all group relative overflow-hidden shadow-2xl"
           >
              <div className="absolute inset-0 bg-[#EF4444]/0 group-hover:bg-[#EF4444]/5 transition-colors duration-500"></div>
              <div className="relative p-8 bg-[#1B1B1E] rounded-[2rem] border border-[#27272A] group-hover:border-[#EF4444]/30 group-hover:text-[#EF4444] transition-all shadow-inner">
                <Smartphone className="w-14 h-14" />
              </div>
              <div className="relative space-y-3 px-4">
                <h2 className="text-3xl font-black tracking-tighter italic uppercase">Remote Feed</h2>
                <p className="text-xs text-[#71717A] font-medium leading-relaxed tracking-wide px-4">Turn your mobile device into a dedicated wireless camera feed for the Studio Switcher. Supports Full HD 60fps.</p>
              </div>
           </motion.button>

           <div className="col-span-full mt-12 flex justify-center gap-12 opacity-30">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-black uppercase tracking-widest">Latency</span>
                 <span className="font-mono text-sm">~150ms</span>
              </div>
              <div className="w-px h-8 bg-zinc-800 self-center"></div>
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-black uppercase tracking-widest">Protocol</span>
                 <span className="font-mono text-sm">WebRTC</span>
              </div>
              <div className="w-px h-8 bg-zinc-800 self-center"></div>
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-black uppercase tracking-widest">Enc</span>
                 <span className="font-mono text-sm">VP8/9</span>
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (!socket) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={role}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full"
      >
        {role === 'host' ? (
          <HostInterface socket={socket} />
        ) : (
          <SourceInterface socket={socket} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

