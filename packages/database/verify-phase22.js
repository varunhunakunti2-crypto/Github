const { prisma } = require('@gitforge/database');
const { NotificationDispatchService } = require('../../backend/dist/services/notification/notification-dispatch.service');
const { NotificationService } = require('../../backend/dist/services/notification/notification.service');

async function runTests() {
  console.log("Running Phase 22 Notifications End-to-End Verification Tests...");

  let emailSentCount = 0;
  const dispatchService = new NotificationDispatchService({
    sendNotificationEmail: async (email, subject, body) => {
      emailSentCount++;
      return { message: "sent" };
    }
  });

  const notificationService = new NotificationService();

  // Load seeded data
  const appi = await prisma.user.findUnique({ where: { username: 'appi' } });
  const searchmember = await prisma.user.findUnique({ where: { username: 'searchmember' } });
  const muteduser = await prisma.user.findUnique({ where: { username: 'muteduser' } });
  const repo = await prisma.repository.findFirst({ where: { name: 'notifications-test-repo' } });

  const recordResult = (num, name, status, evidence, notes) => {
    console.log(`Test ${num} | ${status} | ${evidence} | ${notes}`);
  };

  // Clear previous notifications
  await prisma.notification.deleteMany({});

  // 1. Trigger PR review request -> Reviewer gets exactly one notification
  try {
    await dispatchService.dispatch({
      recipientId: searchmember.id,
      senderId: appi.id,
      repositoryId: repo.id,
      notifiableType: "PullRequest",
      notifiableId: "pr-1",
      reason: "REVIEW_REQUESTED",
      title: "Review requested on PR #2",
      body: "Please review",
      url: "/repo/pr/2"
    });

    const notifs = await prisma.notification.findMany({
      where: { recipientId: searchmember.id, reason: "REVIEW_REQUESTED" }
    });

    if (notifs.length === 1 && notifs[0].reason === "REVIEW_REQUESTED") {
      recordResult(1, "PR review request type", "PASS", "received exactly 1 notification with reason REVIEW_REQUESTED", "");
    } else {
      recordResult(1, "PR review request type", "FAIL", `found ${notifs.length} notifications`, "");
    }
  } catch (e) {
    recordResult(1, "PR review request type", "FAIL", e.message, "");
  }

  // 2. Trigger action author does NOT get notification about own action
  try {
    const countBefore = await prisma.notification.count({ where: { recipientId: appi.id } });
    await dispatchService.dispatch({
      recipientId: appi.id,
      senderId: appi.id,
      repositoryId: repo.id,
      notifiableType: "PullRequest",
      notifiableId: "pr-1",
      reason: "REVIEW_REQUESTED",
      title: "Self PR request",
      body: "Self action",
      url: "/repo/pr/2"
    });
    const countAfter = await prisma.notification.count({ where: { recipientId: appi.id } });

    if (countBefore === countAfter) {
      recordResult(2, "Self-action protection", "PASS", "no notification created for own action", "");
    } else {
      recordResult(2, "Self-action protection", "FAIL", `count increased from ${countBefore} to ${countAfter}`, "");
    }
  } catch (e) {
    recordResult(2, "Self-action protection", "FAIL", e.message, "");
  }

  // 3. BLOCKING: Mute thread -> confirm NO notification is created at all
  try {
    await prisma.notification.create({
      data: {
        recipientId: searchmember.id,
        senderId: searchmember.id,
        repositoryId: repo.id,
        notifiableType: "Issue",
        notifiableId: "issue-999",
        reason: "subscribed",
        title: "Muted Issue",
        body: "Muted",
        url: "",
        isRead: true,
        isUnsubscribed: true
      }
    });

    const countBefore = await prisma.notification.count({
      where: { recipientId: searchmember.id, notifiableId: "issue-999" }
    });

    await dispatchService.dispatch({
      recipientId: searchmember.id,
      senderId: appi.id,
      repositoryId: repo.id,
      notifiableType: "Issue",
      notifiableId: "issue-999",
      reason: "MENTION",
      title: "Mentioned on muted issue",
      body: "Hey check this",
      url: "/repo/issue/999"
    });

    const countAfter = await prisma.notification.count({
      where: { recipientId: searchmember.id, notifiableId: "issue-999" }
    });

    if (countBefore === countAfter) {
      recordResult(3, "Mute thread deliveries", "PASS", "no new notifications created in database", "BLOCKING CHECK PASSED");
    } else {
      recordResult(3, "Mute thread deliveries", "FAIL", `notifications count increased by ${countAfter - countBefore}`, "BLOCKING CHECK FAILED");
    }
  } catch (e) {
    recordResult(3, "Mute thread deliveries", "FAIL", e.message, "");
  }

  // 4. Trigger 3 rapid similar events -> confirm deduplication collapses them
  try {
    const beforeCount = await prisma.notification.count({
      where: { recipientId: searchmember.id, notifiableId: "pr-2", reason: "MENTION" }
    });

    // Send 3 duplicate mentions in quick succession
    await dispatchService.dispatch({
      recipientId: searchmember.id,
      senderId: appi.id,
      repositoryId: repo.id,
      notifiableType: "PullRequest",
      notifiableId: "pr-2",
      reason: "MENTION",
      title: "Mention 1",
      body: "Mention text",
      url: "/repo/pr/2"
    });

    await dispatchService.dispatch({
      recipientId: searchmember.id,
      senderId: appi.id,
      repositoryId: repo.id,
      notifiableType: "PullRequest",
      notifiableId: "pr-2",
      reason: "MENTION",
      title: "Mention 2",
      body: "Mention text",
      url: "/repo/pr/2"
    });

    await dispatchService.dispatch({
      recipientId: searchmember.id,
      senderId: appi.id,
      repositoryId: repo.id,
      notifiableType: "PullRequest",
      notifiableId: "pr-2",
      reason: "MENTION",
      title: "Mention 3",
      body: "Mention text",
      url: "/repo/pr/2"
    });

    const afterCount = await prisma.notification.count({
      where: { recipientId: searchmember.id, notifiableId: "pr-2", reason: "MENTION" }
    });

    if (afterCount - beforeCount === 1) {
      recordResult(4, "Collapsing duplicate dispatches", "PASS", "3 rapid events collapsed to 1 notification in database", "");
    } else {
      recordResult(4, "Collapsing duplicate dispatches", "FAIL", `created ${afterCount - beforeCount} notifications`, "");
    }
  } catch (e) {
    recordResult(4, "Collapsing duplicate dispatches", "FAIL", e.message, "");
  }

  // 10. Email immediate preference -> sends email
  try {
    emailSentCount = 0;
    await dispatchService.dispatch({
      recipientId: searchmember.id,
      senderId: appi.id,
      repositoryId: repo.id,
      notifiableType: "Issue",
      notifiableId: "issue-abc",
      reason: "ASSIGN",
      title: "Assign immediate",
      body: "Assigned",
      url: "/repo/issue/abc"
    });

    if (emailSentCount === 1) {
      recordResult(10, "Email immediate preference", "PASS", "sent immediate transactional email", "");
    } else {
      recordResult(10, "Email immediate preference", "FAIL", `emails sent count is ${emailSentCount}`, "");
    }
  } catch (e) {
    recordResult(10, "Email immediate preference", "FAIL", e.message, "");
  }

  // 11. Email OFF preference -> no email
  try {
    emailSentCount = 0;
    await dispatchService.dispatch({
      recipientId: muteduser.id,
      senderId: appi.id,
      repositoryId: repo.id,
      notifiableType: "Issue",
      notifiableId: "issue-abc",
      reason: "ASSIGN",
      title: "Assign off preference",
      body: "Assigned",
      url: "/repo/issue/abc"
    });

    if (emailSentCount === 0) {
      recordResult(11, "Email OFF preference", "PASS", "no email sent for users with email notifications off", "");
    } else {
      recordResult(11, "Email OFF preference", "FAIL", `sent ${emailSentCount} emails`, "");
    }
  } catch (e) {
    recordResult(11, "Email OFF preference", "FAIL", e.message, "");
  }

  // 12. BLOCKING: Email muted thread -> no email sent
  try {
    emailSentCount = 0;
    // Deliver to searchmember (immediate preference) but on muted issue-999 thread
    await dispatchService.dispatch({
      recipientId: searchmember.id,
      senderId: appi.id,
      repositoryId: repo.id,
      notifiableType: "Issue",
      notifiableId: "issue-999",
      reason: "MENTION",
      title: "Muted thread email attempt",
      body: "Attempting",
      url: "/repo/issue/999"
    });

    if (emailSentCount === 0) {
      recordResult(12, "Muted thread email check", "PASS", "no email sent for muted thread", "BLOCKING CHECK PASSED");
    } else {
      recordResult(12, "Muted thread email check", "FAIL", `sent ${emailSentCount} emails on muted thread`, "BLOCKING CHECK FAILED");
    }
  } catch (e) {
    recordResult(12, "Muted thread email check", "FAIL", e.message, "");
  }

  // 13. Direct unsubscribe email link confirms unsubscribe
  try {
    await notificationService.unsubscribeThreadDirect("Issue", "issue-unsub", searchmember.id);
    const mutedItem = await prisma.notification.findFirst({
      where: { recipientId: searchmember.id, notifiableType: "Issue", notifiableId: "issue-unsub", isUnsubscribed: true }
    });

    if (mutedItem) {
      recordResult(13, "Direct unsubscribe link verification", "PASS", "unsubscribed from specific thread", "");
    } else {
      recordResult(13, "Direct unsubscribe link verification", "FAIL", "thread not muted", "");
    }
  } catch (e) {
    recordResult(13, "Direct unsubscribe link verification", "FAIL", e.message, "");
  }

  console.log("\nNotifications End-to-End Tests Completed.");
}

runTests();
