'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getAdminSession, listAdminSessions } from '@/api/admin';
import { Button, Notice, Skeleton, Tabs } from '@/components/ui';
import type { AdminSessionScope, AdminSessionSummary } from '@/types/admin';
import { AdminSessionRow, type RowDetail } from './AdminSessionRow';
import { redirectIfSignedOut } from './redirect-if-signed-out';
import { SavedToast } from './SavedToast';
import { groupByDay, matchesSearch } from './schedule-groups';
import { replaceScheduleParams } from './schedule-url';
import { SessionFormPanel } from './SessionFormPanel';

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; sessions: AdminSessionSummary[] };

const scopeTabs: { value: AdminSessionScope; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

/**
 * /admin lands here: Today pinned first, then the coming days, plus a Past tab. Rows expand inline
 * to the roster. The header's search box (?q=) and "+ New class" (?new=1) reach it through the URL.
 */
export function AdminSchedule() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const editId = searchParams.get('edit');
  const isCreating = searchParams.get('new') !== null;

  const [scope, setScope] = useState<AdminSessionScope>('upcoming');
  const [list, setList] = useState<ListState>({ status: 'loading' });
  // Bumped to refetch the list in the background (after saving) or to retry after an error.
  const [listVersion, setListVersion] = useState(0);
  const [details, setDetails] = useState<Record<string, RowDetail>>({});
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());
  // ?saved=<id> comes from the deep-link form pages: highlight that class and say "Saved".
  const [highlightId, setHighlightId] = useState<string | null>(() => searchParams.get('saved'));
  const [isToastVisible, setIsToastVisible] = useState(() => searchParams.get('saved') !== null);

  // Refetches one class after any action and updates its row. Never throws: a failure shows in the row.
  const loadDetail = useCallback(
    async (id: string) => {
      try {
        const data = await getAdminSession(id);
        setDetails((current) => ({ ...current, [id]: { status: 'ready', data } }));
        setList((current) =>
          current.status === 'ready'
            ? { ...current, sessions: current.sessions.map((item) => (item.id === id ? data.session : item)) }
            : current,
        );
      } catch (error) {
        if (redirectIfSignedOut(error, router)) return;
        setDetails((current) => ({ ...current, [id]: { status: 'error' } }));
      }
    },
    [router],
  );

  useEffect(() => {
    let isCurrent = true;
    listAdminSessions(scope)
      .then((sessions) => isCurrent && setList({ status: 'ready', sessions }))
      .catch((error: unknown) => {
        if (!isCurrent || redirectIfSignedOut(error, router)) return;
        setList({ status: 'error' });
      });
    return () => {
      isCurrent = false;
    };
  }, [scope, listVersion, router]);

  useEffect(() => {
    if (searchParams.get('saved')) replaceScheduleParams({ saved: null });
  }, [searchParams]);

  const hideToast = useCallback(() => setIsToastVisible(false), []);

  function handleScopeChange(next: AdminSessionScope) {
    if (next === scope) return;
    setList({ status: 'loading' });
    setScope(next);
  }

  function handleToggle(id: string) {
    const willExpand = !expandedIds.has(id);
    setExpandedIds((current) => {
      const next = new Set(current);
      if (willExpand) next.add(id);
      else next.delete(id);
      return next;
    });
    // The roster is fetched on the first expand (and again if that failed).
    const detail = details[id];
    if (willExpand && (!detail || detail.status === 'error')) {
      setDetails((current) => ({ ...current, [id]: { status: 'loading' } }));
      void loadDetail(id);
    }
  }

  function closePanel() {
    replaceScheduleParams({ new: null, edit: null });
  }

  function handleSaved(session: AdminSessionSummary) {
    closePanel();
    setHighlightId(session.id);
    setIsToastVisible(true);
    if (details[session.id]) void loadDetail(session.id);
    // A saved class is always upcoming (past classes can't be created or edited).
    if (scope === 'upcoming') {
      setListVersion((version) => version + 1);
    } else {
      setList({ status: 'loading' });
      setScope('upcoming');
    }
  }

  const sessions = list.status === 'ready' ? list.sessions : [];
  const editing = editId ? sessions.find((session) => session.id === editId) : undefined;
  const isPanelOpen = isCreating || editing !== undefined;

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-ink-900">Schedule</h1>
      <div className="mt-4">
        <Tabs label="Schedule" tabs={scopeTabs} value={scope} onChange={handleScopeChange}>
          {list.status === 'loading' && <ScheduleSkeleton />}

          {list.status === 'error' && (
            <div className="flex flex-col items-start gap-3">
              <Notice tone="danger">We couldn&apos;t load the schedule. Check your connection and try again.</Notice>
              <Button
                variant="secondary"
                onClick={() => {
                  setList({ status: 'loading' });
                  setListVersion((version) => version + 1);
                }}
              >
                Try again
              </Button>
            </div>
          )}

          {list.status === 'ready' && (
            <ScheduleGroups
              sessions={sessions}
              scope={scope}
              query={query}
              details={details}
              expandedIds={expandedIds}
              highlightId={highlightId}
              onToggle={handleToggle}
              onChanged={loadDetail}
              onEdit={(id) => replaceScheduleParams({ edit: id, new: null })}
            />
          )}
        </Tabs>
      </div>

      {isPanelOpen && (
        <SessionFormPanel key={editing?.id ?? 'new'} session={editing} onSaved={handleSaved} onClose={closePanel} />
      )}
      <SavedToast isVisible={isToastVisible} onDismiss={hideToast} />
    </>
  );
}

interface ScheduleGroupsProps {
  sessions: AdminSessionSummary[];
  scope: AdminSessionScope;
  query: string;
  details: Record<string, RowDetail>;
  expandedIds: ReadonlySet<string>;
  highlightId: string | null;
  onToggle: (id: string) => void;
  onChanged: (id: string) => Promise<void>;
  onEdit: (id: string) => void;
}

function ScheduleGroups({
  sessions,
  scope,
  query,
  details,
  expandedIds,
  highlightId,
  onToggle,
  onChanged,
  onEdit,
}: ScheduleGroupsProps) {
  const isSearching = query.trim() !== '';
  const visible = sessions.filter((session) => {
    const detail = details[session.id];
    return matchesSearch(session, detail?.status === 'ready' ? detail.data : undefined, query);
  });

  if (sessions.length === 0) {
    return (
      <p className="rounded-control border border-dashed border-ink-300 bg-white p-6 text-center text-ink-600">
        {scope === 'upcoming' ? 'No upcoming classes. Use "+ New class" to add one.' : 'No past classes yet.'}
      </p>
    );
  }

  // Today stays pinned (even when empty) unless a search is narrowing the list.
  const groups = groupByDay(visible, scope === 'upcoming' && !isSearching);

  return (
    <div className="flex flex-col gap-6">
      {isSearching && (
        <p role="status" className="text-sm text-ink-600">
          {visible.length === 0 ? `No classes match "${query.trim()}".` : `${visible.length} matching ${visible.length === 1 ? 'class' : 'classes'}.`}{' '}
          Member names are searched in rosters you&apos;ve opened.
        </p>
      )}
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          {/* Sticky below the admin header: 7rem tall on mobile, 4rem from md. */}
          <h2 className="sticky top-28 z-10 -mx-1 bg-ink-50/95 px-1 py-2 text-sm font-bold text-ink-700 backdrop-blur-sm md:top-16">
            {group.label}
          </h2>
          {group.sessions.length === 0 ? (
            <p className="text-sm text-ink-500">No classes left today.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {group.sessions.map((session) => (
                <AdminSessionRow
                  key={session.id}
                  session={session}
                  detail={details[session.id]}
                  isExpanded={expandedIds.has(session.id)}
                  isHighlighted={session.id === highlightId}
                  onToggle={() => onToggle(session.id)}
                  onChanged={() => onChanged(session.id)}
                  onEdit={scope === 'upcoming' ? () => onEdit(session.id) : undefined}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading schedule" className="flex flex-col gap-2">
      <Skeleton className="h-5 w-20" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-36 w-full md:h-20" shape="block" />
      ))}
    </div>
  );
}
