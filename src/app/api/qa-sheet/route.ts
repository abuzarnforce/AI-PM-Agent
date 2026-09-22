import { NextResponse } from "next/server";
import { getQaSnapshot } from "@/lib/qaSheetStore";

export async function GET() {
  const snapshot = await getQaSnapshot();
  return NextResponse.json({ snapshot });
}
