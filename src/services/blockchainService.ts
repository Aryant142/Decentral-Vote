import { ethers } from 'ethers';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

/**
 * Solidity Smart Contract (for reference and deployment)
 * 
 * // SPDX-License-Identifier: MIT
 * pragma solidity ^0.8.0;
 * 
 * contract Voting {
 *     struct Candidate {
 *         string id;
 *         string name;
 *         string party;
 *         uint256 voteCount;
 *     }
 * 
 *     mapping(string => Candidate) public candidates;
 *     mapping(address => bool) public hasVoted;
 *     string[] public candidateIds;
 *     address public admin;
 * 
 *     event Voted(string indexed candidateId, address indexed voter);
 * 
 *     constructor() {
 *         admin = msg.sender;
 *     }
 * 
 *     function addCandidate(string memory _id, string memory _name, string memory _party) public {
 *         require(msg.sender == admin, "Only admin can add candidates");
 *         candidates[_id] = Candidate(_id, _name, _party, 0);
 *         candidateIds.push(_id);
 *     }
 * 
 *     function vote(string memory _candidateId) public {
 *         require(!hasVoted[msg.sender], "Already voted");
 *         require(bytes(candidates[_candidateId].id).length != 0, "Invalid candidate");
 * 
 *         hasVoted[msg.sender] = true;
 *         candidates[_candidateId].voteCount++;
 * 
 *         emit Voted(_candidateId, msg.sender);
 *     }
 * 
 *     function getResults(string memory _candidateId) public view returns (uint256) {
 *         return candidates[_candidateId].voteCount;
 *     }
 * }
 */

// Mock Blockchain Service for the environment
// In a real app, this would use ethers.Contract with a deployed address and ABI
class BlockchainService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  
  // Mock state for demo purposes
  private mockVotes: Record<string, number> = {};
  private mockVotedAddresses: Set<string> = new Set();
  private initialized = false;

  private async initialize() {
    if (this.initialized) return;
    
    // Only initialize if we have a user, otherwise we'll get permission errors
    const { auth } = await import('../firebase');
    if (!auth.currentUser) {
      console.warn("Blockchain sync deferred: No authenticated user.");
      return;
    }

    this.initialized = true;

    // Set up real-time listener for votes to simulate blockchain transparency
    onSnapshot(collection(db, 'votes'), (snapshot) => {
      const newVotes: Record<string, number> = {};
      const newVotedAddresses: Set<string> = new Set();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const candidateId = data.candidateId;
        if (candidateId) {
          newVotes[candidateId] = (newVotes[candidateId] || 0) + 1;
        }
        if (data.walletAddress) {
          newVotedAddresses.add(data.walletAddress.toLowerCase());
        }
      });
      
      this.mockVotes = newVotes;
      this.mockVotedAddresses = newVotedAddresses;
    }, (error: any) => {
      if (error.code === 'permission-denied') {
        console.warn("Blockchain sync permission denied. Retrying on next interaction.");
      } else {
        console.error("Blockchain sync failed:", error);
      }
      this.initialized = false; // Allow retry if it fails
    });
  }

  async connectWallet() {
    const win = window as any;
    if (typeof win.ethereum !== 'undefined') {
      try {
        this.provider = new ethers.BrowserProvider(win.ethereum);
        await win.ethereum.request({ method: 'eth_requestAccounts' });
        this.signer = await this.provider.getSigner();
        return await this.signer.getAddress();
      } catch (error) {
        console.error("User denied account access", error);
        throw error;
      }
    } else {
      // Fallback for demo/preview environments
      console.warn("MetaMask not detected. Using mock wallet for demo purposes.");
      const mockAddress = "0x" + Math.random().toString(16).substring(2, 42).padStart(40, '0');
      return mockAddress;
    }
  }

  async castVote(candidateId: string, walletAddress: string) {
    await this.initialize();
    console.log(`Casting vote for ${candidateId} from ${walletAddress}`);
    
    // Simulate blockchain delay and logic
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.mockVotedAddresses.has(walletAddress.toLowerCase())) {
          reject(new Error("Already voted on blockchain"));
          return;
        }
        
        this.mockVotes[candidateId] = (this.mockVotes[candidateId] || 0) + 1;
        this.mockVotedAddresses.add(walletAddress.toLowerCase());
        resolve({ hash: "0x" + Math.random().toString(16).substring(2) });
      }, 2000);
    });
  }

  async getResults(candidateId: string) {
    await this.initialize();
    // Simulating the Solidity getResults function
    return this.mockVotes[candidateId] || 0;
  }

  // Alias for backward compatibility if needed
  async getVoteCount(candidateId: string) {
    return this.getResults(candidateId);
  }
}

export const blockchainService = new BlockchainService();
