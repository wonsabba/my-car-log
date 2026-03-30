"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import Link from "next/link";

export default function StockPage() {
  const [isDarkMode, setIsDarkMode] = useState(false); // 기본 Light
  const [logs, setLogs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [session, setSession] = useState<any>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    trade_date: new Date().toISOString().split('T')[0],
    stock_name: "",
    trade_type: "BUY",
    quantity: "",
    unit_price: "",
    fee: "",
    tax: "",
    total_amount: "",
    profit: "",
    memo: ""
  });

  const phColor = isDarkMode ? "placeholder-slate-400" : "placeholder-slate-500";

  useEffect(() => {
    const qty = Number(formData.quantity) || 0;
    const price = Number(formData.unit_price) || 0;
    const fee = Number(formData.fee) || 0;
    const tax = Number(formData.tax) || 0;
    
    if (qty > 0 && price > 0) {
      const calculated = formData.trade_type === "BUY" 
        ? (qty * price) + fee + tax 
        : (qty * price) - fee - tax;
      setFormData(prev => ({ ...prev, total_amount: calculated.toString() }));
    }
  }, [formData.quantity, formData.unit_price, formData.fee, formData.tax, formData.trade_type]);

  const startEdit = (log: any) => {
    setEditingId(log.id);
    setFormData({
      trade_date: log.trade_date,
      stock_name: log.stock_name,
      trade_type: log.trade_type,
      quantity: log.quantity.toString(),
      unit_price: log.unit_price.toString(),
      fee: log.fee?.toString() || "0",
      tax: log.tax?.toString() || "0",
      total_amount: log.total_amount.toString(),
      profit: log.profit?.toString() || "0",
      memo: log.memo || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  useEffect(() => { if (session) fetchLogs(); }, [session]);

  const fetchLogs = async () => {
    const { data, error } = await supabase.from("stock_logs").select("*").order("trade_date", { ascending: false });
    if (!error) setLogs(data || []);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      quantity: Number(formData.quantity),
      unit_price: Number(formData.unit_price),
      fee: Number(formData.fee),
      tax: Number(formData.tax),
      total_amount: Number(formData.total_amount),
      profit: Number(formData.profit),
    };
    const { error } = editingId ? await supabase.from("stock_logs").update(payload).eq("id", editingId) : await supabase.from("stock_logs").insert([payload]);
    if (!error) { showToast("기록 완료"); resetForm(); fetchLogs(); }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ trade_date: new Date().toISOString().split('T')[0], stock_name: "", trade_type: "BUY", quantity: "", unit_price: "", fee: "", tax: "", total_amount: "", profit: "", memo: "" });
  };

  const openDeleteModal = (id: number) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase.from("stock_logs").delete().eq("id", deleteTargetId);
    if (!error) {
      showToast("삭제 완료");
      fetchLogs();
      if (editingId === deleteTargetId) resetForm();
    }
    setIsDeleteModalOpen(false);
    setDeleteTargetId(null);
  };

  if (!session) return <div className="p-10 text-white font-black bg-[#0f172a] h-screen">LOGIN REQUIRED...</div>;

  return (
    <div className={`flex flex-col md:flex-row h-screen max-w-6xl mx-auto overflow-hidden font-sans transition-colors ${isDarkMode ? 'bg-[#0f172a] text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
      {toast && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full bg-blue-600 text-white font-bold text-xs shrink-0">{toast.msg}</div>}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#111c3a] border-[#1e2e56] border' : 'bg-white border-slate-200 border'}`}>
            <div className={`p-5 border-b text-center ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <h2 className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>알림</h2>
            </div>
            <div className="p-6 text-center">
              <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>정말로 삭제하시겠습니까?</p>
            </div>
            <div className="flex p-4 gap-3 pt-0">
              <button onClick={() => setIsDeleteModalOpen(false)} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>취소</button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95">삭제</button>
            </div>
          </div>
        </div>
      )}

      <header className={`w-full md:w-[340px] border-b md:border-r p-4 flex flex-col shrink-0 ${isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black italic tracking-tighter text-blue-500">Stock</h1>
            <div className="flex gap-1 ml-1">
              <Link href="/home" className="text-slate-300 hover:text-slate-800 font-black text-1xl tracking-tighter transition-colors">🏠</Link> 
              <Link href="/" className="text-slate-300 hover:text-slate-800 font-black text-1xl tracking-tighter transition-colors">
                <img src="/GV80.jpg" alt="GV80 Icon" className="w-5 h-5 inline-block mr-1 -mt-1 rounded-md " title="차계부로"/></Link>
            </div>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${isDarkMode ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
            {isDarkMode ? 'LIGHT' : 'DARK'}
          </button>
        </div>

        <form onSubmit={handleSave} className={`space-y-2 p-3 rounded-2xl border transition-all ${editingId ? 'bg-orange-950/10 border-orange-800' : (isDarkMode ? 'bg-[#0f172a]/50 border-slate-700' : 'bg-slate-100 border-slate-200')}`}>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className={`p-2 rounded-lg text-[13px] font-bold outline-none border ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`} value={formData.trade_date} onChange={e => setFormData({...formData, trade_date: e.target.value})} required />
            <select className={`p-2 rounded-lg text-[13px] font-bold outline-none border ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`} value={formData.trade_type} onChange={e => setFormData({...formData, trade_type: e.target.value})}>
              <option value="BUY">매수</option>
              <option value="SELL">매도</option>
            </select>
          </div>
          
          <input type="text" placeholder="종목명" className={`w-full p-2 rounded-lg text-[13px] font-bold outline-none border ${isDarkMode ? 'bg-[#1e293b] border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} ${phColor}`} value={formData.stock_name} onChange={e => setFormData({...formData, stock_name: e.target.value})} required />
          
          <div className="grid grid-cols-3 gap-1.5">
            <input type="number" placeholder="수량" className={`p-2 rounded-lg text-[13px] font-bold outline-none border ${isDarkMode ? 'bg-[#1e293b] border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} ${phColor}`} value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
            <input type="number" placeholder="단가" className={`p-2 rounded-lg text-[13px] font-bold outline-none border ${isDarkMode ? 'bg-[#1e293b] border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} ${phColor}`} value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value})} required />
            <input type="number" placeholder="수수료" className={`p-2 rounded-lg text-[13px] font-bold outline-none border ${isDarkMode ? 'bg-[#1e293b] border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} ${phColor}`} value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <input type="number" placeholder="세금" className={`p-2 rounded-lg text-[13px] font-bold outline-none border ${isDarkMode ? 'bg-[#1e293b] border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} ${phColor}`} value={formData.tax} onChange={e => setFormData({...formData, tax: e.target.value})} />
            <input type="number" placeholder="수익금액" className={`p-2 rounded-lg text-[13px] font-bold outline-none border ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'} ${phColor}`} value={formData.profit} onChange={e => setFormData({...formData, profit: e.target.value})} />
            <input type="number" placeholder="금액" className={`p-2 rounded-lg text-[13px] font-black outline-none border ${isDarkMode ? 'bg-slate-800 border-blue-900 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700 placeholder-blue-300'}`} value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})} />
          </div>

          <div className="flex gap-1.5">
            <textarea className={`flex-1 p-2 rounded-lg text-[13px] font-bold outline-none h-[42px] resize-none border ${isDarkMode ? 'bg-[#1e293b] border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} ${phColor}`} value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} placeholder="메모" />
            <div className={`flex gap-1 ${editingId ? 'w-[120px]' : 'w-[60px]'} transition-all`}>
              <button type="submit" className={`flex-1 rounded-lg font-black text-white text-[13px] shadow-lg active:scale-95 transition-all ${editingId ? 'bg-orange-600' : (formData.trade_type === 'BUY' ? 'bg-red-600' : 'bg-blue-600')}`}>
                {editingId ? "수정" : "기록"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className={`flex-1 rounded-lg font-black text-[12px] border ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'} active:scale-95`}>
                  취소
                </button>
              )}
            </div>
          </div>
        </form>
      </header>

      <main className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="flex flex-col gap-2 w-full">
          {logs.map(log => (
            <div key={log.id} onDoubleClick={() => startEdit(log)} className={`flex items-start px-4 py-3 rounded-2xl border transition-all cursor-pointer ${editingId === log.id ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-500/5' : (isDarkMode ? 'bg-[#1e293b] border-slate-800 hover:bg-slate-900' : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50')}`}>
              
              {/* ✅ 1. 날짜 영역 (17%) - 년도와 월/일을 2줄로 배치 */}
              <div style={{ width: '15%' }} className="flex flex-col text-center mt-1">
                <span className="text-[12px] font-bold opacity-60 leading-none">{log.trade_date.substring(0, 4)}</span>
                <span className="text-[12px] font-black opacity-70 tracking-tighter">{log.trade_date.substring(5).replace('-', '.')}</span>
              </div>
              
              {/* 2. 종목 및 메모 (39%) */}
              <div style={{ width: '41%' }} className="px-2">
                <div className="font-black text-[14px] tracking-tight truncate">{log.stock_name}</div>
                <div className="text-[11px] opacity-60 font-medium break-words leading-tight mt-0.5">{log.memo || '-'}</div>
              </div>

              {/* 3. 구분 (9%) */}
              <div style={{ width: '9%' }} className="text-center mt-1.5">
                <span className={`text-[12px] font-black px-1.5 py-0.5 rounded ${log.trade_type === 'BUY' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>{log.trade_type === 'BUY' ? '매수' : '매도'}</span>
              </div>

              {/* 4. 거래상세 및 수익 (30%) */}
              <div style={{ width: '30%' }} className="text-right">
                <div className="text-[14px] font-black tracking-tight">{log.total_amount.toLocaleString()}원</div>
                <div className="text-[11px] font-bold opacity-60">{log.quantity}주 · {log.unit_price.toLocaleString()}원</div>
                {log.profit !== 0 && (
                  <div className={`text-[12px] font-black mt-0.5 ${log.profit > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {log.profit > 0 ? '+' : ''}{log.profit.toLocaleString()}
                  </div>
                )}
              </div>

              {/* 5. 삭제 버튼 (5%) */}
              <div style={{ width: '5%' }} className="flex justify-end mt-1.5">
                <button onClick={(e) => { e.stopPropagation(); openDeleteModal(log.id); }} className="opacity-20 hover:opacity-100 hover:text-red-500 transition-opacity text-xs">✕</button>
              </div>
            </div>
          ))}
          {logs.length === 0 && <div className="text-center py-20 opacity-30 font-bold text-sm uppercase">No Records</div>}
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}