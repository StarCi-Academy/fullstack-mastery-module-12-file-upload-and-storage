// Chunked Upload demo page — HeroUI v3 Card/Button/Input/Progress UI on top of backend chunked-upload protocol.
// (EN: Chunked Upload demo page — HeroUI v3 Card/Button/Input/Progress UI on top of the backend chunked-upload protocol.)
"use client";

import { useRef, useState } from "react";
import {
  Card,
  Button,
  Input,
  ProgressBar,
  Chip,
} from "@heroui/react";

type InitResp = {
  sessionId: string;
  totalChunks: number;
  chunkSize: number;
};

type StatusResp = {
  sessionId: string;
  totalChunks: number;
  chunkSize: number;
  received: number[];
  missing: number[];
  finalized: boolean;
};

type FinalizeResp = {
  filename: string;
  size: number;
  sha256: string;
  path: string;
};

const DEFAULT_BACKEND = "http://localhost:3360";

// Component giữ state upload chunked: backend URL, file picker, session id, progress per chunk, log.
// (EN: Component holds chunked upload state: backend URL, file picker, session id, per-chunk progress, log.)
export default function HomePage(): React.ReactElement {
  const [backend, setBackend] = useState<string>(DEFAULT_BACKEND);
  const [sessionId, setSessionId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [overall, setOverall] = useState<number>(0);
  const [chunkProgress, setChunkProgress] = useState<number[]>([]);
  const [doneChunks, setDoneChunks] = useState<Set<number>>(new Set());
  const [logLines, setLogLines] = useState<string[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const abortRef = useRef<boolean>(false);
  const xhrPool = useRef<XMLHttpRequest[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Append a log line (kept in component state, displayed in the log Card).
  // (EN: Append a log line — stored in state and rendered in the log Card.)
  function log(line: string): void {
    setLogLines((prev) => [...prev, line]);
  }

  // PATCH a single chunk via XHR so onprogress can drive the per-chunk Progress bar.
  // (EN: PATCH a single chunk via XHR so onprogress can drive the per-chunk Progress bar.)
  function putChunk(id: string, index: number, blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrPool.current.push(xhr);
      xhr.open("PATCH", `${backend}/uploads/${id}/chunks?index=${index}`);
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        setChunkProgress((prev) => {
          const next = [...prev];
          next[index] = pct;
          return next;
        });
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setChunkProgress((prev) => {
            const next = [...prev];
            next[index] = 100;
            return next;
          });
          setDoneChunks((prev) => new Set(prev).add(index));
          resolve();
        } else {
          reject(new Error(`chunk ${index} status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error(`chunk ${index} network error`));
      xhr.onabort = () => reject(new Error(`chunk ${index} aborted`));
      xhr.send(blob);
    });
  }

  // Init session, then sequentially PATCH every chunk, then finalize.
  // (EN: Init session, then sequentially PATCH every chunk, then finalize.)
  async function start(): Promise<void> {
    if (!file) return;
    abortRef.current = false;
    xhrPool.current = [];
    setBusy(true);
    try {
      const r = await fetch(`${backend}/uploads/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, size: file.size }),
      });
      if (!r.ok) throw new Error(`init failed: ${r.status}`);
      const init = (await r.json()) as InitResp;
      setSessionId(init.sessionId);
      setChunkProgress(new Array<number>(init.totalChunks).fill(0));
      setDoneChunks(new Set());
      log(`[init] sessionId=${init.sessionId} totalChunks=${init.totalChunks} chunkSize=${init.chunkSize}`);

      let done = 0;
      for (let i = 0; i < init.totalChunks; i++) {
        if (abortRef.current) {
          log(`[abort] stopped at chunk ${i}`);
          return;
        }
        const startByte = i * init.chunkSize;
        const endByte = Math.min(startByte + init.chunkSize, file.size);
        await putChunk(init.sessionId, i, file.slice(startByte, endByte));
        done++;
        setOverall(Math.round((done / init.totalChunks) * 100));
        log(`[chunk ${i}/${init.totalChunks}] ok (${endByte - startByte}B)`);
      }
      const fr = await fetch(`${backend}/uploads/${init.sessionId}/finalize`, { method: "POST" });
      if (!fr.ok) throw new Error(`finalize failed: ${fr.status}`);
      const fin = (await fr.json()) as FinalizeResp;
      log(`[finalize] path=${fin.path} sha256=${fin.sha256} size=${fin.size}`);
    } catch (e) {
      log(`[error] ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // GET status of an existing session and PATCH only the missing chunks.
  // (EN: GET status of an existing session and PATCH only the missing chunks.)
  async function resume(): Promise<void> {
    if (!file || !sessionId) return;
    abortRef.current = false;
    xhrPool.current = [];
    setBusy(true);
    try {
      const r = await fetch(`${backend}/uploads/${sessionId}/status`);
      if (!r.ok) throw new Error(`status failed: ${r.status}`);
      const st = (await r.json()) as StatusResp;
      log(`[resume] received=[${st.received.join(",")}] missing=[${st.missing.join(",")}]`);
      const seeded = new Set(st.received);
      setDoneChunks(seeded);
      setChunkProgress(() => {
        const next = new Array<number>(st.totalChunks).fill(0);
        for (const i of st.received) next[i] = 100;
        return next;
      });

      let done = st.received.length;
      setOverall(Math.round((done / st.totalChunks) * 100));
      for (const i of st.missing) {
        if (abortRef.current) return;
        const startByte = i * st.chunkSize;
        const endByte = Math.min(startByte + st.chunkSize, file.size);
        await putChunk(sessionId, i, file.slice(startByte, endByte));
        done++;
        setOverall(Math.round((done / st.totalChunks) * 100));
        log(`[chunk ${i}/${st.totalChunks}] ok (${endByte - startByte}B)`);
      }
      const fr = await fetch(`${backend}/uploads/${sessionId}/finalize`, { method: "POST" });
      if (!fr.ok) throw new Error(`finalize failed: ${fr.status}`);
      const fin = (await fr.json()) as FinalizeResp;
      log(`[finalize] path=${fin.path} sha256=${fin.sha256} size=${fin.size}`);
    } catch (e) {
      log(`[error] ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // Abort all in-flight chunk uploads.
  // (EN: Abort all in-flight chunk uploads.)
  function abort(): void {
    abortRef.current = true;
    for (const x of xhrPool.current) {
      try {
        x.abort();
      } catch {
        // ignore
      }
    }
    log("[abort] requested");
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <Card className="p-4">
        <Card.Header className="flex flex-col items-start gap-1">
          <Card.Title className="text-2xl font-semibold" data-testid="home-title">
            Chunked Upload with Progress
          </Card.Title>
          <Card.Description className="text-default-500 text-sm">
            Slice file, PATCH per chunk, finalize. Abort + resume supported.
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="backend" className="text-default-700 text-sm font-medium">
              Backend
            </label>
            <Input
              id="backend"
              value={backend}
              onChange={(e) => setBackend((e.target as HTMLInputElement).value)}
              data-testid="input-backend"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="session" className="text-default-700 text-sm font-medium">
              Session id
            </label>
            <Input
              id="session"
              placeholder="(auto on Start)"
              value={sessionId}
              onChange={(e) => setSessionId((e.target as HTMLInputElement).value)}
              data-testid="input-session"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            data-testid="input-file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onPress={() => fileInputRef.current?.click()}
              data-testid="btn-pick"
            >
              {file ? `File: ${file.name}` : "Pick file"}
            </Button>
            <Button variant="primary" onPress={start} isDisabled={!file || busy} data-testid="btn-start">
              Start upload
            </Button>
            <Button variant="secondary" onPress={resume} isDisabled={!file || !sessionId || busy} data-testid="btn-resume">
              Resume
            </Button>
            <Button variant="danger-soft" onPress={abort} isDisabled={!busy} data-testid="btn-abort">
              Abort
            </Button>
          </div>
        </Card.Content>
      </Card>

      <Card className="p-4">
        <Card.Header className="flex items-center justify-between">
          <Card.Title className="text-xl font-semibold">Overall</Card.Title>
          <Chip color={overall === 100 ? "success" : "accent"} data-testid="chip-overall">
            {overall}%
          </Chip>
        </Card.Header>
        <Card.Content className="pt-4">
          <ProgressBar
            value={overall}
            aria-label="overall"
            color={overall === 100 ? "success" : "accent"}
            data-testid="progress-overall"
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </Card.Content>
      </Card>

      {chunkProgress.length > 0 && (
        <Card className="p-4">
          <Card.Header>
            <Card.Title className="text-xl font-semibold">Chunks ({chunkProgress.length})</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-2 pt-4">
            {chunkProgress.map((pct, i) => (
              <div key={i} className="flex items-center gap-3" data-testid={`chunk-row-${i}`}>
                <span className="text-default-500 w-24 text-sm">Chunk {i}</span>
                <ProgressBar
                  value={pct}
                  aria-label={`chunk ${i}`}
                  className="flex-1"
                  color={doneChunks.has(i) ? "success" : "accent"}
                  data-testid={`progress-chunk-${i}`}
                >
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
                <span className="w-14 text-right text-sm" data-testid={`pct-chunk-${i}`}>
                  {pct}%
                </span>
              </div>
            ))}
          </Card.Content>
        </Card>
      )}

      <Card className="p-4">
        <Card.Header>
          <Card.Title className="text-xl font-semibold">Log</Card.Title>
        </Card.Header>
        <Card.Content className="pt-4">
          <pre
            data-testid="log"
            className="bg-default-100 max-h-60 overflow-auto whitespace-pre-wrap rounded p-3 font-mono text-xs"
          >
            {logLines.join("\n")}
          </pre>
        </Card.Content>
      </Card>
    </main>
  );
}
