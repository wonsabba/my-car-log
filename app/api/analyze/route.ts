import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const tab = formData.get("tab") as string;

    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    // 이미지를 바이너리 데이터로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 'models/' 접두사를 명시적으로 붙여줍니다.
    // 'models/'를 붙인 정식 명칭을 사용합니다.
    // route.ts 수정
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

    const prompt = tab === "fuel" 
      ? "이 주유 영수증 이미지에서 다음 정보를 JSON 형식으로 추출해줘: { brand: '1(SK), 2(GS), 3(알뜰) 중 숫자만', unit_price_krw: '단가(숫자)', fuel_volume_l: '주유량(숫자)', amount_krw: '총액(숫자)', refuel_date: 'YYYY-MM-DD' }. 텍스트 설명 없이 오직 JSON만 반환해."
      : "이 정비 영수증 이미지에서 다음 정보를 JSON 형식으로 추출해줘: { company: '업체명', content: '정비내용 요약', amount_krw: '금액(숫자)', maint_date: 'YYYY-MM-DD' }. 텍스트 설명 없이 오직 JSON만 반환해.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: file.type
        }
      }
    ]);

    const response = await result.response;
    let text = response.text();
    
    // JSON 외에 마크다운 기호(```json)가 포함될 경우 제거
    text = text.replace(/```json|```/g, "").trim();
    
    return NextResponse.json(JSON.parse(text));
  } catch (error: any) {
    // 터미널에 아주 자세한 에러 원인을 찍어줍니다.
    console.error("🔥 Gemini API 에러 상세:", error.message); 
    console.error("🔥 에러 스택:", error.stack);
    
    return NextResponse.json({ 
      error: "AI 분석 중 오류가 발생했습니다.",
      detail: error.message 
    }, { status: 500 });
  }
}