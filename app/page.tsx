"use client";

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [formData, setFormData] = useState({
    refuel_date: new Date().toISOString().split('T')[0],
    brand: "1",
    unit_price_krw: "",
    fuel_volume_l: "",
    amount_krw: "",
    distance_km: ""
  });

  // 합계 계산용 변수
  const totalAmount = logs.reduce((acc, cur) => acc + (Number(cur.amount_krw) || 0), 0);
  const totalVolume = logs.reduce((acc, cur) => acc + (Number(cur.fuel_volume_l) || 0), 0);

  const brandMap: { [key: string]: string } = { "1": "SK", "2": "GS", "3": "알뜰" };

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
      ...formData,
      unit_price_krw: Number(formData.unit_price_krw),
      fuel_volume_l: Number(formData.fuel_volume_l),
      amount_krw: Number(formData.amount_krw),
      distance_km: Number(formData.distance_km),
    };

    if (editingId) {
      const { error } = await supabase.from("fuel_logs").update(payload).eq("id", editingId);
      if (!error) { showToast("✅ 수정 완료"); setEditingId(null); }
    } else {
      const { error } = await supabase.from("fuel_logs").insert([payload]);
      if (!error) showToast("🚀 저장 완료");
    }
    resetForm();
    fetchLogs();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ 
      refuel_date: new Date().toISOString().split('T')[0],
      brand: "1", unit_price_krw: "", fuel_volume_l: "", amount_krw: "", distance_km: ""
    });
  }

  const startEdit = (log: any) => {
    setEditingId(log.id);
    setFormData({
      refuel_date: log.refuel_date, brand: log.brand || "1",
      unit_price_krw: log.unit_price_krw.toString(),
      fuel_volume_l: log.fuel_volume_l.toString(),
      amount_krw: log.amount_krw.toString(),
      distance_km: log.distance_km.toString()
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white max-w-6xl mx-auto overflow-hidden border-x border-slate-200 font-sans">
      
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full shadow-xl bg-slate-800 text-white font-bold text-xs">
          {toast.msg}
        </div>
      )}

      {/* --- [좌측/상단 입력창] --- */}
      <header className="w-full md:w-[350px] bg-white z-20 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4">
          <h1 className="text-xl font-black mb-4 text-slate-800 tracking-tighter">🚗 차계부 관리</h1>
          <section className={`p-4 rounded-2xl border ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">주유 일자</label>
                  <input type="date" className="p-2 border border-slate-200 rounded-xl w-full text-sm font-bold text-slate-900 outline-none" 
                    value={formData.refuel_date} onChange={(e) => setFormData({...formData, refuel_date: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">주유 회사</label>
                  <select className="p-2 border border-slate-200 rounded-xl w-full text-sm font-bold text-slate-900 outline-none bg-white"
                    value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})}>
                    <option value="1">SK</option><option value="2">GS</option><option value="3">알뜰</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">단가</label>
                  <input type="number" className="p-2 border border-slate-200 rounded-xl w-full text-sm text-right font-bold outline-none"
                    value={formData.unit_price_krw} onChange={(e) => setFormData({...formData, unit_price_krw: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">주유량(L)</label>
                  <input type="number" step="0.01" className="p-2 border border-slate-200 rounded-xl w-full text-sm text-right font-bold outline-none"
                    value={formData.fuel_volume_l} onChange={(e) => setFormData({...formData, fuel_volume_l: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-500 ml-1 mb-1 block">주유액</label>
                  <input type="number" className="p-2 border border-blue-200 rounded-xl w-full text-sm font-black text-right bg-blue-50 text-blue-800 outline-none" 
                    value={formData.amount_krw} onChange={(e) => setFormData({...formData, amount_krw: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">주행거리(km)</label>
                  <input type="number" className="p-2 border border-slate-200 rounded-xl w-full text-sm font-bold text-blue-600 text-right outline-none"
                    value={formData.distance_km} onChange={(e) => setFormData({...formData, distance_km: e.target.value})} required />
                </div>
                <button type="submit" className={`py-2 rounded-xl font-black text-white shadow-md transition-all ${editingId ? 'bg-orange-500' : 'bg-slate-800'}`}>
                  {editingId ? "수정" : "저장"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </header>

      {/* --- [우측/하단 목록 및 합계 고정 영역] --- */}
      <main className="flex-1 flex flex-col min-h-0 bg-white relative">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white z-10 border-b border-slate-100 shrink-0">
          <div className="px-5 py-4 flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-800 tracking-tight">주유 내역 <span className="text-[10px] text-slate-300 font-normal ml-1 italic font-sans uppercase">double-click to edit</span></h2>
            <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">{logs.length}건</span>
          </div>
          <div className="bg-slate-50 px-4 py-2 flex items-center border-t border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
            <div className="w-[100px] text-center">Date</div>
            <div className="w-[50px] text-center">Co</div>
            <div className="w-[90px] text-right pr-4 border-r border-slate-200">Amount</div>
            <div className="flex-1 grid grid-cols-3">
              <span className="text-right pr-4">Price</span>
              <span className="text-right pr-4">Liter</span>
              <span className="text-right pr-4">Dist</span>
            </div>
          </div>
        </div>

        {/* 데이터 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
          {logs.map((log) => (
            <div key={log.id} onDoubleClick={() => startEdit(log)} className={`flex items-center px-4 py-4 hover:bg-slate-50 cursor-pointer transition-colors ${editingId === log.id ? 'bg-orange-50 ring-1 ring-inset ring-orange-200' : ''}`}>
              <div className="w-[100px] shrink-0 text-base font-black text-slate-950 text-center tracking-tighter">{log.refuel_date}</div>
              {/* Co 폰트 크기 및 색상 동기화 */}
              <div className="w-[50px] shrink-0 text-base font-black text-slate-950 text-center tracking-tighter">{brandMap[log.brand] || "-"}</div>
              <div className="w-[90px] shrink-0 text-base font-black text-slate-950 text-right pr-4 border-r border-slate-100 tracking-tight">{log.amount_krw.toLocaleString()}</div>
              <div className="flex-1 grid grid-cols-3 font-black text-slate-950 text-base tracking-tighter">
                <div className="text-right pr-4">{log.unit_price_krw.toLocaleString()}</div>
                <div className="text-right pr-4">{log.fuel_volume_l.toLocaleString()}</div>
                <div className="text-right pr-4 text-blue-700">{log.distance_km.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* [NEW] 하단 고정 합계행 (Sticky Footer) */}
        <div className="sticky bottom-0 bg-slate-900 text-white px-4 py-3 flex items-center shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-10 shrink-0">
          <div className="w-[100px] shrink-0 text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">Total Summary</div>
          <div className="w-[50px] shrink-0"></div>
          <div className="w-[90px] shrink-0 text-base font-black text-white text-right pr-4 border-r border-slate-700 tracking-tight">
            {totalAmount.toLocaleString()}
          </div>
          <div className="flex-1 grid grid-cols-3 font-black text-base tracking-tighter">
            <div className="text-right pr-4 text-slate-500 text-xs self-center">합계</div>
            <div className="text-right pr-4 text-orange-400">{totalVolume.toFixed(2)}</div>
            <div className="text-right pr-4 text-slate-500 text-xs self-center">Liter</div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}