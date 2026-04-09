import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { blockchainService } from '../services/blockchainService';
import { toast } from 'react-hot-toast';
import { Shield, CheckCircle, Clock, XCircle, Wallet, Fingerprint, Upload, Camera, RefreshCw, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INDIAN_STATES } from '../constants';
import { useRef } from 'react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUpdatingState, setIsUpdatingState] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const address = await blockchainService.connectWallet();
      setWalletAddress(address);
      
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            walletAddress: address
          });
          toast.success('Wallet connected and saved!');
        } catch (fsError: any) {
          handleFirestoreError(fsError, OperationType.UPDATE, `users/${user.uid}`);
          toast.error('Wallet connected but failed to save to profile');
        }
      }
    } catch (error: any) {
      // Don't log MetaMask errors as Firestore errors
      if (error.message === 'Please install MetaMask') {
        toast.error('MetaMask not found. Please install the extension or use a compatible browser.');
      } else {
        toast.error(error.message || 'Failed to connect wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUpdateState = async (newState: string) => {
    if (!user) return;
    setIsUpdatingState(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        state: newState,
        updatedAt: new Date().toISOString()
      });
      toast.success('State updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error('Failed to update state');
    } finally {
      setIsUpdatingState(false);
    }
  };
  const handleUploadKYC = async () => {
    if (!capturedImage) {
      toast.error('Please capture a photo of your voter card first.');
      return;
    }

    const loadingToast = toast.loading('Uploading document...');
    try {
      if (user && user.uid) {
        console.log("Uploading KYC for user:", user.uid, "Image length:", capturedImage.length);
        await updateDoc(doc(db, 'users', user.uid), {
          kycDocumentUrl: capturedImage,
          kycStatus: 'pending',
          updatedAt: new Date().toISOString()
        });
        toast.success('Voter card uploaded successfully!', { id: loadingToast });
        setIsCameraOpen(false);
        setCapturedImage(null);
      } else {
        throw new Error("User profile not found. Please try logging out and back in.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error('Failed to upload document', { id: loadingToast });
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Could not access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Ensure video is actually playing and has dimensions
      if (video.videoWidth === 0) return;

      // Resize to a reasonable size (max width 800px)
      const maxWidth = 800;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Lower quality to save space
        setCapturedImage(dataUrl);
        stopCameraStream(); // Stop the stream but keep modal open to show preview
      }
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-neutral-500 font-medium">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Voter Dashboard</h1>
          <p className="text-neutral-500 mt-2">Manage your identity and voting status</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-full border border-neutral-200 flex items-center space-x-2 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span>Online</span>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* KYC Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 space-y-6"
        >
          <div className="flex justify-between items-start">
            <div className="bg-indigo-50 p-3 rounded-2xl">
              <Shield className="w-8 h-8 text-indigo-600" />
            </div>
            <StatusBadge status={user.kycStatus} />
          </div>
          <div>
            <h3 className="text-xl font-bold">KYC Verification</h3>
            <p className="text-neutral-500 text-sm mt-1">Required to generate your DID and cast votes.</p>
          </div>
          {user.kycStatus === 'pending' && (
            <div className="space-y-4">
              {!user.kycDocumentUrl ? (
                <button 
                  onClick={startCamera}
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Voter Card</span>
                </button>
              ) : (
                <div className="bg-amber-50 p-4 rounded-xl flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-700">Your verification is in progress. Admins will review your documents shortly.</p>
                </div>
              )}
            </div>
          )}
          {user.kycStatus === 'rejected' && (
            <button 
              onClick={startCamera}
              className="w-full flex items-center justify-center space-x-2 bg-neutral-900 text-white py-3 rounded-xl hover:bg-neutral-800 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Re-capture Voter Card</span>
            </button>
          )}
          {user.kycStatus === 'approved' && (
            <div className="bg-green-50 p-4 rounded-xl flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <p className="text-sm text-green-700">Identity verified. You are eligible to vote.</p>
            </div>
          )}
        </motion.div>

        {/* DID Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 space-y-6"
        >
          <div className="bg-purple-50 p-3 rounded-2xl w-fit">
            <Fingerprint className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Decentralized ID (DID)</h3>
            <p className="text-neutral-500 text-sm mt-1">Your unique, blockchain-based identity.</p>
          </div>
          {user.did ? (
            <div className="bg-neutral-50 p-4 rounded-xl break-all font-mono text-xs text-neutral-600 border border-neutral-100">
              {user.did}
            </div>
          ) : (
            <div className="text-neutral-400 text-sm italic">
              DID will be generated once KYC is approved.
            </div>
          )}
        </motion.div>

        {/* Wallet Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 space-y-6"
        >
          <div className="bg-orange-50 p-3 rounded-2xl w-fit">
            <Wallet className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Blockchain Wallet</h3>
            <p className="text-neutral-500 text-sm mt-1">Connect your MetaMask wallet to vote.</p>
          </div>
          {walletAddress ? (
            <div className="space-y-4">
              <div className="bg-neutral-50 p-4 rounded-xl break-all font-mono text-xs text-neutral-600 border border-neutral-100">
                {walletAddress}
              </div>
              <button 
                onClick={handleConnectWallet}
                className="text-indigo-600 text-sm font-bold hover:underline"
              >
                Change Wallet
              </button>
            </div>
          ) : (
            <button 
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          )}
        </motion.div>
      </div>

      {/* Profile Details */}
      <section className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
          <h3 className="text-xl font-bold">Personal Information</h3>
          <div className="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-xl">
            <MapPin className="w-4 h-4 text-indigo-600" />
            {user.state ? (
              <span className="text-sm font-bold text-indigo-600">{user.state}</span>
            ) : (
              <select 
                className="text-sm font-bold text-indigo-600 bg-transparent outline-none cursor-pointer"
                onChange={(e) => handleUpdateState(e.target.value)}
                defaultValue=""
                disabled={isUpdatingState}
              >
                <option value="" disabled>Select State</option>
                {INDIAN_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8 p-8">
          <InfoItem label="Full Name" value={user.name} />
          <InfoItem label="Email Address" value={user.email} />
          <div className="space-y-1">
            <p className="text-sm text-neutral-500 font-medium">Aadhaar ID</p>
            {user.aadhaarId === 'PENDING' ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Enter 12-digit Aadhaar"
                  className="text-sm px-3 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  maxLength={12}
                  id="aadhaar-input"
                />
                <button 
                  onClick={async () => {
                    const input = document.getElementById('aadhaar-input') as HTMLInputElement;
                    const val = input.value;
                    if (val.length !== 12 || !/^\d+$/.test(val)) {
                      toast.error('Aadhaar must be 12 digits');
                      return;
                    }
                    try {
                      await updateDoc(doc(db, 'users', user.uid), {
                        aadhaarId: val,
                        updatedAt: new Date().toISOString()
                      });
                      toast.success('Aadhaar updated!');
                    } catch (e) {
                      toast.error('Failed to update Aadhaar');
                    }
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            ) : (
              <p className="text-lg font-semibold text-neutral-900">
                {user.aadhaarId.length === 12 
                  ? `•••• •••• ${user.aadhaarId.slice(-4)}` 
                  : user.aadhaarId}
              </p>
            )}
          </div>
          <InfoItem label="Account Type" value={user.role.toUpperCase()} />
        </div>
      </section>

      {/* Camera Capture Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#151619] rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${!capturedImage ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                  <h3 className="text-white font-mono text-sm tracking-widest uppercase">
                    {capturedImage ? 'Review Capture' : 'Live Feed // Environment'}
                  </h3>
                </div>
                <button onClick={closeCameraModal} className="text-white/40 hover:text-white transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="relative aspect-[4/3] bg-black rounded-3xl overflow-hidden border border-white/10 shadow-inner group">
                  {!capturedImage ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover opacity-80"
                    />
                  ) : (
                    <img 
                      src={capturedImage} 
                      alt="Captured Voter Card" 
                      className="w-full h-full object-contain"
                    />
                  )}
                  
                  {/* Technical Overlays */}
                  {!capturedImage && (
                    <>
                      <div className="absolute inset-0 border border-white/20 m-8 rounded-2xl pointer-events-none">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-500 -translate-x-1 -translate-y-1" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-500 translate-x-1 -translate-y-1" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-500 -translate-x-1 translate-y-1" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-500 translate-x-1 translate-y-1" />
                      </div>
                      <div className="absolute top-4 right-4 font-mono text-[10px] text-white/40 tracking-tighter">
                        REC [00:00:00:00]
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {!capturedImage ? (
                    <button 
                      onClick={capturePhoto}
                      className="col-span-2 bg-indigo-600 text-white py-5 rounded-2xl font-bold hover:bg-indigo-500 transition-all flex items-center justify-center space-x-3 shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-[0.98]"
                    >
                      <Camera className="w-6 h-6" />
                      <span className="font-mono tracking-widest uppercase text-sm">Initialize Capture</span>
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setCapturedImage(null);
                          startCamera();
                        }}
                        className="bg-white/5 text-white/70 py-5 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center space-x-3 border border-white/10"
                      >
                        <RefreshCw className="w-5 h-5" />
                        <span className="font-mono tracking-widest uppercase text-xs">Discard</span>
                      </button>
                      <button 
                        onClick={handleUploadKYC}
                        className="bg-green-600 text-white py-5 rounded-2xl font-bold hover:bg-green-500 transition-all flex items-center justify-center space-x-3 shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-[0.98]"
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-mono tracking-widest uppercase text-xs">Commit to Chain</span>
                      </button>
                    </>
                  )}
                </div>
                
                <p className="text-center text-white/20 font-mono text-[10px] tracking-widest uppercase">
                  Secure Identity Verification // AES-256 Encrypted
                </p>
              </div>
              
              <canvas ref={canvasRef} className="hidden" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: any = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
};

const InfoItem: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-sm text-neutral-500 font-medium">{label}</p>
    <p className="text-lg font-semibold text-neutral-900">{value}</p>
  </div>
);

export default Dashboard;
