import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";

const ACCEPT = {
  image: "image/*",
  video: "video/*",
  sheet: ".csv,.xlsx,.xls,.ods",
};

const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  image: { label: "Image",       color: "#0369a1", icon: "🖼️" },
  video: { label: "Video",       color: "#7c3aed", icon: "🎬" },
  sheet: { label: "Spreadsheet", color: "#118849", icon: "📊" },
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function fmtDate(ts: any) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Media() {
  const [files, setFiles] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = () => {
    setFetching(true);
    api.get("/media").then(r => r.json()).then(d => {
      setFiles(d.files ?? []);
      setFetching(false);
    });
  };

  const upload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    let succeeded = 0;
    for (const file of Array.from(fileList)) {
      setUploadProgress(`Uploading ${file.name}…`);
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/media", { method: "POST", body: form, credentials: "include" });
        if (res.ok) succeeded++;
        else console.error("Upload failed:", await res.text());
      } catch (e) {
        console.error("Upload error:", e);
      }
    }
    setUploading(false);
    setUploadProgress("");
    if (succeeded > 0) load();
  };

  const deleteFile = async (id: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    await api.delete(`/media/${id}`);
    setFiles(f => f.filter(x => x.id !== id));
    if (preview?.id === id) setPreview(null);
  };

  const filtered = filterCat ? files.filter(f => f.category === filterCat) : files;

  const counts = { image: 0, video: 0, sheet: 0 } as Record<string, number>;
  files.forEach(f => { if (f.category) counts[f.category] = (counts[f.category] ?? 0) + 1; });

  return (
    <Layout>
      <style>{`
        .media-drop { border: 2px dashed #d1d9e0; border-radius: 6px; padding: 36px 20px;
          text-align: center; cursor: pointer; transition: all 0.15s; background: #fff; }
        .media-drop.drag { border-color: #118849; background: #f0fdf4; }
        .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
        .media-card { background: #fff; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          overflow: hidden; cursor: pointer; transition: box-shadow 0.15s; }
        .media-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.14); }
        .media-thumb { width: 100%; height: 140px; object-fit: cover; display: block; background: #eef2f6; }
        .media-thumb-icon { width:100%; height:140px; display:flex; align-items:center; justify-content:center;
          font-size:48px; background:#eef2f6; }
        .media-info { padding: 10px 12px; }
        .media-overlay { position:fixed; inset:0; background:rgba(15,50,107,0.8);
          display:flex; align-items:center; justify-content:center; z-index:300; }
        .media-overlay-inner { background:#fff; border-radius:6px; max-width:90vw; max-height:90vh;
          overflow:auto; padding:24px; position:relative; min-width:320px; }
        @media(max-width:600px) { .media-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#192943" }}>Media Library</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5e708d" }}>{files.length} file{files.length !== 1 ? "s" : ""} · images, videos and spreadsheets</p>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={uploading} style={{
          padding: "9px 20px", background: "#118849", color: "#fff", border: "none",
          borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer",
          fontFamily: "'Open Sans',Arial,sans-serif", opacity: uploading ? 0.7 : 1,
        }}>
          {uploading ? uploadProgress : "+ Upload Files"}
        </button>
        <input ref={inputRef} type="file" multiple accept="image/*,video/*,.csv,.xlsx,.xls,.ods"
          style={{ display: "none" }} onChange={e => upload(e.target.files)} />
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        {Object.entries(CATEGORY_META).map(([key, m]) => (
          <div key={key} onClick={() => setFilterCat(filterCat === key ? "" : key)} style={{
            background: "#fff", borderRadius: 4, padding: "14px 16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", cursor: "pointer",
            border: `2px solid ${filterCat === key ? m.color : "transparent"}`,
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{m.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#192943" }}>{counts[key] ?? 0}</div>
            <div style={{ fontSize: 12, color: "#5e708d" }}>{m.label}{(counts[key] ?? 0) !== 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        className={`media-drop${dragOver ? " drag" : ""}`}
        style={{ marginBottom: 20 }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#192943", marginBottom: 4 }}>
          {dragOver ? "Drop to upload" : "Drag & drop files here, or click to browse"}
        </div>
        <div style={{ fontSize: 12, color: "#5e708d" }}>Images, videos, CSV and Excel spreadsheets</div>
        {uploading && <div style={{ marginTop: 12, fontSize: 13, color: "#118849", fontWeight: 600 }}>{uploadProgress}</div>}
      </div>

      {/* Grid */}
      {fetching ? (
        <div style={{ textAlign: "center", padding: 40, color: "#5e708d" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 4, padding: 40, textAlign: "center", color: "#5e708d", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          {filterCat ? `No ${CATEGORY_META[filterCat]?.label.toLowerCase()}s uploaded yet.` : "No files uploaded yet. Drag and drop or click Upload Files to get started."}
        </div>
      ) : (
        <div className="media-grid">
          {filtered.map(f => {
            const m = CATEGORY_META[f.category] ?? { icon: "📄", label: "File", color: "#5e708d" };
            const url = `/uploads/${f.fileName}`;
            return (
              <div key={f.id} className="media-card" onClick={() => setPreview(f)}>
                {f.category === "image" ? (
                  <img src={url} alt={f.originalName} className="media-thumb" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="media-thumb-icon">{m.icon}</div>
                )}
                <div className="media-info">
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#192943", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.originalName}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, alignItems: "center" }}>
                    <span style={{ padding: "1px 7px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: m.color, color: "#fff" }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: "#5e708d" }}>{fmtSize(f.size)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#9eafc2", marginTop: 4 }}>{fmtDate(f.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="media-overlay" onClick={() => setPreview(null)}>
          <div className="media-overlay-inner" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} style={{
              position: "absolute", top: 12, right: 12, background: "none", border: "none",
              fontSize: 22, cursor: "pointer", color: "#5e708d", lineHeight: 1,
            }}>×</button>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#192943", marginBottom: 16, paddingRight: 32 }}>{preview.originalName}</div>

            {preview.category === "image" && (
              <img src={`/uploads/${preview.fileName}`} alt={preview.originalName}
                style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 4, display: "block", marginBottom: 16 }} />
            )}
            {preview.category === "video" && (
              <video controls src={`/uploads/${preview.fileName}`}
                style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 4, display: "block", marginBottom: 16 }} />
            )}
            {preview.category === "sheet" && (
              <div style={{ padding: "24px", textAlign: "center", background: "#eef2f6", borderRadius: 4, marginBottom: 16, fontSize: 40 }}>📊</div>
            )}

            <div style={{ fontSize: 12, color: "#5e708d", marginBottom: 16, display: "flex", flexDirection: "column", gap: 4 }}>
              <span>Size: {fmtSize(preview.size)}</span>
              <span>Uploaded: {fmtDate(preview.createdAt)}</span>
              {preview.uploadedByName && <span>By: {preview.uploadedByName}</span>}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <a href={`/uploads/${preview.fileName}`} download={preview.originalName} style={{
                flex: 1, padding: "10px", background: "#0f326b", color: "#fff", borderRadius: 3,
                fontSize: 13, fontWeight: 700, textAlign: "center", textDecoration: "none",
              }}>Download</a>
              <button onClick={() => deleteFile(preview.id, preview.originalName)} style={{
                padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca",
                color: "#dc2626", borderRadius: 3, fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Open Sans',Arial,sans-serif",
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
