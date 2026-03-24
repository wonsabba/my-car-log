"use client";

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null); // 현재 수정 중인 ID
  
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

  // 저장 또는 수정 완료 버튼 클릭 시
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
      // 수정 모드 (Update)
      const { error } = await supabase.from("fuel_logs").update(payload).eq("id", editingId);
      if (error) alert("수정 실패: " + error.message);
      else {
        alert("수정되었습니다.");
        setEditingId(null);
      }
    } else {
      // 신규 입력 모드 (Insert)
      const { error } = await supabase.from("fuel_logs").insert([{ ...payload, refuel_date: new Date().toISOString().split('T')[0] }]);
      if (error) alert("저장 실패: " + error.message);
      else alert("저장되었습니다.");
    }

    setFormData({ amount_krw: "", distance_km: "", unit_price_krw: "", fuel_volume_l: "", memo: "" });
    fetchLogs();
  };

  // 수정 버튼 클릭 시 (데이터를 입력 폼으로 불러오기)
  const startEdit = (log: any) => {
    setEditingId(log.id);
    setFormData({
      amount_krw: log.amount_krw.toString(),
      distance_km: log.distance_km.toString(),
      unit_price_krw: log.unit_price_krw.toString(),
      fuel_volume_l: log.fuel_volume_l.toString(),
      memo: log.memo || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 화면 상단으로 이동
  };

  // 삭제 기능
  const handleDelete = async (id: number) => {
    if (confirm("정말로 삭제하시겠습니까?")) {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
      if (error) alert("삭제 실패: " + error.message);
      else fetchLogs();
    }
  };

  return (
    <main className="p-6 max-w-lg mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">🚗 내 차계부 (로컬)</h1>
      
      {/* 입력/수정 폼 */}
      <section className="bg-white p-5 rounded-2xl shadow-md mb-8 border-2 border-blue-100">
        <h2 className="text-sm font-semibold text-blue-500 mb-4 uppercase tracking-wider">
          {editingId ? "📝 기록 수정 중" : "➕ 새 주유 기록"}
        </h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="주유액(원)" className="p-3 border rounded-xl w-full text-sm" 
              value={formData.amount_krw} onChange={(e) => setFormData({...formData, amount_krw: e.target.value})} required />
            <input type="number" placeholder="주유량(L)" className="p-3 border rounded-xl w-full text-sm"
              value={formData.fuel_volume_l} onChange={(e) => setFormData({...formData, fuel_volume_l: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="단가(원)" className="p-3 border rounded-xl w-full text-sm"
              value={formData.unit_price_krw} onChange={(e) => setFormData({...formData, unit_price_krw: e.target.value})} required />
            <input type="number" placeholder="주행거리(km)" className="p-3 border rounded-xl w-full text-sm"
              value={formData.distance_km} onChange={(e) => setFormData({...formData, distance_km: e.target.value})} required />
          </div>
          <input type="text" placeholder="메모" className="p-3 border rounded-xl w-full text-sm"
            value={formData.memo} onChange={(e) => setFormData({...formData, memo: e.target.value})} />
          
          <div className="flex gap-2">
            <button type="submit" className={`flex-1 p-3 rounded-xl font-bold text-white transition ${editingId ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editingId ? "수정 완료" : "기록 저장하기"}
            </button>
            {editingId && (
              <button type="button" onClick={() => {setEditingId(null); setFormData({amount_krw:"", distance_km:"", unit_price_krw:"", fuel_volume_l:"", memo:""})}} className="bg-gray-400 text-white p-3 rounded-xl font-bold">취소</button>
            )}
          </div>
        </form>
      </section>

      {/* 리스트 내역 */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">최근 주유 내역</h2>
        {logs.map((log) => (
          <div key={log.id} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs text-gray-400">{log.refuel_date}</p>
                <p className="text-lg font-bold text-gray-800">{log.amount_krw.toLocaleString()}원</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(log)} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 hover:bg-gray-200">수정</button>
                <button onClick={() => handleDelete(log.id)} className="text-xs bg-red-50 px-2 py-1 rounded text-red-500 hover:bg-red-100">삭제</button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 border-t pt-2 border-gray-50">
              <p className="text-xs text-gray-500">{log.fuel_volume_l}L (단가: {log.unit_price_krw}원)</p>
              <span className="text-sm font-semibold text-blue-600">{log.distance_km.toLocaleString()} km</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}