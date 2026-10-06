'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Switch } from '../ui/switch';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FriendAvatar } from '../friends/FriendAvatar';
import { friendsClient, type FriendSettingsPatch } from '../../lib/friends/client';
import type { BlockedUser, FriendSettings } from '../../lib/friends/types';
import {
  AUTO_SHARE_COPY,
  AUTO_SHARE_FOOTNOTE,
  BLOCKED_COPY,
  DISCOVERABLE_COPY,
  FORGET_CONTACTS_COPY,
  PUBLIC_POSTS_COPY,
} from './vriendenkringCopy';

/**
 * The Vriendenkring controls on /instellingen, mirroring the app's section:
 * findability, the three things that may be published, the blocked list, and
 * throwing away the contact fingerprints.
 *
 * Built on ProgressTreeSection's row shape and toggle so the switches line up
 * with every other control on the page - the panel is the page's panel, not
 * its own thing. All copy lives in ./vriendenkringCopy so the privacy promise
 * can be read (and tested) as one block.
 *
 * Each switch writes its own named path through `PATCH /api/v1/friends/settings`
 * and takes the server's answer as the new truth; a refused write is put back,
 * so a toggle never shows a state the server does not hold.
 */

/** The design's toggle. Copied from ProgressTreeSection - same panel, same control. */
const TOGGLE =
  'h-[27px] w-[46px] border-0 px-[3px] data-[state=checked]:bg-teal data-[state=unchecked]:bg-line-strong focus-visible:ring-teal focus-visible:ring-offset-0 [&>span]:h-[21px] [&>span]:w-[21px] [&>span]:bg-white [&>span]:shadow-none [&>span[data-state=checked]]:translate-x-[19px]';

/** One row of the settings page, repeated here so the columns line up. */
const ROW =
  'flex flex-col gap-2.5 py-[14px] first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8';

export default function VriendenkringSection() {
  const [settings, setSettings] = useState<FriendSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState('');
  const [confirmForget, setConfirmForget] = useState(false);
  const [forgetting, setForgetting] = useState(false);
  const [forgotten, setForgotten] = useState(false);

  const load = useCallback(async () => {
    const result = await friendsClient.settings();
    if (result.ok) {
      setSettings(result.data);
      setError('');
    } else if (result.kind === 'unauthorized') {
      setSignedOut(true);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Flip one switch. The control answers at once and is put back if the server
   * refuses, because a settings toggle that waits on a round trip reads as
   * broken; `patch` sends only the path that changed.
   */
  async function write(patch: FriendSettingsPatch, optimistic: FriendSettings) {
    const previous = settings;
    setSettings(optimistic);
    setError('');
    const result = await friendsClient.updateSettings(patch);
    if (result.ok) setSettings(result.data);
    else {
      setSettings(previous);
      setError(result.message);
    }
  }

  function setDiscoverable(value: boolean) {
    if (!settings) return;
    void write({ discoverable: value }, { ...settings, discoverable: value });
  }

  function setPublicPosts(value: boolean) {
    if (!settings) return;
    void write({ publicPosts: value }, { ...settings, publicPosts: value });
  }

  function setAutoShare(key: keyof FriendSettings['autoShare'], value: boolean) {
    if (!settings) return;
    const autoShare = { ...settings.autoShare, [key]: value };
    // Only the one key goes over the wire. The service `$set`s the named path,
    // so sending all three would be a chance to overwrite a change made on the
    // phone a second ago for nothing.
    void write({ autoShare: { [key]: value } }, { ...settings, autoShare });
  }

  async function forgetContacts() {
    setForgetting(true);
    const result = await friendsClient.forgetContacts();
    setForgetting(false);
    setConfirmForget(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setForgotten(true);
    // The server decides what `hasContactHashes` is now; re-read rather than
    // guess, so the row below the switch cannot claim a state that is not true.
    await load();
  }

  async function unblock(userId: string) {
    const result = await friendsClient.unblock(userId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSettings((current) =>
      current ? { ...current, blocked: (current.blocked ?? []).filter((row) => row.userId !== userId) } : current,
    );
  }

  if (signedOut) {
    return (
      <p className="py-[14px] text-[13px] leading-relaxed text-ink-muted">
        Log in om je vriendenkring in te stellen.
      </p>
    );
  }

  const busy = loading || !settings;
  // Tolerated as absent: the field is part of the contract, but a deployed API
  // that predates it answers without one.
  const blocked: BlockedUser[] = settings?.blocked ?? [];

  return (
    <>
      <div className="divide-y divide-line-soft">
        <Row
          id="instelling-vindbaar"
          label={DISCOVERABLE_COPY.label}
          hint={DISCOVERABLE_COPY.hint}
          checked={Boolean(settings?.discoverable)}
          disabled={busy}
          onChange={setDiscoverable}
        />
        {/* Absent reads as off: a deployed API that predates the switch, or a
            profile written before it existed, must not look like permission to
            publish outside the kring. */}
        <Row
          id="instelling-openbaar-delen"
          label={PUBLIC_POSTS_COPY.label}
          hint={PUBLIC_POSTS_COPY.hint}
          checked={settings?.publicPosts === true}
          disabled={busy}
          onChange={setPublicPosts}
        />
        <Row
          id="instelling-mijlpalen-delen"
          label={AUTO_SHARE_COPY.milestones.label}
          hint={AUTO_SHARE_COPY.milestones.hint}
          checked={settings ? settings.autoShare.milestones : true}
          disabled={busy}
          onChange={(value) => setAutoShare('milestones', value)}
        />
        <Row
          id="instelling-tekst-delen"
          label={AUTO_SHARE_COPY.verses.label}
          hint={AUTO_SHARE_COPY.verses.hint}
          checked={Boolean(settings?.autoShare.verses)}
          disabled={busy}
          onChange={(value) => setAutoShare('verses', value)}
        />
        <Row
          id="instelling-notities-delen"
          label={AUTO_SHARE_COPY.notes.label}
          hint={AUTO_SHARE_COPY.notes.hint}
          checked={Boolean(settings?.autoShare.notes)}
          disabled={busy}
          onChange={(value) => setAutoShare('notes', value)}
        />

        {/* Not a switch: throwing the fingerprints away is a one-way action, and
            a toggle would suggest it can be slid back. */}
        <div id="instelling-contacten-vergeten" className={`${ROW} scroll-mt-6`}>
          <div className="min-w-0 sm:max-w-[26rem]">
            <p className="text-[14.5px] text-ink">{FORGET_CONTACTS_COPY.label}</p>
            <p className="mt-[3px] text-[12px] leading-relaxed text-ink-faint">{FORGET_CONTACTS_COPY.hint}</p>
            {forgotten && (
              <p role="status" className="mt-[6px] text-[12px] font-semibold text-teal dark:text-teal-400">
                {FORGET_CONTACTS_COPY.done}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setConfirmForget(true)}
              disabled={busy || !settings?.hasContactHashes}
              className="flex h-9 items-center rounded-[9px] border border-line bg-surface px-[14px] text-[13px] font-semibold text-ink-body transition-colors hover:bg-line-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {FORGET_CONTACTS_COPY.action}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 border-t border-line-soft pt-4 text-[12px] leading-relaxed text-ink-muted">
        {AUTO_SHARE_FOOTNOTE}
      </p>

      {/* The blocked list. Hidden entirely when it is empty, which is nearly
          always: an empty "Geblokkeerd" heading on a settings page reads as a
          feature the reader has to think about. */}
      {blocked.length > 0 && (
        <div className="mt-4 border-t border-line-soft pt-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">{BLOCKED_COPY.heading}</h3>
          <p className="mt-[3px] text-[12px] leading-relaxed text-ink-faint">{BLOCKED_COPY.hint}</p>
          <ul className="mt-2 divide-y divide-line-soft">
            {blocked.map((person) => (
              <li key={person.userId} className="flex items-center gap-3 py-[10px]">
                <FriendAvatar name={person.name} image={person.image} size={32} />
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{person.name || 'Iemand'}</span>
                <button
                  type="button"
                  onClick={() => void unblock(person.userId)}
                  className="flex h-8 items-center rounded-[9px] border border-line bg-surface px-3 text-[12.5px] font-semibold text-ink-body transition-colors hover:bg-line-soft"
                >
                  {BLOCKED_COPY.unblock}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[12.5px] leading-relaxed text-amber-700 dark:text-amber-400">
          {error}
        </p>
      )}

      <div className="mt-4 border-t border-line-soft pt-4">
        <Link
          href="/vriendenkring"
          className="inline-block text-[13px] font-semibold text-teal dark:text-teal-400 no-underline underline-offset-4 transition-colors hover:underline"
        >
          Naar je vriendenkring →
        </Link>
      </div>

      <ConfirmDialog
        open={confirmForget}
        onCancel={() => setConfirmForget(false)}
        onConfirm={() => void forgetContacts()}
        title={FORGET_CONTACTS_COPY.confirmTitle}
        description={FORGET_CONTACTS_COPY.confirmBody}
        confirmLabel={FORGET_CONTACTS_COPY.confirmAction}
        pendingLabel="Verwijderen..."
        pending={forgetting}
        destructive
      />
    </>
  );
}

function Row({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  /** An `instelling-*` anchor for deep links from the command palette. */
  id?: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div id={id} className={`${ROW} scroll-mt-6`}>
      <div className="min-w-0 sm:max-w-[26rem]">
        <p className="text-[14.5px] text-ink">{label}</p>
        <p className="mt-[3px] text-[12px] leading-relaxed text-ink-faint">{hint}</p>
      </div>
      <div className="flex flex-shrink-0 items-center sm:justify-end">
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          aria-label={label}
          className={TOGGLE}
        />
      </div>
    </div>
  );
}
