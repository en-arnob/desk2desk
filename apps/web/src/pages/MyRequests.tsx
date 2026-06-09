import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RequestDto } from '@desk2desk/shared';
import { apiGet } from '@/lib/api';
import { RequestRow } from '@/components/RequestRow';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export function MyRequestsPage() {
  const [requests, setRequests] = useState<RequestDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<RequestDto[]>('/requests/mine')
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Requests</h1>
          <p className="text-sm text-muted-foreground">
            Support you have asked for.
          </p>
        </div>
        <Button asChild>
          <Link to="/requests/new">
            <PlusCircle className="h-4 w-4" /> New Request
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          You haven&apos;t raised any requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
