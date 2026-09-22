import { NextRequest, NextResponse } from "next/server";
import { parseQaWorkbook } from "@/lib/qaSheet";
import { saveQaSnapshot } from "@/lib/qaSheetStore";

/** Only the derived, structured stats are ever stored — the uploaded workbook itself
 * is parsed in memory and discarded, never written to disk or KV. The "Testdata" sheet
 * (test-account passwords) is never read at all, by construction: qaSheet.ts's parsers
 * only look at Regression / Testcase_Tracker / Automation_Scenarios. */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (!/\.xlsx?$/i.test(file.name)) {
      return NextResponse.json({ error: "Please upload an .xlsx or .xls file." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const snapshot = parseQaWorkbook(buffer, file.name);

    if (!snapshot.regression && !snapshot.testcaseTracker && !snapshot.automation) {
      return NextResponse.json(
        { error: "Couldn't find any recognizable Regression, Testcase_Tracker, or Automation_Scenarios data in this file." },
        { status: 400 }
      );
    }

    await saveQaSnapshot(snapshot);
    return NextResponse.json({ snapshot });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to parse the uploaded file." }, { status: 500 });
  }
}
