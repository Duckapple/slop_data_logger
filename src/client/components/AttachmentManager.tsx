import { useState, useRef, type DragEvent } from 'react';
import { Image as ImageIcon, Link as LinkIcon, Trash2, Upload, X, ExternalLink } from 'lucide-react';
import type { Attachment } from '../../shared/types';
import { api } from '../lib/api';
import { ApiError } from '../lib/api';
import { formatBytes } from '../lib/format';

type Props = {
  misspellingId: string;
  attachments: Attachment[];
  onChange: () => void;
};

export function AttachmentManager({ misspellingId, attachments, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkCaption, setLinkCaption] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const images = attachments.filter((a) => a.kind === 'image');
  const links = attachments.filter((a) => a.kind === 'link');

  async function uploadFiles(files: FileList | File[]) {
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadImage(misspellingId, file);
      }
      onChange();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    setLinkError(null);
    setLinkSubmitting(true);
    try {
      await api.attachLink(
        misspellingId,
        linkUrl.trim(),
        linkCaption.trim() || undefined,
      );
      setLinkUrl('');
      setLinkCaption('');
      setShowLinkForm(false);
      onChange();
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : 'Failed to save link');
    } finally {
      setLinkSubmitting(false);
    }
  }

  async function removeAttachment(id: string) {
    try {
      await api.deleteAttachment(id);
      onChange();
    } catch {
      // best-effort; refetch will reflect actual state
      onChange();
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void uploadFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? 'border-rose-400 bg-rose-50'
            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <Upload className="w-6 h-6 mx-auto text-slate-400" aria-hidden />
        <p className="mt-2 text-sm text-slate-600">
          Drag images here or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-rose-600 hover:text-rose-700 font-medium"
          >
            choose a file
          </button>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          PNG, JPG, WEBP, GIF · up to 5 MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
          }}
        />
        {uploading ? (
          <p className="mt-3 text-xs text-slate-500">Uploading…</p>
        ) : null}
        {uploadError ? (
          <p className="mt-3 text-xs text-rose-600">{uploadError}</p>
        ) : null}
      </div>

      <div>
        {showLinkForm ? (
          <form onSubmit={submitLink} className="space-y-2">
            <input
              type="url"
              required
              placeholder="https://example.com/proof"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            <input
              type="text"
              placeholder="Caption (optional)"
              value={linkCaption}
              onChange={(e) => setLinkCaption(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            {linkError ? (
              <p className="text-xs text-rose-600">{linkError}</p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={linkSubmitting}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition disabled:opacity-50"
              >
                {linkSubmitting ? 'Saving…' : 'Add link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLinkForm(false);
                  setLinkError(null);
                }}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowLinkForm(true)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900"
          >
            <LinkIcon className="w-4 h-4" aria-hidden />
            Add a link
          </button>
        )}
      </div>

      {images.length > 0 ? (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" aria-hidden /> Images
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((a) => (
              <figure
                key={a.id}
                className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
              >
                <button
                  type="button"
                  onClick={() => setLightboxUrl(a.url)}
                  className="block w-full aspect-square overflow-hidden"
                >
                  <img
                    src={a.url}
                    alt={a.caption ?? 'Spelling evidence'}
                    className="w-full h-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  className="absolute top-1.5 right-1.5 rounded-full bg-white/90 hover:bg-white text-slate-700 p-1 shadow opacity-0 group-hover:opacity-100 transition"
                  aria-label="Delete attachment"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                </button>
                {a.sizeBytes != null ? (
                  <figcaption className="px-2 py-1 text-[10px] text-slate-500 bg-white border-t border-slate-100">
                    {formatBytes(a.sizeBytes)}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      {links.length > 0 ? (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5" aria-hidden /> Links
          </h4>
          <ul className="space-y-1.5">
            {links.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <ExternalLink
                  className="w-4 h-4 text-slate-400 shrink-0"
                  aria-hidden
                />
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 text-sm text-slate-700 hover:text-rose-700 truncate"
                  title={a.url}
                >
                  {a.caption ?? a.url}
                </a>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  aria-label="Delete link"
                  className="text-slate-400 hover:text-rose-600 transition"
                >
                  <Trash2 className="w-4 h-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lightboxUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white p-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
          />
        </div>
      ) : null}
    </div>
  );
}
