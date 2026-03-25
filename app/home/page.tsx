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
    const { error } = editingId 
      ? await supabase.from("household_ledger").update(payload).eq("id", editingId)
      : await supabase.from("household_ledger").insert([payload]);

    if (!error) {
      showToast(editingId ? "✅ 수정 완료" : "🚀 등록 완료");
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
    if (confirm("이 항목을 정말 삭제하시겠습니까?")) {
      const { error } = await supabase.from("household_ledger").delete().eq("id", id);
      if (!error) { showToast("🗑️ 삭제 완료"); fetchLogs(); cancelEdit(); }
    }
  };

  const totalCard = logs.filter(l => l.is_card).reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const totalCash = logs.filter(l => !l.is_card).reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const totalSpent = totalCard + totalCash;
  const remaining = budget - totalSpent;

  // [수정]: 셀 너비 설정 (전체적으로 키움)
  const colWidths = {
    item: "w-[130px]",
    amount: "w-[150px]",
    spacer: "pr-8" // 우측 여백 넉넉히
  };

  if (!session) return <div className="p-10 text-center font-bold">로그인이 필요합니다.</div>;

  return (
    // [변경]: max-w-4xl로 전체 폭 확장
    <div className="flex flex-col h-screen bg-white max-w-4xl mx-auto border-x border-slate-200 font-sans relative">
      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full shadow-xl bg-slate-800 text-white font-bold text-xs">{toast.msg}</div>}

      <header className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-300 hover:text-slate-800 font-black text-2xl tracking-tighter transition-colors">🚗 GV80</Link>
          <h1 className="text-2xl font-black text-blue-600 tracking-tighter">🏠 HOME</h1>
        </div>
        <button onClick={() => { cancelEdit(); setIsAdding(true); }} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-black active:scale-95 transition-all">
          [+] 신규 항목 추가
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-72 custom-scrollbar">
        {/* 입력 폼 상단 노출 */}
        {isAdding && (
          <div className="bg-blue-50 p-6 border-b-2 border-blue-100 space-y-4 animate-in slide-in-from-top duration-300">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="항목명" className="p-3 rounded-xl border border-blue-200 text-sm font-bold outline-none" value={tempData.item_name} onChange={e => setTempData({...tempData, item_name: e.target.value})} />
              <input type="number" placeholder="금액" className="p-3 rounded-xl border border-blue-200 text-sm font-bold text-right outline-none" value={tempData.amount} onChange={e => setTempData({...tempData, amount: e.target.value})} />
            </div>
            <div className="flex gap-4 items-center">
              <input type="text" placeholder="상세 비고 내용" className="flex-1 p-3 rounded-xl border border-blue-200 text-sm font-bold outline-none" value={tempData.remarks} onChange={e => setTempData({...tempData, remarks: e.target.value})} />
              <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-3 rounded-xl border border-blue-200">
                <input type="checkbox" checked={tempData.is_card} onChange={e => setTempData({...tempData, is_card: e.target.checked})} className="w-4 h-4" />
                <span className="text-xs font-black text-slate-500 uppercase">Card</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition-colors">항목 저장하기</button>
              <button onClick={cancelEdit} className="px-8 bg-slate-200 text-slate-500 py-3 rounded-xl font-black text-sm hover:bg-slate-300">취소</button>
            </div>
          </div>
        )}

        {/* 목록 헤더 - 너비 확장 반영 */}
        <div className="bg-slate-50 px-6 py-3 flex text-[11px] font-black text-slate-500 border-b border-slate-200 sticky top-0 z-10 uppercase tracking-widest">
          <div className={`${colWidths.item} shrink-0 text-center`}>Item Category</div>
          <div className={`${colWidths.amount} text-right ${colWidths.spacer} shrink-0 border-r border-slate-200 bg-slate-100/50`}>Amount (KRW)</div>
          <div className="flex-1 text-center px-6">Description / Remarks</div>
        </div>

        {/* 목록 데이터 - 너비 확장 반영 */}
        <div className="divide-y divide-slate-100">
          {logs.map((log) => {
            const isEditing = editingId === log.id;
            return (
              <div key={log.id} className={`flex items-center px-6 py-4 hover:bg-slate-50 transition-colors ${isEditing ? 'bg-yellow-50' : ''}`}
                onDoubleClick={() => { setEditingId(log.id); setEditMode("all"); setTempData({ item_name: log.item_name, amount: log.amount.toString(), remarks: log.remarks || "", is_card: log.is_card }); }}>
                <div className={`${colWidths.item} shrink-0`}>
                  {isEditing && editMode === "all" ? (
                    <input className="w-full text-center font-black text-sm border-b-2 border-blue-400 outline-none bg-transparent" value={tempData.item_name} onChange={e => setTempData({...tempData, item_name: e.target.value})} />
                  ) : (
                    <div className={`font-black text-sm text-center tracking-tighter ${log.is_card ? 'text-blue-700' : 'text-slate-900'}`}>{log.item_name}</div>
                  )}
                </div>
                <div className={`${colWidths.amount} shrink-0 text-right ${colWidths.spacer} border-r border-slate-100`}>
                  {isEditing ? (
                    <input autoFocus type="number" className="w-full text-right font-black text-sm text-blue-600 outline-none bg-transparent border-b-2 border-blue-400" value={tempData.amount} onChange={e => setTempData({...tempData, amount: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleSave()} />
                  ) : (
                    <div className="font-black text-sm text-slate-950 cursor-pointer hover:bg-yellow-100 px-2 py-1 rounded transition-all" onClick={() => { setEditingId(log.id); setEditMode("amount"); setTempData({ item_name: log.item_name, amount: log.amount.toString(), remarks: log.remarks || "", is_card: log.is_card }); }}>
                      {log.amount.toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex-1 px-8 flex items-center justify-between min-w-0">
                  {isEditing && editMode === "all" ? (
                    <div className="flex-1 flex gap-3 items-center">
                      <input className="flex-1 text-xs font-bold border-b-2 border-blue-400 outline-none bg-transparent" value={tempData.remarks} onChange={e => setTempData({...tempData, remarks: e.target.value})} />
                      <button onClick={handleSave} className="text-[11px] font-black text-blue-600 hover:scale-110">SAVE</button>
                      <button onClick={() => handleDelete(log.id)} className="text-[11px] font-black text-red-600 hover:scale-110 ml-1">DEL</button>
                    </div>
                  ) : (
                    <div className="text-[13px] font-bold text-slate-400 whitespace-normal break-all leading-relaxed">{log.remarks || "-"}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* [Footer]: 확장된 너비에 맞춰 세로선 정렬 완료 */}
      <footer className="absolute bottom-0 left-0 right-0 bg-slate-900 text-white p-6 space-y-2 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-[2.5rem]">
        {/* 1. 카드종합 */}
        <div className="flex items-center">
          <div className={`${colWidths.item} text-center text-[11px] font-black text-slate-500 uppercase`}>Card Total</div>
          <div className={`${colWidths.amount} text-right ${colWidths.spacer} font-black text-base border-r border-slate-700 text-blue-400`}>{totalCard.toLocaleString()}</div>
          <div className="flex-1 pl-6 text-[11px] text-slate-600 font-bold uppercase tracking-widest opacity-50">Credit Card Sum</div>
        </div>

        {/* 2. 현금종합 */}
        <div className="flex items-center">
          <div className={`${colWidths.item} text-center text-[11px] font-black text-slate-500 uppercase`}>Cash Total</div>
          <div className={`${colWidths.amount} text-right ${colWidths.spacer} font-black text-base border-r border-slate-700 text-emerald-400`}>{totalCash.toLocaleString()}</div>
          <div className="flex-1 pl-6 text-[11px] text-slate-600 font-bold uppercase tracking-widest opacity-50">General Cash Sum</div>
        </div>

        {/* 3. 지출합계 */}
        <div className="flex items-center border-t border-slate-800 pt-2">
          <div className={`${colWidths.item} text-center text-[11px] font-black text-slate-400 uppercase`}>Total Spent</div>
          <div className={`${colWidths.amount} text-right ${colWidths.spacer} font-black text-base border-r border-slate-700 text-white`}>{totalSpent.toLocaleString()}</div>
          <div className="flex-1 pl-6 text-[11px] text-slate-500 font-black italic opacity-50">Total Combined Expenditure</div>
        </div>

        {/* 4. 예산 (Budget) */}
        <div className="flex items-center">
          <div className={`${colWidths.item} text-center text-[12px] font-black text-slate-400 uppercase tracking-tighter`}>Monthly Budget</div>
          <div className={`${colWidths.amount} text-right ${colWidths.spacer} border-r border-slate-700 bg-transparent`}>
            {editMode === "budget" ? (
              <input autoFocus type="number" className="w-full text-right font-black text-xl bg-slate-800 text-orange-400 outline-none rounded-md" value={tempBudget} onChange={(e) => setTempBudget(e.target.value)} onBlur={() => { if(tempBudget) setBudget(Number(tempBudget)); setEditMode(null); }} onKeyDown={(e) => e.key === 'Enter' && (setBudget(Number(tempBudget)), setEditMode(null))} />
            ) : (
              <div className="font-black text-xl text-white cursor-pointer hover:text-orange-400 transition-all underline decoration-slate-700 underline-offset-4" onClick={() => { setEditMode("budget"); setTempBudget(budget.toString()); }}>{budget.toLocaleString()}</div>
            )}
          </div>
          <div className="flex-1 pl-6 text-[11px] text-slate-500 font-bold uppercase tracking-tighter">Current Target Goal</div>
        </div>

        {/* 5. 잔액 (Remain) */}
        <div className="flex items-center border-t border-slate-700 pt-3 mt-1">
          <div className={`${colWidths.item} text-center text-[13px] font-black text-orange-400 uppercase tracking-tighter leading-none`}>Balance</div>
          <div className={`${colWidths.amount} text-right ${colWidths.spacer} font-black text-3xl border-r border-slate-700 leading-none tracking-tighter`}>
             <span className={`${remaining < 0 ? 'text-red-500' : 'text-orange-400'} animate-pulse`}>
              {remaining.toLocaleString()}
            </span>
          </div>
          <div className="flex-1 text-right pr-4 text-[12px] font-black text-slate-600 uppercase tracking-widest">Krw Surplus</div>
        </div>
      </footer>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}