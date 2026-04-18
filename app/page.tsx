"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../utils/supabase";
import Link from "next/link";
import * as XLSX from "xlsx";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"fuel" | "maint">("fuel");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [maintLogs, setMaintLogs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // 모달 상태
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; msg: string; type?: "info" | "error" }>({ isOpen: false, msg: "" });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; msg: string; onConfirm: () => void }>({ isOpen: false, msg: "", onConfirm: () => {} });

  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- 영수증 처리 로직 추가 ---
  const handleReceiptClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    showToast("🔍 AI 영수증 분석 중...", "success");

    try {
      // 1.5초 대기 (Vibe Coding 테스트용)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (activeTab === "fuel") {
        setFormData({
          refuel_date: new Date().toISOString().split('T')[0],
          brand: "1",
          unit_price_krw: "1650",
          fuel_volume_l: "45.45",
          amount_krw: "75000",
          distance_km: "" // 주행거리는 직접 입력 유도
        });
      } else {
        setMaintFormData({
          maint_date: new Date().toISOString().split('T')[0],
          company: "블루핸즈(AI)",
          content: "엔진오일 교환",
          amount_krw: "120000",
          odometer_km: "",
          memo: "영수증 자동 인식"
        });
      }

      setIsInputModalOpen(true); // 모달 자동 열기
      showToast("✅ 분석 완료! 내용을 확인하세요.");
    } catch (error) {
      showToast("분석 실패", "error");
    } finally {
      setIsAnalyzing(false);
      if (e.target) e.target.value = "";
    }
  };

  // 주유금액 자동 계산
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

  const monthlyFuelTotals = logs.reduce((acc, log) => {
    const month = log.refuel_date.substring(0, 7);
    acc[month] = (acc[month] || 0) + (Number(log.amount_krw) || 0);
    return acc;
  }, {} as Record<string, number>);
  const sortedFuelMonths = Object.keys(monthlyFuelTotals).sort((a, b) => b.localeCompare(a));

  const brandConfig: { [key: string]: { name: string; color: string } } = {
    "1": { name: "SK Enclean", color: isDarkMode ? "text-red-500" : "text-red-600" },
    "2": { name: "GS Caltex", color: isDarkMode ? "text-emerald-300" : "text-emerald-500" },
    "3": { name: "알뜰 주유소", color: isDarkMode ? "text-orange-500" : "text-orange-500" }
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showAlert = (msg: string, type: "info" | "error" = "info") => {
    setAlertModal({ isOpen: true, msg, type });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showAlert("로그인 실패: " + error.message, "error");
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
      if (logs.length === 0) return showAlert("데이터가 없습니다.", "error");
      const headers = ["주유일자", "주유회사", "단가(원)", "주유량(L)", "주유액(원)", "누적주행거리(Km)"];
      const data = logs.map(log => [log.refuel_date.replace(/-/g, '.'), brandConfig[log.brand]?.name || "미지정", log.unit_price_krw, log.fuel_volume_l, log.amount_krw, log.distance_km]);
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
      XLSX.utils.book_append_sheet(workbook, worksheet, "주유내역");
      XLSX.writeFile(workbook, `주유내역_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      if (maintLogs.length === 0) return showAlert("데이터가 없습니다.", "error");
      const headers = ["정비일자", "정비회사", "정비내역", "정비금액", "주행거리(km)", "메모"];
      const data = maintLogs.map(log => [log.maint_date.replace(/-/g, '.'), log.company, log.content, log.amount_krw, log.odometer_km, log.memo]);
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
      XLSX.utils.book_append_sheet(workbook, worksheet, "정비내역");
      XLSX.writeFile(workbook, `정비내역_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    showToast("📊 엑셀 다운로드 완료");
  };

  const downloadMonthlyExcel = () => {
    if (sortedFuelMonths.length === 0) return showAlert("데이터가 없습니다.", "error");
    const headers = ["월", "주유금액(원)"];
    const data = sortedFuelMonths.map(month => [month, monthlyFuelTotals[month]]);
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "월별합계");
    XLSX.writeFile(workbook, `월별_주유합계_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast("📊 월별 내역 다운로드 완료");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "fuel") {
      const payload = { refuel_date: formData.refuel_date, brand: formData.brand, unit_price_krw: Number(formData.unit_price_krw), fuel_volume_l: Number(formData.fuel_volume_l), amount_krw: Number(formData.amount_krw), distance_km: Number(formData.distance_km) };
      if (editingId) {
        const { error } = await supabase.from("fuel_logs").update(payload).eq("id", editingId);
        if (!error) { showToast("✅ 수정 완료"); resetForm(); fetchLogs(); }
      } else {
        const { error } = await supabase.from("fuel_logs").insert([payload]);
        if (!error) { showToast("🚀 저장 완료"); resetForm(); fetchLogs(); }
      }
    } else {
      const payload = { maint_date: maintFormData.maint_date, content: maintFormData.content, amount_krw: Number(maintFormData.amount_krw), company: maintFormData.company, odometer_km: Number(maintFormData.odometer_km), memo: maintFormData.memo };
      if (editingId) {
        const { error } = await supabase.from("maintenance_logs").update(payload).eq("id", editingId);
        if (!error) { showToast("✅ 수정 완료"); resetForm(); fetchLogs(); }
      } else {
        const { error } = await supabase.from("maintenance_logs").insert([payload]);
        if (!error) { showToast("🚀 저장 완료"); resetForm(); fetchLogs(); }
      }
    }
    setIsInputModalOpen(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ refuel_date: new Date().toISOString().split('T')[0], brand: "1", unit_price_krw: "", fuel_volume_l: "", amount_krw: "", distance_km: "" });
    setMaintFormData({ maint_date: new Date().toISOString().split('T')[0], company: "", content: "", amount_krw: "", odometer_km: "", memo: "" });
  };

  const handleDelete = () => {
    if (!editingId) return;
    setConfirmModal({
      isOpen: true,
      msg: "내역을 삭제하시겠습니까?",
      onConfirm: async () => {
        const table = activeTab === "fuel" ? "fuel_logs" : "maintenance_logs";
        const { error } = await supabase.from(table).delete().eq("id", editingId);
        if (!error) { showToast("🗑️ 삭제 완료"); resetForm(); fetchLogs(); }
        setConfirmModal({ isOpen: false, msg: "", onConfirm: () => {} });
        setIsInputModalOpen(false);
      }
    });
  };

  const startEdit = (log: any) => {
    setEditingId(log.id);
    if (activeTab === "fuel") {
      setFormData({ refuel_date: log.refuel_date, brand: log.brand || "1", unit_price_krw: log.unit_price_krw.toString(), fuel_volume_l: log.fuel_volume_l.toString(), amount_krw: log.amount_krw.toString(), distance_km: log.distance_km.toString() });
    } else {
      setMaintFormData({ maint_date: log.maint_date, company: log.company || "", content: log.content, amount_krw: log.amount_krw.toString(), odometer_km: log.odometer_km?.toString() || "", memo: log.memo || "" });
    }
    setIsInputModalOpen(true);
  };

  if (!session) {
    return (
      <div className={`flex items-center justify-center h-screen font-sans p-6 ${isDarkMode ? 'bg-[#0a1122] text-slate-300' : 'bg-slate-100 text-slate-800'}`}>
        <div className={`w-full max-w-sm p-8 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-[#111c3a] border-[#1e2e56]' : 'bg-white border-slate-200'}`}>
          <h1 className={`text-2xl font-black mb-6 text-center tracking-tighter italic ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Brandon CAR</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email" className={`w-full p-4 border rounded-2xl outline-none font-bold ${isDarkMode ? 'bg-[#1e2e56] border-[#2a3f75] text-white focus:border-blue-500 placeholder-[#5c72a8]' : 'bg-white border-slate-200 text-slate-800'}`} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" className={`w-full p-4 border rounded-2xl outline-none font-bold ${isDarkMode ? 'bg-[#1e2e56] border-[#2a3f75] text-white focus:border-blue-500 placeholder-[#5c72a8]' : 'bg-white border-slate-200 text-slate-800'}`} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl">LOGIN</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-full mx-auto overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* 분석 중일 때 상단에 파란색 로딩 바 표시 */}
      {isAnalyzing && (
        <div className="fixed top-0 left-0 w-full h-1.5 bg-blue-500 z-[200] animate-pulse" />
      )}

      {toast && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[110] px-6 py-2 rounded-full shadow-xl bg-blue-600 text-white font-bold text-xs shrink-0">{toast.msg}</div>}

      <header className={`w-full p-4 border-b shrink-0 ${isDarkMode ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <img src="/GV80.jpg" alt="GV80" className="w-8 h-8 rounded-lg shadow-sm" />
            <h1 className={`text-xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>GV80</h1>
            <div className="flex gap-1 ml-1">
            </div>
            <Link href="/home" className="flex items-center justify-center hover:opacity-70 transition-opacity">
            <img src="/House.png" alt="홈지출내역" className="w-8 h-8 rounded-lg shadow-sm"/>
            </Link>
            
            <Link href="/stock" className="flex items-center justify-center hover:opacity-70 transition-opacity">
            <img src="/Stock.png" alt="주식내역" className="w-8 h-8 rounded-lg shadow-sm"/>
            </Link>

            <Link href="https://wonsabba-cash.vercel.app" className="flex items-center justify-center hover:opacity-70 transition-opacity">
            <img src="/Money.png" alt="현금내역" className="w-8 h-8 rounded-lg shadow-sm"/>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${isDarkMode ? 'bg-[#334155] text-blue-300' : 'bg-slate-100 text-blue-600'}`}>
              {isDarkMode ? 'LIGHT' : 'DARK'}
            </button>
            <button onClick={handleLogout} className="text-[10px] font-bold text-slate-400">Logout</button>
          </div>
        </div>

        <div className={`flex p-1 rounded-2xl border ${isDarkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
          <button onClick={() => {setActiveTab("fuel"); resetForm();}} className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'fuel' ? (isDarkMode ? 'bg-[#334155] text-white shadow-lg' : 'bg-white text-blue-600 shadow-md') : 'text-slate-500'}`}>주유내역</button>
          <button onClick={() => {setActiveTab("maint"); resetForm();}} className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'maint' ? (isDarkMode ? 'bg-[#334155] text-white shadow-lg' : 'bg-white text-blue-600 shadow-md') : 'text-slate-500'}`}>정비내역</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
        <div className={`px-5 py-4 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex gap-2 items-center overflow-hidden">
            {activeTab === 'fuel' ? (
              <>
                <span className={`text-[14px] font-black px-2 py-1 rounded-md border whitespace-nowrap ${isDarkMode ? 'bg-blue-600/20 text-blue-300 border-blue-900' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                  {Number(totalVolume.toFixed(1)).toLocaleString()} L
                </span>
                <span className={`text-[14px] font-black px-2 py-1 rounded-md border whitespace-nowrap ${isDarkMode ? 'bg-orange-900/20 text-orange-400 border-orange-900' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                  {totalAmount.toLocaleString()} 원
                </span>
                <button onClick={() => setIsMonthlyModalOpen(true)} className="text-base active:scale-90 transition-transform">📅</button>
              </>
            ) : (
              <span className={`text-[14px] font-black px-2 py-1 rounded-md border ${isDarkMode ? 'bg-orange-900/20 text-orange-400 border-orange-900' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                Total : {totalMaintAmount.toLocaleString()} 원
              </span>
            )}
          </div>

          {/* ✅ 신규 버튼과 엑셀 버튼을 하나의 묶음으로 처리하여 나란히 배치 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 숨겨진 Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
            />
            
            {/* 영수증 버튼 추가 */}
            <button 
              onClick={handleReceiptClick}
              disabled={isAnalyzing}
              className={`p-1.5 rounded-md transition-all active:scale-90 ${isAnalyzing ? 'animate-pulse' : ''} ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
              title="영수증 인식"
            >
              <span className="text-lg">📷</span>
            </button>

            <button 
              onClick={downloadExcel} 
              className={`p-1.5 rounded-md transition-all active:scale-90 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
            >
              <span className="text-lg">📊</span>
            </button>
            
            <button 
              onClick={() => {resetForm(); setIsInputModalOpen(true);}} 
              className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-black text-[11px] active:scale-95 transition-all shadow-md"
            >
              + 신규
            </button>
            
          </div>
        </div>

        <div className={`px-4 py-2 flex border-b text-[14px] font-black tracking-tight ${isDarkMode ? 'bg-[#1e293b]/50 border-slate-500 text-slate-300' : 'bg-slate-80 border-slate-300 text-slate-600'}`}>
          {activeTab === 'fuel' ? (
            <>
              <div className="w-[22%] text-center">주유일자</div>
              <div className="w-[12%] text-center">회사</div>
              <div className="w-[15%] text-right pr-2">단가</div>
              <div className="w-[18%] text-right pr-5">주유액</div>
              <div className="w-[15%] text-right pr-2">주유량</div>
              <div className="w-[17%] text-right pr-2">Trip</div>
            </>
          ) : (
            <>
              <div className="w-[20%] text-center">정비일자</div>
              <div className="w-[20%] text-right pr-8">금액</div>
              <div className="flex-1 px-4">정비내역 / 업체 / 메모</div>
              <div className="w-[15%] text-right pr-1">누적거리</div>
            </>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto divide-y custom-scrollbar ${isDarkMode ? 'divide-slate-900' : 'divide-slate-100'}`}>
          {(activeTab === 'fuel' ? logs : maintLogs).map((log, index) => {
            const currentList = activeTab === 'fuel' ? logs : maintLogs;
            const nextLog = currentList[index + 1];
            const tripVal = nextLog ? (activeTab === 'fuel' ? (Number(log.distance_km) - Number(nextLog.distance_km)) : (Number(log.odometer_km) - Number(nextLog.odometer_km))) : 0;
            
            return (
              <div key={log.id} onDoubleClick={() => startEdit(log)} className={`flex items-center px-4 py-4 cursor-pointer transition-all ${isDarkMode ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'}`}>
                {activeTab === 'fuel' ? (
                  <>
                    <div className="w-[22%] text-[14px] font-black text-center tracking-tighter">{log.refuel_date.replace(/-/g, '.')}</div>
                    <div className={`w-[12%] text-[14px] font-black text-center ${brandConfig[log.brand]?.color}`}>{brandConfig[log.brand]?.name.split(' ')[0]}</div>
                    <div className="w-[15%] text-[14px] font-bold text-right opacity-80 tracking-tighter">{log.unit_price_krw.toLocaleString()}</div>
                    <div className="w-[18%] text-[14px] font-black text-right pr-2 tracking-tighter">{log.amount_krw.toLocaleString()}</div>
                    <div className="w-[15%] text-[14px] font-bold text-right opacity-80">{log.fuel_volume_l.toLocaleString()}</div>
                    <div className="w-[17%] text-[14px] font-black text-right text-blue-500">{tripVal > 0 ? tripVal.toLocaleString() : "-"}</div>
                  </>
                ) : (
                  <>
                    <div className="w-[20%] text-[14px] font-black text-center tracking-tighter">{log.maint_date.replace(/-/g, '.')}</div>
                    <div className="w-[20%] text-[14px] font-black text-right pr-4 text-emerald-500 tracking-tighter">{log.amount_krw.toLocaleString()}</div>
                    <div className="flex-1 px-4 min-w-0 flex flex-col justify-center">
                      <div className={`text-[14px] font-black truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{log.content}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[13px] font-bold opacity-60 uppercase shrink-0">{log.company}</span>
                        {log.memo && (
                          <>
                            <span className="text-[12px] opacity-50">|</span>
                            <span className={`text-[13px] font-bold truncate ${isDarkMode ? 'text-blue-500' : 'text-blue-600'}`}>{log.memo}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="w-[15%] text-[14px] font-black text-right opacity-80 tracking-tighter">{log.odometer_km?.toLocaleString()}</div>
                  </>
                )}
              </div>
            );
          })}
          {(activeTab === 'fuel' ? logs : maintLogs).length === 0 && (
            <div className="text-center py-20 opacity-20 font-black">데이터가 없습니다.</div>
          )}
        </div>
      </main>

      {isInputModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className={`w-full max-w-md p-6 rounded-[32px] shadow-2xl border ${isDarkMode ? 'bg-[#111c3a] border-[#1e2e56]' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                {editingId ? '기록 수정' : (activeTab === 'fuel' ? '주유 기록' : '정비 기록')}
              </h2>
              <button onClick={() => {setIsInputModalOpen(false); resetForm();}} className="text-slate-500 text-lg">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {activeTab === "fuel" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] font-bold block opacity-60 ml-1 mb-1">주유일자</label><input type="date" className={`p-3 border rounded-2xl w-full font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300'}`} value={formData.refuel_date} onChange={(e) => setFormData({...formData, refuel_date: e.target.value})} required /></div>
                    <div><label className="text-[11px] font-bold block opacity-60 ml-1 mb-1">주유회사</label><select className={`p-3 border rounded-2xl w-full font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300'}`} value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})}><option value="1">SK Enclean</option><option value="2">GS Caltex</option><option value="3">알뜰 주유소</option></select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] font-bold block opacity-60 ml-1 mb-1">단가 (원)</label><input type="number" className={`p-3 border rounded-2xl w-full font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300'}`} value={formData.unit_price_krw} onChange={(e) => setFormData({...formData, unit_price_krw: e.target.value})} required /></div>
                    <div><label className="text-[11px] font-bold block opacity-60 ml-1 mb-1">주유량 (L)</label><input type="number" step="0.01" className={`p-3 border rounded-2xl w-full font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300'}`} value={formData.fuel_volume_l} onChange={(e) => setFormData({...formData, fuel_volume_l: e.target.value})} required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] font-bold block text-blue-500 ml-1 mb-1">주유금액 (원)</label><input type="number" className={`p-3 border-2 border-blue-500/30 rounded-2xl w-full font-black outline-none ${isDarkMode ? 'bg-[#0f172a] text-blue-300' : 'bg-blue-50 text-blue-800'}`} value={formData.amount_krw} onChange={(e) => setFormData({...formData, amount_krw: e.target.value})} required /></div>
                    <div><label className="text-[11px] font-bold block text-emerald-500 ml-1 mb-1">누적거리 (Km)</label><input type="number" className={`p-3 border border-emerald-500/30 rounded-2xl w-full font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] text-emerald-400' : 'bg-white text-emerald-600'}`} value={formData.distance_km} onChange={(e) => setFormData({...formData, distance_km: e.target.value})} required /></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] font-bold block opacity-60 ml-1 mb-1">정비일자</label><input type="date" className={`p-3 border rounded-2xl w-full font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300'}`} value={maintFormData.maint_date} onChange={(e) => setMaintFormData({...maintFormData, maint_date: e.target.value})} required /></div>
                    <div><label className="text-[11px] font-bold block opacity-60 ml-1 mb-1">정비회사</label><input type="text" className={`p-3 border rounded-2xl w-full font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300'}`} value={maintFormData.company} onChange={(e) => setMaintFormData({...maintFormData, company: e.target.value})} required /></div>
                  </div>
                  <div><label className="text-[11px] font-bold block opacity-60 ml-1 mb-1">정비내역</label><input type="text" className={`p-3 border rounded-2xl w-full font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300'}`} value={maintFormData.content} onChange={(e) => setMaintFormData({...maintFormData, content: e.target.value})} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] font-bold block opacity-60 ml-1 mb-1">금액 (원)</label><input type="number" className={`p-3 border rounded-2xl w-full font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300'}`} value={maintFormData.amount_krw} onChange={(e) => setMaintFormData({...maintFormData, amount_krw: e.target.value})} required /></div>
                    <div><label className="text-[11px] font-bold block opacity-60 ml-1 mb-1">누적거리 (Km)</label><input type="number" className={`p-3 border rounded-2xl w-full font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300'}`} value={maintFormData.odometer_km} onChange={(e) => setMaintFormData({...maintFormData, odometer_km: e.target.value})} required /></div>
                  </div>
                  <div><label className="text-[11px] font-bold block opacity-60 ml-1 mb-1">메모</label><input type="text" className={`p-3 border rounded-2xl w-full font-bold outline-none ${isDarkMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300'}`} value={maintFormData.memo} onChange={(e) => setMaintFormData({...maintFormData, memo: e.target.value})} /></div>
                </>
              )}
              <div className="flex gap-3 pt-4">
                {editingId && <button type="button" onClick={handleDelete} className="flex-1 py-4 bg-red-600/20 text-red-500 rounded-2xl font-black active:scale-95 transition-all">삭제</button>}
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl">{editingId ? "수정" : "저장"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 알림 및 확인 모달 (변화 없음) */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-xs rounded-3xl shadow-2xl flex flex-col ${isDarkMode ? 'bg-[#111c3a] border-[#1e2e56] border' : 'bg-white border-slate-200 border'}`}>
            <div className="p-6 text-center mt-2">
              <div className={`text-3xl mb-3 ${alertModal.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>{alertModal.type === 'error' ? '⚠️' : 'ℹ️'}</div>
              <p className={`text-sm font-bold leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{alertModal.msg}</p>
            </div>
            <div className="p-4 pt-0"><button onClick={() => setAlertModal({ isOpen: false, msg: "" })} className={`w-full py-3 rounded-xl font-black text-sm ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'}`}>확인</button></div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-xs rounded-3xl shadow-2xl flex flex-col ${isDarkMode ? 'bg-[#111c3a] border-[#1e2e56] border' : 'bg-white border-slate-200 border'}`}>
            <div className="p-6 text-center mt-2"><div className="text-3xl mb-3 text-red-500">🗑️</div><p className={`text-sm font-bold leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{confirmModal.msg}</p></div>
            <div className="flex p-4 gap-3 pt-0">
              <button onClick={() => setConfirmModal({ isOpen: false, msg: "", onConfirm: () => {} })} className={`flex-1 py-3 rounded-xl font-bold text-sm ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>취소</button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600 text-white">삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 [복구 완료] 월별 주유액 팝업 내 엑셀 버튼 추가 */}
      {isMonthlyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl flex flex-col max-h-[80vh] ${isDarkMode ? 'bg-[#111c3a] border-[#1e2e56] border' : 'bg-white border-slate-200 border'}`}>
            <div className={`p-5 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">월별 주유액</h2>
                {/* ✅ 엑셀 버튼 복구 */}
                <button 
                  onClick={downloadMonthlyExcel} 
                  className={`p-1 rounded-md transition-all active:scale-90 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                  title="월별 엑셀 다운로드"
                >
                  📊
                </button>
              </div>
              <button onClick={() => setIsMonthlyModalOpen(false)} className="text-sm font-bold">닫기 ✕</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 custom-scrollbar">
              {sortedFuelMonths.map(month => (
                <div key={month} className={`flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50`}>
                  <span className="text-sm font-black text-blue-500">{month}</span>
                  <span className="text-sm font-black text-blue-500">{monthlyFuelTotals[month].toLocaleString()} 원</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}