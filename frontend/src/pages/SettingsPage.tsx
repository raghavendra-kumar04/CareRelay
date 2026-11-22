import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import PatientSelectorBar from '../components/family/PatientSelectorBar';
import {
  createFamily,
  getApiErrorCode,
  getApiErrorMessage,
  getFamily,
  getMyFamilies,
  regenerateInvite,
  removeMember,
} from '../lib/familyApi';
import { useAuthStore } from '../store/authStore';
import { useFamilyStore } from '../store/familyStore';
import type { FamilyDetail, FamilyMember, FamilyRole, FamilySummary } from '../types';

const NAME_MAX = 100;

function RoleBadge({ role }: { role: FamilyRole }) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`rounded-input px-2 py-0.5 text-xs font-medium ${
        isAdmin ? 'bg-primary text-white' : 'border border-border bg-background text-text-secondary'
      }`}
    >
      {isAdmin ? 'Admin' : 'Member'}
    </span>
  );
}

export default function SettingsPage() {
  const currentUserId = useAuthStore((s) => s.user?._id ?? null);
  const { activeFamilyId, setActiveFamilyId } = useFamilyStore();

  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [selectedFid, setSelectedFid] = useState<string | null>(activeFamilyId || null);
  const [detail, setDetail] = useState<FamilyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const isAdmin = detail?.role === 'admin';
  const inviteToken = detail?.family.inviteToken;
  const inviteUrl = inviteToken ? `${window.location.origin}/invite/${inviteToken}` : null;
  const inviteExpiresAt = detail?.family.inviteTokenExpiresAt ?? null;

  const loadDetail = useCallback(async (fid: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      setDetail(await getFamily(fid));
    } catch (err) {
      setDetailError(getApiErrorMessage(err, 'Could not load this family.'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadFamilies = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const { families: list } = await getMyFamilies();
      setFamilies(list);
      if (list.length > 0 && !selectedFid) {
        const toSelect = activeFamilyId && list.some((f) => f.family._id === activeFamilyId)
          ? activeFamilyId
          : list[0].family._id;
        setSelectedFid(toSelect);
        setActiveFamilyId(toSelect);
        void loadDetail(toSelect);
      }
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not load your families.'));
    } finally {
      setListLoading(false);
    }
  }, [loadDetail, selectedFid, activeFamilyId, setActiveFamilyId]);

  useEffect(() => {
    void loadFamilies();
  }, [loadFamilies]);

  const handleSelect = (fid: string) => {
    setSelectedFid(fid);
    setActiveFamilyId(fid);
    setDetail(null);
    setInviteError(null);
    setRemoveError(null);
    void loadDetail(fid);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newName.trim();
    if (name.length < 1 || name.length > NAME_MAX) {
      setCreateError(`Family name must be 1-${NAME_MAX} characters.`);
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const { family } = await createFamily(name);
      setNewName('');
      toast.success('Family created');
      await loadFamilies();
      handleSelect(family._id);
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Could not create the family.'));
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!detail) return;
    const fid = detail.family._id;
    setInviteBusy(true);
    setInviteError(null);
    try {
      const info = await regenerateInvite(fid);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              family: {
                ...prev.family,
                inviteToken: info.inviteToken,
                inviteTokenExpiresAt: info.inviteTokenExpiresAt,
              },
            }
          : prev,
      );
    } catch (err) {
      setInviteError(getApiErrorMessage(err, 'Could not generate an invite link.'));
    } finally {
      setInviteBusy(false);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy the invite link');
    }
  };

  const handleRemove = async (member: FamilyMember) => {
    if (!detail || !member.user) return;
    if (!window.confirm('Remove this member from the family?')) return;
    const fid = detail.family._id;
    const userId = member.user._id;
    setRemovingId(userId);
    setRemoveError(null);
    try {
      await removeMember(fid, userId);
      await loadDetail(fid);
    } catch (err) {
      const code = getApiErrorCode(err);
      const message = getApiErrorMessage(err, 'Could not remove this member.');
      if (code === 'LAST_ADMIN' || code === 'INVALID_MEMBERSHIP_REMOVAL') {
        toast.error(message);
      }
      setRemoveError(message);
    } finally {
      setRemovingId(null);
    }
  };

  const spinner = (
    <div className="flex justify-center py-6">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">Family settings</h1>

        <section className="rounded-card bg-surface p-6 shadow-card">
          <h2 className="mb-3 text-lg font-medium text-text-primary">Create a family</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <label htmlFor="family-name" className="sr-only">
                Family name
              </label>
              <input
                id="family-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Family name"
                className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-text-secondary/50 transition-all duration-200 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
              />
              {createError && <p className="mt-1 text-sm text-error">{createError}</p>}
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? 'Working...' : 'Create family'}
            </button>
          </form>
        </section>

        <section className="rounded-card bg-surface p-6 shadow-card">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-text-primary">Your families</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Select a family to view their details, manage members, and configure invite links.
            </p>
          </div>
          {listLoading ? (
            spinner
          ) : listError ? (
            <div className="space-y-3">
              <p className="text-sm text-error">{listError}</p>
              <button
                type="button"
                onClick={() => void loadFamilies()}
                className="rounded-input border border-border bg-background px-4 py-2 text-sm text-text-primary"
              >
                Retry
              </button>
            </div>
          ) : families.length === 0 ? (
            <p className="text-text-secondary">You are not in any family yet</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-3">
              {families.map(({ family, role }) => {
                const selected = selectedFid === family._id;
                return (
                  <li key={family._id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(family._id)}
                      aria-pressed={selected}
                      className={`flex w-full items-center justify-between gap-3 rounded-card border bg-background p-4 text-left shadow-card transition ${
                        selected
                          ? 'border-primary ring-2 ring-primary/30 bg-primary/10 shadow-sm'
                          : 'border-border hover:border-primary/40 hover:bg-surface/50'
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-medium text-text-primary">{family.name}</span>
                        <span className="text-xs text-text-secondary mt-0.5">
                          {selected ? 'Currently viewing details' : 'Click to view details'}
                        </span>
                      </div>
                      <RoleBadge role={role} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {!selectedFid && families.length > 0 && !listLoading && (
          <section className="rounded-card border border-dashed border-border bg-surface p-8 text-center shadow-card">
            <p className="text-base font-medium text-text-primary">No family selected</p>
            <p className="mt-1 text-sm text-text-secondary">
              Please select a family above to view their details, members, and workspace settings.
            </p>
          </section>
        )}

        {selectedFid && detailLoading && !detail && (
          <section className="rounded-card bg-surface p-6 shadow-card">{spinner}</section>
        )}

        {selectedFid && !detail && !detailLoading && detailError && (
          <section className="space-y-3 rounded-card bg-surface p-6 shadow-card">
            <p className="text-sm text-error">{detailError}</p>
            <button
              type="button"
              onClick={() => void loadDetail(selectedFid)}
              className="rounded-input border border-border bg-background px-4 py-2 text-sm text-text-primary"
            >
              Retry
            </button>
          </section>
        )}

        {detail && (
          <section className="space-y-6 rounded-card bg-surface p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-text-primary">{detail.family.name}</h2>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span>Your role:</span>
                <RoleBadge role={detail.role} />
              </div>
            </div>

            {/* Patients / Care Recipients Management */}
            <div>
              <PatientSelectorBar family={detail.family} isAdmin={isAdmin} />
            </div>

            {isAdmin && (
              <div className="space-y-3 rounded-card border border-border bg-background p-4">
                <h3 className="font-medium text-text-primary">Invite link</h3>
                <button
                  type="button"
                  onClick={() => void handleRegenerate()}
                  disabled={inviteBusy}
                  className="rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {inviteBusy
                    ? 'Working...'
                    : inviteToken
                      ? 'Regenerate invite link'
                      : 'Generate invite link'}
                </button>
                {inviteError && <p className="text-sm text-error">{inviteError}</p>}
                {inviteUrl && (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        readOnly
                        value={inviteUrl}
                        aria-label="Invite link"
                        className="w-full rounded-lg border border-border/80 bg-surface px-3.5 py-2 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] font-mono transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCopy(inviteUrl)}
                        className="rounded-input border border-border bg-surface px-4 py-2 text-sm text-text-primary"
                      >
                        Copy link
                      </button>
                    </div>
                    {inviteExpiresAt && (
                      <p className="text-sm text-text-secondary">
                        Expires {format(new Date(inviteExpiresAt), 'PP')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-medium text-text-primary">Members</h3>
              {removeError && <p className="text-sm text-error">{removeError}</p>}
              <ul className="divide-y divide-border">
                {detail.members.map((member) => {
                  if (!member.user) return null;
                  const isSelf = member.user._id === currentUserId;
                  const userId = member.user._id;
                  return (
                    <li
                      key={member.membershipId}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary">
                          {member.user.name}
                          {isSelf && <span className="ml-1 text-text-secondary">(you)</span>}
                        </p>
                        <p className="truncate text-sm text-text-secondary">{member.user.email}</p>
                        <p className="text-xs text-text-secondary">
                          Joined {format(new Date(member.joinedAt), 'PP')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <RoleBadge role={member.role} />
                        {isAdmin && !isSelf && (
                          <button
                            type="button"
                            onClick={() => void handleRemove(member)}
                            disabled={removingId !== null}
                            className="text-sm text-error hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {removingId === userId ? 'Working...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
