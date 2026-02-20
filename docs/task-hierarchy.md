# Task Hierarchy

This document describes the task hierarchy, data model, CRUD operations, and UI behavior for Luna PM.

## Hierarchy

Workspaces -> Projects -> Lists (sublists) -> Tasks

A project is essentially a special type of list — it can hold tasks directly and also have sublists. Think of it as a list with extra capabilities: status, custom fields, date ranges, and an assets folder.

## Entities

- Workspace
  - The top-level organizational unit. Replaces the current Client model.
  - Has a type: CLIENT or COMPANY.
  - CLIENT workspace: represents an external client. Has a client portal where the client user can view projects, tasks, and approvals.
  - COMPANY workspace: internal to the organization. No client portal access. Used for internal projects, operations, and team work.
  - Has a name and address.
  - Has a root Assets folder for file storage. Project asset folders appear within this tree.
  - Can have one or many projects.
  - Has an implicit task list (tasks with no project or list assignment).
  - CLIENT workspaces have exactly one primary user (the client contact) who can access the client portal.
  - COMPANY workspaces have no primary user / client portal.

- Project
  - A special type of list that belongs to exactly one workspace.
  - Can hold tasks directly (project acts as a list itself).
  - Can have zero or many sublists (Lists). Sublists are one level deep — no sub-sublists.
  - Has metadata: name, description, status, start/end dates, custom field values.
  - Has an Assets folder for file storage, which appears within the workspace's folder tree.
  - Status: INTAKE, PENDING, ACTIVE, ARCHIVED.

- List (sublist)
  - Belongs to exactly one project.
  - Can have zero or many tasks.
  - One level deep only — no nested sublists.

- Task
  - Always belongs to exactly one workspace (via `workspaceId`).
  - Can optionally belong to a project (via `projectId`).
  - Can belong to zero or many lists within its project (many-to-many via ListTask join table).
  - A task can live in three places:
    1. Workspace implicit list — no project, no lists (backlog/inbox).
    2. Directly in a project — has projectId but no ListTask rows.
    3. In sublists within a project — has projectId and ListTask rows.
  - All lists a task belongs to must be within the task's project.
  - Can have subtasks (one level deep only — subtasks cannot have subtasks).

- Subtask
  - A task with a parentTaskId set.
  - Inherits workspaceId, projectId, list membership from the parent task (no own ListTask rows).
  - Inherits owner from parent task on creation, but owner can be changed or added independently.
  - Cannot be added to lists directly — always accessed through the parent task.

## User Types

There are two types of users of this application:

1. **Organization users** — the company or team running Luna PM. They use the main application at the root path (`/`). They can see and manage all workspaces, projects, lists, and tasks.
2. **Client users** — external clients who access their client portal at `/client/[workspace-slug]`. They can only see the workspace(s) and projects they have access to.

## Access Model

- Organization users access the main app at `/` (no `/admin` prefix). They can manage all workspaces (CLIENT and COMPANY), projects, lists, and tasks.
- Client users access their portal at `/client/[workspace-slug]` where the slug is a URL-friendly identifier for the CLIENT workspace. They can see all projects, lists, and tasks within their workspace.
- COMPANY workspaces have no client portal — they are internal only.

## Relationship Summary

- Workspace 1 -> N Projects
- Workspace 1 -> N Tasks (every task has a workspaceId)
- Workspace 1 -> 1 Root Assets Folder
- Project 1 -> N Lists (sublists)
- Project 1 -> N Tasks (directly in project, via projectId)
- Project 1 -> 1 Assets Folder (within workspace folder tree)
- List N <-> N Tasks (via ListTask, optional)
- Workspace (CLIENT) 1 -> 1 Primary User (optional for COMPANY)

---

## Data Model

### Workspace (replaces Client)

Rename the `Client` model to `Workspace` and add a `type` field.

| Column        | Type          | Notes                                         |
|---------------|---------------|-----------------------------------------------|
| id            | cuid          | Primary key                                   |
| name          | String        | Workspace name                                |
| slug          | String        | URL-friendly identifier. Unique. Used in client portal path. |
| type          | WorkspaceType | CLIENT or COMPANY                             |
| address       | String        | Address                                       |
| primaryUserId | String?       | FK to User. Required for CLIENT, null for COMPANY. |
| createdAt     | DateTime      | Auto                                          |
| updatedAt     | DateTime      | Auto                                          |

New enum: `WorkspaceType` with values `CLIENT` and `COMPANY`.

- `slug` is auto-generated from the workspace name on creation (lowercased, spaces to hyphens, special chars stripped). Can be manually edited.
- Unique constraint on `slug`.

Rename all foreign keys referencing `Client`:
- `Project.clientId` -> `Project.workspaceId`
- `Folder.clientId` -> `Folder.workspaceId`
- `File.clientId` -> `File.workspaceId`
- `User.clientId` -> `User.workspaceId`

Rename relations accordingly (e.g. `ClientUsers` -> `WorkspaceUsers`, `ClientPrimaryUser` -> `WorkspacePrimaryUser`).

### Project (updated)

Update the Project model to reflect its role as a special list with metadata.

| Column      | Type          | Notes                                    |
|-------------|---------------|------------------------------------------|
| id          | cuid          | Primary key                              |
| workspaceId | String        | FK to Workspace                          |
| name        | String        | Project name                             |
| description | String?       | Optional description                     |
| status      | ProjectStatus | INTAKE, PENDING, ACTIVE, ARCHIVED        |
| startDate   | DateTime?     | Optional                                 |
| endDate     | DateTime?     | Optional                                 |
| createdAt   | DateTime      | Auto                                     |
| updatedAt   | DateTime      | Auto                                     |

Update `ProjectStatus` enum to: `INTAKE`, `PENDING`, `ACTIVE`, `ARCHIVED`.

### WorkspaceCustomField (new model)

Defines custom field schemas at the workspace level. All projects in the workspace share the same set of available custom fields.

| Column      | Type   | Notes                                         |
|-------------|--------|-----------------------------------------------|
| id          | cuid   | Primary key                                   |
| workspaceId | String | FK to Workspace                               |
| name        | String | Field label (e.g. "Contractor", "Address")    |
| type        | String | Field type: TEXT, NUMBER, DATE, SELECT         |
| options     | String[] | For SELECT type: list of allowed values. Empty for other types. |
| order       | Int    | Display order                                 |
| createdAt   | DateTime | Auto                                        |
| updatedAt   | DateTime | Auto                                        |

- Unique constraint on (workspaceId, name) — no duplicate field names within a workspace.

### ProjectCustomFieldValue (new model)

Stores actual custom field values for a project.

| Column        | Type   | Notes                                      |
|---------------|--------|--------------------------------------------|
| id            | cuid   | Primary key                                |
| projectId     | String | FK to Project                              |
| customFieldId | String | FK to WorkspaceCustomField                 |
| value         | String | The field value (stored as string, parsed by type) |
| createdAt     | DateTime | Auto                                     |
| updatedAt     | DateTime | Auto                                     |

- Unique constraint on (projectId, customFieldId) — one value per field per project.

### Task (updated fields)

Add `workspaceId` and `projectId`. Remove `listId`.

| New/Changed Column | Type    | Notes                                    |
|--------------------|---------|------------------------------------------|
| workspaceId        | String  | FK to Workspace. Required.               |
| projectId          | String? | FK to Project. Optional.                 |

- Remove `listId` field from Task model.
- A task always belongs to a workspace. Project and list membership are optional.
- If projectId is set, the task is in that project (either directly or via sublists).
- If projectId is null, the task is in the workspace implicit list.

### Workspace implicit list

Every workspace has an implicit list — this is not a database record, but a virtual concept. It represents all tasks where `workspaceId` is set but `projectId` is null and there are zero ListTask rows.

- The implicit list appears on the workspace detail page as "Unassigned tasks".
- Tasks can be moved from the implicit list to a project by setting projectId.
- Tasks can be moved back to the implicit list by clearing projectId (which also removes all ListTask rows).

### ListTask (new join table)

Optional many-to-many relationship between tasks and sublists within a project.

| Column   | Type   | Notes                          |
|----------|--------|--------------------------------|
| id       | cuid   | Primary key                    |
| listId   | String | FK to List                     |
| taskId   | String | FK to Task                     |

- Unique constraint on (listId, taskId).
- Update List model: `tasks` becomes a relation through ListTask.
- A task can have zero ListTask rows (lives directly in project or in workspace implicit list).
- All lists referenced must belong to the task's project.

### TaskComment (update existing model)

Add threading support via a self-referencing parent.

| Column          | Type     | Notes                                    |
|-----------------|----------|------------------------------------------|
| id              | cuid     | Primary key                              |
| taskId          | String   | FK to Task                               |
| authorId        | String   | FK to User                               |
| body            | String   | Comment text                             |
| parentCommentId | String?  | FK to TaskComment (null = top-level)     |
| createdAt       | DateTime | Auto                                     |
| updatedAt       | DateTime | Auto                                     |

- `parentCommentId` is nullable. Null means it's a top-level comment; non-null means it's a reply.
- Self-relation: `parentComment` / `replies` on TaskComment.
- Replies can only be one level deep — you reply to a top-level comment, not to another reply. Enforced at application level.
- Existing `files` relation (TaskCommentFile) stays unchanged — replies can also have file attachments.

### Subtasks (using existing parentTaskId on Task)

The Task model already has `parentTaskId` and the `Subtasks` self-relation. No schema changes needed — just application-level rules:

- A subtask is a Task where `parentTaskId` is non-null.
- Subtasks do NOT have their own ListTask rows. Their list membership, projectId, and workspaceId are derived from the parent task.
- Only one level deep: if a task has a `parentTaskId`, it cannot be set as a `parentTaskId` on another task.
- On creation, a subtask inherits `ownerId` from the parent task (can be null if parent has no owner). The owner can be changed independently after creation.
- Subtasks have their own: name, description, statusId, ownerId, dueDate, priority, tags, requiresApproval, comments, files.
- Subtasks do NOT have: list membership, projectId (inherits from parent), subtasks of their own.

### Assets / Folder Structure

The existing Folder and File models handle asset storage. The hierarchy:

- **Workspace root folder**: Each workspace has a root-level folder tree. Folders with `workspaceId` set and `projectId` null live at the workspace root.
- **Project assets folder**: Each project can have folders. Folders with both `workspaceId` and `projectId` set belong to the project. These appear as a subtree within the workspace's folder tree.
- Files can be uploaded to any folder.
- The folder tree on the workspace detail page shows the full hierarchy: workspace root folders + project folders nested within.

No schema changes needed for Folder/File — just update `clientId` references to `workspaceId`.

### Constraints

- Every task must have a workspaceId.
- If a task has a projectId, that project must belong to the task's workspace.
- When adding a task to a list, the list must belong to the task's project.
- A task can have zero list memberships (it lives directly in the project or in the workspace implicit list).
- A task without a projectId cannot have ListTask rows.
- A subtask cannot have subtasks (one level deep only).
- A subtask inherits workspaceId and projectId from the parent and cannot have its own ListTask rows.
- CLIENT workspaces must have a primaryUserId. COMPANY workspaces must not.
- Lists cannot be nested — one level deep only (sublists of a project, no sub-sublists).

---

## CRUD Operations

### Workspace CRUD

**Create** — `POST /api/workspaces`
- Required: name, type, address
- Optional: primaryUserId (required if type is CLIENT)
- Validates: if type is CLIENT, primaryUserId must be provided. If type is COMPANY, primaryUserId must be null.
- Redirects to `/workspaces` after creation.

**Read** — Server component queries
- `/workspaces` — table of all workspaces with type badge, project count.
- `/workspaces/[id]` — workspace detail with projects, unassigned tasks, and assets folder tree.

**Slug generation:**
- Auto-generated from name on creation (e.g. "Company ABC" -> "company-abc").
- Editable via update. Must be unique.

**Update** — `PATCH /api/workspaces/[id]`
- Editable: name, address, primaryUserId.
- Cannot change type after creation.

**Delete** — `DELETE /api/workspaces/[id]`
- Cascades: deletes all projects, lists, ListTask entries, tasks, folders, and files for this workspace.
- Requires confirmation dialog.

### Workspace Custom Field CRUD

**Create** — `POST /api/workspaces/[id]/custom-fields`
- Required: name, type
- Optional: options (for SELECT type), order
- Validates: name is unique within the workspace.

**Read** — Loaded as part of workspace detail and project forms.

**Update** — `PATCH /api/workspaces/[id]/custom-fields/[fieldId]`
- Editable: name, type, options, order.
- Changing type may invalidate existing project values (application warns but allows).

**Delete** — `DELETE /api/workspaces/[id]/custom-fields/[fieldId]`
- Removes all ProjectCustomFieldValue rows for this field.
- Requires confirmation.

### Project CRUD

**Create** — `POST /api/projects`
- Required: name, workspaceId
- Optional: description, status, startDate, endDate, custom field values
- Defaults: status = INTAKE
- Redirects to `/projects/[id]` after creation.

**Read** — Server component queries
- `/projects` — table of all projects with workspace name, status, date range, list count.
- `/projects/[id]` — project detail with sublists, tasks (direct + in sublists), custom fields, and assets.

**Update** — `PATCH /api/projects/[id]`
- Editable: name, description, status, startDate, endDate, custom field values.

**Delete** — `DELETE /api/projects/[id]`
- Cascades: deletes all lists, ListTask entries, and tasks that belong to this project. Also deletes project folders and files.
- Tasks that belong to this project are deleted (they cannot exist without a project if they had one).
- Requires confirmation dialog.

### List (sublist) CRUD

**Create** — Server action on `/lists/new`
- Required: name, projectId
- Redirects to `/projects/[projectId]` after creation.

**Read** — Server component queries
- `/lists` — table of all lists with project name and task count.
- Lists also appear inline on the project detail page.

**Update** — `PATCH /api/lists/[id]`
- Editable: name.
- Cannot change projectId (move between projects).

**Delete** — `DELETE /api/lists/[id]`
- Removes all ListTask entries for this list.
- Tasks that lose their list assignments remain in the project (directly in project, no sublists).
- Requires confirmation dialog.

### Task CRUD

**Create** — Server action on `/tasks/new`
- Required: name, statusId, workspaceId
- Optional: projectId, listIds (zero or more), description, ownerId, requestorId, dueDate, startDate, priority, tags, timeEstimate, points, requiresApproval, parentTaskId
- workspaceId is set based on context (selected workspace or derived from project).
- If projectId is set, optionally select sublists within that project.
- On creation, creates ListTask rows for each selected list (if any).
- If requiresApproval is true, creates a TaskApproval row with status PENDING.
- Redirects to project detail page (if projectId set) or workspace detail page (if no project).

**Read** — Server component queries
- `/tasks` — table of all top-level tasks with workspace, project, list names, owner, status, due date.
- Tasks also appear inline on the project detail page, grouped by sublist (or directly in project).
- `/tasks/[id]` — task detail page (future).

**Update** — `PATCH /api/tasks/[id]`
- Editable: name, description, statusId, ownerId, requestorId, dueDate, startDate, priority, tags, timeEstimate, points, requiresApproval.
- Moving a task to a different project: update projectId, remove all ListTask rows (task lands directly in the new project).
- Moving a task to workspace implicit list: clear projectId, remove all ListTask rows.
- List membership within a project is managed via Multi-List Operations.

**Delete** — `DELETE /api/tasks/[id]`
- Removes all ListTask entries, subtasks, TaskFile entries, TaskComment entries, TaskApproval, and TaskDependency rows.
- Requires confirmation dialog.

### Subtask CRUD

**Create** — `POST /api/tasks/[id]/subtasks`
- Required: name, statusId
- Optional: description, ownerId, dueDate, priority, tags, requiresApproval
- Validates parent task is not itself a subtask (no nesting beyond one level).
- Sets `parentTaskId` to the parent task's id.
- Inherits `workspaceId` and `projectId` from parent.
- Inherits `ownerId` from parent if not explicitly provided.
- Does NOT create any ListTask rows.
- If requiresApproval is true, creates a TaskApproval row with status PENDING.

**Read** — Loaded as part of the parent task
- Subtasks are included when fetching a task (via the `subtasks` relation).
- On the tasks table page, subtasks are not shown as separate rows — they only appear within the parent task's detail view.

**Update** — `PATCH /api/tasks/[id]/subtasks/[subtaskId]`
- Editable: name, description, statusId, ownerId, dueDate, priority, tags, requiresApproval.
- Cannot change parentTaskId (cannot move a subtask to a different parent).

**Delete** — `DELETE /api/tasks/[id]/subtasks/[subtaskId]`
- Removes the subtask, its TaskApproval, comments, and file attachments.
- Does not affect the parent task.

### Task Comment CRUD

**Create** — `POST /api/tasks/[id]/comments`
- Required: body
- Optional: parentCommentId (to reply to a comment)
- Author is the current authenticated user.
- If parentCommentId is provided, validates it belongs to the same task and is a top-level comment (no nested replies).
- Returns the created comment with author info.

**Read** — Server component queries
- Comments are loaded as part of the task detail page.
- Fetched as top-level comments with their replies included (two levels max).
- Ordered by createdAt ascending (oldest first) so conversation reads naturally.
- Replies within a thread are also ordered by createdAt ascending.

**Update** — `PATCH /api/tasks/[id]/comments/[commentId]`
- Editable: body.
- Only the comment author can edit their own comment.
- Shows "(edited)" indicator after update.

**Delete** — `DELETE /api/tasks/[id]/comments/[commentId]`
- Only the comment author or an admin can delete.
- Deleting a top-level comment also deletes all its replies and their file attachments.
- Deleting a reply only deletes that reply and its file attachments.

---

## Multi-List Operations

### Add task to sublist — `POST /api/tasks/[id]/lists`
- Body: `{ listId: string }`
- Validates that the task has a projectId and the list belongs to that project.
- Creates a ListTask row.
- Returns 409 if task is already in that list.

### Remove task from sublist — `DELETE /api/tasks/[id]/lists/[listId]`
- Removes the ListTask row.
- If this was the task's last list, the task remains directly in the project (this is allowed).

### UI for multi-list management
- On the task create form: if a project is selected, optionally pick sublists within that project. Multi-select checkboxes.
- On the task detail page (future): a "Lists" section showing current sublist memberships with an "Add to list" button and remove (x) buttons.
- On the project detail page: tasks appear under each sublist they belong to, plus a "Direct tasks" section for tasks not in any sublist. A task in multiple sublists appears in each.

---

## Routing

### Organization app (root)

The main application for organization users. No `/admin` prefix.

| Route                              | Page                          |
|------------------------------------|-------------------------------|
| `/`                                | Dashboard / home              |
| `/workspaces`                      | All workspaces                |
| `/workspaces/[id]`                 | Workspace detail              |
| `/projects`                        | All projects                  |
| `/projects/[id]`                   | Project detail                |
| `/tasks`                           | All tasks                     |
| `/tasks/new`                       | New task form                 |
| `/tasks/[id]`                      | Task detail (future)          |
| `/lists`                           | All lists                     |
| `/lists/new`                       | New list form                 |

### Client portal

Path-based access per CLIENT workspace, using the workspace slug.

| Route                                          | Page                     |
|------------------------------------------------|--------------------------|
| `/client/[workspace-slug]`                     | Workspace overview       |
| `/client/[workspace-slug]/projects/[id]`       | Project detail           |
| `/client/[workspace-slug]/tasks/[id]`          | Task detail              |

---

## UI Behavior

### Workspaces page (`/workspaces`)
- Table with columns: Workspace, Type, Projects.
- Type column shows a badge: "Client" or "Company".
- "New workspace" button.
- Each row links to `/workspaces/[id]`.

### Workspace detail page (`/workspaces/[id]`)

**Header:**
- Workspace name, type badge, address.
- For CLIENT workspaces: shows primary user contact info and link to client portal (`/client/[slug]`).
- For COMPANY workspaces: no primary user section.
- Custom fields configuration section (define fields available to all projects).

**Layout: two-column**
- Left (main): tabbed content area (see tabs below).
- Right (sidebar): Assets file tree.

**Tabs:**

#### "Projects & Lists" tab (default)

Shows all projects and lists in the workspace as expandable, hierarchical cards.

- Each **project** is a card showing: name, status badge, date range, custom field values summary.
- Clicking the project card header expands/collapses it.
- Expanded project shows:
  - **Direct tasks**: tasks in the project with no sublist. Each task row shows: name, owner, status badge, due date. Expandable to show subtasks.
  - **Sublists**: each sublist as a nested section with its name and task count. Expandable to show its tasks. Each task row shows: name, owner, status badge, due date. Expandable to show subtasks.
- "New task" button on the project (adds directly to project) and on each sublist.
- "New sublist" button on each project.
- Below the projects: **"Unassigned tasks"** section showing tasks with no projectId (workspace implicit list). Each task row shows: name, owner, status badge, due date.
- "New task" button in the unassigned section links to `/tasks/new?workspaceId=xxx`.
- "New project" button at the top.

#### "Kanban" tab

A board view of all tasks in the workspace, organized as a grid.

- **Columns** = task statuses (ordered by the TaskStatus.order field). Each column header shows the status name and color.
- **Rows** = grouping by project/list. One row per group:
  - One row for each project's direct tasks (labeled with project name).
  - One row for each sublist within a project (labeled "Project Name > List Name").
  - One row for unassigned tasks (labeled "Unassigned").
- Each cell shows task cards at the intersection of that status and that project/list group.
- Task cards show: name, owner avatar/initials, due date, priority indicator.
- Subtasks are not shown as separate cards — only top-level tasks appear on the board.
- Empty cells are empty (no placeholder).
- Rows with zero tasks across all statuses are hidden.
- Future: drag-and-drop to change task status (move between columns) or list assignment (move between rows).

**Assets sidebar (right column):**

A navigable file tree showing the workspace's folder hierarchy.

- Displays as an expandable tree structure (folders expand/collapse to show children).
- Workspace root folders appear at the top level.
- Project asset folders appear as named subtrees (e.g. "Brooklyn Brownstone Refresh/").
- Clicking a folder expands it to show child folders and files.
- Clicking a file shows file details (name, size, upload date) or triggers download.
- "New folder" and "Upload file" buttons at the top of the sidebar.
- Files/folders can be scoped to the workspace or to a specific project — the tree shows both merged together.

### Project detail page (`/projects/[id]`)

Same structure as the workspace detail page, scoped to a single project.

**Header:**
- Project name, status badge, description, date range, custom field values.
- Edit button for project metadata and custom fields.
- Breadcrumb: Workspace name > Project name.

**Layout: two-column**
- Left (main): tabbed content area.
- Right (sidebar): project assets file tree.

**Tabs:**

#### "Lists" tab (default)

Shows all sublists and direct tasks within this project as expandable sections.

- **Direct tasks** section at the top: tasks in the project with no sublist assignment. Each task row shows: name, owner, status badge, due date. Expandable to show subtasks.
- Each **sublist** as an expandable section with its name and task count.
  - Expanded sublist shows its tasks. Each task row shows: name, owner, status badge, due date. Expandable to show subtasks.
  - Tasks in multiple sublists appear in each sublist's section.
- "New task" button on the direct tasks section links to `/tasks/new?workspaceId=xxx&projectId=yyy`.
- "New task" button on each sublist links to `/tasks/new?workspaceId=xxx&projectId=yyy&listId=zzz`.
- "New sublist" button at the top.

#### "Kanban" tab

A board view scoped to this project's tasks only.

- **Columns** = task statuses (ordered by TaskStatus.order).
- **Rows** = grouping by list within the project:
  - One row for direct tasks (labeled "Direct" or project name).
  - One row for each sublist (labeled with sublist name).
- Each cell shows task cards at the intersection of that status and list group.
- Task cards show: name, owner avatar/initials, due date, priority indicator.
- Subtasks are not shown as separate cards — only top-level tasks.
- Empty cells are empty. Rows with zero tasks across all statuses are hidden.
- Future: drag-and-drop to change status or list assignment.

**Assets sidebar (right column):**

A navigable file tree scoped to this project's folders only.

- Displays as an expandable tree structure.
- Shows only folders/files where `projectId` matches this project.
- Clicking a folder expands it. Clicking a file shows details or triggers download.
- "New folder" and "Upload file" buttons.

### Tasks page (`/tasks`)
- Table with columns: Task, Workspace, Project, Lists, Owner, Status, Due.
- "Workspace" column shows the workspace name.
- "Project" column shows project name or "—" if task is in the workspace implicit list.
- "Lists" column shows comma-separated sublist names, or "—" if direct/unassigned.
- "New task" button links to `/tasks/new`.
- Each row is clickable (future: links to `/tasks/[id]`).

### New task form (`/tasks/new`)

The form pre-populates based on where the user navigated from, so they don't have to re-select context they've already drilled into.

**Context inheritance via query params:**
- From workspace detail page: `?workspaceId=xxx` — workspace is pre-selected and locked.
- From project detail page: `?workspaceId=xxx&projectId=yyy` — workspace and project are pre-selected and locked.
- From sublist within a project: `?workspaceId=xxx&projectId=yyy&listId=zzz` — workspace, project, and sublist are pre-selected (sublist can still be changed or additional sublists added).
- From global tasks page (no context): all fields start empty.

**Form fields:**
- Workspace (required): dropdown, locked if passed via query param.
- Project (optional): dropdown filtered to workspace's projects, locked if passed via query param. If not selected, task goes to workspace implicit list.
- Sublists (optional, multi-select): checkboxes filtered to project's sublists. Pre-checked if passed via query param. User can add/remove sublists. If none selected, task lives directly in the project.
- Name (required), status (required, dropdown), owner (optional, dropdown), due date (optional), requires approval (checkbox).

**On submit:** creates task with workspaceId, optional projectId, optional ListTask rows, optional TaskApproval row. Redirects back to the originating page (project detail, workspace detail, or tasks list).

### Lists page (`/lists`)
- Table with columns: List, Project, Tasks.
- "Tasks" count reflects ListTask rows.
- "New list" button.

### Subtask UI

**On the project detail page (`/projects/[id]`):**
- Under each task in a sublist card or direct tasks section, subtasks are shown as an indented sub-list.
- Each subtask shows: name, owner, status badge.
- Subtask count shown next to the parent task name (e.g. "3 subtasks").

**On the task detail page (`/tasks/[id]`) (future):**
- Subtasks section below the task details, above comments.
- Displayed as a checklist-style list: name, owner, status, due date.
- "Add subtask" button opens an inline form (name + status, owner defaults to parent's owner).
- Each subtask row has edit and delete actions.

**On the client portal:**
- Subtasks appear indented under their parent task in the task list view.
- Read-only — no create/edit/delete.

**On the admin tasks table (`/tasks`):**
- Subtasks are NOT shown as separate rows in the global tasks table.
- Only top-level tasks (parentTaskId is null) appear in the table.

### Task Comments UI

Comments appear on the task detail page (`/tasks/[id]`) and on the client portal task view.

**Layout:**
- Comments section sits below the task details.
- Top-level comments are displayed as a flat list, ordered oldest-first.
- Each top-level comment shows: author name/email, timestamp, body, and a "Reply" button.
- Replies are indented below their parent comment, visually nested one level.
- Each reply shows: author name/email, timestamp, body.
- "(edited)" indicator next to timestamp if the comment was updated after creation.

**Compose:**
- A text input at the bottom of the comments section for new top-level comments.
- Clicking "Reply" on a comment opens an inline text input directly below that comment for composing a reply.
- Submit button posts the comment and clears the input.

**Admin vs Client:**
- Admin can comment on any task and delete any comment.
- Client users can comment on tasks belonging to their CLIENT workspace projects and delete only their own comments.

### Client portal (`/client/[workspace-slug]`)

Path-based access for client users. The slug in the URL identifies the CLIENT workspace.

**Routing:**
- `/client/[workspace-slug]` — workspace overview with projects list.
- `/client/[workspace-slug]/projects/[id]` — project detail with tasks and sublists.
- `/client/[workspace-slug]/tasks/[id]` — task detail with subtasks and comments.

**Behavior:**
- Only accessible for CLIENT workspaces. Returns 404 for COMPANY workspace slugs.
- Authenticated client user must be the workspace's primary user (or linked via workspaceId).
- Shows the workspace name and primary user info.
- Project section shows sublists and tasks grouped by sublist, plus direct project tasks.
- Tasks in multiple sublists appear under each.
- Read-only for tasks and lists — no create/edit/delete.
- Client can comment on tasks and approve/reject tasks pending approval.
- Pending approvals widget shows tasks awaiting client approval.
- COMPANY workspace data never appears in the client portal.

---

## Empty States

- No workspaces: "No workspaces yet. Create a workspace to get started."
- No projects for workspace: "No projects yet."
- No sublists for project: (no empty state — direct tasks section always shows)
- No tasks in sublist: "No tasks in this list."
- No direct tasks in project: "No tasks yet."
- No unassigned tasks in workspace: "No unassigned tasks."
- No tasks globally: "No tasks yet. Add lists and tasks to populate this view."
- No comments on task: "No comments yet."
- No subtasks: (no explicit empty state — the subtask section just doesn't appear)
- No custom fields: "No custom fields defined."

---

## Validation Rules

- Workspace name: required, non-empty string, trimmed.
- Workspace type: required, must be CLIENT or COMPANY.
- Workspace slug: required, unique, lowercase alphanumeric + hyphens only, no leading/trailing hyphens.
- Workspace address: required, non-empty string, trimmed.
- CLIENT workspace must have a primaryUserId. COMPANY workspace must not.
- Project name: required, non-empty string, trimmed.
- Project must belong to a workspace.
- Custom field name: required, unique per workspace.
- Custom field type: must be TEXT, NUMBER, DATE, or SELECT.
- Task name: required, non-empty string, trimmed.
- Task must have a workspaceId.
- If task has a projectId, that project must belong to the task's workspace.
- If task has ListTask rows, all lists must belong to the task's project.
- A task without a projectId cannot have ListTask rows.
- List name: required, non-empty string, trimmed.
- List must belong to a project.
- Comment body: required, non-empty string.
- Comment parentCommentId (if provided) must reference a top-level comment on the same task.
