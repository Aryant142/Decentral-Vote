import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { blockchainService } from '../services/blockchainService';
import { toast } from 'react-hot-toast';
import { Shield, CheckCircle, Clock, XCircle, Wallet, Fingerprint, Upload, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { Candidate } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      setCandidates(snapshot.docs.map(doc => doc.data() as Candidate));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      const counts: Record<string, number> = {};
      for (const candidate of candidates) {
        counts[candidate.id] = await blockchainService.getResults(candidate.id);
      }
      setResults(counts);
    };

    if (candidates.length > 0) {
      fetchResults();
      const interval = setInterval(fetchResults, 10000);
      return () => clearInterval(interval);
    }
  }, [candidates]);

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

  const handleUploadKYC = async () => {
    const loadingToast = toast.loading('Uploading document...');
    setTimeout(async () => {
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            kycDocumentUrl: 'https://picsum.photos/seed/doc/800/1200', // Mock document URL
            kycStatus: 'pending'
          });
          toast.success('Document uploaded successfully!', { id: loadingToast });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
          toast.error('Failed to upload document', { id: loadingToast });
        }
      }
    }, 2000);
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
                  onClick={handleUploadKYC}
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Documents</span>
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
              onClick={handleUploadKYC}
              className="w-full flex items-center justify-center space-x-2 bg-neutral-900 text-white py-3 rounded-xl hover:bg-neutral-800 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Re-upload Documents</span>
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
        <div className="p-8 border-b border-neutral-100">
          <h3 className="text-xl font-bold">Personal Information</h3>
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

      {/* Election Results Section */}
      <section className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-neutral-100 flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          <h3 className="text-xl font-bold">Live Election Results</h3>
        </div>
        <div className="p-8 space-y-6">
          {candidates.length === 0 ? (
            <p className="text-neutral-500 italic">No candidates registered yet.</p>
          ) : (
            candidates.map((candidate) => {
              const votes = results[candidate.id] || 0;
              const totalVotes = (Object.values(results) as number[]).reduce((a, b) => a + b, 0);
              const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
              
              return (
                <div key={candidate.id} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="font-bold text-neutral-900">{candidate.name}</span>
                      <span className="text-xs text-neutral-500 ml-2">{candidate.party}</span>
                    </div>
                    <span className="text-sm font-bold text-indigo-600">{votes} Votes</span>
                  </div>
                  <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full bg-indigo-600 rounded-full"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
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
