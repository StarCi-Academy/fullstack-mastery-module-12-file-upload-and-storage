// tus.io Resumable Upload demo — HeroUI v3 Card/Button/Input/Progress UI driving tus-js-client.
// (EN: tus.io Resumable Upload demo — HeroUI v3 Card/Button/Input/Progress UI driving tus-js-client.)
"use client";

import { useRef, useState } from "react";
import {
  Card,
  Button,
  Input,
  ProgressBar,
  Chip,
} from "@heroui/react";
import * as tus from "tus-js-client";

const DEFAULT_ENDPOINT = "http://localhost:3370/files";

// Trang demo tus.io — pick file, start/resume, pause; tus-js-client lo phần resume/fingerprint.
// (EN: tus.io demo page — pick file, start/resume, pause; tus-js-client handles resume/fingerprint.)
export default function HomePage(): React.ReactElement {
  const [endpoint, setEndpoint] = useState<string>(DEFAULT_ENDPOINT);
  const [file, setFile] = useState<File | null>(null);
  const [percent, setPercent] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "done" | "error">("idle");
  const [logLines, setLogLines] = useState<string[]>([]);
  const [uploadUrl, setUploadUrl] = useState<string>("");
  const uploadRef = useRef<tus.Upload | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function log(line: string): void {
    const ts = new Date().toISOString().slice(11, 19);
    setLogLines((prev) => [...prev, `[${ts}] ${line}`]);
  }

  // Start (or resume) upload. tus-js-client tự fingerprint file + lưu URL trong localStorage.
  // (EN: Start (or resume) upload. tus-js-client fingerprints file + persists URL in localStorage.)
  function start(): void {
    if (!file) return;
    setStatus("running");
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: { filename: file.name, filetype: file.type },
      chunkSize: 5 * 1024 * 1024,
      onError: (err: Error) => {
        log(`ERROR: ${err.message}`);
        setStatus("error");
      },
      onProgress: (bytesUploaded: number, bytesTotal: number) => {
        const pct = (bytesUploaded / bytesTotal) * 100;
        setPercent(Number(pct.toFixed(1)));
      },
      onSuccess: () => {
        const url = (upload as unknown as { url?: string }).url ?? "";
        setUploadUrl(url);
        log(`SUCCESS uploadUrl=${url}`);
        setStatus("done");
      },
      onAfterResponse: (req: tus.HttpRequest, res: tus.HttpResponse) => {
        const off = res.getHeader("Upload-Offset");
        log(`${req.getMethod()} ${req.getURL()} -> ${res.getStatus()}${off ? ` Upload-Offset=${off}` : ""}`);
      },
    });
    uploadRef.current = upload;
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        log(`Resuming from prior upload: ${previousUploads[0].uploadUrl}`);
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  }

  // Pause the currently in-flight upload — tus-js-client keeps progress to allow resume.
  // (EN: Pause the currently in-flight upload — tus-js-client retains progress so resume can pick up.)
  function pause(): void {
    if (uploadRef.current) {
      uploadRef.current.abort();
      log("Paused");
      setStatus("paused");
    }
  }

  const statusColor: "default" | "success" | "accent" | "danger" | "warning" =
    status === "done" ? "success" : status === "error" ? "danger" : status === "running" ? "accent" : "default";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <Card className="p-4">
        <Card.Header className="flex flex-col items-start gap-1">
          <Card.Title className="text-2xl font-semibold" data-testid="home-title">
            tus.io Resumable Upload
          </Card.Title>
          <Card.Description className="text-default-500 text-sm">
            Upload via tus protocol — automatic resume from prior offset via localStorage fingerprint.
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="endpoint" className="text-default-700 text-sm font-medium">
              Backend endpoint
            </label>
            <Input
              id="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint((e.target as HTMLInputElement).value)}
              data-testid="input-endpoint"
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
            <Button
              variant="primary"
              onPress={start}
              isDisabled={!file || status === "running"}
              data-testid="btn-start"
            >
              Start / Resume
            </Button>
            <Button
              variant="danger-soft"
              onPress={pause}
              isDisabled={status !== "running"}
              data-testid="btn-pause"
            >
              Pause
            </Button>
          </div>
        </Card.Content>
      </Card>

      <Card className="p-4">
        <Card.Header className="flex items-center justify-between">
          <Card.Title className="text-xl font-semibold">Progress</Card.Title>
          <div className="flex items-center gap-2">
            <Chip color={statusColor} data-testid="chip-status">
              {status}
            </Chip>
            <Chip color={percent === 100 ? "success" : "accent"} data-testid="chip-percent">
              {percent}%
            </Chip>
          </div>
        </Card.Header>
        <Card.Content className="pt-4">
          <ProgressBar
            value={percent}
            aria-label="overall"
            color={percent === 100 ? "success" : "accent"}
            data-testid="progress-overall"
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
          {uploadUrl && (
            <p className="text-default-500 mt-3 break-all text-sm" data-testid="upload-url">
              Upload URL: <code className="font-mono">{uploadUrl}</code>
            </p>
          )}
        </Card.Content>
      </Card>

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
