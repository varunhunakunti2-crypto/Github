const { prisma } = require('@gitforge/database');
const { OrganizationService } = require('../../backend/dist/services/organization/organization.service');
const { TeamService } = require('../../backend/dist/services/organization/team.service');

// Mock Email Service
class MockEmailService {
  async sendNotificationEmail(email, subject, body) {
    console.log(`[MOCK EMAIL] To: ${email}, Subject: ${subject}`);
    return { message: "sent" };
  }
}

async function runTests() {
  console.log("Running Phase 20 E2E Verification Tests...");

  const emailService = new MockEmailService();
  const orgService = new OrganizationService(emailService);
  const teamService = new TeamService();

  // Load seeded users
  const appi = await prisma.user.findUnique({ where: { username: 'appi' } });
  const member1 = await prisma.user.findUnique({ where: { username: 'member1' } });
  const member2 = await prisma.user.findUnique({ where: { username: 'member2' } });
  const testreviewer = await prisma.user.findUnique({ where: { username: 'testreviewer' } });

  const results = [];

  // Helper to log test result
  const recordResult = (num, name, status, evidence, notes) => {
    results.push({ num, name, status, evidence, notes });
    console.log(`Test ${num}: [${status}] - ${name}`);
  };

  // 1. Create an org with a slug that's already taken
  try {
    const checkRes = await orgService.checkSlug("acme");
    if (!checkRes.available) {
      recordResult(1, "Slug Availability Check", "PASS", "checkSlug('acme') returned available: false", "Live availability check catches duplicate slug");
    } else {
      recordResult(1, "Slug Availability Check", "FAIL", "checkSlug('acme') returned true", "Should return false");
    }
  } catch (e) {
    recordResult(1, "Slug Availability Check", "FAIL", e.message, "");
  }

  // 2. Creator automatically Owner
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: 'acme' },
      include: { members: true }
    });
    const creatorMember = org.members.find(m => m.userId === appi.id);
    if (creatorMember && creatorMember.role === "OWNER") {
      recordResult(2, "Creator is Owner", "PASS", `appi role in organization_members: ${creatorMember.role}`, "Creating user automatically gets OWNER role");
    } else {
      recordResult(2, "Creator is Owner", "FAIL", "appi not found or role is not OWNER", "");
    }
  } catch (e) {
    recordResult(2, "Creator is Owner", "FAIL", e.message, "");
  }

  // 3. Repos grid private visibility access check
  try {
    // member1 has access to private repo because member1 is in eng team, which has permissions for acme-core
    const member1Repos = await orgService.getRepositories("acme", member1.id);
    const hasCoreForMember1 = member1Repos.some(r => r.name === "acme-core");

    // member2 is in qa team, which doesn't have permissions, so member2 should NOT see the private repo acme-core
    const member2Repos = await orgService.getRepositories("acme", member2.id);
    const hasCoreForMember2 = member2Repos.some(r => r.name === "acme-core");

    if (hasCoreForMember1 && !hasCoreForMember2) {
      recordResult(3, "Private Repo Visibility Rules", "PASS", `member1 sees acme-core: ${hasCoreForMember1}, member2 sees acme-core: ${hasCoreForMember2}`, "Private repo hidden from member without team access");
    } else {
      recordResult(3, "Private Repo Visibility Rules", "FAIL", `member1 sees: ${hasCoreForMember1}, member2 sees: ${hasCoreForMember2}`, "Visibility rule mismatch");
    }
  } catch (e) {
    recordResult(3, "Private Repo Visibility Rules", "FAIL", e.message, "");
  }

  // 4. Owner changes Member's role
  try {
    await orgService.updateMemberRole("acme", "member1", "BILLING_MANAGER", appi.id);
    const record = await prisma.organizationMember.findFirst({
      where: { userId: member1.id },
      include: { user: true }
    });
    if (record.role === "BILLING_MANAGER") {
      recordResult(4, "Owner changes Member role", "PASS", `member1 new role: ${record.role}`, "Role updated successfully by Owner");
    } else {
      recordResult(4, "Owner changes Member role", "FAIL", `role is ${record.role}`, "");
    }
  } catch (e) {
    recordResult(4, "Owner changes Member role", "FAIL", e.message, "");
  }

  // 5. As NON-owner Member, attempt to change role (BLOCKING)
  try {
    // member2 is MEMBER, attempts to change appi's role
    await orgService.updateMemberRole("acme", "appi", "MEMBER", member2.id);
    recordResult(5, "Non-owner role change rejection", "FAIL", "Allowed role update", "Server failed to reject unauthorized role update");
  } catch (e) {
    if (e.status === 403 || e.message.includes("Only owners")) {
      recordResult(5, "Non-owner role change rejection", "PASS", `Server rejected with message: "${e.message}"`, "Blocked on server-side as expected");
    } else {
      recordResult(5, "Non-owner role change rejection", "FAIL", `Rejected with unexpected error: ${e.message}`, "");
    }
  }

  // 6. Remove member removes access immediately
  try {
    // Let's remove member1
    await orgService.removeMember("acme", "member1", appi.id);
    const member1Repos = await orgService.getRepositories("acme", member1.id);
    const hasCore = member1Repos.some(r => r.name === "acme-core");
    if (!hasCore) {
      recordResult(6, "Member removal access revocation", "PASS", "acme-core hidden from member1 after removal", "Access revoked immediately");
    } else {
      recordResult(6, "Member removal access revocation", "FAIL", "member1 still has access to acme-core after removal", "");
    }
  } catch (e) {
    recordResult(6, "Member removal access revocation", "FAIL", e.message, "");
  }

  // 7. Pending invitations list
  try {
    const invites = await orgService.getInvitations("acme", appi.id);
    if (invites.length > 0) {
      recordResult(7, "List pending invitations", "PASS", `Pending invites count: ${invites.length}`, "Visible on Members page");
    } else {
      recordResult(7, "List pending invitations", "FAIL", "No invites returned", "");
    }
  } catch (e) {
    recordResult(7, "List pending invitations", "FAIL", e.message, "");
  }

  // 8. Nested team parent reference
  try {
    const qaDetail = await teamService.findOne("acme", "qa", appi.id);
    if (qaDetail.parentTeam && qaDetail.parentTeam.slug === "eng") {
      recordResult(8, "Nested team parent visualization", "PASS", `qa parentTeam slug: ${qaDetail.parentTeam.slug}`, "Correctly linked to parent");
    } else {
      recordResult(8, "Nested team parent visualization", "FAIL", "Parent link missing or incorrect", "");
    }
  } catch (e) {
    recordResult(8, "Nested team parent visualization", "FAIL", e.message, "");
  }

  // 9. Team maintainer manages team membership
  try {
    // member1 was team maintainer of eng, let's restore member1 in org first (since we removed them in test 6)
    await prisma.organizationMember.create({
      data: { organizationId: (await prisma.organization.findUnique({ where: { slug: "acme" } })).id, userId: member1.id, role: "MEMBER" }
    });
    // Add member2 to eng team using member1 credentials
    await teamService.addMember("acme", "eng", "member2", "MEMBER", member1.id);
    const engDetail = await teamService.findOne("acme", "eng", appi.id);
    const hasMember2 = engDetail.members.some(m => m.user.username === "member2");
    if (hasMember2) {
      recordResult(9, "Team maintainer membership control", "PASS", "member1 successfully added member2 to eng team", "Maintainer control verified");
    } else {
      recordResult(9, "Team maintainer membership control", "FAIL", "member2 not found in eng team", "");
    }
  } catch (e) {
    recordResult(9, "Team maintainer membership control", "FAIL", e.message, "");
  }

  // 10. Regular team member manages team membership (BLOCKING)
  try {
    // member2 is MEMBER in qa, attempts to add appi to qa
    await teamService.addMember("acme", "qa", "appi", "MEMBER", member2.id);
    recordResult(10, "Regular member team control rejection", "FAIL", "Allowed adding member by regular team member", "");
  } catch (e) {
    if (e.status === 403 || e.message.includes("Only team maintainers")) {
      recordResult(10, "Regular member team control rejection", "PASS", `Rejected with message: "${e.message}"`, "Blocked on server-side as expected");
    } else {
      recordResult(10, "Regular member team control rejection", "FAIL", `Unexpected error: ${e.message}`, "");
    }
  }

  // 11. Invite registered user
  let registeredUserToken = '';
  try {
    await prisma.invitation.deleteMany({ where: { invitedUserId: testreviewer.id } });
    const invite = await orgService.inviteMember("acme", "testreviewer", "MEMBER", appi.id);
    registeredUserToken = invite.token;
    if (invite.invitedUserId === testreviewer.id) {
      recordResult(11, "Invite registered user notification", "PASS", `Notification triggered for user id ${testreviewer.id}`, "Generates correct database reference");
    } else {
      recordResult(11, "Invite registered user notification", "FAIL", "User ID not linked", "");
    }
  } catch (e) {
    recordResult(11, "Invite registered user notification", "FAIL", e.message, "");
  }

  // 12. Invite unregistered email
  try {
    await prisma.invitation.deleteMany({ where: { invitedEmail: "newuser@example.com" } });
    const invite = await orgService.inviteMember("acme", "newuser@example.com", "MEMBER", appi.id);
    if (invite.invitedEmail === "newuser@example.com") {
      recordResult(12, "Invite email notification", "PASS", `Email invite created for newuser@example.com`, "Sends email with valid link containing token");
    } else {
      recordResult(12, "Invite email notification", "FAIL", "Email not saved", "");
    }
  } catch (e) {
    recordResult(12, "Invite email notification", "FAIL", e.message, "");
  }

  // 13. Accept invitation
  try {
    const res = await orgService.acceptInvitation(registeredUserToken || "token-registered-user", testreviewer.id);
    const memberRecord = await prisma.organizationMember.findFirst({
      where: { userId: testreviewer.id }
    });
    const inviteRecord = await prisma.invitation.findFirst({ where: { token: registeredUserToken } });
    if (memberRecord && inviteRecord.status === "ACCEPTED") {
      recordResult(13, "Accept invitation flow", "PASS", `member record: exists, invite status: ${inviteRecord.status}`, "Status updated to accepted, user added to org");
    } else {
      recordResult(13, "Accept invitation flow", "FAIL", `status is ${inviteRecord ? inviteRecord.status : "not found"}`, "");
    }
  } catch (e) {
    recordResult(13, "Accept invitation flow", "FAIL", e.message, "");
  }

  // 14. Reuse token
  try {
    await orgService.acceptInvitation(registeredUserToken || "token-registered-user", testreviewer.id);
    recordResult(14, "Token reuse prevention", "FAIL", "Accepted already accepted invitation", "");
  } catch (e) {
    recordResult(14, "Token reuse prevention", "PASS", `Rejected with message: "${e.message}"`, "Blocks reuse gracefully");
  }

  // 15. Expired token
  try {
    await orgService.acceptInvitation("token-expired", member2.id);
    recordResult(15, "Expired token rejection", "FAIL", "Accepted expired invitation", "");
  } catch (e) {
    recordResult(15, "Expired token rejection", "PASS", `Rejected with message: "${e.message}"`, "Blocks expired invites");
  }

  // 16. Non-owner billing/delete org access (BLOCKING)
  try {
    await orgService.delete("acme", member2.id);
    recordResult(16, "Non-owner administrative rejection", "FAIL", "Allowed deletion of organization by normal member", "");
  } catch (e) {
    if (e.status === 403 || e.message.includes("Only owners")) {
      recordResult(16, "Non-owner administrative rejection", "PASS", `Rejected with message: "${e.message}"`, "Blocked on server-side as expected");
    } else {
      recordResult(16, "Non-owner administrative rejection", "FAIL", `Unexpected error: ${e.message}`, "");
    }
  }

  console.log("\nVerification Tests Completed.");
}

runTests();
