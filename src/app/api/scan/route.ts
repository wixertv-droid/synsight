import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Die Eingabe vom Frontend (Browser) empfangen
    const body = await req.json();

    // 2. Der Next.js-Server funkt jetzt DEINEN Contabo-Server an
    // Da dies auf Server-Ebene passiert, blockiert hier kein Browser wegen "http"!
    const contaboResponse = await fetch('http://161.97.85.22:5000/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!contaboResponse.ok) {
      throw new Error(`Contabo Server Fehler: ${contaboResponse.status}`);
    }

    // 3. Ergebnis vom Contabo-Server lesen
    const data = await contaboResponse.json();

    // 4. Ergebnis sicher (via HTTPS) an dein Frontend zurückgeben
    return NextResponse.json(data);

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        message: "Der interne Analyse-Server konnte nicht erreicht werden.",
        risk_level: "Fehler"
      },
      { status: 500 }
    );
  }
}
