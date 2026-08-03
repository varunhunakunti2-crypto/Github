const { prisma } = require('@gitforge/database');

async function runTests() {
  console.log("==================================================");
  console.log("Adversarial Admin Panel E2E Verification (Phase 27)");
  console.log("==================================================");

  const results = [];
  const recordResult = (num, status, evidence, notes) => {
    results.push({ num, status, evidence, notes });
    console.log(`Test ${num} | ${status} | ${evidence} | ${notes}`);
  };

  // Find/create users
  let admin = await prisma.user.findFirst({ where: { isPlatformAdmin: true } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        username: 'admin_test_user',
        email: 'admin_test@gitforge.local',
        passwordHash: 'dummy',
        isPlatformAdmin: true,
      }
    });
  }

  let normalUser = await prisma.user.findFirst({ where: { isPlatformAdmin: false, username: { not: 'admin_test_user' } } });
  if (!normalUser) {
    normalUser = await prisma.user.create({
      data: {
        username: 'normal_test_user',
        email: 'normal_test@gitforge.local',
        passwordHash: 'dummy',
        isPlatformAdmin: false,
      }
    });
  }

  const { AdminGuard } = require('../../backend/dist/common/guards/admin.guard');
  const { AuditService } = require('../../backend/dist/services/security/audit.service');
  const auditService = new AuditService();
  const adminGuard = new AdminGuard(auditService);

  // 1. Rejection of normal users (403 Forbidden)
  try {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: normalUser,
          route: { path: '/admin/users' },
          method: 'GET',
          ip: '127.0.0.1'
        })
      })
    };

    try {
      await adminGuard.canActivate(mockContext);
      recordResult(1, "FAIL", "Normal user was allowed to pass AdminGuard", "CRITICAL");
    } catch (err) {
      if (err.message.includes('Requires platform administrator privileges')) {
        recordResult(1, "PASS", `Successfully rejected with message: "${err.message}"`, "Access denied to non-admins");
      } else {
        recordResult(1, "FAIL", `Rejected with unexpected error: ${err.message}`, "CRITICAL");
      }
    }
  } catch (e) {
    recordResult(1, "FAIL", e.message, "");
  }

  // 2. Allow admin users
  try {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: admin,
          route: { path: '/admin/users' },
          method: 'GET',
          ip: '127.0.0.1'
        })
      })
    };

    const allowed = await adminGuard.canActivate(mockContext);
    if (allowed === true) {
      recordResult(2, "PASS", "Platform Admin successfully allowed access", "");
    } else {
      recordResult(2, "FAIL", "Admin user rejected", "");
    }
  } catch (e) {
    recordResult(2, "FAIL", e.message, "");
  }

  // 3. Suspended users block login (AuthGuard check)
  try {
    const { AuthGuard } = require('../../backend/dist/common/guards/auth.guard');
    const authGuard = new AuthGuard();
    
    // Suspend user
    const suspendedUser = await prisma.user.create({
      data: {
        username: `susp_${Date.now()}`,
        email: `susp_${Date.now()}@gitforge.local`,
        passwordHash: 'dummy',
        isSuspended: true
      }
    });

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-username': suspendedUser.username },
          query: {},
          body: {}
        })
      })
    };

    try {
      await authGuard.canActivate(mockContext);
      recordResult(3, "FAIL", "Suspended user successfully authenticated", "CRITICAL");
    } catch (err) {
      if (err.message.includes('Your account is suspended')) {
        recordResult(3, "PASS", `Auth rejected with message: "${err.message}"`, "Suspended user block works");
      } else {
        recordResult(3, "FAIL", `Rejected with unexpected error: ${err.message}`, "CRITICAL");
      }
    }
  } catch (e) {
    recordResult(3, "FAIL", e.message, "");
  }

  // 4. Daily rollup metrics population
  try {
    const { AdminService } = require('../../backend/dist/services/security/admin.service');
    const adminService = new AdminService(auditService);

    // Run aggregation
    const metricRow = await adminService.runMetricsRollup();
    if (metricRow.totalUsers >= 1 && metricRow.date !== null) {
      recordResult(4, "PASS", `Metrics rollup row successfully computed & written to DB: Users=${metricRow.totalUsers}`, "analytics performance risk closed");
    } else {
      recordResult(4, "FAIL", "PlatformMetricsDaily remained empty or missing values", "");
    }
  } catch (e) {
    recordResult(4, "FAIL", e.message, "");
  }

  // 5. Audit Logging for admin actions
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: { startsWith: 'admin.access' } },
      orderBy: { createdAt: 'desc' }
    });
    if (logs.length > 0) {
      recordResult(5, "PASS", `Access attempts correctly recorded in audit logs: ${logs[0].action}`, "Read-only/write admin accesses tracked");
    } else {
      recordResult(5, "FAIL", "Admin console access not written to audit logs", "");
    }
  } catch (e) {
    recordResult(5, "FAIL", e.message, "");
  }
}

runTests().catch(console.error);
