import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, setDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { User, Candidate, Election } from '../types';
import { toast } from 'react-hot-toast';
import { Users, Check, X, ShieldCheck, Plus, Trash2, Eye, Filter, List, Edit2, Save, RotateCcw, AlertTriangle, Calendar, MapPin, BarChart3, Clock } from 'lucide-react';
import { INDIAN_STATES } from '../constants';
import { blockchainService } from '../services/blockchainService';
import { motion } from 'motion/react';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [results, setResults] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('pending');
  
  // Candidate Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    party: '',
    description: '',
    imageUrl: '',
    electionId: ''
  });

  // Election Form State
  const [isElectionModalOpen, setIsElectionModalOpen] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [electionFormData, setElectionFormData] = useState({
    title: '',
    state: INDIAN_STATES[0],
    status: 'upcoming' as const
  });

  // Reset Confirmation State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    const unsubscribeCandidates = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      setCandidates(snapshot.docs.map(doc => doc.data() as Candidate));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'candidates');
    });

    const unsubscribeElections = onSnapshot(collection(db, 'elections'), (snapshot) => {
      setElections(snapshot.docs.map(doc => doc.data() as Election));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'elections');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeCandidates();
      unsubscribeElections();
    };
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

  const openModal = (candidate?: Candidate) => {
    if (candidate) {
      setEditingCandidate(candidate);
      setFormData({
        name: candidate.name,
        party: candidate.party,
        description: candidate.description || '',
        imageUrl: candidate.imageUrl || '',
        electionId: candidate.electionId
      });
    } else {
      setEditingCandidate(null);
      setFormData({ 
        name: '', 
        party: '', 
        description: '', 
        imageUrl: '',
        electionId: elections.length > 0 ? elections[0].id : ''
      });
    }
    setIsModalOpen(true);
  };

  const openElectionModal = (election?: Election) => {
    if (election) {
      setEditingElection(election);
      setElectionFormData({
        title: election.title,
        state: election.state,
        status: election.status
      });
    } else {
      setEditingElection(null);
      setElectionFormData({
        title: '',
        state: INDIAN_STATES[0],
        status: 'upcoming'
      });
    }
    setIsElectionModalOpen(true);
  };

  const handleSaveElection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editingElection ? editingElection.id : `e-${Date.now()}`;
      const electionData: Election = {
        id,
        ...electionFormData
      };

      await setDoc(doc(db, 'elections', id), electionData);
      toast.success(editingElection ? 'Election updated!' : 'Election added!');
      setIsElectionModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'elections');
      toast.error('Failed to save election');
    }
  };

  const handleDeleteElection = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'elections', id));
      toast.success('Election deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `elections/${id}`);
      toast.error('Failed to delete election');
    }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editingCandidate ? editingCandidate.id : `c-${Date.now()}`;
      const candidateData: Candidate = {
        id,
        ...formData
      };

      await setDoc(doc(db, 'candidates', id), candidateData);
      toast.success(editingCandidate ? 'Candidate updated!' : 'Candidate added!');
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'candidates');
      toast.error('Failed to save candidate');
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteCandidate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'candidates', id));
      toast.success('Candidate deleted');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `candidates/${id}`);
      toast.error('Failed to delete candidate');
    }
  };

  const handleCancelElection = async () => {
    setResetLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Delete all candidates
      const candidatesSnap = await getDocs(collection(db, 'candidates'));
      candidatesSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 2. Delete all votes
      const votesSnap = await getDocs(collection(db, 'votes'));
      votesSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. Reset election status
      const electionRef = doc(db, 'elections', 'main-election');
      batch.set(electionRef, {
        status: 'upcoming',
        startDate: null,
        endDate: null
      }, { merge: true });

      await batch.commit();
      toast.success('Election cancelled and reset successfully!');
      setIsResetConfirmOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reset-election');
      toast.error('Failed to reset election');
    } finally {
      setResetLoading(false);
    }
  };

  const filteredUsers = activeTab === 'pending' 
    ? users.filter(u => u.kycStatus === 'pending')
    : users;

  const handleApproveKYC = async (userId: string) => {
    const user = users.find(u => u.uid === userId);
    if (!user?.kycDocumentUrl) {
      toast.error('Cannot approve user without documents.');
      return;
    }

    const loadingToast = toast.loading('Generating DID and approving...');
    try {
      // Generate DID via backend API
      const response = await fetch('/api/did/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) throw new Error('Failed to generate DID from server');
      
      const { did } = await response.json();

      await updateDoc(doc(db, 'users', userId), {
        kycStatus: 'approved',
        did: did
      });
      toast.success('KYC Approved and DID generated!', { id: loadingToast });
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to approve KYC', { id: loadingToast });
    }
  };

  const handleRejectKYC = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        kycStatus: 'rejected'
      });
      toast.error('KYC Rejected');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      toast.error('Failed to reject KYC');
    }
  };

  const seedDemoData = async () => {
    try {
      const electionId = 'main-election';
      const demoCandidates = [
        {
          id: "c-1775740264102",
          electionId,
          name: "Aryan",
          party: "bjp",
          description: "",
          imageUrl: "https://c8.alamy.com/comp/2TCXNXD/lotus-flower-symbol-political-party-sign-bjp-banner-background-election-symbol-bhartiya-janata-party-2TCXNXD.jpg"
        },
        {
          id: "c-1775740732461",
          electionId,
          name: "Aditya",
          party: "congress",
          description: "",
          imageUrl: "https://m.media-amazon.com/images/I/61FXpKlb+HL._SL1500_.jpg"
        },
        {
          id: "c-1775740800629",
          electionId,
          name: "Abhishek",
          party: "bsp",
          description: "",
          imageUrl: "https://www.peacockride.com/cdn/shop/files/Bsp_522a32c1-df4d-456d-8242-24b28e2af2fb_1024x1024.jpg?v=1683788610"
        },
        {
          id: "c-1775740905561",
          electionId,
          name: "Akshat",
          party: "sp",
          description: "",
          imageUrl: "https://m.media-amazon.com/images/I/71WptAonwpL._AC_UF1000,1000_QL80_.jpg"
        },
        {
          id: "c-1775741023716",
          electionId,
          name: "kush",
          party: "aap",
          description: "",
          imageUrl: "https://voteridcard.org.in/wp-content/uploads/2014/01/AAP_party_symbol.jpg"
        }
      ];

      for (const c of demoCandidates) {
        await setDoc(doc(db, 'candidates', c.id), c);
      }

      await setDoc(doc(db, 'elections', electionId), {
        id: electionId,
        title: 'State Election 2026',
        state: 'Uttar Pradesh',
        status: 'active',
        startDate: new Date().toISOString()
      });

      toast.success('Demo data seeded successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seed-data');
      toast.error('Failed to seed demo data');
    }
  };

  if (loading) return <div>Loading Admin Panel...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Admin Control Center</h1>
          <p className="text-neutral-500 mt-2">Manage users, verify identities, and control elections.</p>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center space-x-2 bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold hover:bg-red-100 transition-all border border-red-100"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Cancel Election</span>
          </button>
          <button 
            onClick={seedDemoData}
            className="bg-neutral-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200"
          >
            Seed Demo Data
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* User Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold">User Verification</h2>
            </div>
            <div className="flex bg-neutral-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('pending')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                <Filter className="w-4 h-4" />
                <span>Pending</span>
              </button>
              <button 
                onClick={() => setActiveTab('all')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                <List className="w-4 h-4" />
                <span>All Users</span>
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-neutral-600 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-sm font-bold text-neutral-600 uppercase tracking-wider">Aadhaar</th>
                  <th className="px-6 py-4 text-sm font-bold text-neutral-600 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-4 text-sm font-bold text-neutral-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-sm font-bold text-neutral-600 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 italic">
                      No users found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold">{user.name}</div>
                        <div className="text-xs text-neutral-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-neutral-600">
                        {user.aadhaarId}
                      </td>
                      <td className="px-6 py-4">
                        {user.kycDocumentUrl ? (
                          <button 
                            onClick={() => {
                              console.log("Viewing document for user:", user.uid, "URL length:", user.kycDocumentUrl?.length);
                              setViewingDoc(user.kycDocumentUrl!);
                            }}
                            className="flex items-center space-x-1 text-indigo-600 hover:underline text-sm font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Doc</span>
                          </button>
                        ) : (
                          <span className="text-neutral-400 text-xs italic">No doc</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          user.kycStatus === 'approved' ? 'bg-green-100 text-green-700' :
                          user.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {user.kycStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {user.kycStatus === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleApproveKYC(user.uid)}
                              className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleRejectKYC(user.uid)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {user.kycStatus === 'approved' && (
                          <ShieldCheck className="w-5 h-5 text-green-600 inline-block" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Live Election Results Section (Admin Only) */}
          <div className="space-y-6 pt-8 border-t border-neutral-100">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold">Live Election Results</h2>
            </div>

            <div className="grid md:grid-cols-1 gap-6">
              {elections.filter(e => e.status === 'active').map(election => {
                const electionCandidates = candidates.filter(c => c.electionId === election.id);
                const electionResults = electionCandidates.reduce((acc, c) => {
                  acc[c.id] = results[c.id] || 0;
                  return acc;
                }, {} as Record<string, number>);
                const totalVotes = (Object.values(electionResults) as number[]).reduce((a, b) => a + b, 0);

                return (
                  <div key={election.id} className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                      <div>
                        <h3 className="font-bold text-lg">{election.title}</h3>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">{election.state}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Active</span>
                    </div>
                    <div className="p-6 space-y-6">
                      {electionCandidates.length === 0 ? (
                        <p className="text-neutral-500 text-sm italic">No candidates registered.</p>
                      ) : (
                        electionCandidates.map(candidate => {
                          const votes = results[candidate.id] || 0;
                          const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                          return (
                            <div key={candidate.id} className="space-y-2">
                              <div className="flex justify-between items-end">
                                <div>
                                  <span className="font-bold text-neutral-900 text-sm">{candidate.name}</span>
                                  <span className="text-[10px] text-neutral-500 ml-2 uppercase">{candidate.party}</span>
                                </div>
                                <span className="text-xs font-bold text-indigo-600">{votes} Votes</span>
                              </div>
                              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
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
                  </div>
                );
              })}
              {elections.filter(e => e.status === 'active').length === 0 && (
                <div className="bg-white p-8 rounded-3xl border border-dashed border-neutral-200 text-center">
                  <Clock className="w-10 h-10 text-neutral-200 mx-auto mb-4" />
                  <p className="text-neutral-500 text-sm">No active elections to display results for.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Candidate Management */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold">Candidates</h2>
            </div>
            <button 
              onClick={() => openModal()}
              disabled={elections.length === 0}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              title={elections.length === 0 ? "Create an election first" : "Add Candidate"}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {candidates.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-neutral-200 text-center text-neutral-500">
                No candidates added yet.
              </div>
            ) : (
              candidates.map((candidate) => {
                const election = elections.find(e => e.id === candidate.electionId);
                return (
                  <div key={candidate.id} className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm flex justify-between items-center group">
                    <div className="flex items-center space-x-3">
                      {candidate.imageUrl && (
                        <img src={candidate.imageUrl} alt={candidate.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      )}
                      <div>
                        <div className="font-bold">{candidate.name}</div>
                        <div className="text-[10px] text-neutral-400 uppercase tracking-widest">{candidate.party}</div>
                        {election && (
                          <div className="text-[10px] text-indigo-500 font-bold mt-1">
                            {election.title} ({election.state})
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {deleteConfirmId === candidate.id ? (
                        <div className="flex items-center space-x-1 animate-in fade-in slide-in-from-right-2">
                          <button 
                            onClick={() => handleDeleteCandidate(candidate.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1 text-neutral-400 hover:text-neutral-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => openModal(candidate)}
                            className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(candidate.id)}
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Election Management Section */}
          <div className="pt-8 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Calendar className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold">Elections</h2>
              </div>
              <button 
                onClick={() => openElectionModal()}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {elections.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-neutral-200 text-center text-neutral-500">
                  No elections created yet.
                </div>
              ) : (
                elections.map((election) => (
                  <div key={election.id} className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm flex justify-between items-center group">
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-50 p-2 rounded-lg">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-bold">{election.title}</div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-neutral-500">{election.state}</span>
                          <span className="text-[8px] text-neutral-300">•</span>
                          <span className={`text-[10px] font-bold uppercase ${
                            election.status === 'active' ? 'text-green-600' :
                            election.status === 'ended' ? 'text-red-600' :
                            'text-amber-600'
                          }`}>
                            {election.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openElectionModal(election)}
                        className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteElection(election.id)}
                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveCandidate} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Election</label>
                <select 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.electionId}
                  onChange={(e) => setFormData({ ...formData, electionId: e.target.value })}
                >
                  {elections.map(e => (
                    <option key={e.id} value={e.id}>{e.title} ({e.state})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Alice Johnson"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Party Name</label>
                <input 
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.party}
                  onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                  placeholder="e.g. Progressive Party"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Description</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief bio or manifesto..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Image URL</label>
                <input 
                  type="url"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 mt-4"
              >
                <Save className="w-5 h-5" />
                <span>{editingCandidate ? 'Update Candidate' : 'Save Candidate'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Election Modal */}
      {isElectionModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingElection ? 'Edit Election' : 'Create New Election'}</h3>
              <button onClick={() => setIsElectionModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveElection} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Election Title</label>
                <input 
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={electionFormData.title}
                  onChange={(e) => setElectionFormData({ ...electionFormData, title: e.target.value })}
                  placeholder="e.g. State Assembly 2026"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 uppercase tracking-wider">State</label>
                <select 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={electionFormData.state}
                  onChange={(e) => setElectionFormData({ ...electionFormData, state: e.target.value })}
                >
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Status</label>
                <select 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={electionFormData.status}
                  onChange={(e) => setElectionFormData({ ...electionFormData, status: e.target.value as any })}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 mt-4"
              >
                <Save className="w-5 h-5" />
                <span>{editingElection ? 'Update Election' : 'Create Election'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-neutral-900">Cancel Election?</h3>
                <p className="text-neutral-500 mt-2">
                  This action is <strong>irreversible</strong>. All candidates and votes will be permanently deleted, and the election will be reset to zero.
                </p>
              </div>
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={handleCancelElection}
                  disabled={resetLoading}
                  className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {resetLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      <span>Yes, Reset Everything</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setIsResetConfirmOpen(false)}
                  disabled={resetLoading}
                  className="w-full bg-neutral-100 text-neutral-600 py-4 rounded-xl font-bold hover:bg-neutral-200 transition-all"
                >
                  No, Keep Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Voter Card Preview</h3>
              <button onClick={() => setViewingDoc(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-grow flex items-center justify-center bg-neutral-50 min-h-[400px]">
              {viewingDoc.startsWith('data:image') ? (
                <div className="relative group">
                  <img 
                    src={viewingDoc} 
                    alt="Voter Card" 
                    className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border-4 border-white"
                    onError={(e) => {
                      console.error("Image failed to load");
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://placehold.co/600x400?text=Image+Load+Error';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none rounded-xl" />
                </div>
              ) : (
                <div className="text-center space-y-6 max-w-md">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h4 className="text-lg font-bold mb-2">External Document</h4>
                    <p className="text-neutral-500 text-sm mb-6">This document is stored at an external URL. For security, please open it in a new tab.</p>
                    <a 
                      href={viewingDoc} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Open Document</span>
                    </a>
                  </div>
                  <p className="text-xs text-neutral-400 break-all">URL: {viewingDoc}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-neutral-100 flex justify-end">
              <button 
                onClick={() => setViewingDoc(null)}
                className="px-6 py-2 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
