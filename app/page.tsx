"use client";

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import Link from "next/link";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"fuel" | "maint">("fuel");
  const [logs, setLogs] = useState<any[]>([]);
  const [maintLogs, setMaintLogs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [formData, setFormData] = useState({
    refuel_date: new Date().toISOString().split('T')[0],
    brand: "1",
    unit_price_krw: "",
    fuel_volume_l: "",
    amount_krw: "",
    distance_km: ""
  });

  const [maintFormData, setMaintFormData] = useState({
    maint_date: new Date().toISOString().split('T')[0],
    company: "",
    content: "",
    amount_krw: "",
    odometer_km: "",
    memo: ""
  });

  useEffect(() => {
    if (activeTab === "fuel") {
      const price = Number(formData.unit_price_krw);
      const volume = Number(formData.fuel_volume_l);
      if (price > 0 && volume > 0) {
        setFormData(prev => ({ ...prev, amount_krw: Math.round(price * volume).toString() }));
      }
    }
  }, [formData.unit_price_krw, formData.fuel_volume_l, activeTab]);

  const totalAmount = logs.reduce((acc, cur) => acc + (Number(cur.amount_krw) || 0), 0);
  const totalVolume = logs.reduce((acc, cur) => acc + (Number(cur.fuel_volume_l) || 0), 0);
  const totalMaintAmount = maintLogs.reduce((acc, cur) => acc + (Number(cur.amount_krw) || 0), 0);

  const brandConfig: { [key: string]: { name: string; color: string; bg: string } } = {
    "1": { name: "SK Enclean", color: "text-red-600", bg: "bg-red-50" },
    "2": { name: "GS Caltex", color: "text-emerald-600", bg: "bg-emerald-50" },
    "3": { name: "알뜰주유소", color: "text-blue-600", bg: "bg-blue-50" }
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showToast("로그인 실패", "error");
    else showToast("시스템 접속 성공");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  useEffect(() => { if (session) fetchLogs(); }, [session, activeTab]);

  const fetchLogs = async () => {
    const table = activeTab === "fuel" ? "fuel_logs" : "maintenance_logs";
    const dateField = activeTab === "fuel" ? "refuel_date" : "maint_date";
    const { data, error } = await supabase.from(table).select("*").order(dateField, { ascending: false }); 
    if (!error) {
      if (activeTab === "fuel") setLogs(data || []);
      else setMaintLogs(data || []);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const table = activeTab === "fuel" ? "fuel_logs" : "maintenance_logs";
    const payload = activeTab === "fuel" ? {
      refuel_date: formData.refuel_date,
      brand: formData.brand,
      unit_price_krw: Number(formData.unit_price_krw),
      fuel_volume_l: Number(formData.fuel_volume_l),
      amount_krw: Number(formData.amount_krw),
      distance_km: Number(formData.distance_km)
    } : {
      maint_date: maintFormData.maint_date,
      content: maintFormData.content,
      amount_krw: Number(maintFormData.amount_krw),
      company: maintFormData.company,
      odometer_km: Number(maintFormData.odometer_km),
      memo: maintFormData.memo
    };

    const { error } = editingId ? await supabase.from(table).update(payload).eq("id", editingId) : await supabase.from(table).insert([payload]);
    if (!error) { showToast("기록 완료"); resetForm(); fetchLogs(); }
    else showToast("저장 실패", "error");
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ refuel_date: new Date().toISOString().split('T')[0], brand: "1", unit_price_krw: "", fuel_volume_l: "", amount_krw: "", distance_km: "" });
    setMaintFormData({ maint_date: new Date().toISOString().split('T')[0], company: "", content: "", amount_krw: "", odometer_km: "", memo: "" });
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (confirm("정말로 이 기록을 삭제하시겠습니까?")) {
      const table = activeTab === "fuel" ? "fuel_logs" : "maintenance_logs";
      const { error } = await supabase.from(table).delete().eq("id", editingId);
      if (!error) { showToast("🗑️ 삭제 완료"); resetForm(); fetchLogs(); }
    }
  };

  const startEdit = (log: any) => {
    setEditingId(log.id);
    if (activeTab === "fuel") {
      setFormData({ refuel_date: log.refuel_date, brand: log.brand || "1", unit_price_krw: log.unit_price_krw?.toString() || "", fuel_volume_l: log.fuel_volume_l?.toString() || "", amount_krw: log.amount_krw?.toString() || "", distance_km: log.distance_km?.toString() || "" });
    } else {
      setMaintFormData({ maint_date: log.maint_date, company: log.company || "", content: log.content || "", amount_krw: log.amount_krw?.toString() || "", odometer_km: log.odometer_km?.toString() || "", memo: log.memo || "" });
    }
  };

  if (!session) return (
    <div className="flex items-center justify-center h-screen bg-blue-50">
       {/* 로그인 생략 */}
       <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center">
         <h1 className="text-2xl font-black text-blue-600 mb-6 italic">BRANDON CAR</h1>
         <form onSubmit={handleLogin} className="space-y-4">
           <input type="email" placeholder="Email" className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none font-bold" value={email} onChange={(e) => setEmail(e.target.value)} required />
           <input type="password" placeholder="Password" className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none font-bold" value={password} onChange={(e) => setPassword(e.target.value)} required />
           <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black active:scale-95 transition-all">LOGIN</button>
         </form>
       </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-blue-50/30 text-slate-800 max-w-7xl mx-auto overflow-hidden border-x border-blue-100 font-sans">
      <aside className="w-full lg:w-[360px] bg-white border-b lg:border-b-0 lg:border-r border-blue-100 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <img src="/GV80.jpg" alt="GV80" className="w-6 h-6 rounded shadow-sm" />
              <h1 className="text-xl font-black text-slate-800 tracking-tighter">GV80</h1>
              <Link href="/home" className="text-[10px] font-black text-blue-500 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-600 hover:text-white transition-all">🏠 Home</Link>
            </div>
            <button onClick={handleLogout} className="text-[10px] font-black text-slate-300 hover:text-red-500 uppercase">Logout</button>
          </div>

          <div className="flex bg-blue-50 p-1 rounded-2xl mb-6 border border-blue-100">
            <button onClick={() => {setActiveTab("fuel"); resetForm();}} className={`flex-1 py-2.5 rounded-xl text-[11px] font-black ${activeTab === 'fuel' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>주유내역</button>
            <button onClick={() => {setActiveTab("maint"); resetForm();}} className={`flex-1 py-2.5 rounded-xl text-[11px] font-black ${activeTab === 'maint' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>정비내역</button>
          </div>

          <section className={`p-4 rounded-3xl border transition-all ${editingId ? 'bg-orange-50 border-orange-100 shadow-sm' : 'bg-blue-50/20 border-blue-100'}`}>
            <h2 className="text-[10px] font-black text-blue-300 mb-3 uppercase tracking-widest">{editingId ? 'Edit Entry' : 'New Entry'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              {activeTab === "fuel" ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="p-2.5 bg-white border border-blue-100 rounded-xl text-xs font-bold" value={formData.refuel_date} onChange={(e) => setFormData({...formData, refuel_date: e.target.value})} required />
                    <select className="p-2.5 bg-white border border-blue-100 rounded-xl text-xs font-bold text-slate-800" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})}><option value="1">SK</option><option value="2">GS</option><option value="3">알뜰</option></select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" placeholder="단가" className="p-2.5 bg-white border border-blue-100 rounded-xl text-xs font-bold text-right" value={formData.unit_price_krw} onChange={(e) => setFormData({...formData, unit_price_krw: e.target.value})} required />
                    <input type="number" step="0.01" placeholder="리터" className="p-2.5 bg-white border border-blue-100 rounded-xl text-xs font-bold text-right" value={formData.fuel_volume_l} onChange={(e) => setFormData({...formData, fuel_volume_l: e.target.value})} required />
                    <input type="number" placeholder="Km" className="p-2.5 bg-white border border-blue-100 rounded-xl text-xs font-bold text-right text-blue-600" value={formData.distance_km} onChange={(e) => setFormData({...formData, distance_km: e.target.value})} required />
                  </div>
                  <div className="flex gap-2">
                    <input type="number" placeholder="총 금액" className={`flex-1 p-2.5 border-2 rounded-xl text-sm font-black text-right outline-none ${editingId ? 'bg-white border-orange-200 text-orange-600' : 'bg-blue-100/50 border-blue-200 text-blue-700'}`} value={formData.amount_krw} onChange={(e) => setFormData({...formData, amount_krw: e.target.value})} required />
                    <button type="submit" className={`w-16 rounded-xl font-black text-white text-xs shadow-md active:scale-95 ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}>{editingId ? "UPD" : "SAVE"}</button>
                    {editingId && (
                      <><button type="button" onClick={handleDelete} className="w-12 bg-red-500 text-white rounded-xl font-black text-[10px] shadow-md">DEL</button><button type="button" onClick={resetForm} className="w-8 bg-slate-200 text-slate-500 rounded-xl font-black text-xs">✕</button></>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="p-2.5 bg-white border border-blue-100 rounded-xl text-xs font-bold" value={maintFormData.maint_date} onChange={(e) => setMaintFormData({...maintFormData, maint_date: e.target.value})} required />
                    <input type="text" placeholder="정비업체" className="p-2.5 bg-white border border-blue-100 rounded-xl text-xs font-bold" value={maintFormData.company} onChange={(e) => setMaintFormData({...maintFormData, company: e.target.value})} required />
                  </div>
                  <input type="text" placeholder="정비내역" className="p-2.5 bg-white border border-blue-100 rounded-xl text-xs font-bold" value={maintFormData.content} onChange={(e) => setMaintFormData({...maintFormData, content: e.target.value})} required />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="정비금액" className="p-2.5 bg-white border border-blue-100 rounded-xl text-xs font-bold text-right" value={maintFormData.amount_krw} onChange={(e) => setMaintFormData({...maintFormData, amount_krw: e.target.value})} required />
                    <input type="number" placeholder="주행거리" className="p-2.5 bg-white border border-blue-100 rounded-xl text-xs font-bold text-right text-blue-600" value={maintFormData.odometer_km} onChange={(e) => setMaintFormData({...maintFormData, odometer_km: e.target.value})} required />
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="메모 입력" className="flex-1 p-2.5 bg-white border border-blue-100 rounded-xl text-xs font-bold" value={maintFormData.memo} onChange={(e) => setMaintFormData({...maintFormData, memo: e.target.value})} />
                    <button type="submit" className={`w-16 rounded-xl font-black text-white text-xs shadow-md active:scale-95 ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}>{editingId ? "UPD" : "SAVE"}</button>
                    {editingId && (
                      <><button type="button" onClick={handleDelete} className="w-12 bg-red-500 text-white rounded-xl font-black text-[10px] shadow-md">DEL</button><button type="button" onClick={resetForm} className="w-8 bg-slate-200 text-slate-500 rounded-xl font-black text-xs">✕</button></>
                    )}
                  </div>
                </div>
              )}
            </form>
          </section>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="p-6 pb-4 border-b border-blue-100 shrink-0 flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em] mb-1">Brandon GV80 System</p>
            <div className="flex items-baseline gap-4">
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter">{activeTab === 'fuel' ? '주유 데이터' : '정비 데이터'}</h2>
              {activeTab === 'fuel' && <span className="text-sm font-black text-blue-400">{totalVolume.toLocaleString(undefined, {minimumFractionDigits: 1})}L Total</span>}
            </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Total Accumulated</p>
             <p className="text-xl font-black text-slate-900 tracking-tighter">₩{(activeTab === 'fuel' ? totalAmount : totalMaintAmount).toLocaleString()}</p>
          </div>
        </div>

        {/* 목록 헤더 (순서 및 너비 고정) */}
        <div className="bg-slate-50 border-b border-blue-100 flex items-center px-5 py-2.5 shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-wider">
          {activeTab === 'fuel' ? (
            <>
              <div className="w-[100px] text-center">Date</div>
              <div className="w-[80px] text-center">Brand</div>
              <div className="w-[80px] text-right pr-2">Price</div>
              <div className="w-[80px] text-right pr-2">Volume</div>
              <div className="flex-1 text-right pr-4">Amount</div>
              <div className="w-[70px] text-right">Trip(Km)</div>
            </>
          ) : (
            <>
              <div className="w-[100px] text-center">Date</div>
              <div className="w-[100px] text-right pr-3">Cost</div>
              <div className="flex-1 text-center">Content / Company</div>
              <div className="w-[80px] text-right">Odometer</div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-blue-50 custom-scrollbar">
          {(activeTab === 'fuel' ? logs : maintLogs).map((log, index) => {
            const isEditRow = editingId === log.id;
            return (
              <div key={log.id} onDoubleClick={() => startEdit(log)} className={`flex items-center px-5 py-4 hover:bg-blue-50/50 cursor-pointer whitespace-nowrap transition-colors ${isEditRow ? 'bg-orange-50' : ''}`}>
                {activeTab === 'fuel' ? (
                  <>
                    <div className="w-[100px] text-sm font-black text-slate-900 text-center tracking-tighter">{log.refuel_date}</div>
                    <div className={`w-[80px] shrink-0 text-sm font-black text-center tracking-tighter ${brandConfig[log.brand]?.color}`}>{brandConfig[log.brand]?.name.split(' ')[0]}</div>
                    <div className="w-[80px] shrink-0 text-sm font-black text-slate-900 text-right pr-2 border-r border-blue-50">{log.unit_price_krw?.toLocaleString()}</div>
                    <div className="w-[80px] shrink-0 text-sm font-black text-slate-500 text-right pr-2 border-r border-blue-50">{log.fuel_volume_l?.toLocaleString()}L</div>
                    <div className="flex-1 text-sm font-black text-blue-700 text-right pr-4">{log.amount_krw?.toLocaleString()}</div>
                    <div className="w-[70px] shrink-0 text-sm font-bold text-orange-600 text-right tabular-nums">
                      +{activeTab === 'fuel' && logs[index+1] ? (Number(log.distance_km) - Number(logs[index+1].distance_km)).toLocaleString() : "-"}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-[100px] text-sm font-black text-slate-900 text-center tracking-tighter">{log.maint_date}</div>
                    <div className="w-[100px] shrink-0 text-sm font-black text-blue-700 text-right pr-3 border-r border-blue-100 bg-blue-50/30 py-1 tracking-tight">
                      {log.amount_krw?.toLocaleString()}
                    </div>
                    <div className="flex-1 px-4 py-1 overflow-hidden whitespace-normal break-all">
                      <div className="text-sm font-black text-slate-900 leading-tight">{log.content}</div>
                      <div className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                        <span className="text-blue-400">@ {log.company}</span>
                        {log.memo && <><span className="text-slate-200">|</span> <span>{log.memo}</span></>}
                      </div>
                    </div>
                    <div className="w-[80px] shrink-0 text-sm font-black text-slate-500 text-right tabular-nums">
                      {log.odometer_km?.toLocaleString()}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="p-8 flex flex-col items-center select-none opacity-30 bg-white border-t border-blue-100 shrink-0">
           <img src="/GV80.jpg" alt="GV80" className="w-5 h-5 rounded grayscale mb-1" />
           <p className="text-[8px] font-black tracking-[0.4em] text-slate-900 uppercase italic">Designed for BRANDON • 1994 DEVELOPER</p>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #dbeafe; border-radius: 10px; }
      `}</style>
    </div>
  );
}