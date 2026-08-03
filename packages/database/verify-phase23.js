const { prisma } = require('@gitforge/database');
const { ProjectService } = require('../../backend/dist/services/repository/project.service');

async function runTests() {
  console.log("Running Phase 23 Projects End-to-End Verification Tests...");

  const projectService = new ProjectService();

  // Load seeded data
  const appi = await prisma.user.findFirst({ where: { username: "appi" } });
  const project = await prisma.project.findFirst({ where: { title: "Projects Roadmapping Board" } });

  const recordResult = (num, name, status, evidence, notes) => {
    console.log(`Test ${num} | ${status} | ${evidence} | ${notes}`);
  };

  // 1. Verify Saved Views creation
  try {
    const viewsBefore = await projectService.listViews(project.id);
    const newView = await projectService.createView(project.id, {
      viewType: "roadmap",
      name: "Q3 Release Timeline",
      isDefault: false,
      config: { zoom: "quarter" }
    });
    const viewsAfter = await projectService.listViews(project.id);

    if (viewsAfter.length === viewsBefore.length + 1 && newView.name === "Q3 Release Timeline") {
      recordResult(1, "Saved Views creation", "PASS", `View ID: ${newView.id} Name: ${newView.name}`, "");
    } else {
      recordResult(1, "Saved Views creation", "FAIL", "Failed to insert project view", "");
    }
  } catch (e) {
    recordResult(1, "Saved Views creation", "FAIL", e.message, "");
  }

  // 2. Verify retrieving items with start/due dates & priority
  try {
    const board = await projectService.getBoard(project.id);
    const task = board.items.find(item => item.itemType === "note");

    if (task && task.priority === "HIGH" && task.startDate && task.dueDate) {
      recordResult(2, "Enhanced metadata retrieval", "PASS", `StartDate: ${task.startDate.toISOString()} Priority: ${task.priority}`, "");
    } else {
      recordResult(2, "Enhanced metadata retrieval", "FAIL", `Found: ${JSON.stringify(task)}`, "");
    }
  } catch (e) {
    recordResult(2, "Enhanced metadata retrieval", "FAIL", e.message, "");
  }

  // 3. Verify updating card details inline (due date and priority)
  try {
    const board = await projectService.getBoard(project.id);
    const task = board.items.find(item => item.itemType === "note");
    
    const updated = await projectService.updateItem(project.id, task.id, {
      priority: "URGENT",
      dueDate: "2026-08-20T00:00:00.000Z"
    });

    if (updated.priority === "URGENT" && updated.dueDate.toISOString() === "2026-08-20T00:00:00.000Z") {
      recordResult(3, "Inline metadata updates", "PASS", "Priority set to URGENT and dueDate shifted to Aug 20", "");
    } else {
      recordResult(3, "Inline metadata updates", "FAIL", `Updated object: ${JSON.stringify(updated)}`, "");
    }
  } catch (e) {
    recordResult(3, "Inline metadata updates", "FAIL", e.message, "");
  }

  // 4. Verify Task-to-Issue conversion
  try {
    const board = await projectService.getBoard(project.id);
    const task = board.items.find(item => item.itemType === "note");

    const conversion = await projectService.convertTaskToIssue(project.id, task.id, appi.id);
    
    // Fetch updated project item
    const checkItem = await prisma.projectItem.findUnique({
      where: { id: task.id }
    });

    if (checkItem.itemType === "issue" && checkItem.itemId === conversion.issue.id) {
      recordResult(4, "Task-to-Issue conversion", "PASS", `Issue Number: #${conversion.issue.number} Title: ${conversion.issue.title}`, "Replaced task card with issue successfully");
    } else {
      recordResult(4, "Task-to-Issue conversion", "FAIL", `ProjectItem status: ${JSON.stringify(checkItem)}`, "");
    }
  } catch (e) {
    recordResult(4, "Task-to-Issue conversion", "FAIL", e.message, "");
  }

  console.log("\nProjects End-to-End Tests Completed.");
}

runTests();
