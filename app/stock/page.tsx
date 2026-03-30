"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import Link from "next/link";

export default function StockPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [session, setSession] = useState<any>(null);

  // ✅ 삭제 관련 상태 (이 부분이 있어야 에러가 안 납니다)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    trade_date: new Date().toISOString().split('T')[0],
    stock_name: "",
    stock_code: "",
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
  
  // ✅ 모든 입력창 스타일 통일 변수
  const inputBaseStyle = `p-2 rounded-lg text-[13px] font-bold outline-none border transition-all ${
    isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
  }`;

  // ✅ 삭제 모달 열기 함수 (에러 해결 핵심)
  const openDeleteModal = (id: number) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  // ✅ 삭제 확정 함수
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

  const openExternalFinance = (e: React.MouseEvent, name: string, code?: string) => {
    e.stopPropagation();
    const url = code 
      ? `https://finance.naver.com/item/main.naver?code=${code}`
      : `https://search.naver.com/search.naver?query=${encodeURIComponent(name + " 주식 시세")}`;
    window.open(url, "_blank");
  };

  const fetchRealTimePrice = async (e: React.MouseEvent, code: string, name: string) => {
    e.stopPropagation();
    if (!code) { showToast("종목코드를 입력해주세요.", "error"); return; }
    showToast(`${name} 시세 조회 중...`);
    try {
      const ticker = code.length === 6 ? (code.startsWith('0') ? `${code}.KS` : `${code}.KQ`) : code;
      const res = await fetch(`/api/stock?ticker=${ticker}`);
      const data = await res.json();
      if (data.price) {
        setCurrentPrices(prev => ({ ...prev, [code]: data.price }));
        showToast(`${name}: ${data.price.toLocaleString()}원 반영!`);
      } else throw new Error();
    } catch (e) {
      showToast("시세 조회 실패", "error");
    }
  };

  useEffect(() => {
    const qty = Number(formData.quantity) || 0;
    const price = Number(formData.unit_price) || 0;
    const fee = Number(formData.fee) || 0;
    const tax = Number(formData.tax) || 0;
    if (qty > 0 && price > 0) {
      const calculated = formData.trade_type === "BUY" ? (qty * price) + fee + tax : (qty * price) - fee - tax;
      setFormData(prev => ({ ...prev, total_amount: calculated.toString() }));
    }
  }, [formData.quantity, formData.unit_price, formData.fee, formData.tax, formData.trade_type]);

  const startEdit = (log: any) => {
    setEditingId(log.id);
    setFormData({
      trade_date: log.trade_date,
      stock_name: log.stock_name,
      stock_code: log.stock_code || "",
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
    const payload = { ...formData, quantity: Number(formData.quantity), unit_price: Number(formData.unit_price), fee: Number(formData.fee), tax: Number(formData.tax), total_amount: Number(formData.total_amount), profit: Number(formData.profit) };
    const { error } = editingId ? await supabase.from("stock_logs").update(payload).eq("id", editingId) : await supabase.from("stock_logs").insert([payload]);
    if (!error) { showToast("저장 완료"); resetForm(); fetchLogs(); }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ trade_date: new Date().toISOString().split('T')[0], stock_name: "", stock_code: "", trade_type: "BUY", quantity: "", unit_price: "", fee: "", tax: "", total_amount: "", profit: "", memo: "" });
  };

  if (!session) return <div className="p-10 text-white font-black bg-[#0f172a] h-screen text-center">LOGIN REQUIRED...</div>;

  return (
    <div className={`flex flex-col md:flex-row h-screen w-full mx-auto overflow-hidden font-sans transition-colors ${isDarkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {toast && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[110] px-6 py-2 rounded-full bg-blue-600 text-white font-bold text-xs shrink-0">{toast.msg}</div>}

      {/* ✅ 커스텀 삭제 모달 UI */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#111c3a] border-[#1e2e56] border' : 'bg-white border-slate-200 border'}`}>
            <div className={`p-5 border-b text-center ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}><h2 className="text-lg font-black tracking-tight">알림</h2></div>
            <div className="p-6 text-center"><p className="text-sm font-bold">정말로 삭제하시겠습니까?</p></div>
            <div className="flex p-4 gap-3 pt-0">
              <button onClick={() => setIsDeleteModalOpen(false)} className={`flex-1 py-3 rounded-xl font-bold text-sm ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>취소</button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600 text-white">삭제</button>
            </div>
          </div>
        </div>
      )}

      <header className={`w-full md:w-[340px] border-b md:border-r p-4 flex flex-col shrink-0 ${isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black italic tracking-tighter text-blue-500">Stock</h1>
            <div className="flex gap-3 ml-2">
              <Link href="/home" className="text-slate-300 hover:text-slate-800 font-black text-1xl tracking-tighter">🏠</Link> 
              <Link href="/" className="text-slate-300 hover:text-slate-800 transition-colors">
                <img src="/GV80.jpg" alt="Icon" className="w-5 h-5 inline-block mr-1 -mt-1 rounded-md"/></Link>
            </div>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[9px] font-black px-1.5 py-0.5 rounded border">{isDarkMode ? 'LIGHT' : 'DARK'}</button>
        </div>

        <form onSubmit={handleSave} className={`space-y-2 p-3 rounded-2xl border transition-all ${editingId ? 'bg-orange-950/10 border-orange-800' : (isDarkMode ? 'bg-[#0f172a]/50 border-slate-700' : 'bg-slate-100 border-slate-200')}`}>
          <div className="grid grid-cols-2 gap-1">
            <input type="date" className={inputBaseStyle} value={formData.trade_date} onChange={e => setFormData({...formData, trade_date: e.target.value})} required />
            <div className={`flex p-0.5 rounded-lg border ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-300'}`}>
              <button type="button" onClick={() => setFormData({...formData, trade_type: 'BUY'})} className={`flex-1 py-1 rounded-md text-[11px] font-black ${formData.trade_type === 'BUY' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400'}`}>매수</button>
              <button type="button" onClick={() => setFormData({...formData, trade_type: 'SELL'})} className={`flex-1 py-1 rounded-md text-[11px] font-black ${formData.trade_type === 'SELL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}>매도</button>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-1">
            <input type="text" placeholder="종목명" className={`col-span-3 ${inputBaseStyle} ${phColor}`} value={formData.stock_name} onChange={e => setFormData({...formData, stock_name: e.target.value})} required />
            <input type="text" placeholder="코드" className={`col-span-1 ${inputBaseStyle} ${phColor}`} value={formData.stock_code} onChange={e => setFormData({...formData, stock_code: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-3 gap-1.5">
            <input type="number" placeholder="수량" className={`${inputBaseStyle} ${phColor}`} value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
            <input type="number" placeholder="단가" className={`${inputBaseStyle} ${phColor}`} value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value})} required />
            <input type="number" placeholder="수수료" className={`${inputBaseStyle} ${phColor}`} value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <input type="number" placeholder="세금" className={`${inputBaseStyle} ${phColor}`} value={formData.tax} onChange={e => setFormData({...formData, tax: e.target.value})} />
            <input type="number" placeholder="수익금액" className={`${inputBaseStyle} ${phColor}`} value={formData.profit} onChange={e => setFormData({...formData, profit: e.target.value})} />
            <input type="number" placeholder="금액" className="p-2 rounded-lg text-[13px] font-black outline-none border bg-blue-50 text-blue-700 border-blue-200" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})} />
          </div>

          <div className="flex gap-1.5">
            <textarea className={`flex-1 h-[42px] resize-none ${inputBaseStyle} ${phColor}`} value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} placeholder="메모" />
            <div className={`flex gap-1 ${editingId ? 'w-[100px]' : 'w-[50px]'} transition-all`}>
              <button type="submit" className={`flex-1 rounded-lg font-black text-white text-[13px] shadow-lg active:scale-95 ${editingId ? 'bg-orange-600' : (formData.trade_type === 'BUY' ? 'bg-red-600' : 'bg-blue-600')}`}>
                {editingId ? "수정" : "저장"}
              </button>
              {editingId && <button type="button" onClick={resetForm} className="flex-1 rounded-lg font-black text-[11px] border border-slate-300">취소</button>}
            </div>
          </div>
        </form>
      </header>

      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <div className="flex flex-col gap-2 w-full">
            {logs.map(log => {
              const currentPrice = currentPrices[log.stock_code] || 0;
              const liveProfitRate = currentPrice > 0 ? ((currentPrice - log.unit_price) / log.unit_price * 100).toFixed(2) : null;
              return (
                <div key={log.id} onDoubleClick={() => startEdit(log)} className={`flex items-start p-3 rounded-2xl border transition-all cursor-pointer w-full ${editingId === log.id ? 'border-orange-500 bg-orange-50/10' : (isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white shadow-sm border-slate-200')}`}>
                  <div style={{ width: '15%' }} className="flex flex-col text-center mt-1 shrink-0">
                    <span className="text-[13px] font-bold opacity-70 leading-none">{log.trade_date.substring(0, 4)}</span>
                    <span className="text-[14px] font-black opacity-80 tracking-tighter mt-0.5">{log.trade_date.substring(5).replace('-', '.')}</span>
                    {log.stock_code && <span className="text-[10px] font-bold mt-1 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 opacity-60 truncate">{log.stock_code}</span>}
                  </div>
                  
                  <div style={{ width: '40%' }} className="px-2 min-w-0 flex-1">
                    <div className="flex items-center gap-1 overflow-hidden">
                      <div onClick={(e) => openExternalFinance(e, log.stock_name, log.stock_code)} className="font-black text-[16px] tracking-tight truncate text-blue-600 hover:underline">{log.stock_name}</div>
                      {log.stock_code && <button onClick={(e) => fetchRealTimePrice(e, log.stock_code, log.stock_name)} className="text-[12px] opacity-50 p-0.5">🔍</button>}
                    </div>
                    <div className="text-[12px] opacity-70 font-medium break-words leading-tight mt-0.5">{log.memo || '-'}</div>
                  </div>

                  <div style={{ width: '10%' }} className="text-center mt-1.5 shrink-0">
                    <span className={`text-[12px] font-black px-1.5 py-0.5 rounded ${log.trade_type === 'BUY' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>{log.trade_type === 'BUY' ? '매수' : '매도'}</span>
                  </div>

                  <div style={{ width: '30%' }} className="text-right shrink-0">
                    <div className="text-[15px] font-black tracking-tight">{log.total_amount.toLocaleString()}원</div>
                    <div className="text-[14px] font-bold opacity-70">{log.quantity}주 / {log.unit_price.toLocaleString()}</div>
                    {log.profit !== 0 ? (
                      <div className={`text-[16px] font-black mt-0.5 ${log.profit > 0 ? 'text-red-500' : 'text-blue-400'}`}>{log.profit > 0 ? '+' : ''}{log.profit.toLocaleString()}</div>
                    ) : liveProfitRate && (
                      <div className={`text-[15px] font-black mt-0.5 px-1.5 py-0.5 rounded bg-slate-50 inline-block ${Number(liveProfitRate) > 0 ? 'text-red-600' : 'text-blue-600'}`}>L {liveProfitRate}%</div>
                    )}
                  </div>

                  <div className="w-[20px] flex justify-end mt-1.5 shrink-0 ml-1">
                    <button onClick={(e) => { e.stopPropagation(); openDeleteModal(log.id); }} className="opacity-30 hover:opacity-100 hover:text-red-500 text-xs p-1">✕</button>
                  </div>
                </div>
              );
            })}
            {logs.length === 0 && <div className="text-center py-20 opacity-30 font-bold text-sm uppercase">No Records</div>}
          </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}