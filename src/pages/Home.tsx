import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Vote, Fingerprint, Database } from 'lucide-react';
import { motion } from 'motion/react';

const Home: React.FC = () => {
  return (
    <div className="space-y-24 py-12">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-4xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-extrabold tracking-tight text-neutral-900 sm:text-7xl"
        >
          Secure, Transparent <span className="text-indigo-600">Blockchain Voting</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-neutral-600 leading-relaxed"
        >
          A decentralized identity-based voting system that ensures one person, one vote. 
          Verified by KYC, secured by Ethereum.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center space-x-4"
        >
          <Link to="/register" className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            Get Started
          </Link>
          <Link to="/login" className="bg-white text-neutral-900 border border-neutral-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-neutral-50 transition-all">
            Sign In
          </Link>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { icon: Fingerprint, title: "Decentralized ID", desc: "Unique DID generated after KYC verification." },
          { icon: Shield, title: "KYC Verified", desc: "Rigorous identity checks to prevent fraud." },
          { icon: Database, title: "Blockchain Secured", desc: "Votes are immutable and stored on Ethereum." },
          { icon: Vote, title: "One Person, One Vote", desc: "Smart contracts prevent duplicate voting." }
        ].map((feature, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <feature.icon className="w-12 h-12 text-indigo-600 mb-6" />
            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-neutral-600">{feature.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* How it Works */}
      <section className="bg-indigo-900 text-white rounded-3xl p-12 md:p-24 overflow-hidden relative">
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl font-bold">How DecentralVote Works</h2>
            <div className="space-y-6">
              {[
                { step: "01", title: "Register & Upload KYC", desc: "Create an account and provide your National ID for verification." },
                { step: "02", title: "Identity Verification", desc: "Admins verify your documents and generate your unique DID." },
                { step: "03", title: "Connect Wallet", desc: "Link your Ethereum wallet to your verified identity." },
                { step: "04", title: "Cast Your Vote", desc: "Select your candidate and sign the transaction securely." }
              ].map((item, i) => (
                <div key={i} className="flex space-x-4">
                  <span className="text-indigo-400 font-mono font-bold text-xl">{item.step}</span>
                  <div>
                    <h4 className="font-bold text-lg">{item.title}</h4>
                    <p className="text-indigo-200">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:block">
             <div className="bg-indigo-800/50 backdrop-blur-xl border border-indigo-700 p-8 rounded-2xl rotate-3 shadow-2xl">
                <div className="space-y-4">
                  <div className="h-4 w-3/4 bg-indigo-700 rounded animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-indigo-700 rounded animate-pulse"></div>
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="h-24 bg-indigo-700 rounded-xl"></div>
                    <div className="h-24 bg-indigo-700 rounded-xl"></div>
                  </div>
                </div>
             </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] opacity-20 -mr-48 -mt-48"></div>
      </section>
    </div>
  );
};

export default Home;
