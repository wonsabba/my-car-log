"use client";

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
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
      const { error } = await supabase.from("fuel_logs").insert([{ ...payload, refuel_date: new Date().toISOString().split('T')[0] }]);
      if (error) alert("저장 실패: " + error.message);
      else alert("저장되었습니다.");
    }

    setFormData({ amount_krw: "", distance_km: "", unit_price_krw: "", fuel_volume_l: "", memo: "" });
    fetchLogs();
  };

  const startEdit = (log: any) => {
    setEditingId(log.id);
    setFormData({
      amount_krw: log.amount_krw.toString(),
      distance_km: log.distance_km.toString(),
      unit_price_krw: log.unit_price_krw.toString(),
      fuel_volume_l: log.fuel_volume_l.toString(),
      memo: log.memo || ""
    });
    // 스크롤 이동 없이 상단 폼만 바로 수정 모드로 바뀝니다.
  };

  const handleDelete = async (id: number) => {
    if (confirm("정말로 삭제하시겠습니까?")) {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
      if (error) alert("삭제 실패: " + error.message);
      else fetchLogs();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-lg mx-auto border-x shadow-2xl">
      {/* --- [상단 고정 영역] --- */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md p-5 shadow-sm border-b-2 border-blue-100">
        <h1 className="text-xl font-black mb-4 text-gray-800 flex items-center justify-center gap-2">
          🚗 내 차계부
        </h1>
        
        <section className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
          <h2 className="text-[10px] font-bold text-blue-500 mb-3 uppercase tracking-tighter">
            {editingId ? "📝 기록 수정 중" : "➕ 새 주유 기록"}
          </h2>
          <form onSubmit={handleSave} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="주유액(원)" className="p-2.5 border rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none" 
                value={formData.amount_krw} onChange={(e) => setFormData({...formData, amount_krw: e.target.value})} required />
              <input type="number" placeholder="주유량(L)" className="p-2.5 border rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                value={formData.fuel_volume_l} onChange={(e) => setFormData({...formData, fuel_volume_l: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="단가(원)" className="p-2.5 border rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                value={formData.unit_price_krw} onChange={(e) => setFormData({...formData, unit_price_krw: e.target.value})} required />
              <input type="number" placeholder="주행거리(km)" className="p-2.5 border rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                value={formData.distance_km} onChange={(e) => setFormData({...formData, distance_km: e.target.value})} required />
            </div>
            <input type="text" placeholder="메모" className="p-2.5 border rounded-xl w-full text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              value={formData.memo} onChange={(e) => setFormData({...formData, memo: e.target.value})} />
            
            <div className="flex gap-2 pt-1">
              <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition ${editingId ? 'bg-green-500' : 'bg-blue-600'}`}>
                {editingId ? "수정 완료" : "기록 저장하기"}
              </button>
              {editingId && (
                <button type="button" onClick={() => {setEditingId(null); setFormData({amount_krw:"", distance_km:"", unit_price_krw:"", fuel_volume_l:"", memo:""})}} 
                  className="bg-gray-400 text-white px-4 py-3 rounded-xl font-bold active:scale-95">취소</button>
              )}
            </div>
          </form>
        </section>
      </header>

      {/* --- [하단 스크롤 영역] --- */}
      <main className="flex-1 overflow-y-auto p-5 pb-10 custom-scrollbar">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">최근 주유 내역</h2>
          <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-mono">{logs.length}건</span>
        </div>
        
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] text-gray-400 font-mono mb-1">{log.refuel_date}</p>
                  <p className="text-lg font-black text-gray-800 tracking-tight">{log.amount_krw.toLocaleString()}<span className="text-xs font-normal ml-0.5">원</span></p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(log)} className="text-[10px] font-bold bg-blue-50 px-3 py-1.5 rounded-lg text-blue-600 active:bg-blue-100">수정</button>
                  <button onClick={() => handleDelete(log.id)} className="text-[10px] font-bold bg-red-50 px-3 py-1.5 rounded-lg text-red-400 active:bg-red-100">삭제</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-3 border-t pt-3 border-gray-50 text-[11px] text-gray-500">
                <p className="flex items-center gap-1">
                  <span className="opacity-50">⛽</span> {log.fuel_volume_l}L <span className="text-[9px] text-gray-300">({log.unit_price_krw}원)</span>
                </p>
                <p className="flex items-center gap-1 justify-end font-semibold text-gray-700">
                  <span className="opacity-50 text-[9px]">TOTAL</span> {log.distance_km.toLocaleString()} km
                </p>
              </div>
              {log.memo && (
                <div className="mt-2 text-[11px] bg-gray-50 p-2 rounded-lg text-gray-500 italic">
                  💬 {log.memo}
                </div>
              )}
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="text-center py-20">
              <p className="text-4xl mb-4">⛽</p>
              <p className="text-gray-400 text-sm">아직 등록된 기록이 없습니다.</p>
            </div>
          )}
        </div>
      </main>

      {/* 모바일 스타일 보정 */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}