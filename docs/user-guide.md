# User Guide

## Overview

w-ssh is a desktop SSH session manager. It lets you save SSH host configurations and open multiple terminal connections in tabs, all in one window.

---

## Interface Layout

```
┌─────────────────────────────────────────────────────┐
│ [▣ Vaults]  [⌨ server1]  [⌨ server2]           [+] │  ← Top tab bar
├─────────────────────────────────────────────────────┤
│                                                     │
│  Left nav  │  Host cards / Terminal                 │  ← Content area
│            │                                        │
└─────────────────────────────────────────────────────┘
```

- **Vaults tab** — host manager (always present)
- **Terminal tabs** — one per active SSH connection
- **[+] button** — returns to Vaults tab

---

## Managing Hosts

### Add a Host

1. Click the **Vaults** tab to open the host manager.
2. Click **New Host** in the top-right of the content area.
3. Fill in the form:
   - **Name** — a label for this host (e.g., "Production Web")
   - **Host** — IP address or hostname
   - **Port** — default 22
   - **Username** — SSH login user
   - **Host icon** — choose the icon shown on the host card
   - **Group** — select an existing group from the dropdown or enter a new one
4. Choose an authentication method:
   - **Password** — enter now or at connection time; saving uses the OS credential store
   - **Private Key** — selects the first private key actually found under `~/.ssh/`; if none is found, enter an existing path manually. The passphrase is empty unless entered and can optionally be saved in the OS credential store
5. Click **Save**.

### Edit or Delete a Host

Use the visible **连接** button to connect and the **…** button to edit, delete, or manage saved credentials. Double-click and right-click remain available as shortcuts.

The host form also lets you change the host icon and group assignment.

### Create or Edit a Group

Click **新建分组** below **Hosts** in the left sidebar, enter a name, choose an icon, and click **创建分组**. The new group appears immediately and remains available even before a host is added. Select an empty group and use **添加主机** when you are ready.

Use the edit button beside an existing group to rename it or change its icon. The update is applied atomically to the group and all hosts it contains. An empty group can also be deleted from this dialog; a group containing hosts must first be emptied.

### Search and Filter

- Use the **search bar** at the top of the content area to filter hosts by name or hostname.
- Click a **group name** in the left sidebar to show only hosts in that group.
- Click **All** to return to the full view, organized by group.

---

## Connecting to a Host

Click **连接** on a host card to open an SSH connection. Double-clicking the card is a shortcut.

On first use, verify the displayed SHA-256 host-key fingerprint and choose **Trust and continue**. An exact match connects normally. If the key changes, w-ssh blocks the connection and shows both old and new fingerprints; replace it only after checking through another trusted channel. Use the shield button beside **New Host** to review or delete app-owned trust entries.

A new terminal tab appears in the top bar and becomes active automatically. The tab shows the host name. If the connection drops, the tab icon turns red and the terminal offers **重新连接** and **返回主机列表** actions.

You can also right-click a card and choose **连接** (Connect).

---

## Using Terminals

Each terminal tab is a full interactive terminal:

- Type commands normally; all input is forwarded to the remote shell.
- The terminal resizes automatically when you resize the window.
- Clickable URLs are underlined; Ctrl+click (or Cmd+click on macOS) to open them.
- Multiple connections can be open simultaneously — switch between them using the tabs.

### Closing a Tab

Click the terminal tab's **×** button. Connected sessions ask for confirmation before disconnecting; already disconnected tabs close immediately.

When all terminal tabs are closed, the view returns to **Vaults** automatically.

---

## Authentication

| Method | When to use |
|--------|-------------|
| Password | Save in the OS credential store or use once without saving |
| Private Key | Select a key path; passphrase can be saved or supplied once |

Supported private key types: `id_rsa`, `id_ed25519`, `id_ecdsa`, `id_dsa`, and SK variants.

---

## Data Storage

SQLite remains the default and uses `{app_data_dir}/sessions.db`. Open the gear button beside **New Host** to see the exact SQLite path or select an absolute `.yml` path.

The two storage actions are intentionally separate:

- **仅切换，不复制** requires confirmation, validates the target, and switches without copying hosts. The source remains intact but its hosts are no longer shown.
- **复制并切换** is the primary action when changing backends. It requires the other backend to be empty, copies and verifies every session and group, then switches. The source is never deleted.

SQLite and YAML store host details and private-key file paths, but new passwords, passphrases, and private-key contents are never written to either backend. YAML schema version 1 is unchanged and continues to reject secret fields.

Older SQLite passwords remain quarantined after upgrade: they are not displayed or used automatically. Storage Settings offers **Migrate all safely**, which writes each password to the OS store, reads it back for verification, and only then clears that SQLite value. Per-session **Migrate safely and connect** and explicit deletion are available from the host's **…** menu. The same menu can forget a saved OS credential without deleting the host. A failed migration leaves the old password unchanged and can be retried.

If a selected YAML file is damaged, w-ssh reports it as unavailable instead of silently falling back to SQLite. You can repair the file or explicitly apply SQLite in Storage Settings. No data is sent to any server.
