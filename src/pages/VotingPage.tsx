import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { blockchainService } from '../services/blockchainService';
import { Candidate, Election } from '../types';
import { toast } from 'react-hot-toast';
import { Vote, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

const VotingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [election, setElection] = useState<Election | null>(null);
  const [electionLoading, setElectionLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    // Fetch the active election for user's state
    const unsubscribeElection = onSnapshot(collection(db, 'elections'), (snapshot) => {
      const activeElection = snapshot.docs
        .map(doc => doc.data() as Election)
        .find(e => e.status === 'active' && e.state === user?.state);
      
      setElection(activeElection || null);
      setElectionLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'elections');
      setElectionLoading(false);
    });

    // Listen to candidates for the active election
    let unsubscribeCandidates = () => {};
    if (election) {
      const q = query(collection(db, 'candidates'), where('electionId', '==', election.id));
      unsubscribeCandidates = onSnapshot(q, (snapshot) => {
        setCandidates(snapshot.docs.map(doc => doc.data() as Candidate));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'candidates');
      });
    }

    // Listen to user's vote status
    let unsubscribeVote: () => void = () => {};
    if (user) {
      unsubscribeVote = onSnapshot(doc(db, 'votes', user.uid), (docSnap) => {
        setHasVoted(docSnap.exists());
      }, (error) => {
        // We might get permission denied if the doc doesn't exist yet and rules are strict, 
        // but usually read is allowed for owner.
        console.log("Vote status check:", error.message);
      });
    }

    return () => {
      unsubscribeCandidates();
      unsubscribeElection();
      unsubscribeVote();
    };
  }, [user, election?.id]);

  const handleVote = async (candidateId: string) => {
    if (!user || user.kycStatus !== 'approved') {
      toast.error('You must be KYC verified to vote.');
      return;
    }

    if (!user.walletAddress) {
      toast.error('Please connect your MetaMask wallet in the dashboard.');
      return;
    }

    if (hasVoted) {
      toast.error('You have already cast your vote.');
      return;
    }

    setIsVoting(true);
    try {
      // 1. Cast vote on blockchain
      const tx = await blockchainService.castVote(candidateId, user.walletAddress);
      
      // 2. Record vote in Firestore (to prevent double voting check in UI)
      try {
        await setDoc(doc(db, 'votes', user.uid), {
          voterUid: user.uid,
          walletAddress: user.walletAddress,
          candidateId: candidateId,
          txHash: (tx as any).hash,
          timestamp: serverTimestamp()
        });
        toast.success('Vote cast successfully on blockchain!');
      } catch (fsError: any) {
        handleFirestoreError(fsError, OperationType.WRITE, `votes/${user.uid}`);
        toast.error('Vote cast on blockchain but failed to record status locally.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cast vote on blockchain');
    } finally {
      setIsVoting(false);
    }
  };

  if (!user || electionLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-neutral-500 font-medium">
          {!user ? 'Loading your profile...' : 'Checking for active elections...'}
        </p>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center space-y-8">
        <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-12 h-12 text-neutral-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Voting Not Available</h1>
          {!user?.state ? (
            <div className="space-y-4">
              <p className="text-neutral-500 text-lg">
                Your profile is missing your <strong>State of Residence</strong>. 
                Please update your profile to see elections in your area.
              </p>
              <Link 
                to="/dashboard"
                className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <>
              <p className="text-neutral-500 text-lg">
                There are no active elections for <strong>{user.state}</strong> at this time. Please check back later or contact the administrator.
              </p>
              <div className="pt-8">
                <button 
                  onClick={() => window.location.reload()}
                  className="px-8 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-all"
                >
                  Refresh Page
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tight">Active Election</h1>
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {election.status}
            </span>
            <span className="text-neutral-500 font-medium">{election.title}</span>
          </div>
          
          {/* Quick Stats Summary */}
          <div className="flex space-x-8 bg-white px-8 py-4 rounded-2xl border border-neutral-100 shadow-sm">
            <div className="text-center">
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Total Candidates</p>
              <p className="text-2xl font-black text-indigo-600">{candidates.length}</p>
            </div>
            <div className="w-px bg-neutral-100 h-10 self-center"></div>
            <div className="text-center">
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Election State</p>
              <p className="text-2xl font-black text-indigo-600">{election.state}</p>
            </div>
          </div>
        </div>
      </header>

      {user.kycStatus !== 'approved' && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-start space-x-4">
          <AlertCircle className="w-6 h-6 text-amber-600 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-amber-900">Verification Required</h3>
            <p className="text-amber-700">Your account must be KYC verified by an admin before you can cast a vote. Please check your dashboard for status updates.</p>
          </div>
        </div>
      )}

      {hasVoted && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl flex items-start space-x-4">
          <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-green-900">Vote Recorded</h3>
            <p className="text-green-700">Your vote has been successfully recorded on the blockchain. Thank you for participating in the democratic process!</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {candidates.map((candidate) => (
          <motion.div 
            key={candidate.id}
            whileHover={{ y: -5 }}
            className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="h-48 bg-neutral-100 relative">
              {candidate.imageUrl ? (
                <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Vote className="w-16 h-16 text-neutral-300" />
                </div>
              )}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                {candidate.party}
              </div>
            </div>
            <div className="p-6 flex-grow space-y-4">
              <div>
                <h3 className="text-2xl font-bold">{candidate.name}</h3>
                <p className="text-neutral-500 text-sm mt-1">{candidate.description || 'No description available.'}</p>
              </div>
              
              <div className="flex items-center justify-center pt-4 border-t border-neutral-50">
                <button 
                  onClick={() => handleVote(candidate.id)}
                  disabled={isVoting || user.kycStatus !== 'approved' || hasVoted}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {hasVoted ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Voted</span>
                    </>
                  ) : (
                    <>
                      <Vote className="w-4 h-4" />
                      <span>{isVoting ? 'Voting...' : 'Vote'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {candidates.length === 0 && (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-neutral-200">
          <Vote className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
          <p className="text-neutral-400 font-medium">No candidates have been registered for this election.</p>
        </div>
      )}
    </div>
  );
};

export default VotingPage;
