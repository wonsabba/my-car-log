"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import Link from "next/link";

export default function StockPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [session, setSession] = useState<any>(null);

  const [formData, setFormData] = useState({
    trade_date: new Date().toISOString().split('T')[0],
    stock_name: "",
    trade_type: "BUY",
    quantity: "",
    unit_price: "",
    fee_tax: "",
    total_amount: "",
    profit: "",
    memo: ""
  });

  // 거래금액 자동 계산 로직
  useEffect(() => {
    const qty = Number(formData.quantity) || 0;
    const price = Number(formData.unit_price) || 0;
    const fee = Number(formData.fee_tax) || 0;
    if (qty > 0 && price > 0) {
      const calculated = formData.trade_type === "BUY" ? (qty * price) + fee : (qty * price) - fee;
      setFormData(prev => ({ ...prev, total_amount: calculated.toString() }));
    }
  }, [formData.quantity, formData.unit_price, formData.fee_tax, formData.trade_type]);

  const startEdit = (log: any) => {
    setEditingId(log.id);
    setFormData({
      trade_date: log.trade_date,
      stock_name: log.stock_name,
      trade_type: log.trade_type,
      quantity: log.quantity.toString(),
      unit_price: log.unit_price.toString(),
      fee_tax: log.fee_tax?.toString() || "0",
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
      fee_tax: Number(formData.fee_tax),
      total_amount: Number(formData.total_amount),
      profit: Number(formData.profit),
    };
    const { error } = editingId ? await supabase.from("stock_logs").update(payload).eq("id", editingId) : await supabase.from("stock_logs").insert([payload]);
    if (!error) { showToast("기록 완료"); resetForm(); fetchLogs(); }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ trade_date: new Date().toISOString().split('T')[0], stock_name: "", trade_type: "BUY", quantity: "", unit_price: "", fee_tax: "", total_amount: "", profit: "", memo: "" });
  };

  const handleDelete = async (id: number) => {
    if (confirm("삭제하시겠습니까?")) {
      await supabase.from("stock_logs").delete().eq("id", id);
      showToast("삭제 완료"); fetchLogs();
    }
  };

  if (!session) return <div className="p-10 text-white font-black bg-[#0f172a] h-screen">LOGIN REQUIRED...</div>;

  return (
    <div className={`flex flex-col md:flex-row h-screen max-w-6xl mx-auto overflow-hidden font-sans transition-colors ${isDarkMode ? 'bg-[#0f172a] text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
      {toast && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full bg-blue-600 text-white font-bold text-xs">{toast.msg}</div>}

      <header className={`w-full md:w-[340px] border-b md:border-r p-4 flex flex-col shrink-0 ${isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black italic tracking-tighter text-blue-500">Stock</h1>
            {/* ✅ 홈 링크와 GV80 차계부 링크 추가 */}
            <div className="flex gap-1 ml-1">
              <Link href="/home" className="text-[12px] font-black opacity-40 hover:opacity-100 transition-opacity" title="홈내역으로">🏠</Link>
              <Link href="/" className="text-slate-300 hover:text-slate-800 font-black text-1xl tracking-tighter transition-colors">
                <img src="/GV80.jpg" alt="GV80 Icon" className="w-5 h-5 inline-block mr-1 -mt-1 rounded-md " title="차계부로"/></Link>
            </div>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${isDarkMode ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
            {isDarkMode ? 'LIGHT' : 'DARK'}
          </button>
        </div>

        <form onSubmit={handleSave} className={`space-y-3 p-4 rounded-2xl border transition-all ${editingId ? 'bg-orange-950/20 border-orange-800' : (isDarkMode ? 'bg-[#0f172a]/50 border-slate-700' : 'bg-slate-100 border-slate-200')}`}>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className={`p-2 rounded-lg text-sm font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-300'} border`} value={formData.trade_date} onChange={e => setFormData({...formData, trade_date: e.target.value})} required />
            <select className={`p-2 rounded-lg text-sm font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-300'} border`} value={formData.trade_type} onChange={e => setFormData({...formData, trade_type: e.target.value})}>
              <option value="BUY">매수 (BUY)</option>
              <option value="SELL">매도 (SELL)</option>
            </select>
          </div>
          <input type="text" placeholder="종목명" className={`w-full p-2 rounded-lg text-sm font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-300'} border`} value={formData.stock_name} onChange={e => setFormData({...formData, stock_name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-2"><input type="number" placeholder="수량" className={`p-2 rounded-lg text-sm font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-300'} border`} value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required /><input type="number" placeholder="단가" className={`p-2 rounded-lg text-sm font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-300'} border`} value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-2"><input type="number" placeholder="세금" className={`p-2 rounded-lg text-sm font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-300'} border`} value={formData.fee_tax} onChange={e => setFormData({...formData, fee_tax: e.target.value})} /><input type="number" placeholder="거래금액" className={`p-2 rounded-lg text-sm font-black outline-none ${isDarkMode ? 'bg-slate-800 border-blue-900 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'} border`} value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})} /></div>
          <input type="number" placeholder="수익" className={`w-full p-2 rounded-lg text-sm font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'} border`} value={formData.profit} onChange={e => setFormData({...formData, profit: e.target.value})} />
          <textarea className={`w-full p-2 rounded-lg text-sm font-bold outline-none h-16 resize-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-300'} border`} value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} placeholder="메모..." />
          <button type="submit" className={`w-full py-3 rounded-xl font-black text-white shadow-lg active:scale-95 transition-all ${editingId ? 'bg-orange-600' : (formData.trade_type === 'BUY' ? 'bg-red-600' : 'bg-blue-600')}`}>{editingId ? "데이터 수정" : "기록하기"}</button>
          {editingId && <button type="button" onClick={resetForm} className="w-full text-[10px] font-black opacity-50 uppercase mt-1">Cancel</button>}
        </form>
      </header>

      <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="flex flex-col gap-2 w-full">
          {logs.map(log => (
            <div key={log.id} onDoubleClick={() => startEdit(log)} className={`flex items-center px-4 py-4 rounded-2xl border transition-all cursor-pointer ${editingId === log.id ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-500/5' : (isDarkMode ? 'bg-[#1e293b] border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50')}`}>
              <div style={{ width: '15%' }} className="text-[10px] font-black opacity-40">{log.trade_date.replace(/-/g, '.')}</div>
              <div style={{ width: '35%' }} className="px-2">
                <div className="font-black text-sm tracking-tight truncate">{log.stock_name}</div>
                <div className="text-[10px] opacity-40 truncate font-medium">{log.memo || '-'}</div>
              </div>
              <div style={{ width: '10%' }} className="text-center">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${log.trade_type === 'BUY' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>{log.trade_type}</span>
              </div>
              <div style={{ width: '25%' }} className="text-right">
                <div className="text-sm font-black tracking-tight">{log.total_amount.toLocaleString()}원</div>
                <div className="text-[10px] opacity-40 font-bold">{log.quantity.toLocaleString()}주 · {log.unit_price.toLocaleString()}원</div>
              </div>
              <div style={{ width: '15%' }} className="text-right flex items-center justify-end">
                {log.profit !== 0 ? (
                  <span className={`text-xs font-black ${log.profit > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {log.profit > 0 ? '+' : ''}{log.profit.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-xs opacity-10">-</span>
                )}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }} className="ml-3 opacity-20 hover:opacity-100 hover:text-red-500 transition-opacity text-xs">✕</button>
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