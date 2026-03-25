"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import Link from "next/link";

export default function HouseholdLedger() {
  const [session, setSession] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<"amount" | "all" | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [tempData, setTempData] = useState({ item_name: "", amount: "", remarks: "", is_card: false });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  useEffect(() => { if (session) fetchLogs(); }, [session]);

  const fetchLogs = async () => {
    const { data, error } = await supabase.from("household_ledger").select("*").order("is_card", { ascending: false }).order("created_at"); 
    if (!error) setLogs(data || []);
  };

  const handleSave = async () => {
    const payload = { ...tempData, amount: Number(tempData.amount) };
    let error;
    if (editingId) {
      error = (await supabase.from("household_ledger").update(payload).eq("id", editingId)).error;
    } else {
      error = (await supabase.from("household_ledger").insert([payload])).error;
    }

    if (!error) {
      showToast(editingId ? "✅ 수정 완료" : "🚀 신규 등록 완료");
      cancelEdit();
      fetchLogs();
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditMode(null);
    setIsAdding(false);
    setTempData({ item_name: "", amount: "", remarks: "", is_card: false });
  };

  const handleDelete = async (id: number) => {
    if (confirm("이 항목을 삭제하시겠습니까?")) {
      const { error } = await supabase.from("household_ledger").delete().eq("id", id);
      if (!error) { showToast("🗑️ 삭제 완료"); fetchLogs(); cancelEdit(); }
    }
  };

  const totalCardAmount = logs.filter(l => l.is_card).reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const totalGeneralAmount = logs.filter(l => !l.is_card).reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const budget = 5200000; // 엑셀 기준 예산

  if (!session) return <div className="p-10 text-center font-bold">로그인이 필요합니다.</div>;

  return (
    <div className="flex flex-col h-screen bg-white max-w-3xl mx-auto border-x border-slate-200 font-sans relative">
      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full shadow-xl bg-slate-800 text-white font-bold text-xs">{toast.msg}</div>}

      <header className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-300 hover:text-slate-800 font-black text-2xl tracking-tighter transition-colors">🚗 GV80</Link>
          <h1 className="text-2xl font-black text-blue-600 tracking-tighter">🏠 HOME</h1>
        </div>
        <button 
          onClick={() => { cancelEdit(); setIsAdding(true); }}
          className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg active:scale-95 transition-all"
        >
          [+] 신규 항목
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-48 custom-scrollbar">
        {isAdding && (
          <div className="bg-blue-50 p-5 border-b-2 border-blue-100 space-y-4 animate-in slide-in-from-top duration-300">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="항목명" className="p-3 rounded-xl border border-blue-200 text-sm font-bold outline-none" value={tempData.item_name} onChange={e => setTempData({...tempData, item_name: e.target.value})} />
              <input type="number" placeholder="금액" className="p-3 rounded-xl border border-blue-200 text-sm font-bold text-right outline-none" value={tempData.amount} onChange={e => setTempData({...tempData, amount: e.target.value})} />
            </div>
            <div className="flex gap-3 items-center">
              <input type="text" placeholder="비고 (날짜, 이체방식 등)" className="flex-1 p-3 rounded-xl border border-blue-200 text-sm font-bold outline-none" value={tempData.remarks} onChange={e => setTempData({...tempData, remarks: e.target.value})} />
              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-3 rounded-xl border border-blue-200">
                <input type="checkbox" checked={tempData.is_card} onChange={e => setTempData({...tempData, is_card: e.target.checked})} className="w-4 h-4" />
                <span className="text-xs font-black text-slate-500">CARD</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-sm shadow-md">저장</button>
              <button onClick={cancelEdit} className="px-6 bg-slate-200 text-slate-500 py-3 rounded-xl font-black text-sm">취소</button>
            </div>
          </div>
        )}

        {/* [Header]: 비고 영역 확장을 위해 너비 재조정 */}
        <div className="bg-slate-50 px-4 py-2.5 flex text-[11px] font-black text-slate-500 border-b border-slate-200 sticky top-0 z-10 uppercase tracking-widest">
          <div className="w-[110px] shrink-0 text-center">ITEM</div>
          <div className="w-[120px] text-right pr-6 shrink-0 border-r border-slate-200 bg-slate-100/50">AMOUNT</div>
          <div className="flex-1 text-center px-4">REMARKS / MEMO</div>
        </div>

        <div className="divide-y divide-slate-100">
          {logs.map((log) => {
            const isEditing = editingId === log.id;
            return (
              <div 
                key={log.id} 
                className={`flex items-center px-4 py-4 hover:bg-slate-50 transition-colors ${isEditing ? 'bg-yellow-50' : ''}`}
                onDoubleClick={() => {
                  setEditingId(log.id);
                  setEditMode("all");
                  setTempData({ item_name: log.item_name, amount: log.amount.toString(), remarks: log.remarks || "", is_card: log.is_card });
                }}
              >
                <div className="w-[110px] shrink-0">
                  {isEditing && editMode === "all" ? (
                    <input className="w-full text-center font-black text-sm border-b-2 border-blue-400 outline-none bg-transparent" value={tempData.item_name} onChange={e => setTempData({...tempData, item_name: e.target.value})} />
                  ) : (
                    <div className={`font-black text-sm text-center tracking-tighter ${log.is_card ? 'text-blue-700' : 'text-slate-900'}`}>{log.item_name}</div>
                  )}
                </div>

                <div className="w-[120px] shrink-0 text-right pr-6 border-r border-slate-100">
                  {isEditing ? (
                    <input
                      autoFocus
                      type="number"
                      className="w-full text-right font-black text-sm text-blue-600 outline-none bg-transparent border-b-2 border-blue-400"
                      value={tempData.amount}
                      onChange={e => setTempData({...tempData, amount: e.target.value})}
                      onKeyDown={e => e.key === 'Enter' && handleSave()}
                    />
                  ) : (
                    <div 
                      className="font-black text-sm text-slate-950 cursor-pointer hover:bg-yellow-100 px-1 rounded transition-colors"
                      onClick={() => {
                        setEditingId(log.id);
                        setEditMode("amount");
                        setTempData({ item_name: log.item_name, amount: log.amount.toString(), remarks: log.remarks || "", is_card: log.is_card });
                      }}
                    >
                      {log.amount.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* [REMARKS]: whitespace-normal로 긴 텍스트 줄바꿈 허용 */}
                <div className="flex-1 px-5 flex items-center justify-between min-w-0">
                  {isEditing && editMode === "all" ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <input className="flex-1 text-xs font-bold border-b-2 border-blue-400 outline-none bg-transparent" value={tempData.remarks} onChange={e => setTempData({...tempData, remarks: e.target.value})} />
                      <button onClick={handleSave} className="text-[11px] font-black text-blue-600 shrink-0">SAVE</button>
                      <button onClick={() => handleDelete(log.id)} className="text-[11px] font-black text-red-500 shrink-0">DEL</button>
                    </div>
                  ) : (
                    <div className="text-[12px] font-bold text-slate-400 whitespace-normal break-all leading-snug">
                      {log.remarks || "-"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 bg-slate-900 text-white p-5 space-y-3 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.4)] rounded-t-3xl">
        <div className="flex items-center">
          <div className="w-[110px] text-center text-[10px] font-black text-slate-500">CARD TOTAL</div>
          <div className="w-[120px] text-right pr-6 font-black text-sm border-r border-slate-700 text-blue-400">{totalCardAmount.toLocaleString()}</div>
          <div className="flex-1"></div>
        </div>
        <div className="flex items-center">
          <div className="w-[110px] text-center text-[10px] font-black text-slate-500">CASH TOTAL</div>
          <div className="w-[120px] text-right pr-6 font-black text-sm border-r border-slate-700 text-emerald-400">{totalGeneralAmount.toLocaleString()}</div>
          <div className="flex-1 px-6 text-[11px] font-bold text-slate-500 italic uppercase tracking-widest">Live Monitoring</div>
        </div>
        <div className="flex items-center border-t border-slate-800 pt-3 mt-1">
          <div className="w-[110px] text-center text-[11px] font-black text-slate-400">TOTAL SUM</div>
          <div className="w-[120px] text-right pr-6 font-black text-xl text-orange-400 border-r border-slate-700 leading-none">
            {(totalCardAmount + totalGeneralAmount).toLocaleString()}
          </div>
          <div className="flex-1 text-right pr-4 text-[11px] font-black text-red-500 animate-pulse">
            {(budget - (totalCardAmount + totalGeneralAmount)).toLocaleString()} LEFT
          </div>
        </div>
      </footer>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}