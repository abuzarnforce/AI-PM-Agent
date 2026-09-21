import { readJson, writeJson } from "./kvStore";
import { computeSnapshot, type RepoActivitySnapshot } from "./repoActivity";

function snapshotKey(fullRepo: string): string {
  return `repoActivitySnapshot:${fullRepo}`;
}

export async function getCachedSnapshot(fullRepo: string): Promise<RepoActivitySnapshot | null> {
  return readJson<RepoActivitySnapshot>(snapshotKey(fullRepo));
}

export async function refreshSnapshot(fullRepo: string): Promise<RepoActivitySnapshot> {
  const snapshot = await computeSnapshot(fullRepo);
  await writeJson(snapshotKey(fullRepo), snapshot);
  return snapshot;
}
