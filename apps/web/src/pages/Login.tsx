import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PremierMark } from '@/components/Logo';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(employeeId, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-backdrop flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm overflow-hidden shadow-xl">
        {/* Brand accent bar */}
        <div className="h-1.5 w-full bg-primary" />
        <CardContent className="p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <PremierMark className="h-12 w-12" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              <span className="text-primary">Desk</span>2Desk
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Premier Cement · Internal Support Desk
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. 005019"
                autoCapitalize="none"
                autoCorrect="off"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Developed &amp; Maintained by Premier Cement IT
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
