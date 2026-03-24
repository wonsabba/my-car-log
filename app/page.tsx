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

  const totalAmount = logs.reduce((acc, cur) => acc + (Number(cur.amount_krw) || 0), 0);
  const totalVolume = logs.reduce((acc, cur) => acc + (Number(cur.fuel_volume_l) || 0), 0);

  const brandConfig: { [key: string]: { name: string; color: string } } = {
    "1": { name: "SK Enclean", color: "text-red-600" },
    "2": { name: "GS Caltex", color: "text-emerald-600" },
    "3": { name: "알뜰주유소", color: "text-orange-500" }
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const downloadExcel = () => {
    if (logs.length === 0) return showToast("데이터가 없습니다.", "error");
    const headers = ["주유일자", "주유회사", "단가(원)", "주유량(L)", "주유액(원)", "누적주행거리(Km)"];
    const csvContent = logs.map(log => [
      log.refuel_date,
      brandConfig[log.brand]?.name || "미지정",
      log.unit_price_krw,
      log.fuel_volume_l,
      log.amount_krw,
      log.distance_km
    ].join(",")).join("\n");
    const BOM = "\uFEFF"; 
    const blob = new Blob([BOM + headers.join(",") + "\n" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `차계부_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    showToast("📊 엑셀 다운로드 완료");
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
    const { data, error } = await supabase.from("fuel_logs").select("*").order("refuel_date", { ascending: false }); 
    if (!error) setLogs(data || []);
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { 
      refuel_date: formData.refuel_date,
      brand: formData.brand,
      unit_price_krw: Number(formData.unit_price_krw), 
      fuel_volume_l: Number(formData.fuel_volume_l), 
      amount_krw: Number(formData.amount_krw), 
      distance_km: Number(formData.distance_km) 
    };

    if (editingId) {
      const { error } = await supabase.from("fuel_logs").update(payload).eq("id", editingId);
      if (!error) {
        showToast("✅ 수정 완료");
        setEditingId(null);
        resetForm();
        fetchLogs();
      } else {
        showToast("수정 실패: " + error.message, "error");
      }
    } else {
      const { error } = await supabase.from("fuel_logs").insert([payload]);
      if (!error) {
        showToast("🚀 저장 완료");
        resetForm();
        fetchLogs();
      } else {
        showToast("저장 실패: " + error.message, "error");
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ 
      refuel_date: new Date().toISOString().split('T')[0], 
      brand: "1", 
      unit_price_krw: "", 
      fuel_volume_l: "", 
      amount_krw: "", 
      distance_km: "" 
    });
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (confirm("정말로 삭제하시겠습니까?")) {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", editingId);
      if (!error) {
        showToast("🗑️ 삭제 완료");
        resetForm();
        fetchLogs();
      } else {
        showToast("삭제 실패", "error");
      }
    }
  };

  const startEdit = (log: any) => {
    setEditingId(log.id);
    setFormData({ 
      refuel_date: log.refuel_date, 
      brand: log.brand || "1", 
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
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full shadow-xl bg-slate-800 text-white font-bold text-xs shrink-0">{toast.msg}</div>
      )}

      {/* --- [좌측/상단 입력창] --- */}
      <header className="w-full md:w-[340px] bg-white z-20 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4">
          <h1 className="text-xl font-black mb-4 text-slate-800 tracking-tighter leading-none">🚗 GV80</h1>
          <section className={`p-4 rounded-2xl border ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 ml-1 mb-1 block tracking-tighter">주유일자</label>
                  <input type="date" className="p-2 border border-slate-300 rounded-xl w-full text-sm font-bold text-slate-900 outline-none bg-white" value={formData.refuel_date} onChange={(e) => setFormData({...formData, refuel_date: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 ml-1 mb-1 block tracking-tighter">주유회사</label>
                  <select className="p-2 border border-slate-300 rounded-xl w-full text-sm font-bold text-slate-900 outline-none bg-white" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})}>
                    <option value="1">SK Enclean</option><option value="2">GS Caltex</option><option value="3">알뜰주유소</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 ml-1 mb-1 block tracking-tighter">단가</label>
                  <input type="number" className="p-2 border border-slate-300 rounded-xl w-full text-sm text-right font-bold outline-none" value={formData.unit_price_krw} onChange={(e) => setFormData({...formData, unit_price_krw: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 ml-1 mb-1 block tracking-tighter">주유량</label>
                  <input type="number" step="0.01" className="p-2 border border-slate-300 rounded-xl w-full text-sm text-right font-bold outline-none" value={formData.fuel_volume_l} onChange={(e) => setFormData({...formData, fuel_volume_l: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[11px] font-black text-blue-600 ml-1 mb-1 block tracking-tighter">주유액</label>
                  <input type="number" className="p-2 border-2 border-blue-200 rounded-xl w-full text-sm font-black text-right bg-blue-50 text-blue-800 outline-none" value={formData.amount_krw} onChange={(e) => setFormData({...formData, amount_krw: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 ml-1 mb-1 block tracking-tighter">주행거리(km)</label>
                  <input type="number" className="p-2 border border-slate-300 rounded-xl w-full text-sm font-bold text-blue-600 text-right outline-none" value={formData.distance_km} onChange={(e) => setFormData({...formData, distance_km: e.target.value})} required />
                </div>
                <button type="submit" className={`py-2 rounded-xl font-black text-white shadow-md transition-all active:scale-95 ${editingId ? 'bg-orange-600' : 'bg-slate-900'}`}>{editingId ? "수정" : "저장"}</button>
              </div>

              {editingId && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" onClick={handleDelete} className="py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors">삭제</button>
                  <button type="button" onClick={resetForm} className="py-2 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors">취소</button>
                </div>
              )}
            </form>
          </section>
        </div>
      </header>

      {/* --- [우측/하단 목록 영역] --- */}
      <main className="flex-1 flex flex-col min-h-0 bg-white relative overflow-x-auto font-sans">
        <div className="min-w-[360px] flex flex-col h-full shrink-0">
          <div className="sticky top-0 bg-white z-10 border-b border-slate-100 shrink-0">
            <div className="px-5 py-4 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">주유 내역</h2>
                <button onClick={downloadExcel} className="p-1 hover:bg-slate-100 rounded-md transition-all active:scale-90" title="엑셀 다운로드">
                  <span className="text-lg block transition-transform hover:scale-125">📊</span>
                </button>
              </div>
              <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0">{logs.length}건</span>
            </div>
            
            <div className="bg-slate-50 px-3 py-2 flex items-center border-t border-slate-200 text-[12px] font-black text-slate-700 tracking-tight whitespace-nowrap">
              <div className="flex-1 text-center pr-2">주유일자</div>
              <div className="w-[45px] text-center pr-2 shrink-0">회사</div>
              <div className="w-[55px] text-center pr-1 shrink-0">단가(원)</div>
              <div className="w-[55px] text-center pr-0 shrink-0 border-r border-slate-300">주유량(L)</div>
              <div className="w-[75px] text-center pr-2 shrink-0">주유액(원)</div>
              <div className="w-[70px] text-center pr-3 shrink-0">Trip(km)</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {logs.map((log, index) => {
              const nextLog = logs[index + 1];
              const tripDistance = nextLog 
                ? (Number(log.distance_km) - Number(nextLog.distance_km)) 
                : 0;

              return (
                <div key={log.id} onDoubleClick={() => startEdit(log)} className={`flex items-center px-4 py-4 hover:bg-slate-50 cursor-pointer transition-colors whitespace-nowrap ${editingId === log.id ? 'bg-orange-50 ring-1 ring-inset ring-orange-200' : ''}`}>
                  <div className="flex-1 text-sm font-black text-slate-950 text-center tracking-tighter pr-2">{log.refuel_date}</div>
                  <div className={`w-[45px] shrink-0 text-sm font-black text-center tracking-tighter ${brandConfig[log.brand]?.color || "text-slate-950"}`}>{brandConfig[log.brand]?.name.split(' ')[0] || "-"}</div>
                  <div className="w-[55px] shrink-0 text-sm font-bold text-slate-600 text-right pr-2 tracking-tighter">{log.unit_price_krw.toLocaleString()}</div>
                  <div className="w-[55px] shrink-0 text-sm font-bold text-slate-600 text-right pr-2 border-r border-slate-100 tracking-tighter">{log.fuel_volume_l.toLocaleString()}</div>
                  <div className="w-[75px] shrink-0 text-sm font-black text-slate-950 text-right pr-2 tracking-tighter">{log.amount_krw.toLocaleString()}</div>
                  <div className="w-[70px] shrink-0 text-sm font-black text-blue-700 text-right pr-3 tracking-tighter">
                    {tripDistance > 0 ? tripDistance.toLocaleString() : "-"}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-0 bg-slate-900 text-white px-3 py-3 flex items-center shadow-[0_-4px_15px_rgba(0,0,0,0.15)] z-10 shrink-0 font-bold whitespace-nowrap">
            <div className="flex-1 text-[14px] font-black text-slate-400 text-center tracking-tighter pr-2 leading-none">Total</div>
            <div className="w-[45px] shrink-0"></div><div className="w-[55px] shrink-0"></div>
            <div className="w-[55px] shrink-0 text-orange-400 text-sm font-black text-right pr-2 border-r border-slate-700 tracking-tight">{totalVolume.toFixed(1)}</div>
            <div className="w-[75px] shrink-0 text-sm font-black text-white text-right pr-2 tracking-tight">{totalAmount.toLocaleString()}</div>
            <div className="w-[70px] shrink-0 text-right pr-3 text-slate-500 text-[9px] self-center tracking-tighter leading-none"></div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}