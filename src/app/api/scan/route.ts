import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    // Server-zu-Server Kommunikation: Hier funkt Next.js deinen Contabo-Server an.
    // Das umgeht alle Browser-Blockaden (CORS, CSP, Mixed Content)!
    const response = await fetch("http://161.97.85.22:5000/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "KI-Server antwortet nicht.", risk_level: "Fehler" },
      { status: 500 }
    );
  }
}
