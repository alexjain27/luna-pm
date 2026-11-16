const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data in dependency order
  await prisma.invoiceLineItem.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.projectMemberRate.deleteMany();
  await prisma.billingSettings.deleteMany();
  await prisma.taskCommentFile.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskApproval.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.taskFile.deleteMany();
  await prisma.listTask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.list.deleteMany();
  await prisma.projectCustomFieldValue.deleteMany();
  await prisma.workspaceCustomField.deleteMany();
  await prisma.projectMessage.deleteMany();
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.project.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
  await prisma.taskStatus.deleteMany();

  // ── Users ──────────────────────────────────────────────

  const adminUser = await prisma.user.create({
    data: { name: "Luna Admin", email: "admin@lunapm.local", role: "ADMIN" },
  });

  const samUser = await prisma.user.create({
    data: { name: "Sam Chen", email: "sam@lunapm.local", role: "ADMIN" },
  });

  const avaUser = await prisma.user.create({
    data: { name: "Ava Martinez", email: "ava@crescent.local", role: "CLIENT" },
  });

  // ── Workspaces ─────────────────────────────────────────

  const crescentWorkspace = await prisma.workspace.create({
    data: {
      name: "Crescent Interiors",
      slug: "crescent-interiors",
      type: "CLIENT",
      address: "120 Wythe Ave, Brooklyn, NY 11249",
      primaryUserId: avaUser.id,
    },
  });

  const internalWorkspace = await prisma.workspace.create({
    data: {
      name: "Internal Ops",
      slug: "internal-ops",
      type: "COMPANY",
      address: "85 Broad St, New York, NY 10004",
    },
  });

  await prisma.user.update({
    where: { id: avaUser.id },
    data: { workspaceId: crescentWorkspace.id },
  });

  // ── Custom Fields ──────────────────────────────────────

  const contractorField = await prisma.workspaceCustomField.create({
    data: {
      workspaceId: crescentWorkspace.id,
      name: "Contractor",
      type: "TEXT",
      options: [],
      order: 1,
    },
  });

  const styleField = await prisma.workspaceCustomField.create({
    data: {
      workspaceId: crescentWorkspace.id,
      name: "Style Preference",
      type: "SELECT",
      options: ["Modern", "Traditional", "Transitional", "Minimalist"],
      order: 2,
    },
  });

  // ── Task Statuses ──────────────────────────────────────

  const statusTodo = await prisma.taskStatus.create({
    data: { name: "To do", color: "#E4E4E7", order: 1, isDefault: true },
  });
  const statusInProgress = await prisma.taskStatus.create({
    data: { name: "In progress", color: "#BFDBFE", order: 2 },
  });
  const statusReview = await prisma.taskStatus.create({
    data: { name: "Ready for review", color: "#FDE68A", order: 3 },
  });
  const statusOnHold = await prisma.taskStatus.create({
    data: { name: "On hold", color: "#FCA5A5", order: 4 },
  });
  const statusDone = await prisma.taskStatus.create({
    data: { name: "Done", color: "#BBF7D0", order: 5 },
  });

  // ── Projects (Crescent Interiors) ──────────────────────

  const brooklynProject = await prisma.project.create({
    data: {
      workspaceId: crescentWorkspace.id,
      name: "Brooklyn Brownstone Refresh",
      status: "ACTIVE",
      description:
        "Full interior refresh of a classic Brooklyn brownstone. Living room, kitchen, and master bedroom.",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-06-30"),
    },
  });

  const tribecaProject = await prisma.project.create({
    data: {
      workspaceId: crescentWorkspace.id,
      name: "Tribeca Loft Styling",
      status: "PENDING",
      description: "Modern styling for a converted warehouse loft in Tribeca.",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-08-15"),
    },
  });

  const sohoProject = await prisma.project.create({
    data: {
      workspaceId: crescentWorkspace.id,
      name: "SoHo Showroom Launch",
      status: "INTAKE",
      description: "Design and setup of a new retail showroom in SoHo.",
    },
  });

  // ── Projects (Internal Ops) ────────────────────────────

  const websiteProject = await prisma.project.create({
    data: {
      workspaceId: internalWorkspace.id,
      name: "Website Redesign",
      status: "ACTIVE",
      description:
        "Redesign the company website with updated branding and portfolio.",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-04-30"),
    },
  });

  // ── Custom Field Values ────────────────────────────────

  await prisma.projectCustomFieldValue.createMany({
    data: [
      { projectId: brooklynProject.id, customFieldId: contractorField.id, value: "Atlas Build Co" },
      { projectId: brooklynProject.id, customFieldId: styleField.id, value: "Transitional" },
      { projectId: tribecaProject.id, customFieldId: styleField.id, value: "Modern" },
    ],
  });

  // ── Lists ──────────────────────────────────────────────

  const designList = await prisma.list.create({
    data: { projectId: brooklynProject.id, name: "Design Planning" },
  });
  const procurementList = await prisma.list.create({
    data: { projectId: brooklynProject.id, name: "Procurement" },
  });
  const installationList = await prisma.list.create({
    data: { projectId: brooklynProject.id, name: "Installation" },
  });
  const stylingList = await prisma.list.create({
    data: { projectId: tribecaProject.id, name: "Styling" },
  });
  const designPhaseList = await prisma.list.create({
    data: { projectId: websiteProject.id, name: "Design Phase" },
  });

  // ── Tasks ──────────────────────────────────────────────

  // 1. Workspace implicit list (no project)
  await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      statusId: statusTodo.id,
      name: "General vendor follow-up",
      description: "Follow up with all active vendors on pricing and availability.",
      ownerId: adminUser.id,
      priority: "NORMAL",
    },
  });

  // 2. Direct project tasks (no list) — Brooklyn
  await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      statusId: statusDone.id,
      name: "Initial client meeting",
      description: "Kickoff meeting with the client to discuss vision and budget.",
      ownerId: adminUser.id,
      dueDate: new Date("2026-01-20"),
      priority: "HIGH",
    },
  });

  const floorPlanTask = await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      statusId: statusDone.id,
      name: "Review floor plan measurements",
      ownerId: adminUser.id,
      dueDate: new Date("2026-01-25"),
      priority: "NORMAL",
    },
  });

  // 3. Task in Design Planning list + subtasks
  const moodboardTask = await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      statusId: statusInProgress.id,
      name: "Finalize mood board",
      description:
        "Create and finalize the mood board for the living room and kitchen.",
      ownerId: samUser.id,
      dueDate: new Date("2026-02-28"),
      priority: "HIGH",
    },
  });
  await prisma.listTask.create({ data: { listId: designList.id, taskId: moodboardTask.id } });

  // Subtasks
  await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      statusId: statusDone.id,
      name: "Select color palette",
      ownerId: samUser.id,
      parentTaskId: moodboardTask.id,
    },
  });
  await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      statusId: statusInProgress.id,
      name: "Choose fabric samples",
      ownerId: samUser.id,
      parentTaskId: moodboardTask.id,
    },
  });
  await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      statusId: statusTodo.id,
      name: "Create presentation deck",
      ownerId: samUser.id,
      parentTaskId: moodboardTask.id,
      dueDate: new Date("2026-02-25"),
    },
  });

  // 4. Task in Procurement (with approval)
  const pendantTask = await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      statusId: statusReview.id,
      name: "Approve pendant light selection",
      description:
        "Client needs to approve final pendant light options for the kitchen island.",
      ownerId: adminUser.id,
      dueDate: new Date("2026-03-10"),
      priority: "URGENT",
      requiresApproval: true,
    },
  });
  await prisma.listTask.create({ data: { listId: procurementList.id, taskId: pendantTask.id } });
  await prisma.taskApproval.create({ data: { taskId: pendantTask.id, status: "PENDING" } });

  // 5. Task in MULTIPLE lists (Design Planning + Procurement)
  const sourcePendantsTask = await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      statusId: statusInProgress.id,
      name: "Source pendant lights",
      description: "Research and source pendant light options from three vendors.",
      ownerId: samUser.id,
      dueDate: new Date("2026-03-01"),
      priority: "HIGH",
    },
  });
  await prisma.listTask.create({ data: { listId: designList.id, taskId: sourcePendantsTask.id } });
  await prisma.listTask.create({ data: { listId: procurementList.id, taskId: sourcePendantsTask.id } });

  // 6. Installation tasks
  const kitchenInstallTask = await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      statusId: statusTodo.id,
      name: "Schedule kitchen island installation",
      description: "Coordinate with Atlas Build Co on kitchen island delivery and install dates.",
      ownerId: adminUser.id,
      dueDate: new Date("2026-04-15"),
    },
  });
  await prisma.listTask.create({ data: { listId: installationList.id, taskId: kitchenInstallTask.id } });

  const lightingInstallTask = await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      statusId: statusOnHold.id,
      name: "Install living room lighting",
      description: "Waiting on pendant approval before scheduling electrician.",
    },
  });
  await prisma.listTask.create({ data: { listId: installationList.id, taskId: lightingInstallTask.id } });

  // 7. Tribeca tasks
  const artworkTask = await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: tribecaProject.id,
      statusId: statusTodo.id,
      name: "Artwork shortlist",
      description: "Curate a shortlist of artwork pieces for the main living area.",
      ownerId: samUser.id,
      dueDate: new Date("2026-04-01"),
      requiresApproval: true,
    },
  });
  await prisma.listTask.create({ data: { listId: stylingList.id, taskId: artworkTask.id } });
  await prisma.taskApproval.create({ data: { taskId: artworkTask.id, status: "PENDING" } });

  const furnitureTask = await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: tribecaProject.id,
      statusId: statusTodo.id,
      name: "Select furniture pieces",
      description: "Choose sofa, dining table, and accent chairs.",
      ownerId: adminUser.id,
      dueDate: new Date("2026-03-20"),
      priority: "HIGH",
    },
  });
  await prisma.listTask.create({ data: { listId: stylingList.id, taskId: furnitureTask.id } });

  // Direct task on Tribeca
  await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: tribecaProject.id,
      statusId: statusInProgress.id,
      name: "Complete site survey",
      description: "Measure all rooms and document existing conditions.",
      ownerId: adminUser.id,
      priority: "URGENT",
      dueDate: new Date("2026-02-20"),
    },
  });

  // 8. SoHo task (direct on project)
  await prisma.task.create({
    data: {
      workspaceId: crescentWorkspace.id,
      projectId: sohoProject.id,
      statusId: statusTodo.id,
      name: "Define showroom scope",
      description: "Outline square footage needs, fixture requirements, and layout.",
      ownerId: adminUser.id,
    },
  });

  // 9. Internal Ops tasks
  const wireframesTask = await prisma.task.create({
    data: {
      workspaceId: internalWorkspace.id,
      projectId: websiteProject.id,
      statusId: statusInProgress.id,
      name: "Create wireframes",
      description: "Design wireframes for homepage, portfolio, and contact pages.",
      ownerId: samUser.id,
      dueDate: new Date("2026-02-28"),
      priority: "HIGH",
    },
  });
  await prisma.listTask.create({ data: { listId: designPhaseList.id, taskId: wireframesTask.id } });

  const brandGuideTask = await prisma.task.create({
    data: {
      workspaceId: internalWorkspace.id,
      projectId: websiteProject.id,
      statusId: statusDone.id,
      name: "Finalize brand guidelines",
      description: "Complete the updated brand guide with new color palette and typography.",
      ownerId: adminUser.id,
    },
  });
  await prisma.listTask.create({ data: { listId: designPhaseList.id, taskId: brandGuideTask.id } });

  await prisma.task.create({
    data: {
      workspaceId: internalWorkspace.id,
      projectId: websiteProject.id,
      statusId: statusTodo.id,
      name: "Write website copy",
      description: "Draft copy for all pages including About, Services, and Contact.",
      ownerId: adminUser.id,
      dueDate: new Date("2026-03-15"),
    },
  });

  // ── Task Dependencies ──────────────────────────────────

  await prisma.taskDependency.create({
    data: { taskId: lightingInstallTask.id, dependsOnId: pendantTask.id },
  });

  // ── Comments (threaded) ────────────────────────────────

  const comment1 = await prisma.taskComment.create({
    data: {
      taskId: pendantTask.id,
      authorId: adminUser.id,
      body: "I've narrowed it down to three options from West Elm and one from Rejuvenation. Photos attached.",
    },
  });

  await prisma.taskComment.create({
    data: {
      taskId: pendantTask.id,
      authorId: avaUser.id,
      parentCommentId: comment1.id,
      body: "Love the Rejuvenation option! Can we get it in brass instead of black?",
    },
  });

  await prisma.taskComment.create({
    data: {
      taskId: pendantTask.id,
      authorId: adminUser.id,
      parentCommentId: comment1.id,
      body: "Yes, they offer it in aged brass. I'll request a swatch and updated pricing.",
    },
  });

  await prisma.taskComment.create({
    data: {
      taskId: moodboardTask.id,
      authorId: avaUser.id,
      body: "Can we lean more warm and earthy? Less cool tones please.",
    },
  });

  // ── Folders & Files ────────────────────────────────────

  const clientDocsFolder = await prisma.folder.create({
    data: { name: "Client Docs", workspaceId: crescentWorkspace.id },
  });

  const brooklynAssetsFolder = await prisma.folder.create({
    data: {
      name: "Project Assets",
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
    },
  });

  const conceptsFolder = await prisma.folder.create({
    data: {
      name: "Concepts",
      parentId: brooklynAssetsFolder.id,
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
    },
  });

  const tribecaAssetsFolder = await prisma.folder.create({
    data: {
      name: "Project Assets",
      workspaceId: crescentWorkspace.id,
      projectId: tribecaProject.id,
    },
  });

  const internalDocsFolder = await prisma.folder.create({
    data: { name: "Internal Docs", workspaceId: internalWorkspace.id },
  });

  await prisma.file.create({
    data: {
      filename: "Client brief.pdf",
      s3Key: "crescent/client-docs/client-brief.pdf",
      size: 245000,
      mimeType: "application/pdf",
      uploaderId: adminUser.id,
      workspaceId: crescentWorkspace.id,
      folderId: clientDocsFolder.id,
    },
  });

  const renderFile = await prisma.file.create({
    data: {
      filename: "Living room render v3.png",
      s3Key: "crescent/brooklyn/concepts/living-room-v3.png",
      size: 3200000,
      mimeType: "image/png",
      uploaderId: samUser.id,
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      folderId: conceptsFolder.id,
    },
  });

  const floorPlanFile = await prisma.file.create({
    data: {
      filename: "Floor plan measurements.pdf",
      s3Key: "crescent/brooklyn/floor-plan.pdf",
      size: 890000,
      mimeType: "application/pdf",
      uploaderId: adminUser.id,
      workspaceId: crescentWorkspace.id,
      projectId: brooklynProject.id,
      folderId: brooklynAssetsFolder.id,
    },
  });

  await prisma.file.create({
    data: {
      filename: "Loft style guide.pdf",
      s3Key: "crescent/tribeca/style-guide.pdf",
      size: 1500000,
      mimeType: "application/pdf",
      uploaderId: adminUser.id,
      workspaceId: crescentWorkspace.id,
      projectId: tribecaProject.id,
      folderId: tribecaAssetsFolder.id,
    },
  });

  await prisma.file.create({
    data: {
      filename: "Brand guidelines.pdf",
      s3Key: "internal/brand-guidelines.pdf",
      size: 2100000,
      mimeType: "application/pdf",
      uploaderId: adminUser.id,
      workspaceId: internalWorkspace.id,
      folderId: internalDocsFolder.id,
    },
  });

  // Link files to tasks
  await prisma.taskFile.createMany({
    data: [
      { taskId: floorPlanTask.id, fileId: floorPlanFile.id },
      { taskId: moodboardTask.id, fileId: renderFile.id },
    ],
  });

  // Comment file attachments
  await prisma.taskCommentFile.createMany({
    data: [
      {
        taskCommentId: comment1.id,
        uploaderId: adminUser.id,
        filename: "Pendant-Option-A.jpg",
        s3Key: "crescent/brooklyn/pendant-a.jpg",
        size: 420000,
        mimeType: "image/jpeg",
      },
      {
        taskCommentId: comment1.id,
        uploaderId: adminUser.id,
        filename: "Pendant-Option-B.jpg",
        s3Key: "crescent/brooklyn/pendant-b.jpg",
        size: 380000,
        mimeType: "image/jpeg",
      },
    ],
  });

  // ── Project Messages ───────────────────────────────────

  await prisma.projectMessage.create({
    data: {
      projectId: brooklynProject.id,
      authorId: adminUser.id,
      body: "Kitchen island countertop samples arrived. Will bring them to our next site visit.",
    },
  });

  await prisma.projectMessage.create({
    data: {
      projectId: brooklynProject.id,
      authorId: avaUser.id,
      body: "Great! Looking forward to seeing them. Can we schedule for Thursday?",
    },
  });


  // ── Time tracking, expenses & invoicing ───────────────
  // Dates are relative to today so the timesheet always has recent data.

  const DAY = 24 * 60 * 60 * 1000;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysAgo = (n) => new Date(todayUtc - n * DAY);
  const isWeekend = (d) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

  await prisma.billingSettings.create({
    data: {
      id: "default",
      companyName: "Luna Design Studio",
      companyAddress: "85 Broad St\nNew York, NY 10004",
      currency: "USD",
      invoicePrefix: "INV-",
      nextInvoiceNumber: 1001,
      defaultTaxRate: 0,
      paymentTermsDays: 30,
      invoiceNotes: "Payment by ACH or check within 30 days. Thank you!",
    },
  });

  await prisma.user.update({ where: { id: adminUser.id }, data: { defaultRateCents: 15000 } });
  await prisma.user.update({ where: { id: samUser.id }, data: { defaultRateCents: 9500 } });

  await prisma.project.update({
    where: { id: brooklynProject.id },
    data: { hourlyRateCents: 14000, budgetMinutes: 120 * 60 },
  });
  await prisma.project.update({
    where: { id: tribecaProject.id },
    data: { hourlyRateCents: 12500, budgetMinutes: 40 * 60 },
  });
  await prisma.project.update({ where: { id: websiteProject.id }, data: { billable: false } });
  await prisma.projectMemberRate.create({
    data: { projectId: brooklynProject.id, userId: adminUser.id, hourlyRateCents: 17500 },
  });

  const rateFor = { [brooklynProject.id]: { [adminUser.id]: 17500, [samUser.id]: 14000 }, [tribecaProject.id]: { [adminUser.id]: 12500, [samUser.id]: 12500 } };

  const [materials, travel, samples, delivery] = await Promise.all(
    ["Materials", "Travel", "Samples", "Delivery"].map((name) => prisma.expenseCategory.create({ data: { name } }))
  );

  // Work pattern: [projectId, taskId, userId, minutes, notes]
  const pattern = [
    [brooklynProject.id, floorPlanTask.id, adminUser.id, 120, "Revised kitchen layout"],
    [brooklynProject.id, moodboardTask.id, samUser.id, 90, "Living room palette options"],
    [brooklynProject.id, sourcePendantsTask.id, samUser.id, 60, "Vendor calls for pendants"],
    [tribecaProject.id, artworkTask.id, adminUser.id, 75, "Gallery visit, shortlist"],
    [tribecaProject.id, furnitureTask.id, samUser.id, 105, "Sofa + rug sourcing"],
    [websiteProject.id, wireframesTask.id, samUser.id, 45, "Homepage wireframe"],
    [brooklynProject.id, null, adminUser.id, 30, "Client check-in call"],
    [websiteProject.id, brandGuideTask.id, adminUser.id, 60, "Type + color tokens"],
  ];

  const entries = [];
  for (let n = 45; n >= 1; n--) {
    const date = daysAgo(n);
    if (isWeekend(date)) continue;
    // 3 entries per weekday, rotating through the pattern
    for (let k = 0; k < 3; k++) {
      const [projectId, taskId, userId, minutes, notes] = pattern[(n * 3 + k) % pattern.length];
      const billable = projectId !== websiteProject.id;
      entries.push({
        userId,
        projectId,
        taskId,
        date,
        minutes: minutes + ((n + k) % 3) * 15,
        notes,
        billable,
        rateCents: billable ? rateFor[projectId][userId] : 0,
      });
    }
  }
  // Today: one finished entry and a running timer for the admin user
  entries.push({
    userId: adminUser.id,
    projectId: brooklynProject.id,
    taskId: kitchenInstallTask.id,
    date: daysAgo(0),
    minutes: 45,
    notes: "Site walk with contractor",
    billable: true,
    rateCents: 17500,
  });
  entries.push({
    userId: adminUser.id,
    projectId: tribecaProject.id,
    taskId: furnitureTask.id,
    date: daysAgo(0),
    minutes: 20,
    notes: "Finalize furniture order",
    billable: true,
    rateCents: 12500,
    timerStartedAt: new Date(Date.now() - 12 * 60 * 1000),
  });
  await prisma.timeEntry.createMany({ data: entries });

  await prisma.expense.createMany({
    data: [
      { userId: adminUser.id, projectId: brooklynProject.id, categoryId: samples.id, date: daysAgo(40), amountCents: 18500, notes: "Tile samples", billable: true },
      { userId: samUser.id, projectId: brooklynProject.id, categoryId: travel.id, date: daysAgo(33), amountCents: 4200, notes: "Car service to showroom", billable: true },
      { userId: samUser.id, projectId: tribecaProject.id, categoryId: delivery.id, date: daysAgo(12), amountCents: 22500, notes: "Rug delivery", billable: true },
      { userId: adminUser.id, projectId: brooklynProject.id, categoryId: materials.id, date: daysAgo(6), amountCents: 64000, notes: "Wallpaper — 4 rolls", billable: true },
      { userId: adminUser.id, projectId: websiteProject.id, categoryId: materials.id, date: daysAgo(9), amountCents: 2900, notes: "Font license", billable: false },
    ],
  });

  // Invoice older work: one paid invoice (days 45–31) and one sent invoice (days 30–16)
  async function seedInvoice(number, fromDays, toDays, status) {
    const where = {
      project: { workspaceId: crescentWorkspace.id },
      billable: true,
      invoiceId: null,
      date: { gte: daysAgo(fromDays), lte: daysAgo(toDays) },
    };
    const [time, exps] = await Promise.all([
      prisma.timeEntry.findMany({ where: { ...where, timerStartedAt: null }, include: { project: true, task: true } }),
      prisma.expense.findMany({ where, include: { project: true, category: true } }),
    ]);
    const groups = new Map();
    for (const e of time) {
      const key = `${e.projectId}|${e.taskId ?? ""}|${e.rateCents}`;
      const g = groups.get(key) ?? { description: `${e.project.name} — ${e.task ? e.task.name : "General"}`, minutes: 0, rateCents: e.rateCents };
      g.minutes += e.minutes;
      groups.set(key, g);
    }
    const lines = [...groups.values()].map((g) => {
      const quantity = Math.round((g.minutes / 60) * 100) / 100;
      return { kind: "SERVICE", description: g.description, quantity, unitPriceCents: g.rateCents, amountCents: Math.round(quantity * g.rateCents) };
    });
    for (const x of exps) {
      lines.push({ kind: "EXPENSE", description: `${x.project.name} — ${x.category.name}: ${x.notes}`, quantity: 1, unitPriceCents: x.amountCents, amountCents: x.amountCents });
    }
    const issueDate = daysAgo(toDays - 1);
    const invoice = await prisma.invoice.create({
      data: {
        number,
        workspaceId: crescentWorkspace.id,
        status,
        subject: "Interior design services",
        issueDate,
        dueDate: new Date(issueDate.getTime() + 30 * DAY),
        periodStart: daysAgo(fromDays),
        periodEnd: daysAgo(toDays),
        notes: "Payment by ACH or check within 30 days. Thank you!",
        sentAt: issueDate,
        paidAt: status === "PAID" ? daysAgo(toDays - 10) : null,
        lineItems: { create: lines.map((l, i) => ({ ...l, order: i })) },
      },
    });
    await prisma.timeEntry.updateMany({ where: { id: { in: time.map((e) => e.id) } }, data: { invoiceId: invoice.id } });
    await prisma.expense.updateMany({ where: { id: { in: exps.map((e) => e.id) } }, data: { invoiceId: invoice.id } });
  }
  await seedInvoice("INV-1001", 45, 31, "PAID");
  await seedInvoice("INV-1002", 30, 16, "SENT");
  await prisma.billingSettings.update({ where: { id: "default" }, data: { nextInvoiceNumber: 1003 } });

  console.log("Seed complete.");
  console.log(`  Workspaces: ${crescentWorkspace.name}, ${internalWorkspace.name}`);
  console.log(`  Projects: 4`);
  console.log(`  Lists: 5`);
  console.log(`  Tasks: 18 (including 3 subtasks)`);
  console.log(`  Comments: 4 (with threading)`);
  console.log(`  Time entries: ${entries.length}, expenses: 5, invoices: 2`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
