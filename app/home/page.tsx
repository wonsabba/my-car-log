"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import Link from "next/link";

export default function HouseholdLedger() {
  const [session, setSession] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<"amount" | "all" | "budget" | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [tempData, setTempData] = useState({ item_name: "", amount: "", remarks: "", is_card: false });
  const [budget, setBudget] = useState(5200000);
  const [tempBudget, setTempBudget] = useState("");

  const defaultAmounts: { [key: string]: number } = {
    "BNK 이체": 1000000, "펀드,월세": 1000000, "동백전(수학)": 500000, "국민연금/보험": 369260,
    "환화종신보험": 208000, "가족,처가,동문": 100000, "주택청약(KB)": 100000, "규원영어": 250000,
    "생활비": 500000, "ISA": 500000, "안마,치아보험": 68270, "가족통신요금": 88000, "상조회비": 50000, "관리비": 280000,
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  };

  // ✅ DB에서 Budget(기준금액) 불러오기
  const fetchBudget = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value_num")
      .eq("id", "household_budget")
      .single();
    if (data && !error) setBudget(data.value_num);
  };

  // ✅ DB에 Budget(기준금액) 저장하기
  const updateBudget = async (newVal: number) => {
    const { error } = await supabase
      .from("app_settings")
      .update({ value_num: newVal, updated_at: new Date() })
      .eq("id", "household_budget");

    if (!error) {
      setBudget(newVal);
      showToast("☁️ 클라우드에 기준금액 저장 완료");
    } else {
      showToast("저장 실패", "error");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  useEffect(() => { 
    if (session) {
      fetchLogs();
      fetchBudget(); // ✅ 세션 연결 시 기준금액도 가져옴
    } 
  }, [session]);

  const fetchLogs = async () => {
    const { data, error } = await supabase.from("household_ledger").select("*").order("is_card", { ascending: false }).order("created_at"); 
    if (!error) setLogs(data || []);
  };

  const handleReset = async () => {
    if (!confirm("새 달을 시작하시겠습니까?\n카드는 0원, 일반 항목은 지정가로 초기화됩니다.")) return;
    try {
      await supabase.from("household_ledger").update({ amount: 0 }).eq("is_card", true);
      const generalItems = logs.filter(l => !l.is_card);
      for (const item of generalItems) {
        const resetVal = defaultAmounts[item.item_name] || 0;
        await supabase.from("household_ledger").update({ amount: resetVal }).eq("id", item.id);
      }
      showToast("✨ 가계부 초기화 완료!");
      fetchLogs();
    } catch (e) { showToast("초기화 중 오류 발생", "error"); }
  };

  const handleSave = async () => {
    const payload = { ...tempData, amount: Number(tempData.amount) };
    const { error } = editingId 
      ? await supabase.from("household_ledger").update(payload).eq("id", editingId)
      : await supabase.from("household_ledger").insert([payload]);
    if (!error) { showToast(editingId ? "✅ 수정" : "🚀 등록"); cancelEdit(); fetchLogs(); }
  };

  const cancelEdit = () => {
    setEditingId(null); setEditMode(null); setIsAdding(false);
    setTempData({ item_name: "", amount: "", remarks: "", is_card: false });
  };

  const handleDelete = async (id: number) => {
    if (confirm("삭제하시겠습니까?")) {
      const { error } = await supabase.from("household_ledger").delete().eq("id", id);
      if (!error) { showToast("🗑️ 삭제"); fetchLogs(); cancelEdit(); }
    }
  };

  const totalCard = logs.filter(l => l.is_card).reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const totalCash = logs.filter(l => !l.is_card).reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const totalSpent = totalCard + totalCash;
  const remaining = budget - totalSpent;

  const colWidths = { item: "w-[110px]", amount: "w-[125px]", spacer: "pr-5" };

  if (!session) return <div className="p-10 text-center font-bold">로그인이 필요합니다.</div>;

  return (
    <div className="flex flex-col h-screen bg-white max-w-[760px] mx-auto border-x border-slate-200 font-sans relative shadow-2xl overflow-hidden">
      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full shadow-xl bg-slate-800 text-white font-bold text-xs">{toast.msg}</div>}

      <header className="p-2 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black text-blue-600 tracking-tighter">🏠 House</h1>
          <Link href="/" className="text-slate-300 hover:text-slate-800 transition-colors">
            <img src="/GV80.jpg" alt="Icon" className="w-7 h-7 inline-block rounded-md" />
          </Link>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg active:scale-95">🔄 초기화</button>
          <button onClick={() => { cancelEdit(); setIsAdding(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg active:scale-95">[+] 신규 항목</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-[280px] custom-scrollbar bg-white">
        {isAdding && (
          <div className="bg-blue-50 p-3 border-b border-blue-100 space-y-2 animate-in slide-in-from-top">
            <div className="flex gap-2 items-center">
              <input type="text" placeholder="항목명" className="w-[120px] p-2 rounded-lg border border-blue-200 text-xs font-bold outline-none" value={tempData.item_name} onChange={e => setTempData({...tempData, item_name: e.target.value})} />
              <input type="number" placeholder="금액" className="w-[120px] p-2 rounded-lg border border-blue-200 text-xs font-bold text-right outline-none" value={tempData.amount} onChange={e => setTempData({...tempData, amount: e.target.value})} />
              <label className="flex items-center gap-1 cursor-pointer bg-white px-2 py-2 rounded-lg border border-blue-200 shrink-0">
                <input type="checkbox" checked={tempData.is_card} onChange={e => setTempData({...tempData, is_card: e.target.checked})} className="w-3.5 h-3.5" />
                <span className="text-[9px] font-black text-slate-500 tracking-tighter">Card</span>
              </label>
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="비고 입력" className="flex-1 min-w-0 p-2 rounded-lg border border-blue-200 text-xs font-bold outline-none" value={tempData.remarks} onChange={e => setTempData({...tempData, remarks: e.target.value})} />
              <button onClick={handleSave} className="px-5 bg-blue-600 text-white py-2 rounded-lg font-black text-xs shadow-sm">저장</button>
              <button onClick={cancelEdit} className="px-3 bg-slate-200 text-slate-500 py-2 rounded-lg font-black text-xs">취소</button>
            </div>
          </div>
        )}

        <div className="bg-slate-50 px-4 py-2.5 flex text-[11px] font-black text-slate-500 border-b border-slate-200 sticky top-0 z-10 uppercase tracking-widest">
          <div className={`${colWidths.item} shrink-0 text-center`}>항목</div>
          <div className={`${colWidths.amount} text-right pr-[35px] shrink-0 border-r border-slate-200 bg-slate-100/50`}>사용금액</div>
          <div className="flex-1 text-center px-4">비고</div>
        </div>

        <div className="divide-y divide-slate-100">
          {logs.map((log) => {
            const isEditing = editingId === log.id;
            return (
              <div key={log.id} className={`flex items-left px-4 py-[12px] hover:bg-slate-50 transition-colors ${isEditing ? 'bg-yellow-50' : ''}`}
                onDoubleClick={() => { setEditingId(log.id); setEditMode("all"); setTempData({ item_name: log.item_name, amount: log.amount.toString(), remarks: log.remarks || "", is_card: log.is_card }); }}>
                
                <div className={`${colWidths.item} shrink-0 font-black text-sm text-left pl-4 ${log.is_card ? 'text-blue-700' : 'text-slate-900'}`}>
                  {isEditing && editMode === "all" ? (
                    <input className="w-full text-left outline-none bg-transparent border-b border-blue-400" value={tempData.item_name} onChange={e => setTempData({...tempData, item_name: e.target.value})} />
                  ) : (log.item_name)}
                </div>

                <div className={`${colWidths.amount} shrink-0 text-right pr-5 border-r border-slate-100 font-black text-sm`}>
                  {isEditing ? (
                    <input autoFocus type="number" className="w-full text-right outline-none bg-transparent" value={tempData.amount} onChange={e => setTempData({...tempData, amount: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleSave()} />
                  ) : (
                    <div className="font-black text-sm text-slate-950 cursor-pointer hover:bg-yellow-100 px-1 rounded" 
                      onClick={() => { 
                        setEditingId(log.id); setEditMode("amount"); 
                        setTempData({ item_name: log.item_name, amount: log.amount.toString(), remarks: log.remarks || "", is_card: log.is_card }); 
                      }}>{log.amount.toLocaleString()}</div>
                  )}
                </div>
                
                <div className="flex-1 px-5 flex items-center justify-between min-w-0">
                  {isEditing && editMode === "all" ? (
                    <div className="flex-1 flex gap-2 items-left">
                      <input className="flex-1 text-xs font-bold border-b-2 border-blue-400 outline-none bg-transparent" value={tempData.remarks} onChange={e => setTempData({...tempData, remarks: e.target.value})} />
                      <button onClick={handleSave} className="text-[11px] font-black text-blue-600">SAVE</button>
                      <button onClick={() => handleDelete(log.id)} className="text-[11px] font-black text-red-600 ml-1">DEL</button>
                    </div>
                  ) : (<div className="text-[12px] font-bold text-slate-600 whitespace-normal break-all leading-snug">{log.remarks || "-"}</div>)}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 bg-slate-900 text-white p-4 py-2 pb-1 space-y-1 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-[2.5rem] border-t border-slate-700">
        <div className="flex items-center border-b border-slate-800 pb-1 mb-1 opacity-50">
           <div className="flex-1 text-center text-[8px] font-black tracking-[0.2em]">CLOUD SYNC SYSTEM ACTIVE</div>
        </div>
        <div className="flex items-center">
          <div className={`${colWidths.item} text-center text-[10px] font-black text-slate-400 tracking-tighter`}>Card Total</div>
          <div className={`${colWidths.amount} text-right pr-5 font-black text-sm border-r border-slate-700 text-blue-400`}>{totalCard.toLocaleString()}</div>
          <div className="flex-1 pl-4 text-[10px] text-slate-500 font-bold uppercase">카드종합</div>
        </div>
        <div className="flex items-center">
          <div className={`${colWidths.item} text-center text-[10px] font-black text-slate-400 tracking-tighter`}>Cash Total</div>
          <div className={`${colWidths.amount} text-right pr-5 font-black text-sm border-r border-slate-700 text-emerald-400`}>{totalCash.toLocaleString()}</div>
          <div className="flex-1 pl-4 text-[10px] text-slate-500 font-bold uppercase">일반종합</div>
        </div>
        <div className="flex items-center border-t border-slate-800 pt-0.5 mt-0.5">
          <div className={`${colWidths.item} text-center text-[10px] font-black text-slate-300 uppercase`}>Total</div>
          <div className={`${colWidths.amount} text-right pr-5 font-black text-sm border-r border-slate-700 text-white`}>{totalSpent.toLocaleString()}</div>
          <div className="flex-1 pl-4 text-[10px] text-slate-500 font-black italic">사용금액</div>
        </div>

        <div className="flex items-center">
          <div className={`${colWidths.item} text-center text-[11px] font-black text-slate-300 uppercase`}>Budget</div>
          <div className={`${colWidths.amount} text-right pr-5 border-r border-slate-700`}>
            {editMode === "budget" ? (
              <input autoFocus type="number" className="w-full text-right font-black text-lg bg-slate-800 text-orange-400 outline-none rounded" 
                value={tempBudget} 
                onChange={(e) => setTempBudget(e.target.value)} 
                onBlur={() => { if(tempBudget) updateBudget(Number(tempBudget)); setEditMode(null); }} 
                onKeyDown={(e) => { if(e.key === 'Enter' && tempBudget) { updateBudget(Number(tempBudget)); setEditMode(null); } }} />
            ) : (
              <div className="font-black text-lg text-white cursor-pointer hover:text-orange-400 transition-colors" 
                onClick={() => { setEditMode("budget"); setTempBudget(budget.toString()); }}>{budget.toLocaleString()}</div>
            )}
          </div>
          <div className="flex-1 pl-4 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">기준금액</div>
        </div>

        <div className="flex items-center border-t border-slate-700 pt-1 mt-1">
          <div className={`${colWidths.item} text-center text-[12px] font-black text-orange-400 uppercase tracking-tighter leading-none`}>Remain</div>
          <div className={`${colWidths.amount} text-right pr-5 font-black text-2xl border-r border-slate-700 leading-none tracking-tighter`}>
             <span className={`${remaining < 0 ? 'text-red-500' : 'text-orange-400'} animate-pulse`}>{remaining.toLocaleString()}</span>
          </div>
          <div className="flex-1 pl-3 text-[12px] font-black text-slate-300 uppercase tracking-widest">최종잔액</div>
        </div>

        <div className="pt-8 pb-8 flex flex-col items-center opacity-50 select-none border-t border-slate-800/50 mt-1">
          <div className="text-[9px] font-black tracking-[0.4em] text-slate-400 ">Designed for BRANDON</div>
          <div className="text-[8px] font-bold tracking-[0.2em] text-slate-500 mt-0.5 italic">EST. 1994 DONGSEO UNIV. DEVELOPER</div>
        </div>
      </footer>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}