/**
 * Cloud Codex — Admin Dashboard
 *
 * Dashboard-style admin console with sidebar navigation and
 * management panels for workspaces, users, squads, and live activity.
 *
 * All Rights Reserved to Cloud City Computing, LLC 2026
 * https://cloudcitycomputing.com
 */

import { useState, useEffect, useCallback } from 'react';
import StdLayout from '../page_layouts/Std_Layout';
import {
  fetchAdminSettings,
  updateAdminSettings,
  fetchAdminStatus,
  fetchAdminStats,
  fetchAdminWorkspaces,
  createAdminWorkspace,
  deleteAdminWorkspace,
  fetchAdminUsers,
  deleteAdminUser,
  resetAdminUserPassword,
  fetchAdminUserPermissions,
  updateAdminUserPermissions,
  updateAdminUserAdmin,
  fetchAdminUserInvitations,
  createAdminUserInvitation,
  deleteAdminUserInvitation,
  fetchAdminGlobalInvitations,
  fetchAdminGlobalInvitation,
  createAdminGlobalInvitation,
  revokeAdminGlobalInvitation,
  fetchAdminSquads,
  fetchAdminSquadMembers,
  updateAdminSquadMember,
  removeAdminSquadMember,
  fetchAdminPresence,
  showModal,
  destroyModal,
  timeAgo,
} from '../util';
import { showToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { toastError } from '../components/Toast';

// ─── Overview Panel ─────────────────────────────────────────

function OverviewPanel() {
  const [stats, setStats] = useState(null);
  const [presence, setPresence] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchAdminStats();
      setStats(res.stats);
    } catch { /* ignore */ }
  }, []);

  const loadPresence = useCallback(async () => {
    try {
      const res = await fetchAdminPresence();
      setPresence(res);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadStats();
    loadPresence();
    const interval = setInterval(() => { loadStats(); loadPresence(); }, 15000);
    return () => clearInterval(interval);
  }, [loadStats, loadPresence]);

  const statItems = stats ? [
    { label: 'Users', value: stats.userCount, icon: '👤' },
    { label: 'Workspaces', value: stats.workspaceCount, icon: '🏢' },
    { label: 'Squads', value: stats.squadCount, icon: '👥' },
    { label: 'Archives', value: stats.archiveCount, icon: '📁' },
    { label: 'Logs', value: stats.logCount, icon: '📄' },
    { label: 'Pending Invites', value: stats.pendingInviteCount, icon: '✉' },
    { label: 'Online Now', value: stats.onlineUserCount ?? 0, icon: '🟢' },
    { label: 'Active Docs', value: stats.activeDocCount ?? 0, icon: '✏' },
  ] : [];

  return (
    <div className="admin-overview">
      {stats && (
        <div className="admin-stats">
          {statItems.map(item => (
            <div key={item.label} className="admin-stat-card">
              <span className="admin-stat-card__icon">{item.icon}</span>
              <span className="admin-stat-card__value">{item.value}</span>
              <span className="admin-stat-card__label">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h3>Live Activity</h3>
          <button className="btn btn-ghost btn-sm" onClick={loadPresence}>↻ Refresh</button>
        </div>
        {!presence ? (
          <p className="text-muted">Loading…</p>
        ) : presence.onlineUsers.length === 0 ? (
          <p className="text-muted">No users currently online.</p>
        ) : (
          <div className="admin-activity-list">
            {presence.onlineUsers.map(u => (
              <div key={u.id} className="admin-activity-item">
                <div className="admin-activity-item__user">
                  {u.avatar_url && <img src={u.avatar_url} alt="" className="admin-user-avatar" />}
                  <span className="admin-activity-item__name">{u.name}</span>
                  <span className="admin-online-dot" />
                </div>
                <div className="admin-activity-item__docs">
                  {u.editing.map((doc, i) => (
                    <span key={i} className="admin-activity-doc">
                      {doc.archive_name} / {doc.title}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────

function NewWorkspaceModal({ onCreated }) {
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [squadName, setSquadName] = useState('');
  const [archiveName, setArchiveName] = useState('');
  const [addSquad, setAddSquad] = useState(false);
  const [addArchive, setAddArchive] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) { setError('Workspace name is required.'); return; }
    if (!ownerEmail.trim()) { setError('Owner email is required.'); return; }
    try {
      await createAdminWorkspace(name, ownerEmail, {
        squadName: addSquad ? squadName.trim() || undefined : undefined,
        archiveName: addSquad && addArchive ? archiveName.trim() || undefined : undefined,
      });
      destroyModal();
      onCreated?.();
    } catch (e) {
      setError(e.body?.message ?? 'Error creating workspace.');
    }
  };

  return (
    <div className="modal-content">
      <span className="close-button" onClick={destroyModal}>&times;</span>
      <h2>New Workspace</h2>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-form">
        <label htmlFor="admin-workspace-name">Workspace Name:</label>
        <input id="admin-workspace-name" type="text" value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />

        <label htmlFor="admin-workspace-owner">Owner Email:</label>
        <input id="admin-workspace-owner" type="email" value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="user@example.com" />

        <label className="setup-checkbox">
          <input type="checkbox" checked={addSquad} onChange={(e) => {
            setAddSquad(e.target.checked);
            if (!e.target.checked) setAddArchive(false);
          }} />
          Also create a squad
        </label>
        {addSquad && (
          <>
            <input type="text" value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              placeholder="e.g. Engineering"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
            <label className="setup-checkbox">
              <input type="checkbox" checked={addArchive} onChange={(e) => setAddArchive(e.target.checked)} />
              Also create an archive
            </label>
            {addArchive && (
              <input type="text" value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                placeholder="e.g. Documentation"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
            )}
          </>
        )}

        <button className="btn btn-primary stretched-button" onClick={handleSubmit}>Create</button>
      </div>
    </div>
  );
}

function InviteUserModal({ onInvited }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!email.trim()) { setError('Email address is required.'); return; }
    try {
      const res = await createAdminUserInvitation(email);
      setSuccess(res.message);
      setEmail('');
      onInvited?.();
    } catch (e) {
      setError(e.body?.message ?? 'Error sending invitation.');
    }
  };

  return (
    <div className="modal-content">
      <span className="close-button" onClick={destroyModal}>&times;</span>
      <h2>Invite User</h2>
      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
      <div className="modal-form">
        <label htmlFor="invite-email">Email Address:</label>
        <input id="invite-email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="newuser@example.com" />
        <button className="btn btn-primary stretched-button" onClick={handleSubmit}>Send Invitation</button>
      </div>
    </div>
  );
}

function InviteGlobalModal({ onInvited }) {
  const [expiry, setExpiry] = useState('0');
  const [maxUses, setMaxUses] = useState('0');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    try {
      const res = await createAdminGlobalInvitation(expiry, maxUses);
      setSuccess(res.message + " " + res.code + " | " + res.signupUrl);
      onCreated?.();
    } catch (e) {
      setError(e.body?.message ?? 'Error creating invitation.');
    }
  };

  return (
    <div className="modal-content">
      <span className="close-button" onClick={destroyModal}>&times;</span>
      <h2>Create global invite</h2>
      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
      <div className="modal-form">
          <label htmlFor="expiry">Expiry Time:</label>
          <select className="form-select" id="expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
            <option value="0">Never</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="360">6 hours</option>
            <option value="720">12 hours</option>
            <option value="1440">1 day</option>
            <option value="10080">7 days</option>
          </select>
          <label htmlFor="maxUses">Max Uses:</label>
          <select className="form-select" id="maxUses" value={maxUses} onChange={(e) => setMaxUses(e.target.value)}>
            <option value="0">Unlimited</option>
            <option value="1">1</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        <button className="btn btn-primary stretched-button" onClick={handleSubmit}>Send Invitation</button>
      </div>
    </div>
  );
}

function InvitedUserModal({ onCreated, inviteID }) {
  const [invitation, setInvitation] = useState([]);
  const [invitationUsers, setInvitationUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { dateShorthand: createdAtShorthand, dateLonghand: createdAtLonghand } = timeAgo(invitation.created_at);

  const load = useCallback(async () => {
    try {
      const invitationRes = await fetchAdminGlobalInvitation(inviteID);
      setInvitation(invitationRes.invitation || []);
      setInvitationUsers(invitationRes.tracked_users || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="modal-content">
      <span className="close-button" onClick={destroyModal}>&times;</span>
      <h2 style={{ marginBottom: 0 }}>Users joined via global invite <code>{loading ? ("Loading…") : (invitation.code)}</code></h2>
      <p className="text-muted text-sm" style={{ marginBottom: 10 }}>
        Created at: <span title={createdAtLonghand} style={{ cursor: 'pointer' }}>{createdAtShorthand}</span>
      </p>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : invitationUsers.length === 0 ? (
        <p className="text-muted">No invitations used yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invitationUsers.map(inv => {
                return (
                  <tr key={inv.id}>
                    <td className="">
                        {inv.invited_user_name}
                    </td>
                    <td />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── User Permissions Modal ─────────────────────────────────

function UserPermissionsModal({ user, onUpdated }) {
  const [perms, setPerms] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAdminUserPermissions(user.id)
      .then(res => setPerms(res.permissions))
      .catch(() => setPerms({ create_squad: false, create_archive: false, create_log: true }));
  }, [user.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminUserPermissions(user.id, perms);
      destroyModal();
      onUpdated?.();
    } catch (e) {
      toastError(e.body?.message ?? 'Error saving permissions.');
    }
    setSaving(false);
  };

  if (!perms) return <div className="modal-content"><p className="text-muted">Loading…</p></div>;

  return (
    <div className="modal-content">
      <span className="close-button" onClick={destroyModal}>&times;</span>
      <h2>Permissions — {user.name}</h2>
      <div className="modal-form admin-perms-form">
        <label className="setup-checkbox">
          <input type="checkbox" checked={perms.create_squad}
            onChange={(e) => setPerms(p => ({ ...p, create_squad: e.target.checked }))} />
          Create Squads
        </label>
        <label className="setup-checkbox">
          <input type="checkbox" checked={perms.create_archive}
            onChange={(e) => setPerms(p => ({ ...p, create_archive: e.target.checked }))} />
          Create Archives
        </label>
        <label className="setup-checkbox">
          <input type="checkbox" checked={perms.create_log}
            onChange={(e) => setPerms(p => ({ ...p, create_log: e.target.checked }))} />
          Create Logs
        </label>
        <button className="btn btn-primary stretched-button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
}

// ─── Squad Member Editor Modal ──────────────────────────────

function EditMemberModal({ squadId, member, onUpdated }) {
  const [role, setRole] = useState(member.role);
  const [perms, setPerms] = useState({
    can_read: member.can_read, can_write: member.can_write,
    can_create_log: member.can_create_log, can_create_archive: member.can_create_archive,
    can_manage_members: member.can_manage_members, can_delete_version: member.can_delete_version,
    can_publish: member.can_publish,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setPerms(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminSquadMember(squadId, member.user_id, { role, ...perms });
      destroyModal();
      onUpdated?.();
    } catch (e) {
      toastError(e.body?.message ?? 'Error updating member.');
    }
    setSaving(false);
  };

  const permLabels = [
    ['can_read', 'Read'], ['can_write', 'Write'], ['can_create_log', 'Create Logs'],
    ['can_create_archive', 'Create Archives'], ['can_manage_members', 'Manage Members'],
    ['can_delete_version', 'Delete Versions'], ['can_publish', 'Publish'],
  ];

  return (
    <div className="modal-content">
      <span className="close-button" onClick={destroyModal}>&times;</span>
      <h2>Edit Member — {member.name}</h2>
      <div className="modal-form admin-perms-form">
        <label htmlFor="member-role">Role:</label>
        <select id="member-role" value={role} onChange={(e) => setRole(e.target.value)} className="admin-select">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>

        <div className="admin-perms-grid">
          {permLabels.map(([key, label]) => (
            <label key={key} className="setup-checkbox">
              <input type="checkbox" checked={Boolean(perms[key])} onChange={() => toggle(key)} />
              {label}
            </label>
          ))}
        </div>

        <button className="btn btn-primary stretched-button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Workspaces Panel ─────────────────────────────────────

function WorkspacesPanel() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchAdminWorkspaces();
      setWorkspaces(res.workspaces || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (workspace) => {
    showModal(
      <ConfirmDialog
        title={`Delete "${workspace.name}"?`}
        message="This will permanently delete the workspace and all its squads, archives, and logs."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          await deleteAdminWorkspace(workspace.id);
          destroyModal();
          load();
        }}
      />
    );
  };

  const filtered = filter
    ? workspaces.filter(w => w.name.toLowerCase().includes(filter.toLowerCase()) || w.owner.toLowerCase().includes(filter.toLowerCase()))
    : workspaces;

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h3>Workspaces</h3>
        <div className="admin-panel__actions">
          <input type="text" className="admin-filter-input" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={() => showModal(<NewWorkspaceModal onCreated={load} />, 'modal-md')}>
            + New Workspace
          </button>
        </div>
      </div>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">{filter ? 'No matching workspaces.' : 'No workspaces yet.'}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Owner</th>
                <th>Squads</th>
                <th>Members</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(workspace => {
                const { dateShorthand, dateLonghand } = timeAgo(workspace.created_at);

                return (
                  <tr key={workspace.id}>
                    <td className="admin-cell--name">{workspace.name}</td>
                    <td>{workspace.owner}</td>
                    <td>{workspace.squad_count}</td>
                    <td>{workspace.member_count}</td>
                    <td><span title={dateLonghand} style={{ cursor: 'pointer' }}>{dateShorthand}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(workspace)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Users Panel ────────────────────────────────────────────

function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchAdminUsers();
      setUsers(res.users || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (user) => {
    showModal(
      <ConfirmDialog
        title={`Delete user "${user.name}"?`}
        message="This will permanently delete the user and all their sessions, comments, and data."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          await deleteAdminUser(user.id);
          destroyModal();
          load();
        }}
      />
    );
  };

  const handleSetDefaultPass = (user) => {
    showModal(
      <ConfirmDialog
        title={`Reset user "${user.name}"s password?`}
        message={`This will reset their password to "password" and remove any 2fa method on the account.`}
        confirmLabel="Reset"
        danger
        onConfirm={async () => {
          await resetAdminUserPassword(user.id);
          destroyModal();
          load();
          window.location.reload();
        }}
      />,
    );
  };

  const handleToggleAdmin = async (user) => {
    const newAdmin = !user.is_admin;
    showModal(
      <ConfirmDialog
        title={`${newAdmin ? 'Grant' : 'Revoke'} admin for "${user.name}"?`}
        message={newAdmin ? 'This user will have full platform access.' : 'This user will lose admin privileges.'}
        confirmLabel={newAdmin ? 'Grant Admin' : 'Revoke Admin'}
        danger={!newAdmin}
        onConfirm={async () => {
          await updateAdminUserAdmin(user.id, newAdmin);
          destroyModal();
          load();
        }}
      />
    );
  };

  const filtered = filter
    ? users.filter(u => u.name.toLowerCase().includes(filter.toLowerCase()) || u.email.toLowerCase().includes(filter.toLowerCase()))
    : users;

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h3>Users</h3>
        <div className="admin-panel__actions">
          <input type="text" className="admin-filter-input" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Squads</th>
                <th>Admin</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const { dateShorthand, dateLonghand } = timeAgo(u.created_at);

                return (
                  <tr key={u.id}>
                    <td className="admin-cell--user">
                      {u.avatar_url && <img src={u.avatar_url} alt="" className="admin-user-avatar" />}
                      {u.name}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.squad_count}</td>
                    <td>
                      <button
                        className={`admin-badge ${u.is_admin ? 'admin-badge--admin' : 'admin-badge--user'}`}
                        onClick={() => handleToggleAdmin(u)}
                        title={u.is_admin ? 'Click to revoke admin' : 'Click to grant admin'}
                        >
                        {u.is_admin ? 'Admin' : 'User'}
                      </button>
                    </td>
                    <td><span title={dateLonghand} style={{ cursor: 'pointer' }}>{dateShorthand}</span></td>
                    <td>
                      <div className="admin-cell-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => showModal(<UserPermissionsModal user={u} onUpdated={load} />, 'modal-md')}>
                          Permissions
                        </button>
                        {!u.is_admin && (
                          <>
                            <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(u)}>Delete</button>
                            <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleSetDefaultPass(u)}>Reset Password</button>
                          </>
                        )}
                    </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ settings, onPreviewChange, onSaved }) {
  const getSafeSettings = (s) => ({
    userInvitesEnabled: s.userInvitesEnabled ?? true,
    globalInvitesEnabled: s.globalInvitesEnabled ?? true,
    SMTPEnabled: s.SMTPEnabled ?? true,
    globalSMTPEnabled: s.globalSMTPEnabled ?? true,
  });

  const [form, setForm] = useState(() => getSafeSettings(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setForm(getSafeSettings(settings));
  }, [settings]);

  const handleInviteToggle = (key, value) => {
    const next = {
      ...form,
      [key]: value,
    };

    setForm(next);

    onPreviewChange?.({
      ...settings,
      userInvitesEnabled: next.userInvitesEnabled,
      globalInvitesEnabled: next.globalInvitesEnabled,
    });
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await updateAdminSettings({
        userInvitesEnabled: form.userInvitesEnabled,
        globalInvitesEnabled: form.globalInvitesEnabled,
        SMTPEnabled: form.SMTPEnabled,
      });

      onSaved?.(res.settings);
      showToast('Module settings saved', 'success');
    } catch (e) {
      const message = e.body?.message ?? 'Error saving settings.';
      setError(message);
      showToast(message);
    } finally {
      setSaving(false);
    }
  };

  const invitesDisabled = !form.userInvitesEnabled && !form.globalInvitesEnabled;

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2>Settings</h2>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          Save Settings
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-panel__body">
        <h3>General settings</h3>
        {!form.globalSMTPEnabled && (
          <p className="panel-status error">Failed to connect to SMTP server at startup. Please restart the application & set valid environment SMTP variables to use this feature. All SMTP-based services will be hidden.</p>
        )}
        <label>
          <input
            type="checkbox"
            checked={form.SMTPEnabled}
            onChange={(e) =>
              updateField('SMTPEnabled', e.target.checked)
            }
            disabled={!form.globalSMTPEnabled}
          />
          {' '}Enable SMTP
        </label>
        <p className="text-muted">When disabled, any services utilising the SMTP service will be hidden & unusable.</p>
        <h3>Module settings</h3>
        {invitesDisabled && (
          <p className="panel-status error">The invitation system has been disabled, new users will be unable to join.</p>
        )}
        <label className="setup-checkbox">
          <input
            type="checkbox"
            checked={form.userInvitesEnabled}
            onChange={(e) =>
              handleInviteToggle('userInvitesEnabled', e.target.checked)
            }
          />
          Enable user invitations
        </label>
        <p className="text-muted">When disabled, email invite based signups are blocked & management is hidden.</p>
        <label className="setup-checkbox" style={{ marginTop: 16 }}>
          <input
            type="checkbox"
            checked={form.globalInvitesEnabled}
            onChange={(e) =>
              handleInviteToggle('globalInvitesEnabled', e.target.checked)
            }
          />
          Enable global invitations
        </label>
        <p className="text-muted">When disabled, global invite codes are blocked and management is hidden.</p>
      </div>
    </div>
  );
}


// ─── Squads Panel ───────────────────────────────────────────

function SquadsPanel() {
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [expandedSquad, setExpandedSquad] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchAdminSquads();
      setSquads(res.squads || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (squad) => {
    if (expandedSquad === squad.id) {
      setExpandedSquad(null);
      setMembers([]);
      return;
    }
    setExpandedSquad(squad.id);
    setMembersLoading(true);
    try {
      const res = await fetchAdminSquadMembers(squad.id);
      setMembers(res.members || []);
    } catch { /* ignore */ }
    setMembersLoading(false);
  };

  const handleRemoveMember = (squadId, member) => {
    showModal(
      <ConfirmDialog
        title={`Remove "${member.name}" from squad?`}
        message="They will lose access to all squad archives."
        confirmLabel="Remove"
        danger
        onConfirm={async () => {
          await removeAdminSquadMember(squadId, member.user_id);
          destroyModal();
          const res = await fetchAdminSquadMembers(squadId);
          setMembers(res.members || []);
          load();
        }}
      />
    );
  };

  const handleEditMember = (squadId, member) => {
    showModal(
      <EditMemberModal squadId={squadId} member={member} onUpdated={async () => {
        const res = await fetchAdminSquadMembers(squadId);
        setMembers(res.members || []);
      }} />,
      'modal-md'
    );
  };

  const filtered = filter
    ? squads.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()) || (s.workspace_name || '').toLowerCase().includes(filter.toLowerCase()))
    : squads;

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h3>Squads</h3>
        <div className="admin-panel__actions">
          <input type="text" className="admin-filter-input" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">{filter ? 'No matching squads.' : 'No squads yet.'}</p>
      ) : (
        <div className="admin-squads-list">
          {filtered.map(squad => (
            <div key={squad.id} className={`admin-squad-card ${expandedSquad === squad.id ? 'admin-squad-card--expanded' : ''}`}>
              <div className="admin-squad-card__header" onClick={() => toggleExpand(squad)}>
                <div className="admin-squad-card__info">
                  <span className="admin-squad-card__name">{squad.name}</span>
                  <span className="admin-squad-card__meta">
                    {squad.workspace_name || 'No workspace'} · {squad.member_count} member{squad.member_count !== 1 ? 's' : ''} · {squad.archive_count} archive{squad.archive_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="admin-squad-card__toggle">{expandedSquad === squad.id ? '▾' : '▸'}</span>
              </div>

              {expandedSquad === squad.id && (
                <div className="admin-squad-card__members">
                  {membersLoading ? (
                    <p className="text-muted">Loading members…</p>
                  ) : members.length === 0 ? (
                    <p className="text-muted">No members.</p>
                  ) : (
                    <table className="admin-table admin-table--compact">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Read</th>
                          <th>Write</th>
                          <th>Logs</th>
                          <th>Archives</th>
                          <th>Members</th>
                          <th>Versions</th>
                          <th>Publish</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {members.map(m => (
                          <tr key={m.user_id}>
                            <td className="admin-cell--user">
                              {m.avatar_url && <img src={m.avatar_url} alt="" className="admin-user-avatar" />}
                              {m.name}
                            </td>
                            <td>
                              <span className={`admin-role-badge admin-role-badge--${m.role}`}>{m.role}</span>
                            </td>
                            <td>{m.can_read ? '✓' : '—'}</td>
                            <td>{m.can_write ? '✓' : '—'}</td>
                            <td>{m.can_create_log ? '✓' : '—'}</td>
                            <td>{m.can_create_archive ? '✓' : '—'}</td>
                            <td>{m.can_manage_members ? '✓' : '—'}</td>
                            <td>{m.can_delete_version ? '✓' : '—'}</td>
                            <td>{m.can_publish ? '✓' : '—'}</td>
                            <td>
                              <div className="admin-cell-actions">
                                <button className="btn btn-ghost btn-sm" onClick={() => handleEditMember(squad.id, m)}>Edit</button>
                                <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleRemoveMember(squad.id, m)}>Remove</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Invitations Panel ──────────────────────────────────────

function InvitationsPanel({ userInvitesEnabled, globalInvitesEnabled, dbUserInvitesEnabled, dbGlobalInvitesEnabled }) {
  const [userInvitations, setUserInvitations] = useState([]);
  const [globalInvitations, setGlobalInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [usersRes, globalRes] = await Promise.all([
        fetchAdminUserInvitations(),
        fetchAdminGlobalInvitations()
      ]);
      setUserInvitations(usersRes.invitations || []);
      setGlobalInvitations(globalRes.invitations || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevokeUserInvitation = async (inv) => {
    try {
      await deleteAdminUserInvitation(inv.id);
      load();
    } catch (e) {
      toastError(e.body?.message ?? 'Error revoking invitation.');
    }
  };

  const handleRevokeGlobalInvitation = async (inv) => {
    try {
      await revokeAdminGlobalInvitation(inv.id);
      load();
    } catch (e) {
      toastError(e.body?.message ?? 'Error revoking invitation.');
    }
  };

  return (
    <>
      <div className="admin-panel">
        <div className="admin-panel__header">
          <h3>User Invitations</h3>
          <button
            className="btn btn-primary btn-sm"
            disabled={!(userInvitesEnabled && dbUserInvitesEnabled)}
            onClick={() => showModal(<InviteUserModal onInvited={load} />, 'modal-md')}
          >
            + Invite User
          </button>
        </div>
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : !userInvitesEnabled ? (
          <p className="text-danger">The email invite system is disabled.</p>
        ) : (
          <>
            {!dbUserInvitesEnabled && (
              <p className="text-danger">User invitation creation is disabled until settings are saved.</p>
            )}
            {userInvitations.length === 0 ? (
              <p className="text-muted">No invitations sent yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Invited By</th>
                      <th>Sent</th>
                      <th>Expires</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {userInvitations.map(inv => {
                      const expired = new Date(inv.expires_at) <= new Date();
                      const status = inv.accepted ? 'Accepted' : expired ? 'Expired' : 'Pending';
                      const { dateShorthand: createdShorthand, dateLonghand: createdLonghand } = timeAgo(inv.created_at);
                      const { dateShorthand: expiresShorthand, dateLonghand: expiresLonghand } = timeAgo(inv.expires_at);

                      return (
                        <tr key={inv.id}>
                          <td>{inv.email}</td>
                          <td>
                            <span className={`status-badge status-badge--${status.toLowerCase()}`}>{status}</span>
                          </td>
                          <td>{inv.invited_by_name}</td>
                          <td><span title={createdLonghand} style={{ cursor: 'pointer' }}>{createdShorthand}</span></td>
                          <td><span title={expiresLonghand} style={{ cursor: 'pointer' }}>{expiresShorthand}</span></td>
                          <td>
                            {!inv.accepted && !expired && (
                              <button className="btn btn-ghost btn-sm" onClick={() => handleRevokeUserInvitation(inv)}>Revoke</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h3>Global Invitations</h3>
          <button
            className="btn btn-primary btn-sm"
            disabled={!(globalInvitesEnabled && dbGlobalInvitesEnabled)}
            onClick={() => showModal(<InviteGlobalModal onCreated={load} />, 'modal-md')}
          >
            + Create invite
          </button>
        </div>
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : !globalInvitesEnabled ? (
          <p className="text-danger">The global invite system is disabled.</p>
        ) : (
          <>
            {!dbGlobalInvitesEnabled && (
              <p className="text-danger">Global invite creation is disabled until settings are saved.</p>
            )}
            {globalInvitations.length === 0 ? (
              <p className="text-muted">No invitations sent yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Invited By</th>
                      <th>Max uses</th>
                      <th>Uses</th>
                      <th>Created</th>
                      <th>Expires</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {globalInvitations.map(inv => {
                      const exhausted = inv.max_uses !== null && inv.uses >= inv.max_uses;
                      const hasExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
                      const status = inv.revoked ? 'Revoked' : hasExpired ? 'Expired' : exhausted ? 'Exhausted' : 'Active';

                      const { dateShorthand: createdShorthand, dateLonghand: createdLonghand } = timeAgo(inv.created_at);
                      const { dateShorthand: expiresShorthand, dateLonghand: expiresLonghand } = timeAgo(inv.expires_at);
                      return (
                        <tr key={inv.id}>
                          <td>{inv.code}</td>
                          <td>
                            <span className={`status-badge status-badge--${status.toLowerCase()}`}>{status}</span>
                          </td>
                          <td>{inv.invited_by_name}</td>
                          <td>{inv.max_uses ?? '∞'}</td>
                          <td>{inv.uses}</td>
                          <td><span title={createdLonghand} style={{ cursor: 'pointer' }}>{createdShorthand}</span></td>
                          <td>
                            {hasExpired ? (
                              <span title={expiresLonghand} style={{ cursor: 'pointer' }}>Expired {expiresShorthand}</span>
                            ) : inv.expires_at ? (
                              <span title={expiresLonghand} style={{ cursor: 'pointer' }}>{expiresShorthand}</span>
                            ) : (
                              'Never'
                            )}
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => showModal(<InvitedUserModal onCreated={load} inviteID={inv.id}/>, 'modal-md')}>View invited users</button>
                            {!exhausted && !hasExpired && !inv.revoked && (
                              <button style={{ marginLeft: 5 }} className="btn btn-ghost btn-sm" onClick={() => handleRevokeGlobalInvitation(inv)}>Revoke</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Admin Dashboard ────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'users', label: 'Users', icon: '👤' },
  { key: 'workspaces', label: 'Workspaces', icon: '🏢' },
  { key: 'squads', label: 'Squads', icon: '👥' },
];
const INVITATIONS_NAV_ITEM = { key: 'invitations', label: 'Invitations', icon: '✉' };
const MODULES_NAV_ITEM = { key: 'settings', label: 'Settings', icon: '⚙' };

const DEFAULT_SETTINGS = {
  SMTPEnabled: true,
  globalSMTPEnabled: true,
  userInvitesEnabled: true,
  globalInvitesEnabled: true,
};

export default function AdminPage() {
  const [activePanel, setActivePanel] = useState('overview');
  const [authorized, setAuthorized] = useState(null);
  const [adminSettings, setAdminSettings] = useState(DEFAULT_SETTINGS);
  const [pendingSettings, setPendingSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    const load = async () => {
      try {
        const [status, settingsRes] = await Promise.all([
          fetchAdminStatus(),
          fetchAdminSettings()
        ]);
        const loadedSettings = settingsRes.settings ?? DEFAULT_SETTINGS;
        setAuthorized(status.isAdmin === true);
        setAdminSettings(loadedSettings);
        setPendingSettings(loadedSettings);
      } catch {
        setAuthorized(false);
      }
    };
    load();
  }, []);

  const showInvitations = pendingSettings.userInvitesEnabled || pendingSettings.globalInvitesEnabled;

  useEffect(() => {
    if (!showInvitations && activePanel === 'invitations') {
      setActivePanel('overview');
    }
  }, [activePanel, showInvitations]);

  if (authorized === null) {
    return <StdLayout><div className="admin-dashboard"><p className="text-muted">Loading…</p></div></StdLayout>;
  }
  if (!authorized) {
    return <StdLayout><div className="admin-dashboard"><h1>Access Denied</h1><p>You do not have admin privileges.</p></div></StdLayout>;
  }

  const navItems = [
    ...NAV_ITEMS,
    ...(showInvitations ? [INVITATIONS_NAV_ITEM] : []),
    MODULES_NAV_ITEM
  ];

  const handleSettingsPreview = (settings) => {
    setPendingSettings((prev) => ({ ...prev, ...settings }));
  };

  const handleSettingsSaved = (settings) => {
    setAdminSettings((prev) => ({ ...prev, ...settings }));
    setPendingSettings((prev) => ({ ...prev, ...settings }));
  };

  return (
    <StdLayout>
      <div className="admin-dashboard">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__title">Admin Console</div>
          <nav className="admin-sidebar__nav">
            {navItems.map(item => (
              <button
                key={item.key}
                className={`admin-sidebar__item ${activePanel === item.key ? 'active' : ''}`}
                onClick={() => setActivePanel(item.key)}
              >
                <span className="admin-sidebar__icon">{item.icon}</span>
                <span className="admin-sidebar__label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>
        <main className="admin-main">
          {activePanel === 'overview' && <OverviewPanel />}
          {activePanel === 'users' && <UsersPanel />}
          {activePanel === 'workspaces' && <WorkspacesPanel />}
          {activePanel === 'squads' && <SquadsPanel />}
          {activePanel === 'invitations' && showInvitations && <InvitationsPanel
            userInvitesEnabled={pendingSettings.userInvitesEnabled}
            globalInvitesEnabled={pendingSettings.globalInvitesEnabled}
            dbUserInvitesEnabled={adminSettings.userInvitesEnabled}
            dbGlobalInvitesEnabled={adminSettings.globalInvitesEnabled}
          />}
          {activePanel === 'settings' && <SettingsPanel settings={adminSettings} onPreviewChange={handleSettingsPreview} onSaved={handleSettingsSaved}/>}
        </main>
      </div>
    </StdLayout>
  );
}
