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

    // 모델 설정 (Flash 모델이 빠르고 무료로 쓰기 좋습니다)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    console.error("Gemini 분석 에러:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}