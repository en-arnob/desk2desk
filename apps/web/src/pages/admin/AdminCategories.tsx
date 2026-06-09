import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  FolderKanban,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import type { CategoryDto } from '@desk2desk/shared';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Loader } from '@/components/Logo';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CategoryDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  function load() {
    apiGet<CategoryDto[]>('/admin/categories')
      .then(setCategories)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    setError(null);
    try {
      await apiDelete(`/admin/categories/${toDelete.id}`);
      setToDelete(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
      setToDelete(null);
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((c) => {
      if (
        q &&
        !c.name.toLowerCase().includes(q) &&
        !(c.description ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter === 'ACTIVE' && !c.isActive) return false;
      if (statusFilter === 'INACTIVE' && c.isActive) return false;
      return true;
    });
  }, [categories, query, statusFilter]);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'INACTIVE', label: 'Inactive' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Support Categories</h1>
          <p className="text-sm text-muted-foreground">
            The kinds of support employees can request. Supporters are granted
            per-category privileges on the Users page.
          </p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>+ New category</Button>
        )}
      </div>

      {creating && (
        <CreateCategory
          onCreated={() => {
            setCreating(false);
            load();
          }}
          onCancel={() => setCreating(false)}
          onError={setError}
        />
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 p-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border bg-card p-0.5">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  'rounded px-3 py-1 text-sm font-medium transition-colors',
                  statusFilter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={3}>
                    <Loader />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    {categories.length === 0
                      ? 'No categories yet.'
                      : 'No categories match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    onChanged={load}
                    onDelete={() => setToDelete(c)}
                    onError={setError}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.name}"?`}
        message="Categories already used by requests can't be deleted — deactivate them instead. This cannot be undone."
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function CreateCategory({
  onCreated,
  onCancel,
  onError,
}: {
  onCreated: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiPost('/admin/categories', { name, description });
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to create');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New category</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Printer / Hardware"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this covers"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Create category</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CategoryRow({
  category,
  onChanged,
  onDelete,
  onError,
}: {
  category: CategoryDto;
  onChanged: () => void;
  onDelete: () => void;
  onError: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? '');
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setName(category.name);
    setDescription(category.description ?? '');
  }

  function startEdit() {
    resetForm();
    setExpanded(true);
  }

  async function save() {
    setSaving(true);
    try {
      await apiPatch(`/admin/categories/${category.id}`, { name, description });
      setExpanded(false);
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    try {
      await apiPatch(`/admin/categories/${category.id}`, {
        isActive: !category.isActive,
      });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to update');
    }
  }

  return (
    <>
      <tr className={cn('transition-colors', !category.isActive && 'opacity-60')}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderKanban className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-medium">{category.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {category.description || 'No description'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium',
              category.isActive ? 'text-emerald-600' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                category.isActive
                  ? 'bg-emerald-500'
                  : 'bg-muted-foreground/50',
              )}
            />
            {category.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <Button variant="outline" size="sm" onClick={toggleActive}>
              {category.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => (expanded ? setExpanded(false) : startEdit())}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
              <ChevronDown
                className={cn(
                  'ml-1 h-3.5 w-3.5 transition-transform',
                  expanded && 'rotate-180',
                )}
              />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              title="Delete"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={3} className="bg-muted/20 px-4 py-4">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What this covers"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setExpanded(false);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
