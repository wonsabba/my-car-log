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
      if (error) showToast("수정 실패: " + error.message, "error");
      else {
        showToast("✅ 수정이 완료되었습니다.");
        setEditingId(null);
      }
    } else {
      const { error } = await supabase.from("fuel_logs").insert([payload]);
      if (error) showToast("저장 실패: " + error.message, "error");
      else showToast("🚀 성공적으로 저장되었습니다.");
    }

    setFormData({ 
      refuel_date: new Date().toISOString().split('T')[0],
      unit_price_krw: "", 
      fuel_volume_l: "", 
      amount_krw: "", 
      distance_km: "", 
      memo: "" 
    });
    fetchLogs();
  };

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
  };

  const handleDelete = async (id: number) => {
    if (confirm("정말로 삭제하시겠습니까?")) {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
      if (error) showToast("삭제 실패: " + error.message, "error");
      else {
        showToast("🗑️ 삭제되었습니다.");
        fetchLogs();
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 max-w-6xl mx-auto overflow-hidden border-x border-slate-200 relative">
      
      {toast && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl text-white font-bold transition-all ${toast.type === 'success' ? 'bg-blue-600' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      <header className="w-full md:w-[360px] bg-white z-20 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-5">
          <h1 className="text-xl font-black mb-4 text-slate-800 flex items-center justify-center md:justify-start gap-2">
            <span className="bg-blue-600 p-1.5 rounded-lg text-white text-sm">⛽</span> 내 차계부
          </h1>
          
          <section className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100 shadow-inner">
            <h2 className="text-[10px] font-bold text-blue-500 mb-3 uppercase tracking-widest">
              {editingId ? "Edit Record" : "New Record"}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">주유 일자</label>
                  <input type="date" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white font-medium text-slate-900" 
                    value={formData.refuel_date} onChange={(e) => setFormData({...formData, refuel_date: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">단가(원/L)</label>
                  <input type="number" placeholder="0" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none text-right text-slate-900 font-bold"
                    value={formData.unit_price_krw} onChange={(e) => setFormData({...formData, unit_price_krw: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">주유량(L)</label>
                  <input type="number" step="0.01" placeholder="0.00" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none text-right font-bold text-slate-900"
                    value={formData.fuel_volume_l} onChange={(e) => setFormData({...formData, fuel_volume_l: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-blue-500 ml-1 mb-1 block font-black text-[9px]">주유액(자동)</label>
                  <input type="number" placeholder="0" className="p-2.5 border-2 border-blue-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none font-black text-right bg-blue-50 text-blue-800" 
                    value={formData.amount_krw} onChange={(e) => setFormData({...formData, amount_krw: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">주행거리(km)</label>
                  <input type="number" placeholder="0" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none font-bold text-blue-600 text-right"
                    value={formData.distance_km} onChange={(e) => setFormData({...formData, distance_km: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">메모</label>
                  <input type="text" placeholder="..." className="p-2.5 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none font-medium text-slate-900"
                    value={formData.memo} onChange={(e) => setFormData({...formData, memo: e.target.value})} />
                </div>
              </div>
              
              <div className="flex gap-2 pt-1">
                <button type="submit" className={`flex-1 py-3.5 rounded-xl font-black text-white shadow-lg active:scale-95 transition-all ${editingId ? 'bg-orange-500' : 'bg-slate-800'}`}>
                  {editingId ? "수정 완료" : "데이터 저장"}
                </button>
                {editingId && (
                  <button type="button" onClick={() => {setEditingId(null); setFormData({refuel_date: new Date().toISOString().split('T')[0], unit_price_krw:"", fuel_volume_l:"", amount_krw:"", distance_km:"", memo:""})}} 
                    className="bg-slate-200 text-slate-600 px-4 py-3.5 rounded-xl font-bold">취소</button>
                )}
              </div>
            </form>
          </section>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 custom-scrollbar bg-slate-50">
        <div className="flex justify-between items-end mb-6 px-1">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">주유 내역 목록</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{logs.length} Total Logs</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="group bg-white p-4 rounded-2xl border border-white shadow-sm hover:shadow-md hover:border-blue-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* 날짜 크기 키움 (text-sm -> text-base), 색상 검정 (text-slate-900) */}
                <div className="text-base font-mono font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  {log.refuel_date}
                </div>
                <div className="text-base font-black text-slate-800 tracking-tight">
                  {log.amount_krw.toLocaleString()}<span className="text-[10px] font-normal ml-0.5 text-slate-400">원</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base font-black text-slate-600">
                {/* 단가 색상 검정 (text-slate-900) */}
                <div className="flex items-center gap-1.5 min-w-[80px] text-slate-900">
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">@</span>
                  <span className="text-base">{log.unit_price_krw}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-[60px]">
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">L</span>
                  <span>{log.fuel_volume_l}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-[100px] text-blue-600">
                  <span className="text-[10px] text-blue-200 font-bold uppercase tracking-tighter">Km</span>
                  <span>{log.distance_km.toLocaleString()}</span>
                </div>
                {log.memo && (
                  <div className="text-sm font-medium text-slate-500 italic hidden lg:block">
                    💬 {log.memo}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-50">
                <button onClick={() => startEdit(log)} className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg active:bg-blue-100">수정</button>
                <button onClick={() => handleDelete(log.id)} className="px-3 py-1.5 text-xs font-bold text-red-400 bg-red-50 rounded-lg active:bg-red-100">삭제</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}