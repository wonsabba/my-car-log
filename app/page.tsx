"use client";

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    refuel_date: new Date().toISOString().split('T')[0],
    amount_krw: "",
    distance_km: "",
    unit_price_krw: "",
    fuel_volume_l: "",
    memo: ""
  });

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
      amount_krw: Number(formData.amount_krw),
      distance_km: Number(formData.distance_km),
      unit_price_krw: Number(formData.unit_price_krw),
      fuel_volume_l: Number(formData.fuel_volume_l),
      memo: formData.memo,
    };

    if (editingId) {
      const { error } = await supabase.from("fuel_logs").update(payload).eq("id", editingId);
      if (error) alert("수정 실패: " + error.message);
      else {
        alert("수정되었습니다.");
        setEditingId(null);
      }
    } else {
      const { error } = await supabase.from("fuel_logs").insert([payload]);
      if (error) alert("저장 실패: " + error.message);
      else alert("저장되었습니다.");
    }

    setFormData({ 
      refuel_date: new Date().toISOString().split('T')[0],
      amount_krw: "", 
      distance_km: "", 
      unit_price_krw: "", 
      fuel_volume_l: "", 
      memo: "" 
    });
    fetchLogs();
  };

  const startEdit = (log: any) => {
    setEditingId(log.id);
    setFormData({
      refuel_date: log.refuel_date,
      amount_krw: log.amount_krw.toString(),
      distance_km: log.distance_km.toString(),
      unit_price_krw: log.unit_price_krw.toString(),
      fuel_volume_l: log.fuel_volume_l.toString(),
      memo: log.memo || ""
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("정말로 삭제하시겠습니까?")) {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
      if (error) alert("삭제 실패: " + error.message);
      else fetchLogs();
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 max-w-6xl mx-auto overflow-hidden border-x border-slate-200">
      
      {/* --- [좌측/상단: 입력 영역] --- */}
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
                  <input type="date" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white font-medium" 
                    value={formData.refuel_date} onChange={(e) => setFormData({...formData, refuel_date: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">주유액(원)</label>
                  <input type="number" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none font-bold text-right" 
                    value={formData.amount_krw} onChange={(e) => setFormData({...formData, amount_krw: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">주유량(L)</label>
                  <input type="number" step="0.01" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none text-right font-bold"
                    value={formData.fuel_volume_l} onChange={(e) => setFormData({...formData, fuel_volume_l: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">단가(원/L)</label>
                  <input type="number" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none text-right text-slate-500 font-bold"
                    value={formData.unit_price_krw} onChange={(e) => setFormData({...formData, unit_price_krw: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">주행거리(km)</label>
                  <input type="number" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none font-bold text-blue-600 text-right"
                    value={formData.distance_km} onChange={(e) => setFormData({...formData, distance_km: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">메모</label>
                  <input type="text" className="p-2.5 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none font-medium"
                    value={formData.memo} onChange={(e) => setFormData({...formData, memo: e.target.value})} />
                </div>
              </div>
              
              <div className="flex gap-2 pt-1">
                <button type="submit" className={`flex-1 py-3.5 rounded-xl font-black text-white shadow-lg active:scale-95 transition-all ${editingId ? 'bg-orange-500 shadow-orange-100' : 'bg-slate-800 shadow-slate-100'}`}>
                  {editingId ? "수정 완료" : "기록 저장"}
                </button>
                {editingId && (
                  <button type="button" onClick={() => {setEditingId(null); setFormData({refuel_date: new Date().toISOString().split('T')[0], amount_krw:"", distance_km:"", unit_price_krw:"", fuel_volume_l:"", memo:""})}} 
                    className="bg-slate-200 text-slate-600 px-4 py-3.5 rounded-xl font-bold active:scale-95">취소</button>
                )}
              </div>
            </form>
          </section>
        </div>
      </header>

      {/* --- [우측/하단: 내역 영역] --- */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 custom-scrollbar bg-slate-50">
        <div className="flex justify-between items-end mb-6 px-1">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">최근 주유 내역</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{logs.length} Total Logs</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="group bg-white p-4 rounded-2xl border border-white shadow-sm hover:shadow-md hover:border-blue-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* 왼쪽: 날짜와 금액 (핵심 정보) */}
              <div className="flex items-center gap-4">
                <div className="text-[11px] font-mono font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {log.refuel_date}
                </div>
                <div className="text-base font-black text-slate-800 tracking-tight">
                  {log.amount_krw.toLocaleString()}<span className="text-[10px] font-normal ml-0.5 text-slate-400">원</span>
                </div>
              </div>

              {/* 중앙: 상세 수치 (폰트 크기 통일 및 모바일에서도 줄바꿈 안 되게 처리) */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base font-black text-slate-600">
                <div className="flex items-center gap-1.5 min-w-[60px]">
                  <span className="text-[10px] text-slate-300 font-bold uppercase">L</span>
                  <span>{log.fuel_volume_l}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-[100px] text-blue-600">
                  <span className="text-[10px] text-blue-200 font-bold uppercase">Km</span>
                  <span>{log.distance_km.toLocaleString()}</span>
                </div>
                {log.memo && (
                  <div className="text-sm font-medium text-slate-400 italic hidden lg:block">
                    💬 {log.memo}
                  </div>
                )}
              </div>

              {/* 오른쪽: 버튼 (터치 영역 확보) */}
              <div className="flex items-center justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-50">
                <button onClick={() => startEdit(log)} className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg active:bg-blue-100">수정</button>
                <button onClick={() => handleDelete(log.id)} className="px-3 py-1.5 text-xs font-bold text-red-400 bg-red-50 rounded-lg active:bg-red-100">삭제</button>
              </div>
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="text-center py-24 text-slate-300 font-bold italic">데이터가 없습니다.</div>
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