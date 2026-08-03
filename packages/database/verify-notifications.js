const { prisma } = require('@gitforge/database');
const { NotificationDispatchService } = require('../../backend/dist/services/notification/notification-dispatch.service');

async function runTests() {
  console.log("Running Phase 22 Notifications Verification Tests...");

  const dispatchService = new NotificationDispatchService({
    sendNotificationEmail: async (email, subject, body) => {
      console.log(`[MOCK EMAIL] Sent to: ${email} | Subject: ${subject}`);
      return { message: "sent" };
    }
  });

  // Load seeded users & repository
  const appi = await prisma.user.findUnique({ where: { username: 'appi' } });
  const searchmember = await prisma.user.findUnique({ where: { username: 'searchmember' } });
  const publicRepo = await prisma.repository.findFirst({ where: { name: 'distinct-public-repo' } });

  const results = [];
  const recordResult = (num, name, status, evidence) => {
    results.push({ num, name, status, evidence });
    console.log(`Test ${num}: [${status}] - ${name} | Evidence: ${evidence}`);
  };

  // Clear notifications for clean run
  await prisma.notification.deleteMany({});

  // 1. Verify dispatch creates a notification successfully
  try {
    await dispatchService.dispatch({
      recipientId: searchmember.id,
      senderId: appi.id,
      repositoryId: publicRepo.id,
      notifiableType: "Issue",
      notifiableId: "issue-1234",
      reason: "ASSIGN",
      title: "Assigned to code review",
      body: "Please review the PR",
      url: "/repo/issue/1"
    });

    const notif = await prisma.notification.findFirst({
      where: { recipientId: searchmember.id, reason: "ASSIGN" }
    });

    if (notif) {
      recordResult(1, "Create Notification Dispatch", "PASS", `Notification ID: ${notif.id}`);
    } else {
      recordResult(1, "Create Notification Dispatch", "FAIL", "No notification found in database");
    }
  } catch (e) {
    recordResult(1, "Create Notification Dispatch", "FAIL", e.message);
  }

  // 2. Verify self-notification is blocked
  try {
    const beforeCount = await prisma.notification.count();
    await dispatchService.dispatch({
      recipientId: appi.id,
      senderId: appi.id,
      repositoryId: publicRepo.id,
      notifiableType: "Issue",
      notifiableId: "issue-1234",
      reason: "MENTION",
      title: "Self Mention",
      body: "Mentioned myself",
      url: "/repo/issue/1"
    });
    const afterCount = await prisma.notification.count();

    if (beforeCount === afterCount) {
      recordResult(2, "Self-notification protection", "PASS", "Blocked notification to self");
    } else {
      recordResult(2, "Self-notification protection", "FAIL", `Count increased from ${beforeCount} to ${afterCount}`);
    }
  } catch (e) {
    recordResult(2, "Self-notification protection", "FAIL", e.message);
  }

  // 3. Verify deduplication within 1 minute
  try {
    const beforeCount = await prisma.notification.count();
    
    // Call dispatch again with same notifiableId, recipient, and reason
    await dispatchService.dispatch({
      recipientId: searchmember.id,
      senderId: appi.id,
      repositoryId: publicRepo.id,
      notifiableType: "Issue",
      notifiableId: "issue-1234",
      reason: "ASSIGN",
      title: "Assigned to code review duplicate",
      body: "Please review the PR again",
      url: "/repo/issue/1"
    });

    const afterCount = await prisma.notification.count();
    if (beforeCount === afterCount) {
      recordResult(3, "Notification deduplication", "PASS", "Duplicate request within 1 minute collapsed/ignored");
    } else {
      recordResult(3, "Notification deduplication", "FAIL", "Duplicate notification row created");
    }
  } catch (e) {
    recordResult(3, "Notification deduplication", "FAIL", e.message);
  }

  // 4. Verify thread-mute (isUnsubscribed) stops delivery
  try {
    // Let's create a muted thread rule
    await prisma.notification.create({
      data: {
        recipientId: searchmember.id,
        senderId: searchmember.id,
        repositoryId: publicRepo.id,
        notifiableType: "Issue",
        notifiableId: "muted-issue-999",
        reason: "subscribed",
        title: "Dummy Muted",
        body: "Dummy",
        url: "",
        isRead: true,
        isUnsubscribed: true
      }
    });

    const beforeCount = await prisma.notification.count();

    // Try to dispatch a notification on the muted thread
    await dispatchService.dispatch({
      recipientId: searchmember.id,
      senderId: appi.id,
      repositoryId: publicRepo.id,
      notifiableType: "Issue",
      notifiableId: "muted-issue-999",
      reason: "MENTION",
      title: "Mentioned on muted thread",
      body: "Hey read this",
      url: "/repo/issue/999"
    });

    const afterCount = await prisma.notification.count();
    if (beforeCount === afterCount) {
      recordResult(4, "Mute thread delivery exemption", "PASS", "Notifications on muted thread blocked");
    } else {
      recordResult(4, "Mute thread delivery exemption", "FAIL", "Notification allowed on muted thread");
    }
  } catch (e) {
    recordResult(4, "Mute thread delivery exemption", "FAIL", e.message);
  }

  console.log("\nNotification Verification Tests Completed.");
}

runTests();
