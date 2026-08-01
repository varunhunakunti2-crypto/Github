import { Injectable } from "@nestjs/common";

export interface ParsedWorkflow {
  name: string;
  filePath: string;
  triggers: WorkflowTriggers;
  jobs: Record<string, ParsedJob>;
}

export interface WorkflowTriggers {
  push?: { branches?: string[]; paths?: string[] };
  pull_request?: { branches?: string[]; types?: string[] };
  workflow_dispatch?: { inputs?: Record<string, any> };
  schedule?: { cron: string }[];
}

export interface ParsedJob {
  name: string;
  runsOn: string;
  needs?: string[];
  matrix?: Record<string, any[]>;
  steps: ParsedStep[];
}

export interface ParsedStep {
  name: string;
  run?: string;
  uses?: string;
  with?: Record<string, string>;
  env?: Record<string, string>;
}

export interface ParseError {
  filePath: string;
  line?: number;
  message: string;
}

@Injectable()
export class WorkflowParserService {
  /**
   * Parse a raw YAML string from a .github/workflows/*.yml file into a
   * structured ParsedWorkflow. Returns either a valid result or a ParseError.
   */
  parseWorkflowYaml(filePath: string, yamlContent: string): { workflow?: ParsedWorkflow; error?: ParseError } {
    let doc: any;
    try {
      // Use a simple YAML parser — js-yaml would be ideal but we avoid
      // adding a dependency; instead we parse the subset of YAML that
      // GitHub Actions actually uses (key: value, lists, nested maps).
      doc = this.simpleYamlParse(yamlContent);
    } catch (e: any) {
      return {
        error: {
          filePath,
          message: `YAML syntax error: ${e.message}`,
          line: e.line
        }
      };
    }

    if (!doc || typeof doc !== "object") {
      return { error: { filePath, message: "Workflow file is empty or not a valid YAML document" } };
    }

    // Validate required top-level keys
    if (!doc.name) {
      return { error: { filePath, message: "Missing required field 'name' at top level" } };
    }

    const onConfig = doc.on || doc.true; // YAML parses `on:` as boolean `true` key in some parsers
    if (!onConfig) {
      return { error: { filePath, message: "Missing required field 'on' (trigger configuration) at top level" } };
    }

    if (!doc.jobs || typeof doc.jobs !== "object") {
      return { error: { filePath, message: "Missing required field 'jobs' at top level" } };
    }

    // Parse triggers
    const triggers = this.parseTriggers(onConfig);

    // Parse jobs
    const jobs: Record<string, ParsedJob> = {};
    for (const [jobKey, jobDef] of Object.entries(doc.jobs as Record<string, any>)) {
      const parsed = this.parseJob(jobKey, jobDef);
      if (!parsed) {
        return { error: { filePath, message: `Job '${jobKey}' is malformed — must have 'runs-on' and 'steps'` } };
      }
      jobs[jobKey] = parsed;
    }

    return {
      workflow: {
        name: doc.name,
        filePath,
        triggers,
        jobs
      }
    };
  }

  /**
   * Check if an incoming event (push to a branch, PR opened, etc.) matches
   * a workflow's trigger configuration.
   */
  matchesTrigger(triggers: WorkflowTriggers, event: string, context: { branch?: string; paths?: string[] }): boolean {
    if (event === "push" && triggers.push) {
      return this.matchBranchFilter(triggers.push.branches, context.branch) &&
             this.matchPathFilter(triggers.push.paths, context.paths);
    }
    if (event === "pull_request" && triggers.pull_request) {
      return this.matchBranchFilter(triggers.pull_request.branches, context.branch);
    }
    if (event === "workflow_dispatch" && triggers.workflow_dispatch) {
      return true;
    }
    if (event === "schedule" && triggers.schedule) {
      return true;
    }
    return false;
  }

  private parseTriggers(onConfig: any): WorkflowTriggers {
    const triggers: WorkflowTriggers = {};

    if (typeof onConfig === "string") {
      // Simple form: on: push
      (triggers as any)[onConfig] = {};
      return triggers;
    }

    if (Array.isArray(onConfig)) {
      // Array form: on: [push, pull_request]
      for (const event of onConfig) {
        (triggers as any)[event] = {};
      }
      return triggers;
    }

    // Object form: on: { push: { branches: [...] }, ... }
    if (onConfig.push) {
      triggers.push = {
        branches: this.toArray(onConfig.push?.branches),
        paths: this.toArray(onConfig.push?.paths)
      };
    }
    if (onConfig.pull_request) {
      triggers.pull_request = {
        branches: this.toArray(onConfig.pull_request?.branches),
        types: this.toArray(onConfig.pull_request?.types)
      };
    }
    if (onConfig.workflow_dispatch !== undefined) {
      triggers.workflow_dispatch = {
        inputs: onConfig.workflow_dispatch?.inputs || {}
      };
    }
    if (onConfig.schedule) {
      triggers.schedule = Array.isArray(onConfig.schedule)
        ? onConfig.schedule
        : [onConfig.schedule];
    }

    return triggers;
  }

  private parseJob(key: string, def: any): ParsedJob | null {
    if (!def || typeof def !== "object") return null;

    const runsOn = def["runs-on"] || def.runsOn || "ubuntu-latest";
    const stepsRaw = def.steps;
    if (!Array.isArray(stepsRaw)) return null;

    const steps: ParsedStep[] = stepsRaw.map((s: any, i: number) => ({
      name: s.name || `Step ${i + 1}`,
      run: s.run,
      uses: s.uses,
      with: s.with,
      env: s.env
    }));

    const matrix = def.strategy?.matrix;

    return {
      name: def.name || key,
      runsOn,
      needs: def.needs ? (Array.isArray(def.needs) ? def.needs : [def.needs]) : undefined,
      matrix: matrix || undefined,
      steps
    };
  }

  private matchBranchFilter(filters: string[] | undefined, branch: string | undefined): boolean {
    if (!filters || filters.length === 0) return true; // no filter = match all
    if (!branch) return false;
    const branchName = branch.replace("refs/heads/", "");
    return filters.some(f => {
      if (f.includes("*")) {
        const regex = new RegExp("^" + f.replace(/\*/g, ".*") + "$");
        return regex.test(branchName);
      }
      return f === branchName;
    });
  }

  private matchPathFilter(filters: string[] | undefined, changedPaths: string[] | undefined): boolean {
    if (!filters || filters.length === 0) return true;
    if (!changedPaths || changedPaths.length === 0) return true; // no path info = assume match
    return changedPaths.some(p =>
      filters.some(f => {
        if (f.includes("*")) {
          const regex = new RegExp("^" + f.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$");
          return regex.test(p);
        }
        return p.startsWith(f);
      })
    );
  }

  private toArray(val: any): string[] | undefined {
    if (!val) return undefined;
    return Array.isArray(val) ? val : [val];
  }

  /**
   * Minimal YAML parser for the subset GitHub Actions uses.
   * Handles: scalars, sequences (- item), mappings (key: value), nesting via indentation.
   * Does NOT handle anchors, aliases, multi-line scalars, flow notation, etc.
   */
  simpleYamlParse(text: string): any {
    const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
    return this.parseBlock(lines, 0, 0).value;
  }

  private parseBlock(lines: string[], startIdx: number, parentIndent: number): { value: any; nextIdx: number } {
    const result: any = {};
    let i = startIdx;
    let isArray = false;
    const arrayResult: any[] = [];

    while (i < lines.length) {
      const line = lines[i];
      const stripped = line.trimStart();

      // Skip empty lines and comments
      if (stripped === "" || stripped.startsWith("#")) { i++; continue; }

      const indent = line.length - stripped.length;
      if (indent < parentIndent) break; // dedent = end of this block
      if (indent > parentIndent && i === startIdx) {
        // First line is indented beyond parent — this shouldn't happen at top level
      }
      if (indent < parentIndent) break;

      // Array item
      if (stripped.startsWith("- ")) {
        isArray = true;
        const itemContent = stripped.substring(2).trim();
        
        if (itemContent.includes(": ")) {
          // Inline mapping in array: - key: value
          const obj: any = {};
          const colonIdx = itemContent.indexOf(": ");
          obj[itemContent.substring(0, colonIdx).trim()] = this.parseScalar(itemContent.substring(colonIdx + 2).trim());
          
          // Check for continuation lines at deeper indent
          const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
          const nextIndent = nextLine.length - nextLine.trimStart().length;
          if (nextIndent > indent + 2 && nextLine.trimStart() !== "" && !nextLine.trimStart().startsWith("#")) {
            const sub = this.parseBlock(lines, i + 1, indent + 2);
            Object.assign(obj, sub.value);
            i = sub.nextIdx;
          } else {
            i++;
          }
          arrayResult.push(obj);
        } else if (itemContent === "") {
          // Block item — parse sub-block
          const sub = this.parseBlock(lines, i + 1, indent + 2);
          arrayResult.push(sub.value);
          i = sub.nextIdx;
        } else {
          arrayResult.push(this.parseScalar(itemContent));
          i++;
        }
        continue;
      }

      // Key-value pair
      const colonIdx = stripped.indexOf(":");
      if (colonIdx === -1) { i++; continue; }

      const key = stripped.substring(0, colonIdx).trim();
      const rawValue = stripped.substring(colonIdx + 1).trim();

      if (rawValue === "" || rawValue === "|" || rawValue === ">") {
        // Block value — look at next lines
        const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
        const nextStripped = nextLine.trimStart();
        const nextIndent = nextLine.length - nextStripped.length;

        if (nextIndent > indent && nextStripped !== "" && !nextStripped.startsWith("#")) {
          if (rawValue === "|" || rawValue === ">") {
            // Multi-line scalar — collect all deeper-indented lines
            let multiLine = "";
            let j = i + 1;
            while (j < lines.length) {
              const ml = lines[j];
              const mi = ml.length - ml.trimStart().length;
              if (ml.trimStart() === "" || mi > indent) {
                multiLine += (multiLine ? "\n" : "") + ml.trimStart();
                j++;
              } else break;
            }
            result[key] = multiLine;
            i = j;
          } else {
            const sub = this.parseBlock(lines, i + 1, nextIndent);
            result[key] = sub.value;
            i = sub.nextIdx;
          }
        } else {
          result[key] = null;
          i++;
        }
      } else {
        // Inline value
        result[key] = this.parseScalar(rawValue);
        i++;
      }
    }

    return { value: isArray ? arrayResult : result, nextIdx: i };
  }

  private parseScalar(val: string): any {
    if (val === "true" || val === "True") return true;
    if (val === "false" || val === "False") return false;
    if (val === "null" || val === "~") return null;
    if (/^\d+$/.test(val)) return parseInt(val, 10);
    if (/^\d+\.\d+$/.test(val)) return parseFloat(val);
    // Strip quotes
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      return val.slice(1, -1);
    }
    // Inline array: [a, b, c]
    if (val.startsWith("[") && val.endsWith("]")) {
      return val.slice(1, -1).split(",").map(s => this.parseScalar(s.trim()));
    }
    return val;
  }
}
