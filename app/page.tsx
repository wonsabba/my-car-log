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

  // ✅ [기능 유지] 주유금액 자동 계산
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

  const brandConfig: { [key: string]: { name: string; color: string } } = {
    "1": { name: "SK Enclean", color: "text-red-400" },
    "2": { name: "GS Caltex", color: "text-emerald-400" },
    "3": { name: "알뜰주유소", color: "text-orange-400" }
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showToast("로그인 실패: " + error.message, "error");
    else showToast("환영합니다!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  useEffect(() => {
    if (session) fetchLogs();
  }, [session, activeTab]);

  const fetchLogs = async () => {
    if (activeTab === "fuel") {
      const { data, error } = await supabase.from("fuel_logs").select("*").order("refuel_date", { ascending: false }); 
      if (!error) setLogs(data || []);
    } else {
      const { data, error } = await supabase.from("maintenance_logs").select("*").order("maint_date", { ascending: false });
      if (!error) setMaintLogs(data || []);
    }
  };

  const downloadExcel = () => {
    if (activeTab === "fuel") {
      if (logs.length === 0) return showToast("데이터가 없습니다.", "error");
      const headers = ["주유일자", "주유회사", "단가(원)", "주유량(L)", "주유액(원)", "누적주행거리(Km)"];
      const csvContent = logs.map(log => [log.refuel_date, brandConfig[log.brand]?.name || "미지정", log.unit_price_krw, log.fuel_volume_l, log.amount_krw, log.distance_km].join(",")).join("\n");
      const BOM = "\uFEFF"; 
      const blob = new Blob([BOM + headers.join(",") + "\n" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `주유내역_${new Date().toISOString().split('T')[0]}.csv`); link.click();
    } else {
      if (maintLogs.length === 0) return showToast("데이터가 없습니다.", "error");
      const headers = ["정비일자", "정비회사", "정비내역", "정비금액", "주행거리(km)", "메모"];
      const csvContent = maintLogs.map(log => [log.maint_date, log.company, log.content, log.amount_krw, log.odometer_km, log.memo].join(",")).join("\n");
      const BOM = "\uFEFF"; 
      const blob = new Blob([BOM + headers.join(",") + "\n" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `정비내역_${new Date().toISOString().split('T')[0]}.csv`); link.click();
    }
    showToast("📊 엑셀 다운로드 완료");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "fuel") {
      const payload = { refuel_date: formData.refuel_date, brand: formData.brand, unit_price_krw: Number(formData.unit_price_krw), fuel_volume_l: Number(formData.fuel_volume_l), amount_krw: Number(formData.amount_krw), distance_km: Number(formData.distance_km) };
      if (editingId) {
        const { error } = await supabase.from("fuel_logs").update(payload).eq("id", editingId);
        if (!error) { showToast("✅ 수정 완료"); setEditingId(null); resetForm(); fetchLogs(); }
      } else {
        const { error } = await supabase.from("fuel_logs").insert([payload]);
        if (!error) { showToast("🚀 저장 완료"); resetForm(); fetchLogs(); }
      }
    } else {
      const payload = { maint_date: maintFormData.maint_date, content: maintFormData.content, amount_krw: Number(maintFormData.amount_krw), company: maintFormData.company, odometer_km: Number(maintFormData.odometer_km), memo: maintFormData.memo };
      if (editingId) {
        const { error } = await supabase.from("maintenance_logs").update(payload).eq("id", editingId);
        if (!error) { showToast("✅ 수정 완료"); setEditingId(null); resetForm(); fetchLogs(); }
      } else {
        const { error } = await supabase.from("maintenance_logs").insert([payload]);
        if (!error) { showToast("🚀 저장 완료"); resetForm(); fetchLogs(); }
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ refuel_date: new Date().toISOString().split('T')[0], brand: "1", unit_price_krw: "", fuel_volume_l: "", amount_krw: "", distance_km: "" });
    setMaintFormData({ maint_date: new Date().toISOString().split('T')[0], company: "", content: "", amount_krw: "", odometer_km: "", memo: "" });
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (confirm("정말로 삭제하시겠습니까?")) {
      const table = activeTab === "fuel" ? "fuel_logs" : "maintenance_logs";
      const { error } = await supabase.from(table).delete().eq("id", editingId);
      if (!error) { showToast("🗑️ 삭제 완료"); resetForm(); fetchLogs(); }
    }
  };

  const startEdit = (log: any) => {
    setEditingId(log.id);
    if (activeTab === "fuel") {
      setFormData({ refuel_date: log.refuel_date, brand: log.brand || "1", unit_price_krw: log.unit_price_krw.toString(), fuel_volume_l: log.fuel_volume_l.toString(), amount_krw: log.amount_krw.toString(), distance_km: log.distance_km.toString() });
    } else {
      setMaintFormData({ maint_date: log.maint_date, company: log.company || "", content: log.content, amount_krw: log.amount_krw.toString(), odometer_km: log.odometer_km?.toString() || "", memo: log.memo || "" });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!session) return (<div className="p-10 font-bold text-white bg-[#0f172a] h-screen">Login Required...</div>);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0f172a] max-w-6xl mx-auto overflow-hidden border-x border-slate-800 font-sans text-slate-300">
      {toast && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full shadow-xl bg-blue-600 text-white font-bold text-xs shrink-0">{toast.msg}</div>}

      <header className="w-full md:w-[340px] bg-[#1e293b] z-20 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <img src="/GV80.jpg" alt="GV80" className="w-6 h-6 rounded shadow-sm" />
              <h1 className="text-xl font-black text-white tracking-tighter">GV80</h1>
              <Link href="/home" className="text-[14px] font-black text-slate-300 hover:text-emerald-400 transition-colors ml-2 uppercase">🏠 Home</Link>
            </div>
            <button onClick={handleLogout} className="text-[10px] font-bold text-slate-300 hover:text-red-400 uppercase">Logout</button>
          </div>

          <div className="flex bg-[#0f172a] p-1 rounded-2xl mb-4 border border-slate-700">
            <button onClick={() => {setActiveTab("fuel"); resetForm();}} className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'fuel' ? 'bg-[#334155] text-white shadow-lg' : 'text-slate-500'}`}>주유내역</button>
            <button onClick={() => {setActiveTab("maint"); resetForm();}} className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'maint' ? 'bg-[#334155] text-white shadow-lg' : 'text-slate-500'}`}>정비내역</button>
          </div>

          <section className={`p-4 rounded-2xl border transition-colors ${editingId ? 'bg-orange-950/20 border-orange-800' : 'bg-[#0f172a]/50 border-slate-700'}`}>
            <form onSubmit={handleSave} className="space-y-3">
              {activeTab === "fuel" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] font-bold text-slate-300 ml-1 mb-1 block uppercase">주유일자</label><input type="date" className="p-2 bg-[#1e293b] border border-slate-700 rounded-xl w-full text-sm font-bold text-white outline-none" value={formData.refuel_date} onChange={(e) => setFormData({...formData, refuel_date: e.target.value})} required /></div>
                    <div><label className="text-[11px] font-bold text-slate-300 ml-1 mb-1 block uppercase">주유회사</label><select className="p-2 bg-[#1e293b] border border-slate-700 rounded-xl w-full text-sm font-bold text-white outline-none" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})}><option value="1">SK Enclean</option><option value="2">GS Caltex</option><option value="3">알뜰주유소</option></select></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[11px] font-bold text-slate-300 ml-1 mb-1 block uppercase">단가</label><input type="number" className="p-2 bg-[#1e293b] border border-slate-700 rounded-xl w-full text-sm text-right font-bold text-white outline-none" value={formData.unit_price_krw} onChange={(e) => setFormData({...formData, unit_price_krw: e.target.value})} required /></div>
                    <div><label className="text-[11px] font-bold text-slate-300 ml-1 mb-1 block uppercase">주유량(L)</label><input type="number" step="0.01" className="p-2 bg-[#1e293b] border border-slate-700 rounded-xl w-full text-sm text-right font-bold text-white outline-none" value={formData.fuel_volume_l} onChange={(e) => setFormData({...formData, fuel_volume_l: e.target.value})} required /></div>
                    <div><label className="text-[11px] font-black text-blue-300 ml-1 mb-1 block uppercase">주유금액</label><input type="number" className="p-2 border-2 border-blue-900 rounded-xl w-full text-sm font-black text-right bg-[#0f172a] text-blue-300 outline-none" value={formData.amount_krw} onChange={(e) => setFormData({...formData, amount_krw: e.target.value})} required /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div className="col-span-1"><label className="text-[11px] font-bold text-slate-300 ml-1 mb-1 block uppercase">주행거리</label><input type="number" className="p-2 bg-[#1e293b] border border-slate-700 rounded-xl w-full text-sm font-bold text-emerald-300 text-right outline-none" value={formData.distance_km} onChange={(e) => setFormData({...formData, distance_km: e.target.value})} required /></div>
                    <button type="submit" className={`col-span-2 py-2 rounded-xl font-black text-white shadow-md active:scale-95 transition-all ${editingId ? 'bg-orange-600' : 'bg-blue-600'}`}>{editingId ? "수정" : "저장"}</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] font-bold text-slate-300 ml-1 mb-1 block uppercase">정비일자</label><input type="date" className="p-2 bg-[#1e293b] border border-slate-700 rounded-xl w-full text-sm font-bold text-white outline-none" value={maintFormData.maint_date} onChange={(e) => setMaintFormData({...maintFormData, maint_date: e.target.value})} required /></div>
                    <div><label className="text-[11px] font-bold text-slate-300 ml-1 mb-1 block uppercase">정비회사</label><input type="text" className="p-2 bg-[#1e293b] border border-slate-700 rounded-xl w-full text-sm font-bold text-white outline-none" value={maintFormData.company} onChange={(e) => setMaintFormData({...maintFormData, company: e.target.value})} required placeholder="블루핸즈" /></div>
                  </div>
                  <div><label className="text-[11px] font-bold text-slate-300 ml-1 mb-1 block uppercase">정비내역</label><input type="text" maxLength={100} className="p-2 bg-[#1e293b] border border-slate-700 rounded-xl w-full text-sm font-bold text-white outline-none" value={maintFormData.content} onChange={(e) => setMaintFormData({...maintFormData, content: e.target.value})} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] font-bold text-slate-300 ml-1 mb-1 block uppercase">금액(원)</label><input type="number" className="p-2 bg-[#1e293b] border border-slate-700 rounded-xl w-full text-sm text-right font-bold text-white outline-none" value={maintFormData.amount_krw} onChange={(e) => setMaintFormData({...maintFormData, amount_krw: e.target.value})} required /></div>
                    <div><label className="text-[11px] font-bold text-slate-300 ml-1 mb-1 block uppercase">주행거리</label><input type="number" className="p-2 bg-[#1e293b] border border-slate-700 rounded-xl w-full text-sm font-bold text-emerald-300 text-right outline-none" value={maintFormData.odometer_km} onChange={(e) => setMaintFormData({...maintFormData, odometer_km: e.target.value})} required /></div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1"><label className="text-[11px] font-bold text-slate-300 ml-1 mb-1 block uppercase">메모</label><input type="text" maxLength={100} className="p-2 bg-[#1e293b] border border-slate-700 rounded-xl w-full text-sm font-bold text-white outline-none" value={maintFormData.memo} onChange={(e) => setMaintFormData({...maintFormData, memo: e.target.value})} /></div>
                    <button type="submit" className={`w-20 py-2 rounded-xl font-black text-white shadow-md active:scale-95 transition-all ${editingId ? 'bg-orange-600' : 'bg-blue-600'}`}>{editingId ? "수정" : "저장"}</button>
                  </div>
                </>
              )}
              {editingId && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" onClick={handleDelete} className="py-2 bg-red-950/30 text-red-400 border border-red-900 rounded-xl font-bold text-xs active:scale-95">삭제</button>
                  <button type="button" onClick={resetForm} className="py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs active:scale-95">취소</button>
                </div>
              )}
            </form>
          </section>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 bg-[#0f172a] relative overflow-x-auto font-sans">
        <div className="min-w-[360px] flex flex-col h-full shrink-0">
          <div className="sticky top-0 bg-[#0f172a]/90 backdrop-blur-md z-10 border-b border-slate-800 shrink-0">
            <div className="px-5 py-4 flex justify-between items-center bg-[#0f172a]">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight leading-none uppercase">{activeTab === 'fuel' ? '주유 내역' : '정비 내역'}</h2>
                {/* ✅ [변경] 엑셀 아이콘 컬러화: grayscale 제거 */}
                <button onClick={downloadExcel} className="p-1 hover:bg-slate-800 rounded-md transition-all active:scale-90" title="엑셀 다운로드">
                  <span className="text-lg block hover:scale-125 transition-transform">📊</span>
                </button>
              </div>
              
              {/* ✅ [변경] 건수 자리 -> 종합 지표로 변경 */}
              <div className="flex gap-3 items-center">
                {activeTab === 'fuel' ? (
                  <>
                    <span className="text-[14px] font-black bg-blue-900/50 text-blue-300 px-2 py-1 rounded-md border border-blue-800/50 uppercase tracking-tighter">
                      총주유량 : {Number(totalVolume.toFixed(1)).toLocaleString()}L
                    </span>
                    <span className="text-[14px] font-black bg-orange-900/50 text-orange-400 px-2 py-1 rounded-md border border-orange-800/50 uppercase tracking-tighter">
                      총주유액 : {totalAmount.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-[14px] font-black bg-orange-900/50 text-orange-400 px-2 py-1 rounded-md border border-orange-800/50 uppercase tracking-tighter">
                    총금액 : ₩{totalMaintAmount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            
            <div className="bg-[#1e293b]/50 px-3 py-2 flex items-center border-t border-slate-800 text-[10px] font-black text-blue-200 tracking-tight whitespace-nowrap uppercase">
              {activeTab === 'fuel' ? (
                <>
                  <div className="flex-1 text-center pr-2">주유일자</div>
                  <div className="w-[45px] text-center pr-5 shrink-0">회사</div>
                  <div className="w-[55px] text-center pr-1 shrink-0">단가(원)</div>
                  <div className="w-[55px] text-center pr-0 shrink-0 border-r border-slate-700">주유량(L)</div>
                  <div className="w-[75px] text-center pr-1 shrink-1 text-blue-400">주유액(원)</div>
                  <div className="w-[70px] text-center pr-0 shrink-1">Trip(km)</div>
                </>
              ) : (
                <>
                  <div className="w-[90px] text-center shrink-0">정비일자</div>
                  <div className="w-[90px] text-right pr-4 shrink-0 border-r border-slate-700 text-emerald-400">금액(원)</div>
                  <div className="flex-1 text-center px-2">정비내역 / 업체 / 메모</div>
                  <div className="w-[50px] text-right pr-3 shrink-0">주행거리</div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-900 custom-scrollbar">
            {(activeTab === 'fuel' ? logs : maintLogs).map((log, index) => {
              const currentList = activeTab === 'fuel' ? logs : maintLogs;
              const nextLog = currentList[index + 1];
              const tripVal = nextLog ? (activeTab === 'fuel' ? (Number(log.distance_km) - Number(nextLog.distance_km)) : (Number(log.odometer_km) - Number(nextLog.odometer_km))) : 0;
              
              return (
                <div key={log.id} onDoubleClick={() => startEdit(log)} className={`flex items-center px-4 py-4 hover:bg-slate-900 cursor-pointer transition-colors whitespace-nowrap ${editingId === log.id ? 'bg-orange-950/20 ring-1 ring-inset ring-orange-900/50' : ''}`}>
                  {activeTab === 'fuel' ? (
                    <>
                      <div className="flex-1 text-sm font-black text-white text-center tracking-tighter pr-2">{log.refuel_date}</div>
                      <div className={`w-[45px] shrink-0 text-sm font-black text-center tracking-tighter ${brandConfig[log.brand]?.color || "text-white"}`}>{brandConfig[log.brand]?.name.split(' ')[0] || "-"}</div>
                      <div className="w-[55px] shrink-0 text-sm font-bold text-slate-300 text-right pr-2 tracking-tighter">{log.unit_price_krw.toLocaleString()}</div>
                      <div className="w-[55px] shrink-0 text-sm font-bold text-slate-300 text-right pr-2 border-r border-slate-700 tracking-tighter">{log.fuel_volume_l.toLocaleString()}</div>
                      <div className="w-[75px] shrink-0 text-sm font-black text-white text-right pr-1 tracking-tighter">{log.amount_krw.toLocaleString()}</div>
                      <div className="w-[70px] shrink-0 text-sm font-black text-blue-400 text-right pr-1 tracking-tighter">{tripVal > 0 ? tripVal.toLocaleString() : "-"}</div>
                    </>
                  ) : (
                    <>
                      <div className="w-[90px] shrink-0 text-[13px] font-black text-white text-center tracking-tighter">{log.maint_date}</div>
                      <div className="w-[90px] shrink-0 text-sm font-black text-emerald-400 text-right pr-2 border-r border-slate-800 bg-slate-900/30 py-1 tracking-tight">{log.amount_krw.toLocaleString()}</div>
                      <div className="flex-1 px-3 py-1 overflow-hidden whitespace-normal break-all">
                        <div className="text-sm font-black text-slate-100 leading-tight mb-1">{log.content}</div>
                        <div className="text-[10px] font-bold leading-tight"><span className="text-blue-200 uppercase">{log.company}</span>{log.memo && <span className="text-slate-400 ml-1">| {log.memo}</span>}</div>
                      </div>
                      <div className="w-[50px] shrink-0 text-sm font-black text-slate-300 text-right pr-1 tracking-tighter">{log.odometer_km?.toLocaleString()}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>


        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}