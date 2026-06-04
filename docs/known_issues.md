# Known Issues

Before submitting a bug report, please check this list to see if we are already aware of the problem and if a workaround exists.

## 🐛 Known Bugs

### 1. Workflows occasionaly stall in `PENDING` state
- **Description**: Very rarely, if the Redis queue drops the connection right as an audit is submitted, the workflow will be stuck in `PENDING` indefinitely.
- **Workaround**: Currently, there is no UI button to cancel a stuck workflow. You must create a new Audit.
- **Status**: Backend fix is planned for V1.1.

### 2. Large screenshots fail to generate Visual Findings
- **Description**: If the target page is extremely long, the screenshot may exceed the payload limits of the vision model.
- **Workaround**: Break the audit down into smaller page segments.
- **Status**: Investigating chunking strategies for V1.2.

---

## 🛑 UX Friction & Limitations

### 1. Empty States on Dashboard
- **Description**: If you have no projects, the dashboard may appear overly blank without clear guidance.
- **Workaround**: Click the "New Project" button in the top right to get started.

### 2. No Live Progress Bar
- **Description**: When an audit is running, the status shows `RUNNING` but there is no granular progress bar (e.g., "Step 2 of 5").
- **Workaround**: Wait for the status to change to `COMPLETED`. Refresh the page if it seems stuck.

### 3. Missing Export Formats
- **Description**: Reports can currently only be viewed in-app.
- **Workaround**: You can print the page to PDF as a temporary workaround. Native PDF/CSV exports are prioritized for post-beta.
