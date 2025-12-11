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
    type: 'PAYMENT' | 'DELETE' | null;
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
    setModalConfig({
        isOpen: true,
        type: 'PAYMENT',
        itemId: id,
        itemData: currentStatus,
        title: 'Confirm Payment Status',
        message: `Are you sure you want to mark ${name} as ${!currentStatus ? 'PAID' : 'UNPAID'}?`
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

  const handleConfirmAction = async () => {
    if (!modalConfig.itemId) return;

    try {
        if (modalConfig.type === 'PAYMENT') {
             await axios.put(`${API_BASE}/players/${modalConfig.itemId}`, 
                { paymentStatus: !modalConfig.itemData }, 
                { headers: { 'x-admin-token': token } }
            );
        } else if (modalConfig.type === 'DELETE') {
             await axios.delete(`${API_BASE}/players/${modalConfig.itemId}`, {
                headers: { 'x-admin-token': token }
            });
        }
        fetchData();
    } catch (err) {
        alert("Action failed. Please check your network or token.");
    } finally {
        setModalConfig({ ...modalConfig, isOpen: false });
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
                    <th className="p-4">Player</th>
                    <th className="p-4">Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Payment</th>
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
                            <td className="p-4 flex items-center space-x-3 min-w-[200px]">
                                <img src={player.playerImageUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-gray-600" />
                                <div>
                                    <div className="font-bold text-white">{player.name}</div>
                                    <div className="text-xs text-gray-500">{player.email}</div>
                                </div>
                            </td>
                            <td className="p-4">
                                <div><span className="text-xs text-gray-500">Mob:</span> {player.mobile}</div>
                                <div><span className="text-xs text-gray-500">Age:</span> {player.age}</div>
                            </td>
                            <td className="p-4">
                                <span className="bg-slate-900 px-2 py-1 rounded text-xs font-mono">{player.category}</span>
                            </td>
                            <td className="p-4">
                                <span 
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        player.paymentStatus ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                                    }`}
                                >
                                    {player.paymentStatus ? 'PAID' : 'UNPAID'}
                                </span>
                                {player.upiOrBarcode && <div className="text-xs mt-1 text-gray-500">Ref: {player.upiOrBarcode}</div>}
                            </td>
                            <td className="p-4 flex gap-2">
                                <button 
                                    onClick={() => openPaymentModal(player._id!, player.paymentStatus, player.name)}
                                    className="text-xs bg-slate-600 hover:bg-ublCyan hover:text-black text-white px-2 py-1 rounded transition-colors"
                                    title="Toggle Payment Status"
                                >
                                    $
                                </button>
                                {player.paymentScreenshotUrl && (
                                    <a 
                                        href={player.paymentScreenshotUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-xs bg-slate-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
                                        title="View Receipt"
                                    >
                                        IMG
                                    </a>
                                )}
                                <button 
                                    onClick={() => openDeleteModal(player._id!, player.name)}
                                    className="text-xs bg-red-900/50 hover:bg-red-600 text-red-200 px-2 py-1 rounded transition-colors"
                                    title="Delete"
                                >
                                    ✕
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setModalConfig({...modalConfig, isOpen: false})}></div>
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
          </div>
      )}

    </div>
  );
};

export default Admin;