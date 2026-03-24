"use client";

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [formData, setFormData] = useState({
    refuel_date: new Date().toISOString().split('T')[0],
    unit_price_krw: "",
    fuel_volume_l: "",
    amount_krw: "",
    distance_km: "",
    memo: ""
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const price = Number(formData.unit_price_krw);
    const volume = Number(formData.fuel_volume_l);
    if (price > 0 && volume > 0) {
      const calculated = Math.floor(price * volume);
      setFormData(prev => ({ ...prev, amount_krw: calculated.toString() }));
    }
  }, [formData.unit_price_krw, formData.fuel_volume_l]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("fuel_logs")
      .select("*")
      .order("refuel_date", { ascending: false }); 
    if (!error) setLogs(data || []);
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      refuel_date: formData.refuel_date,
      unit_price_krw: Number(formData.unit_price_krw),
      fuel_volume_l: Number(formData.fuel_volume_l),
      amount_krw: Number(formData.amount_krw),
      distance_km: Number(formData.distance_km),
      memo: formData.memo,
    };

    if (editingId) {
      const { error } = await supabase.from("fuel_logs").update(payload).eq("id", editingId);
      if (error) showToast("수정 실패", "error");
      else {
        showToast("✅ 수정 완료");
        setEditingId(null);
      }
    } else {
      const { error } = await supabase.from("fuel_logs").insert([payload]);
      if (error) showToast("저장 실패", "error");
      else showToast("🚀 저장 완료");
    }
    resetForm();
    fetchLogs();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ 
      refuel_date: new Date().toISOString().split('T')[0],
      unit_price_krw: "", 
      fuel_volume_l: "", 
      amount_krw: "", 
      distance_km: "", 
      memo: "" 
    });
  }

  const startEdit = (log: any) => {
    setEditingId(log.id);
    setFormData({
      refuel_date: log.refuel_date,
      unit_price_krw: log.unit_price_krw.toString(),
      fuel_volume_l: log.fuel_volume_l.toString(),
      amount_krw: log.amount_krw.toString(),
      distance_km: log.distance_km.toString(),
      memo: log.memo || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (confirm("삭제하시겠습니까?")) {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", editingId);
      if (error) showToast("삭제 실패", "error");
      else {
        showToast("🗑️ 삭제 완료");
        resetForm();
        fetchLogs();
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white max-w-6xl mx-auto overflow-hidden border-x border-slate-200">
      
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full shadow-xl bg-slate-800 text-white font-bold text-xs">
          {toast.msg}
        </div>
      )}

      {/* --- [입력 영역] --- */}
      <header className="w-full md:w-[350px] bg-white z-20 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
        <div className="p-4">
          <h1 className="text-xl font-black mb-4 text-slate-800">🚗 내 차계부</h1>
          <section className={`p-4 rounded-2xl border ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block tracking-tighter">주유 일자</label>
                  <input type="date" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm font-bold text-slate-900 outline-none bg-white" 
                    value={formData.refuel_date} onChange={(e) => setFormData({...formData, refuel_date: e.target.value})} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block tracking-tighter">단가(원/L)</label>
                  <input type="number" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm text-right font-bold outline-none"
                    value={formData.unit_price_krw} onChange={(e) => setFormData({...formData, unit_price_krw: e.target.value})} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block tracking-tighter">주유량(L)</label>
                  <input type="number" step="0.01" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm text-right font-bold outline-none"
                    value={formData.fuel_volume_l} onChange={(e) => setFormData({...formData, fuel_volume_l: e.target.value})} required />
                </div>
                <div>
                  <label className="text-xs font-black text-blue-500 ml-1 mb-1 block tracking-tighter">주유액(자동)</label>
                  <input type="number" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm font-black text-right bg-blue-50 text-blue-800 outline-none" 
                    value={formData.amount_krw} onChange={(e) => setFormData({...formData, amount_krw: e.target.value})} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block tracking-tighter">주행거리(km)</label>
                  <input type="number" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm font-bold text-blue-600 text-right outline-none"
                    value={formData.distance_km} onChange={(e) => setFormData({...formData, distance_km: e.target.value})} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block tracking-tighter">메모</label>
                  <input type="text" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm font-bold outline-none text-slate-900"
                    value={formData.memo} onChange={(e) => setFormData({...formData, memo: e.target.value})} />
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button type="submit" className={`w-full py-3.5 rounded-xl font-black text-white shadow-lg transition-all ${editingId ? 'bg-orange-500' : 'bg-slate-800'}`}>
                  {editingId ? "내역 수정 저장" : "주유 기록 저장"}
                </button>
                {editingId && (
                  <div className="flex gap-2">
                    <button type="button" onClick={handleDelete} className="flex-1 bg-red-50 text-red-600 border border-red-100 py-2.5 rounded-lg font-bold">삭제</button>
                    <button type="button" onClick={resetForm} className="flex-1 bg-slate-100 text-slate-500 py-2.5 rounded-lg font-bold">취소</button>
                  </div>
                )}
              </div>
            </form>
          </section>
        </div>
      </header>

      {/* --- [내역 영역: 정렬 최적화] --- */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 font-sans">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">주유 내역 <span className="text-[10px] text-slate-300 font-normal ml-1">더블클릭 수정</span></h2>
          <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">{logs.length}건</span>
        </div>
        
        {/* 고정 헤더: 정렬에 맞춰 텍스트 정렬 변경 */}
        <div className="sticky top-0 bg-slate-50 px-4 py-2 border-b border-slate-200 z-10 flex items-center shadow-sm font-sans">
          <div className="w-[110px] shrink-0 text-[11px] font-bold text-slate-400 text-center uppercase tracking-tight">Date</div>
          <div className="w-[100px] shrink-0 text-[11px] font-bold text-slate-400 text-right pr-4 uppercase border-r border-slate-200 tracking-tight">Amount</div>
          <div className="flex-1 grid grid-cols-3 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
            <span className="text-right pr-4">Price</span>
            <span className="text-right pr-4">Liter</span>
            <span className="text-right pr-4">Distance</span>
          </div>
        </div>

        {/* 목록 데이터: 날짜 중앙 / 나머지 우측 정렬 */}
        <div className="divide-y divide-slate-100 overflow-y-auto flex-1 font-sans">
          {logs.map((log) => (
            <div 
              key={log.id} 
              onDoubleClick={() => startEdit(log)}
              className={`flex items-center px-4 py-4 hover:bg-slate-50 transition-colors cursor-pointer ${editingId === log.id ? 'bg-orange-50 ring-1 ring-inset ring-orange-200' : ''}`}
            >
              {/* 1. 날짜 (중앙 정렬) */}
              <div className="w-[110px] shrink-0 text-base font-black text-slate-950 text-center tracking-tight">
                {log.refuel_date}
              </div>

              {/* 2. 주유액 (우측 정렬) */}
              <div className="w-[100px] shrink-0 text-base font-black text-slate-950 text-right pr-4 border-r border-slate-100 tracking-tight">
                {log.amount_krw.toLocaleString()}
              </div>

              {/* 3. 상세 수치들 (전부 우측 정렬) */}
              <div className="flex-1 grid grid-cols-3 font-black text-slate-950 text-base tracking-tight">
                <div className="text-right pr-4 tracking-tighter">{log.unit_price_krw.toLocaleString()}</div>
                <div className="text-right pr-4 tracking-tighter">{log.fuel_volume_l.toLocaleString()}</div>
                <div className="text-right pr-4 text-blue-700 tracking-tighter">{log.distance_km.toLocaleString()}</div>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center py-20 text-slate-300 font-bold italic font-mono uppercase">NO DATA</div>
          )}
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}