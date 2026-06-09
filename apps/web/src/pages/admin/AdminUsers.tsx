import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users as UsersIcon,
  UserX,
} from 'lucide-react';
import {
  CategoryDto,
  DepartmentDto,
  Role,
  ROLE_LABELS,
  UserDto,
} from '@desk2desk/shared';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type RoleFilter = 'ALL' | Role;

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<UserDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  function load() {
    apiGet<UserDto[]>('/admin/users').then(setUsers);
  }
  useEffect(() => {
    load();
    apiGet<CategoryDto[]>('/admin/categories').then(setCategories);
    apiGet<DepartmentDto[]>('/admin/departments').then(setDepartments);
  }, []);

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    setError(null);
    try {
      await apiDelete(`/admin/users/${toDelete.id}`);
      setToDelete(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
      setToDelete(null);
    } finally {
      setBusy(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: users.length,
      providers: users.filter((u) => u.isProvider).length,
      admins: users.filter((u) => u.role === Role.ADMIN).length,
      inactive: users.filter((u) => !u.isActive).length,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.id.toLowerCase().includes(q)) {
        return false;
      }
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (deptFilter !== 'ALL' && String(u.department?.id ?? '') !== deptFilter) {
        return false;
      }
      return true;
    });
  }, [users, query, roleFilter, deptFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff, roles, and which categories each supporter can handle.
          </p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>+ New user</Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat icon={UsersIcon} label="Total" value={stats.total} brand />
        <SummaryStat icon={UserCog} label="Providers" value={stats.providers} />
        <SummaryStat icon={ShieldCheck} label="Admins" value={stats.admins} />
        <SummaryStat icon={UserX} label="Inactive" value={stats.inactive} />
      </div>

      {creating && (
        <CreateUser
          departments={departments}
          categories={categories}
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
              placeholder="Search by name or employee ID…"
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              {Object.values(Role).map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 font-medium">Role &amp; access</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    {users.length === 0
                      ? 'No users yet.'
                      : 'No users match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    categories={categories}
                    departments={departments}
                    onChanged={load}
                    onDelete={() => setToDelete(u)}
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
        message="Users linked to existing requests can't be deleted — disable the account instead. This cannot be undone."
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  brand,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: number;
  brand?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            brand
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-semibold tabular-nums leading-none">
            {value}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function Avatar({ name, muted }: { name: string; muted?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        muted
          ? 'bg-muted text-muted-foreground'
          : 'bg-primary/10 text-primary',
      )}
    >
      {initials(name)}
    </div>
  );
}

function CreateUser({
  departments,
  categories,
  onCreated,
  onCancel,
  onError,
}: {
  departments: DepartmentDto[];
  categories: CategoryDto[];
  onCreated: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.USER);
  const [isProvider, setIsProvider] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [catIds, setCatIds] = useState<number[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiPost('/admin/users', {
        id: employeeId.trim(),
        name,
        password,
        role,
        isProvider,
        departmentId: departmentId ? Number(departmentId) : undefined,
        categoryIds: isProvider ? catIds : [],
      });
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to create user');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New user</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                autoCapitalize="none"
                placeholder="e.g. 005019"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Role).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={isProvider}
              onChange={(e) => setIsProvider(e.target.checked)}
            />
            Can provide support (provider)
          </label>

          {isProvider && (
            <div className="space-y-2">
              <Label>Service categories</Label>
              <CategoryChecklist
                categories={categories}
                selected={catIds}
                onChange={setCatIds}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Create user</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UserRow({
  user,
  categories,
  departments,
  onChanged,
  onDelete,
  onError,
}: {
  user: UserDto;
  categories: CategoryDto[];
  departments: DepartmentDto[];
  onChanged: () => void;
  onDelete: () => void;
  onError: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<number[]>(
    (user.serviceCategories ?? []).map((c) => c.id),
  );
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<Role>(user.role);
  const [isProvider, setIsProvider] = useState(user.isProvider);
  const [departmentId, setDepartmentId] = useState(
    user.department ? String(user.department.id) : '',
  );
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const serviceCats = user.serviceCategories ?? [];

  function resetForm() {
    setName(user.name);
    setRole(user.role);
    setIsProvider(user.isProvider);
    setDepartmentId(user.department ? String(user.department.id) : '');
    setSelected(serviceCats.map((c) => c.id));
    setPassword('');
  }

  function startEdit() {
    resetForm();
    setExpanded(true);
  }

  async function save() {
    setSaving(true);
    try {
      await apiPatch(`/admin/users/${user.id}`, {
        name,
        role,
        isProvider,
        departmentId: departmentId ? Number(departmentId) : undefined,
        ...(password ? { password } : {}),
      });
      if (isProvider) {
        await apiPut(`/admin/users/${user.id}/service-categories`, {
          categoryIds: selected,
        });
      }
      setPassword('');
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
      await apiPatch(`/admin/users/${user.id}`, { isActive: !user.isActive });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to update');
    }
  }

  return (
    <>
      <tr className={cn('transition-colors', !user.isActive && 'opacity-60')}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="relative">
              <Avatar name={user.name} muted={!user.isActive} />
              <span
                title={user.isActive ? 'Active' : 'Inactive'}
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
                  user.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/50',
                )}
              />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{user.name}</span>
                {!user.isActive && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Inactive
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">ID {user.id}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {user.department?.name ?? '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Badge variant={user.role === Role.ADMIN ? 'default' : 'secondary'}>
              {ROLE_LABELS[user.role]}
            </Badge>
            {user.isProvider && (
              <span
                title={`Provider · ${serviceCats.length} service categor${serviceCats.length === 1 ? 'y' : 'ies'}`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
              >
                <UserCog className="h-3.5 w-3.5" />
                Provider
                <span className="tabular-nums">· {serviceCats.length}</span>
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
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
          <td colSpan={4} className="bg-muted/20 px-4 py-4">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Department</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="No department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Role).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reset password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep"
                    className="h-9"
                  />
                </div>
              </div>

              <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isProvider}
                  onChange={(e) => setIsProvider(e.target.checked)}
                />
                Can provide support (provider)
              </label>

              {isProvider && (
                <div className="space-y-2">
                  <Label className="text-xs">Service categories</Label>
                  <CategoryChecklist
                    categories={categories}
                    selected={selected}
                    onChange={setSelected}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={toggleActive}>
                  {user.isActive ? 'Disable account' : 'Enable account'}
                </Button>
                <div className="flex gap-2">
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
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function CategoryChecklist({
  categories,
  selected,
  onChange,
}: {
  categories: CategoryDto[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {categories.map((c) => {
        const checked = selected.includes(c.id);
        return (
          <label
            key={c.id}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors',
              checked
                ? 'border-primary/40 bg-primary/5'
                : 'hover:bg-muted/50',
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(c.id)}
            />
            {c.name}
          </label>
        );
      })}
    </div>
  );
}
