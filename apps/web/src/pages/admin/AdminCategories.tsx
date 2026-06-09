import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { CategoryDto } from '@desk2desk/shared';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [toDelete, setToDelete] = useState<CategoryDto | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    apiGet<CategoryDto[]>('/admin/categories').then(setCategories);
  }
  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost('/admin/categories', { name, description });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  async function saveEdit(id: number) {
    try {
      await apiPatch(`/admin/categories/${id}`, {
        name: editName,
        description: editDesc,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  async function toggle(c: CategoryDto) {
    await apiPatch(`/admin/categories/${c.id}`, { isActive: !c.isActive });
    load();
  }

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

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Support Categories</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        The kinds of support employees can request. Supporters are granted
        per-category privileges on the Users page.
      </p>

      <form onSubmit={add} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            required
          />
          <Button type="submit">Add</Button>
        </div>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
        />
      </form>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {categories.map((c) => (
          <Card key={c.id}>
            <CardContent className="py-3">
              {editingId === c.id ? (
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    autoFocus
                  />
                  <Input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(c.id)}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      {c.name}
                      {!c.isActive && (
                        <Badge variant="secondary">inactive</Badge>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-sm text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggle(c)}
                    >
                      {c.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                        setEditDesc(c.description ?? '');
                      }}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setToDelete(c)}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
