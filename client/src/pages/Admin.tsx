import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Player, CATEGORIES } from '../types';

const API_BASE = '/api';

const Admin: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0 });
  const [loading, setLoading] = useState(false);
  
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
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setIsAuthenticated(false);
        setToken('');
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

  const openPaymentModal = (id: string, currentStatus: boolean, name: string) => {
    if (currentStatus) return; // Cannot un-pay
    setModalConfig({
        isOpen: true,
        type: 'PAYMENT',
        itemId: id,
        itemData: currentStatus,
        title: 'Confirm Payment',
        message: `Verify ${name}'s payment. This will mark them as PAID permanently.`
    });
  };

  const openDeleteModal = (id: string, name: string) => {
    setModalConfig({
        isOpen: true,
        type: 'DELETE',
        itemId: id,
        title: 'Delete Record',
        message: `Permanently delete ${name}? This action is irreversible.`
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
             await axios.put(`${API_BASE}/players/${modalConfig.itemId}`, 
                { paymentStatus: true }, 
                { headers: { 'x-admin-token': token } }
            );
        } else if (modalConfig.type === 'DELETE') {
             await axios.delete(`${API_BASE}/players/${modalConfig.itemId}`, {
                headers: { 'x-admin-token': token }
            });
        }
        setModalConfig({ ...modalConfig, isOpen: false });
        fetchData();
    } catch (err) {
        alert("Action failed.");
    }
  };

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-ublDark">
            <form onSubmit={handleLogin} className="bg-slate-900 p-10 rounded-3xl shadow-2xl border border-white/5 w-full max-w-md">
                <h2 className="text-4xl text-ublCyan font-black mb-8 text-center italic tracking-wider uppercase">Admin Login</h2>
                <div className="space-y-4">
                    <input 
                        id="tokenInput"
                        type="password" 
                        placeholder="ADMIN SECRET TOKEN"
                        className="w-full bg-black/40 border border-gray-800 rounded-2xl px-5 py-5 text-white outline-none focus:border-ublCyan transition-all text-center tracking-widest"
                    />
                    <button className="w-full bg-ublCyan text-black font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-white hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all">
                        Access Dashboard
                    </button>
                </div>
            </form>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-ublDark p-4 md:p-10">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 group hover:border-ublCyan/30 transition-all">
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Total Players</p>
            <p className="text-5xl font-black text-white italic">{stats.total}</p>
        </div>
        <div className="bg-emerald-950/20 p-8 rounded-3xl border border-emerald-500/20 group hover:border-emerald-500/50 transition-all">
            <p className="text-emerald-500 text-xs font-black uppercase tracking-widest mb-2">Verified (Paid)</p>
            <p className="text-5xl font-black text-emerald-400 italic">{stats.paid}</p>
        </div>
        <div className="bg-rose-950/20 p-8 rounded-3xl border border-rose-500/20 group hover:border-rose-500/50 transition-all">
            <p className="text-rose-500 text-xs font-black uppercase tracking-widest mb-2">Pending (Unpaid)</p>
            <p className="text-5xl font-black text-rose-400 italic">{stats.unpaid}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl mb-10">
        <div className="p-6 bg-black/20 flex flex-wrap gap-4 items-center justify-between border-b border-white/5">
            <div className="relative w-full md:w-96">
                <input 
                    value={search}
                    onChange={e => {setSearch(e.target.value); setPage(1);}}
                    placeholder="SEARCH BY NAME, MOBILE..." 
                    className="w-full bg-black/40 border border-gray-800 rounded-xl px-5 py-3 text-sm text-white outline-none focus:border-ublCyan transition-all pl-12"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
            </div>
            <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <select value={category} onChange={e => setCategory(e.target.value)} className="bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white outline-none hover:border-ublCyan transition-all">
                    <option value="">ALL CATEGORIES</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white outline-none hover:border-ublCyan transition-all">
                    <option value="">ALL STATUS</option>
                    <option value="true">PAID</option>
                    <option value="false">UNPAID</option>
                </select>
                <select value={sort} onChange={e => setSort(e.target.value)} className="bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white outline-none hover:border-ublCyan transition-all">
                    <option value="createdAt:desc">LATEST FIRST</option>
                    <option value="createdAt:asc">OLDEST FIRST</option>
                    <option value="name:asc">NAME A-Z</option>
                </select>
            </div>
        </div>

        {/* Players Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-black/40 text-gray-500 font-black uppercase text-[10px] tracking-[0.2em]">
                    <tr>
                        <th className="p-6">Player Identity</th>
                        <th className="p-6 text-center">Resources</th>
                        <th className="p-6 text-center">Category</th>
                        <th className="p-6 text-center">Payment Status</th>
                        <th className="p-6 text-right">Management</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {loading ? (
                        <tr><td colSpan={5} className="p-20 text-center text-gray-500 font-bold animate-pulse uppercase tracking-widest">Updating Records...</td></tr>
                    ) : players.length === 0 ? (
                        <tr><td colSpan={5} className="p-20 text-center text-gray-600 font-bold uppercase tracking-widest">No matching players found</td></tr>
                    ) : (
                        players.map(player => (
                            <tr key={player._id} className="hover:bg-white/[0.03] transition-colors group">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="relative cursor-pointer shrink-0" onClick={() => openProfileModal(player)}>
                                            <img src={player.playerImageUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10 group-hover:border-ublCyan transition-all shadow-xl" />
                                            {player.paymentStatus && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>}
                                        </div>
                                        <div>
                                            <div className="font-black text-white text-base tracking-tight cursor-pointer hover:text-ublCyan transition-all" onClick={() => openProfileModal(player)}>{player.name}</div>
                                            <div className="text-xs text-gray-500 font-mono">{player.mobile}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex justify-center gap-3">
                                        <a href={player.validDocumentUrl} target="_blank" className="p-3 bg-slate-800 rounded-xl hover:bg-ublCyan hover:text-black transition-all shadow-lg" title="Identity Proof">🪪</a>
                                        {player.paymentScreenshotUrl ? (
                                            <a href={player.paymentScreenshotUrl} target="_blank" className="p-3 bg-slate-800 rounded-xl hover:bg-emerald-500 hover:text-black transition-all shadow-lg" title="Payment Receipt">🧾</a>
                                        ) : (
                                            <div className="p-3 bg-rose-900/20 text-rose-500 rounded-xl border border-rose-500/20" title="Missing Receipt">❌</div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-6 text-center">
                                    <span className="text-[11px] font-black bg-white/5 border border-white/5 px-3 py-1.5 rounded-full text-gray-400 uppercase">{player.category}</span>
                                </td>
                                <td className="p-6 text-center">
                                    {player.paymentStatus ? (
                                        <div className="inline-flex items-center gap-2 text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                            Verified
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-2 text-[10px] font-black bg-rose-500/10 text-rose-400 px-4 py-2 rounded-full border border-rose-500/20 uppercase tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                                            Pending
                                        </div>
                                    )}
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex justify-end gap-3 items-center">
                                        {!player.paymentStatus ? (
                                            <button 
                                                onClick={() => openPaymentModal(player._id!, player.paymentStatus, player.name)}
                                                className="text-[10px] font-black bg-emerald-500 text-black px-4 py-2.5 rounded-xl hover:bg-white transition-all uppercase tracking-widest"
                                            >
                                                Mark Paid
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => openProfileModal(player)}
                                                className="text-[10px] font-black border border-white/10 text-gray-400 px-4 py-2.5 rounded-xl hover:bg-white hover:text-black transition-all uppercase tracking-widest"
                                            >
                                                Details
                                            </button>
                                        )}
                                        <button onClick={() => openDeleteModal(player._id!, player.name)} className="bg-rose-900/20 text-rose-500 p-2.5 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-500/10" title="Delete">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Pagination */}
        <div className="p-6 border-t border-white/5 flex justify-between items-center bg-black/10">
            <p className="text-xs text-gray-500 font-bold">Showing page {page} of {totalPages}</p>
            <div className="flex gap-2">
                <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-3 bg-slate-800 rounded-xl hover:bg-ublCyan hover:text-black disabled:opacity-20 transition-all font-black text-xs uppercase"
                >
                    Prev
                </button>
                <button 
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-3 bg-slate-800 rounded-xl hover:bg-ublCyan hover:text-black disabled:opacity-20 transition-all font-black text-xs uppercase"
                >
                    Next
                </button>
            </div>
        </div>
      </div>

      {/* Dynamic Modals */}
      {modalConfig.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setModalConfig({...modalConfig, isOpen: false})}></div>
              
              {modalConfig.type === 'PROFILE' && modalConfig.itemData ? (
                  <div className="relative bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-4xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                      <div className="flex flex-col md:flex-row h-full">
                          {/* Profile Sidebar */}
                          <div className="w-full md:w-80 bg-black/40 p-8 flex flex-col items-center border-r border-white/5 shrink-0">
                              <img src={modalConfig.itemData.playerImageUrl} alt="" className="w-48 h-48 rounded-[2rem] object-cover border-4 border-ublCyan shadow-[0_0_40px_rgba(34,211,238,0.3)] mb-6" />
                              <h3 className="text-2xl font-black text-white italic text-center mb-1 leading-tight">{modalConfig.itemData.name}</h3>
                              <p className="text-ublCyan font-black text-xs uppercase tracking-[0.2em] mb-8">{modalConfig.itemData.category} Category</p>
                              
                              <div className="w-full space-y-3">
                                  <a href={modalConfig.itemData.validDocumentUrl} target="_blank" className="flex items-center justify-between w-full bg-slate-800/50 p-4 rounded-2xl hover:bg-ublCyan hover:text-black transition-all group">
                                      <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Identity Doc</span>
                                      <span className="text-xl">📄</span>
                                  </a>
                                  {modalConfig.itemData.paymentScreenshotUrl && (
                                      <a href={modalConfig.itemData.paymentScreenshotUrl} target="_blank" className="flex items-center justify-between w-full bg-slate-800/50 p-4 rounded-2xl hover:bg-emerald-500 hover:text-black transition-all group">
                                          <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Payment Slip</span>
                                          <span className="text-xl">🧾</span>
                                      </a>
                                  )}
                              </div>
                          </div>

                          {/* Profile Body */}
                          <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                              <div className="flex justify-between items-start mb-10">
                                  <div className="space-y-1">
                                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Registration Status</p>
                                      {modalConfig.itemData.paymentStatus ? (
                                          <span className="text-emerald-500 font-black text-sm italic uppercase">Verified Official</span>
                                      ) : (
                                          <span className="text-rose-500 font-black text-sm italic uppercase">Verification Pending</span>
                                      )}
                                  </div>
                                  <button onClick={() => setModalConfig({...modalConfig, isOpen: false})} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-xl hover:bg-white hover:text-black transition-all">&times;</button>
                              </div>

                              <div className="grid grid-cols-2 gap-8 mb-10">
                                  <div>
                                      <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1 block">Phone</label>
                                      <p className="text-white font-bold text-lg">{modalConfig.itemData.mobile}</p>
                                  </div>
                                  <div>
                                      <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1 block">Email</label>
                                      <p className="text-white font-bold text-lg break-all">{modalConfig.itemData.email || 'N/A'}</p>
                                  </div>
                                  <div>
                                      <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1 block">Playing Style</label>
                                      <span className="inline-block bg-ublCyan/10 text-ublCyan border border-ublCyan/20 px-3 py-1 rounded-lg text-xs font-black uppercase">{modalConfig.itemData.playingStyle}</span>
                                  </div>
                                  <div>
                                      <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1 block">Aadhar No</label>
                                      <p className="text-white font-mono tracking-widest">{modalConfig.itemData.adhar || 'NOT PROVIDED'}</p>
                                  </div>
                              </div>

                              <div className="space-y-8">
                                  {modalConfig.itemData.achievements && (
                                      <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                          <label className="text-ublCyan text-[10px] font-black uppercase tracking-widest mb-3 block">Achievements</label>
                                          <p className="text-gray-300 text-sm leading-relaxed">{modalConfig.itemData.achievements}</p>
                                      </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                      <div>
                                          <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1 block">Transaction Ref</label>
                                          <p className="text-white font-mono text-sm uppercase">{modalConfig.itemData.upiOrBarcode || 'NONE'}</p>
                                      </div>
                                      <div className="text-right">
                                          <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1 block">Registered Date</label>
                                          <p className="text-white font-mono text-xs opacity-50">{new Date(modalConfig.itemData.createdAt).toLocaleDateString()}</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="relative bg-slate-900 border border-white/10 p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in duration-300 text-center">
                      <div className="w-20 h-20 bg-ublCyan/10 text-ublCyan text-4xl flex items-center justify-center rounded-3xl mx-auto mb-6 border border-ublCyan/20">
                          {modalConfig.type === 'DELETE' ? '⚠️' : '✅'}
                      </div>
                      <h3 className="text-2xl font-black text-white italic uppercase mb-3 tracking-tighter">{modalConfig.title}</h3>
                      <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">{modalConfig.message}</p>
                      <div className="flex gap-4">
                          <button onClick={() => setModalConfig({...modalConfig, isOpen: false})} className="flex-1 text-gray-500 font-black hover:text-white uppercase text-xs tracking-widest py-4 transition-all">Cancel</button>
                          <button 
                              onClick={handleConfirmAction} 
                              className={`flex-1 ${modalConfig.type === 'DELETE' ? 'bg-rose-500' : 'bg-ublCyan'} text-black font-black uppercase px-6 py-4 rounded-2xl hover:bg-white transition-all text-xs tracking-widest`}
                          >
                              {modalConfig.type === 'DELETE' ? 'Delete Now' : 'Confirm'}
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