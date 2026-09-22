import { readJson, writeJson } from "./kvStore";
import type { QaSnapshot } from "./qaSheet";

const QA_SNAPSHOT_KEY = "qaSnapshot";

export async function getQaSnapshot(): Promise<QaSnapshot | null> {
  return readJson<QaSnapshot>(QA_SNAPSHOT_KEY);
}

export async function saveQaSnapshot(snapshot: QaSnapshot): Promise<void> {
  await writeJson(QA_SNAPSHOT_KEY, snapshot);
}
