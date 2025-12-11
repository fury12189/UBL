import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Player, CATEGORIES } from '../types';

const API_BASE = '/api'; // Use relative path via Vite proxy

const Admin: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0 });
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'PAYMENT' | 'DELETE' | 'PROFILE' | null;
    itemId: string | null;
    itemData?: any;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: null,
    itemId: null,
    title: '',
    message: ''
  });
  
  // Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [sort, setSort] = useState('createdAt:desc');

  useEffect(() => {
    if (token) {
        setIsAuthenticated(true);
        fetchData();
    }
  }, [token, page, category, paymentStatus, sort]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: any = { page, limit: 10, sort };
      if (search) params.search = search;
      if (category) params.category = category;
      if (paymentStatus) params.paymentStatus = paymentStatus;

      const res = await axios.get(`${API_BASE}/players`, {
        headers: { 'x-admin-token': token },
        params
      });

      setPlayers(res.data.results);
      setTotalPages(res.data.totalPages);
      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setIsAuthenticated(false);
        setToken(''); // clear invalid token
        alert("Session expired or invalid token");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputToken = (document.getElementById('tokenInput') as HTMLInputElement).value;
    setToken(inputToken);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const openPaymentModal = (id: string, currentStatus: boolean, name: string) => {
    // Should generally not be called if status is true due to button hiding, but safety check:
    if (currentStatus) return;

    setModalConfig({
        isOpen: true,
        type: 'PAYMENT',
        itemId: id,
        itemData: currentStatus,
        title: 'Confirm Payment',
        message: `Mark ${name} as PAID? This action cannot be undone.`
    });
  };

  const openDeleteModal = (id: string, name: string) => {
    setModalConfig({
        isOpen: true,
        type: 'DELETE',
        itemId: id,
        title: 'Confirm Deletion',
        message: `Are you sure you want to PERMANENTLY delete ${name}? This action cannot be undone.`
    });
  };

  const openProfileModal = (player: Player) => {
    setModalConfig({
        isOpen: true,
        type: 'PROFILE',
        itemId: player._id!,
        itemData: player,
        title: player.name.toUpperCase(),
        message: ''
    });
  };

  const handleConfirmAction = async () => {
    if (!modalConfig.itemId) return;

    try {
        if (modalConfig.type === 'PAYMENT') {
             // Only allow marking as TRUE (Paid)
             await axios.put(`${API_BASE}/players/${modalConfig.itemId}`, 
                { paymentStatus: true }, 
                { headers: { 'x-admin-token': token } }
            );
            setModalConfig({ ...modalConfig, isOpen: false });
            fetchData();
        } else if (modalConfig.type === 'DELETE') {
             await axios.delete(`${API_BASE}/players/${modalConfig.itemId}`, {
                headers: { 'x-admin-token': token }
            });
            setModalConfig({ ...modalConfig, isOpen: false });
            fetchData();
        }
    } catch (err) {
        alert("Action failed. Please check your network or token.");
    }
  };

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-ublDark">
            <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-lg shadow-2xl border border-gray-700 w-full max-w-md">
                <h2 className="text-3xl text-ublCyan font-black mb-6 text-center italic tracking-wider">ADMIN PORTAL</h2>
                <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Secret Access Token</label>
                <input 
                    id="tokenInput"
                    type="password" 
                    placeholder="Enter Token"
                    className="w-full bg-slate-900 border border-gray-600 rounded px-4 py-3 text-white mb-6 outline-none focus:border-ublCyan focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                />
                <button className="w-full bg-ublCyan text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white hover:shadow-[0_0_20px_rgba(34,211,238,1)] transition-all">
                    Access Dashboard
                </button>
            </form>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-ublDark p-4 md:p-8 relative">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800 p-4 rounded border border-gray-700">
            <h3 className="text-gray-400 text-xs uppercase font-bold">Total Entries</h3>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-green-900/30 p-4 rounded border border-green-500/30">
            <h3 className="text-green-400 text-xs uppercase font-bold">Paid</h3>
            <p className="text-3xl font-bold text-green-400">{stats.paid}</p>
        </div>
        <div className="bg-red-900/30 p-4 rounded border border-red-500/30 cursor-pointer hover:bg-red-900/50" onClick={() => setPaymentStatus('false')}>
            <h3 className="text-red-400 text-xs uppercase font-bold">Unpaid (Click to filter)</h3>
            <p className="text-3xl font-bold text-red-400">{stats.unpaid}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-slate-800/50 p-4 rounded-lg">
        <form onSubmit={handleSearch} className="flex w-full md:w-auto">
            <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, mobile..." 
                className="bg-slate-900 border border-gray-600 rounded-l px-4 py-2 text-white outline-none focus:border-ublCyan w-full md:w-64"
            />
            <button className="bg-slate-700 px-4 rounded-r hover:bg-slate-600">🔍</button>
        </form>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select value={category} onChange={e => setCategory(e.target.value)} className="bg-slate-900 border border-gray-600 text-white rounded px-3 py-2 text-sm outline-none">
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="bg-slate-900 border border-gray-600 text-white rounded px-3 py-2 text-sm outline-none">
                <option value="">All Payment Status</option>
                <option value="true">Paid</option>
                <option value="false">Unpaid</option>
            </select>

            <select value={sort} onChange={e => setSort(e.target.value)} className="bg-slate-900 border border-gray-600 text-white rounded px-3 py-2 text-sm outline-none">
                <option value="createdAt:desc">Newest First</option>
                <option value="createdAt:asc">Oldest First</option>
                <option value="name:asc">Name A-Z</option>
            </select>
            
            <button onClick={() => {setSearch(''); setCategory(''); setPaymentStatus(''); setPage(1); fetchData()}} className="text-ublCyan text-sm font-bold px-3 py-2 hover:underline">Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-slate-800 rounded-lg shadow-xl border border-gray-700">
        <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-slate-900 text-gray-400 uppercase text-xs font-bold">
                <tr>
                    <th className="p-4">Registered At</th>
                    <th className="p-4">Player Profile</th>
                    <th className="p-4">Documents</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Payment & Ref</th>
                    <th className="p-4">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
                {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr>
                ) : players.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No records found.</td></tr>
                ) : (
                    players.map(player => (
                        <tr key={player._id} className="hover:bg-slate-700/50 transition-colors">
                            <td className="p-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                                {player.createdAt ? new Date(player.createdAt).toLocaleString() : 'N/A'}
                            </td>
                            <td className="p-4">
                                <div className="flex items-center space-x-3 min-w-[200px]">
                                    <div className="relative group cursor-pointer" onClick={() => openProfileModal(player)}>
                                        <img src={player.playerImageUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-gray-600 group-hover:border-ublCyan transition-colors" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white hover:text-ublCyan cursor-pointer" onClick={() => openProfileModal(player)}>{player.name}</div>
                                        <div className="text-xs text-gray-500">{player.email}</div>
                                        <div className="text-xs text-gray-500">Mob: {player.mobile}</div>
                                        <div className="text-xs text-gray-500">Age: {player.age}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 space-y-2">
                                <a 
                                    href={player.validDocumentUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-700 hover:bg-ublCyan hover:text-black rounded text-xs font-bold transition-all w-full justify-center"
                                >
                                    <span>📄 View ID Proof</span>
                                </a>
                                {player.paymentScreenshotUrl ? (
                                    <a 
                                        href={player.paymentScreenshotUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-700 hover:bg-green-500 hover:text-black rounded text-xs font-bold transition-all w-full justify-center"
                                    >
                                        <span>💸 Payment Rec.</span>
                                    </a>
                                ) : (
                                    <span className="text-xs text-red-500 block text-center">No Payment Rec.</span>
                                )}
                            </td>
                            <td className="p-4">
                                <span className="bg-slate-900 px-2 py-1 rounded text-xs font-mono">{player.category}</span>
                            </td>
                            <td className="p-4">
                                <div className="mb-2">
                                    <span 
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            player.paymentStatus ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                                        }`}
                                    >
                                        {player.paymentStatus ? 'PAID' : 'UNPAID'}
                                    </span>
                                </div>
                                {player.upiOrBarcode ? (
                                    <div className="text-xs font-mono bg-slate-900 p-1 rounded border border-gray-700 text-gray-400 break-all">
                                        Ref: {player.upiOrBarcode}
                                    </div>
                                ) : (
                                    <div className="text-xs text-red-500">No Txn ID</div>
                                )}
                            </td>
                            <td className="p-4 flex gap-2">
                                <button 
                                    onClick={() => openProfileModal(player)}
                                    className="text-xs bg-ublCyan text-black font-bold px-2 py-1 rounded hover:bg-white transition-colors"
                                >
                                    View Full Profile
                                </button>
                                
                                {!player.paymentStatus ? (
                                    <button 
                                        onClick={() => openPaymentModal(player._id!, player.paymentStatus, player.name)}
                                        className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded transition-colors whitespace-nowrap"
                                        title="Mark as Paid"
                                    >
                                        Mark Paid
                                    </button>
                                ) : (
                                    <span className="text-xs text-green-500 border border-green-500/30 bg-green-900/20 px-2 py-1 rounded font-bold cursor-default select-none">
                                        PAID
                                    </span>
                                )}

                                <button 
                                    onClick={() => openDeleteModal(player._id!, player.name)}
                                    className="text-xs bg-red-900/50 hover:bg-red-600 text-red-200 px-2 py-1 rounded transition-colors"
                                    title="Delete"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-6 space-x-2">
         <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-slate-800 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
         >
            Prev
         </button>
         <span className="px-4 py-2 text-sm text-gray-400">Page {page} of {totalPages}</span>
         <button 
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-slate-800 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
         >
            Next
         </button>
      </div>

      {/* MODAL */}
      {modalConfig.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setModalConfig({...modalConfig, isOpen: false})}></div>
              
              {/* CONTENT FOR PROFILE MODAL */}
              {modalConfig.type === 'PROFILE' && modalConfig.itemData ? (
                 <div className="relative bg-slate-900 border border-gray-700 rounded-2xl w-full max-w-4xl shadow-2xl animate-bounce-in flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-black/40 rounded-t-2xl">
                        <h3 className="text-2xl font-black text-ublCyan italic tracking-wider">{modalConfig.title}</h3>
                        <button onClick={() => setModalConfig({...modalConfig, isOpen: false})} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            
                            {/* Left Column: Images */}
                            <div className="space-y-6">
                                <div className="text-center">
                                    <p className="text-xs text-ublCyan font-bold uppercase mb-2">Player Photo</p>
                                    <img src={modalConfig.itemData.playerImageUrl} alt="Player" className="w-48 h-48 object-cover rounded-xl border-2 border-ublCyan mx-auto shadow-[0_0_20px_rgba(6,182,212,0.3)]" />
                                    <a href={modalConfig.itemData.playerImageUrl} target="_blank" rel="noreferrer" className="block mt-2 text-xs text-gray-400 hover:text-white underline">Open Full Size</a>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-400 font-bold uppercase mb-2">ID Proof</p>
                                        <a href={modalConfig.itemData.validDocumentUrl} target="_blank" rel="noreferrer" className="block bg-slate-800 p-2 rounded hover:bg-slate-700 text-center">
                                            <span className="text-2xl">📄</span>
                                            <span className="block text-[10px] mt-1">View Doc</span>
                                        </a>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-bold uppercase mb-2">Payment</p>
                                        {modalConfig.itemData.paymentScreenshotUrl ? (
                                            <a href={modalConfig.itemData.paymentScreenshotUrl} target="_blank" rel="noreferrer" className="block bg-slate-800 p-2 rounded hover:bg-slate-700 text-center">
                                                <span className="text-2xl">💸</span>
                                                <span className="block text-[10px] mt-1">View Receipt</span>
                                            </a>
                                        ) : (
                                            <div className="bg-red-900/20 p-2 rounded text-center border border-red-500/20">
                                                <span className="text-red-500 text-xs">Missing</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Middle & Right: Details */}
                            <div className="md:col-span-2 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase font-bold">Email</label>
                                        <p className="text-white font-mono">{modalConfig.itemData.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase font-bold">Mobile</label>
                                        <p className="text-white font-mono text-xl">{modalConfig.itemData.mobile}</p>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase font-bold">Date of Birth (Age)</label>
                                        <p className="text-white">{new Date(modalConfig.itemData.dob).toLocaleDateString()} <span className="text-ublCyan font-bold">({modalConfig.itemData.age} Yrs)</span></p>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase font-bold">Adhar Number</label>
                                        <p className="text-white font-mono tracking-widest">{modalConfig.itemData.adhar || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase font-bold">Category</label>
                                        <span className="bg-ublCyan text-black px-2 py-1 rounded font-bold text-sm">{modalConfig.itemData.category}</span>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase font-bold">Playing Style</label>
                                        <p className="text-white font-bold">{modalConfig.itemData.playingStyle}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                    <label className="text-ublCyan text-xs uppercase font-bold mb-2 block">Achievements</label>
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{modalConfig.itemData.achievements || 'No achievements listed.'}</p>
                                </div>

                                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                    <label className="text-ublCyan text-xs uppercase font-bold mb-2 block">Remarks</label>
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{modalConfig.itemData.remark || 'No remarks.'}</p>
                                </div>

                                <div className="pt-4 border-t border-gray-700 flex justify-between items-center">
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase font-bold">Payment Status</label>
                                        <div className={`text-sm font-bold ${modalConfig.itemData.paymentStatus ? 'text-green-400' : 'text-red-400'}`}>
                                            {modalConfig.itemData.paymentStatus ? 'PAID' : 'UNPAID'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase font-bold">Transaction Ref</label>
                                        <div className="text-white font-mono text-sm">{modalConfig.itemData.upiOrBarcode || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
              ) : (
                // STANDARD MODAL (Confirm/Delete)
                <div className="relative bg-slate-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-bounce-in">
                    <h3 className="text-xl font-bold text-white mb-2">{modalConfig.title}</h3>
                    <p className="text-gray-300 mb-6">{modalConfig.message}</p>
                    
                    <div className="flex justify-end space-x-3">
                        <button 
                            onClick={() => setModalConfig({...modalConfig, isOpen: false})}
                            className="px-4 py-2 text-gray-400 hover:text-white font-bold"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirmAction}
                            className={`px-6 py-2 rounded font-bold text-black ${modalConfig.type === 'DELETE' ? 'bg-red-500 hover:bg-red-400' : 'bg-ublCyan hover:bg-white'}`}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
              )}
          </div>
      )}

    </div>
  );
};

export default Admin;