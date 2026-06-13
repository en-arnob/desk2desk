import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryDto, Priority, RequestDto } from '@desk2desk/shared';
import { ApiError, apiGet, apiPost, apiUpload } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileText, Loader2, Paperclip, X } from 'lucide-react';

const ACCEPT_TYPES =
  '.pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp';
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function NewRequestPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [files, setFiles] = useState<File[]>([]);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<CategoryDto[]>('/catalog/categories').then(setCategories);
  }, []);

  function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const accepted: File[] = [];
    for (const f of picked) {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(`"${f.name}" type is not allowed.`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        setError(`"${f.name}" is larger than 15 MB.`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
  }

  function removeFile(file: File) {
    setFiles((prev) => prev.filter((f) => f !== file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Create the request once; on a retry (e.g. an upload failed) reuse the id.
      let id = createdId;
      if (id == null) {
        const req = await apiPost<RequestDto>('/requests', {
          title,
          description,
          categoryId: Number(categoryId),
          priority,
        });
        id = req.id;
        setCreatedId(id);
      }
      // Upload each file to the same endpoint conversation attachments use,
      // dropping each from state on success so a retry won't duplicate it.
      for (const file of [...files]) {
        await apiUpload(`/requests/${id}/attachments`, file);
        setFiles((prev) => prev.filter((f) => f !== file));
      }
      navigate(`/requests/${id}`);
    } catch (err) {
      setError(
        createdId != null
          ? 'Request was created, but a file failed to upload. Try again or open the request to attach it.'
          : err instanceof ApiError
            ? err.message
            : 'Failed to create',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">New Support Request</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Pick a category so the right IT staff can pick it up.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Need Q2 sales report"
                disabled={createdId != null}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  disabled={createdId != null}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as Priority)}
                  disabled={createdId != null}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(Priority).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you need…"
                rows={5}
                disabled={createdId != null}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              {files.length > 0 && (
                <ul className="space-y-2">
                  {files.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-3 rounded-lg border bg-secondary/40 px-3 py-2"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {f.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(f.size)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(f)}
                        disabled={busy}
                        className="ml-auto text-muted-foreground hover:text-destructive disabled:opacity-50"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT_TYPES}
                className="hidden"
                onChange={onFilesPicked}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" /> Attach file
              </Button>
              <p className="text-[11px] text-muted-foreground">
                PDF, Word, Excel, CSV or images · up to 15 MB each
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !categoryId}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  'Submit request'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
