#!/usr/bin/env node
// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from "@modelcontextprotocol/sdk/types.js";

// src/clients/jira-client.ts
import axios from "axios";

// src/utils/config.ts
import { config } from "dotenv";
import { z } from "zod";
config();
var configSchema = z.object({
  JIRA_BASE_URL: z.string().url(),
  JIRA_USERNAME: z.string().email(),
  JIRA_API_TOKEN: z.string().min(1),
  ZEPHYR_API_TOKEN: z.string().min(1)
});
var cachedConfig = null;
var validateConfig = () => {
  try {
    const result = configSchema.safeParse(process.env);
    if (!result.success) {
      const errors = result.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
      const errorMessage = `Configuration validation failed:
${errors.join("\n")}`;
      console.error(errorMessage);
      console.error("Please ensure the following environment variables are set:");
      console.error("- JIRA_BASE_URL (valid URL)");
      console.error("- JIRA_USERNAME (valid email)");
      console.error("- JIRA_API_TOKEN (non-empty string)");
      console.error("- ZEPHYR_API_TOKEN (non-empty string)");
      throw new Error(errorMessage);
    }
    return result.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to validate configuration:", errorMessage);
    throw error;
  }
};
var getAppConfig = () => {
  if (!cachedConfig) {
    cachedConfig = validateConfig();
  }
  return cachedConfig;
};
var getJiraAuth = () => {
  const config2 = getAppConfig();
  return {
    username: config2.JIRA_USERNAME,
    password: config2.JIRA_API_TOKEN
  };
};
var getZephyrHeaders = () => {
  const config2 = getAppConfig();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config2.ZEPHYR_API_TOKEN}`
  };
};

// src/clients/jira-client.ts
var JiraClient = class {
  client;
  constructor() {
    const config2 = getAppConfig();
    this.client = axios.create({
      baseURL: `${config2.JIRA_BASE_URL}/rest/api/3`,
      auth: getJiraAuth(),
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 3e4
    });
  }
  async getIssue(issueKey, fields) {
    const params = fields ? { fields: fields.join(",") } : {};
    const response = await this.client.get(`/issue/${issueKey}`, { params });
    return response.data;
  }
  async getProject(projectKey) {
    const response = await this.client.get(`/project/${projectKey}`);
    return response.data;
  }
  async getProjectVersions(projectKey) {
    const response = await this.client.get(`/project/${projectKey}/versions`);
    return response.data;
  }
  async searchIssues(jql, fields, maxResults = 50) {
    const params = {
      jql,
      fields: fields?.join(",") || "*all",
      maxResults
    };
    const response = await this.client.get("/search", { params });
    return {
      issues: response.data.issues,
      total: response.data.total
    };
  }
  async createIssue(issueData) {
    const payload = {
      fields: {
        project: { key: issueData.projectKey },
        summary: issueData.summary,
        description: issueData.description ? {
          type: "doc",
          version: 1,
          content: [{
            type: "paragraph",
            content: [{
              type: "text",
              text: issueData.description
            }]
          }]
        } : void 0,
        issuetype: { name: issueData.issueType },
        priority: issueData.priority ? { name: issueData.priority } : void 0,
        assignee: issueData.assignee ? { accountId: issueData.assignee } : void 0,
        labels: issueData.labels,
        components: issueData.components?.map((name) => ({ name }))
      }
    };
    const response = await this.client.post("/issue", payload);
    return this.getIssue(response.data.key);
  }
  async linkIssues(inwardIssueKey, outwardIssueKey, linkType) {
    const payload = {
      type: { name: linkType },
      inwardIssue: { key: inwardIssueKey },
      outwardIssue: { key: outwardIssueKey }
    };
    await this.client.post("/issueLink", payload);
  }
};

// src/utils/validation.ts
import { z as z2 } from "zod";
var createTestPlanSchema = z2.object({
  name: z2.string().min(1, "Name is required"),
  description: z2.string().optional(),
  projectKey: z2.string().min(1, "Project key is required"),
  startDate: z2.string().optional(),
  endDate: z2.string().optional()
});
var createTestCycleSchema = z2.object({
  name: z2.string().min(1, "Name is required"),
  description: z2.string().optional(),
  projectKey: z2.string().min(1, "Project key is required"),
  versionId: z2.string().min(1, "Version ID is required"),
  environment: z2.string().optional(),
  startDate: z2.string().optional(),
  endDate: z2.string().optional()
});
var readJiraIssueSchema = z2.object({
  issueKey: z2.string().min(1, "Issue key is required"),
  fields: z2.array(z2.string()).optional()
});
var listTestPlansSchema = z2.object({
  projectKey: z2.string().min(1, "Project key is required"),
  limit: z2.number().min(1).max(100).default(50),
  offset: z2.number().min(0).default(0)
});
var listTestCyclesSchema = z2.object({
  projectKey: z2.string().min(1, "Project key is required"),
  versionId: z2.string().optional(),
  limit: z2.number().min(1).max(100).default(50)
});
var executeTestSchema = z2.object({
  executionId: z2.string().min(1, "Execution ID is required"),
  status: z2.enum(["PASS", "FAIL", "WIP", "BLOCKED"]),
  comment: z2.string().optional(),
  defects: z2.array(z2.string()).optional()
});
var getTestExecutionStatusSchema = z2.object({
  cycleId: z2.string().min(1, "Cycle ID is required")
});
var linkTestsToIssuesSchema = z2.object({
  testCaseId: z2.string().min(1, "Test case ID is required"),
  issueKeys: z2.array(z2.string().min(1)).min(1, "At least one issue key is required")
});
var generateTestReportSchema = z2.object({
  cycleId: z2.string().min(1, "Cycle ID is required"),
  format: z2.enum(["JSON", "HTML"]).default("JSON")
});
var createTestCaseSchema = z2.object({
  projectKey: z2.string().min(1, "Project key is required"),
  name: z2.string().min(1, "Name is required"),
  objective: z2.string().optional(),
  precondition: z2.string().optional(),
  estimatedTime: z2.number().min(0).optional(),
  priority: z2.string().optional(),
  status: z2.string().optional(),
  folderId: z2.string().optional(),
  labels: z2.array(z2.string()).optional(),
  componentId: z2.string().optional(),
  customFields: z2.record(z2.any()).optional(),
  testScript: z2.object({
    type: z2.enum(["STEP_BY_STEP", "PLAIN_TEXT"]),
    steps: z2.array(z2.object({
      index: z2.number().min(1),
      description: z2.string().min(1),
      testData: z2.string().optional(),
      expectedResult: z2.string().min(1)
    })).optional(),
    text: z2.string().optional()
  }).optional()
});
var searchTestCasesSchema = z2.object({
  projectKey: z2.string().min(1, "Project key is required"),
  query: z2.string().optional(),
  limit: z2.number().min(1).max(100).default(50)
});
var getTestCaseSchema = z2.object({
  testCaseId: z2.string().min(1, "Test case ID is required")
});
var createMultipleTestCasesSchema = z2.object({
  testCases: z2.array(createTestCaseSchema).min(1, "At least one test case is required"),
  continueOnError: z2.boolean().default(true)
});

// src/tools/jira-issues.ts
var jiraClient = null;
var getJiraClient = () => {
  if (!jiraClient) {
    jiraClient = new JiraClient();
  }
  return jiraClient;
};
var readJiraIssue = async (input) => {
  const validatedInput = readJiraIssueSchema.parse(input);
  try {
    const issue = await getJiraClient().getIssue(validatedInput.issueKey, validatedInput.fields);
    return {
      success: true,
      data: {
        key: issue.key,
        summary: issue.fields?.summary || null,
        description: issue.fields?.description || null,
        status: issue.fields?.status ? {
          name: issue.fields.status.name,
          category: issue.fields.status.statusCategory?.name || "Unknown"
        } : null,
        priority: issue.fields?.priority?.name || null,
        assignee: issue.fields?.assignee ? {
          name: issue.fields.assignee.displayName,
          email: issue.fields.assignee.emailAddress
        } : null,
        reporter: issue.fields?.reporter ? {
          name: issue.fields.reporter.displayName,
          email: issue.fields.reporter.emailAddress
        } : null,
        created: issue.fields?.created || null,
        updated: issue.fields?.updated || null,
        issueType: issue.fields?.issuetype?.name || null,
        project: issue.fields?.project ? {
          key: issue.fields.project.key,
          name: issue.fields.project.name
        } : null,
        labels: issue.fields?.labels || [],
        components: issue.fields?.components?.map((c) => c.name) || [],
        fixVersions: issue.fields?.fixVersions?.map((v) => v.name) || [],
        customFields: issue.fields ? Object.entries(issue.fields).filter(([key]) => key.startsWith("customfield_")).reduce((acc, [key, value]) => ({
          ...acc,
          [key]: value
        }), {}) : {}
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.errorMessages?.[0] || error.message
    };
  }
};

// src/clients/zephyr-client.ts
import axios2 from "axios";
var ZephyrClient = class {
  client;
  constructor() {
    this.client = axios2.create({
      baseURL: "https://api.zephyrscale.smartbear.com/v2",
      headers: getZephyrHeaders(),
      timeout: 3e4
    });
  }
  async createTestPlan(data) {
    const payload = {
      name: data.name,
      objective: data.description,
      projectKey: data.projectKey,
      plannedStartDate: data.startDate,
      plannedEndDate: data.endDate
    };
    const response = await this.client.post("/testplans", payload);
    return response.data;
  }
  async getTestPlans(projectKey, limit = 50, offset = 0) {
    const params = {
      projectKey,
      maxResults: limit,
      startAt: offset
    };
    const response = await this.client.get("/testplans", { params });
    return {
      testPlans: response.data.values || response.data,
      total: response.data.total || response.data.length
    };
  }
  async createTestCycle(data) {
    const payload = {
      name: data.name,
      description: data.description,
      projectKey: data.projectKey,
      versionId: data.versionId,
      environment: data.environment,
      plannedStartDate: data.startDate,
      plannedEndDate: data.endDate
    };
    const response = await this.client.post("/testcycles", payload);
    return response.data;
  }
  async getTestCycles(projectKey, versionId, limit = 50) {
    const params = {
      projectKey,
      versionId,
      maxResults: limit
    };
    const response = await this.client.get("/testcycles", { params });
    return {
      testCycles: response.data.values || response.data,
      total: response.data.total || response.data.length
    };
  }
  async getTestExecution(executionId) {
    const response = await this.client.get(`/testexecutions/${executionId}`);
    return response.data;
  }
  async updateTestExecution(data) {
    const payload = {
      status: data.status,
      comment: data.comment,
      issues: data.defects?.map((key) => ({ key }))
    };
    const response = await this.client.put(`/testexecutions/${data.executionId}`, payload);
    return response.data;
  }
  async getTestExecutionSummary(cycleId) {
    const response = await this.client.get(`/testcycles/${cycleId}/testexecutions`);
    const executions = response.data.values;
    const summary = executions.reduce(
      (acc, execution) => {
        acc.total++;
        switch (execution.status) {
          case "PASS":
            acc.passed++;
            break;
          case "FAIL":
            acc.failed++;
            break;
          case "BLOCKED":
            acc.blocked++;
            break;
          case "WIP":
            acc.inProgress++;
            break;
          default:
            acc.notExecuted++;
        }
        return acc;
      },
      { total: 0, passed: 0, failed: 0, blocked: 0, inProgress: 0, notExecuted: 0 }
    );
    summary.passRate = summary.total > 0 ? summary.passed / summary.total * 100 : 0;
    return summary;
  }
  async linkTestCaseToIssue(testCaseId, issueKey) {
    const payload = {
      issueKeys: [issueKey]
    };
    await this.client.post(`/testcases/${testCaseId}/links`, payload);
  }
  async generateTestReport(cycleId) {
    const cycleResponse = await this.client.get(`/testcycles/${cycleId}`);
    const cycle = cycleResponse.data;
    const executionsResponse = await this.client.get(`/testcycles/${cycleId}/testexecutions`);
    const executions = executionsResponse.data.values || executionsResponse.data;
    const summary = await this.getTestExecutionSummary(cycleId);
    return {
      cycleId,
      cycleName: cycle.name,
      projectKey: cycle.projectKey,
      summary,
      executions,
      generatedOn: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async getTestCase(testCaseId) {
    const response = await this.client.get(`/testcases/${testCaseId}`);
    return response.data;
  }
  async searchTestCases(projectKey, query, limit = 50) {
    const params = {
      projectKey,
      query,
      maxResults: limit
    };
    const response = await this.client.get("/testcases/search", { params });
    return {
      testCases: response.data.values || response.data,
      total: response.data.total || response.data.length
    };
  }
  async createTestCase(data) {
    const payload = {
      projectKey: data.projectKey,
      name: data.name,
      objective: data.objective,
      precondition: data.precondition,
      estimatedTime: data.estimatedTime
    };
    if (data.priority) {
      payload.priority = data.priority;
    }
    if (data.status) {
      payload.status = data.status;
    }
    if (data.folderId) {
      payload.folderId = data.folderId;
    }
    if (data.labels && data.labels.length > 0) {
      payload.labels = data.labels;
    }
    if (data.componentId) {
      payload.componentId = data.componentId;
    }
    if (data.customFields) {
      payload.customFields = data.customFields;
    }
    if (data.testScript) {
      payload.testScript = data.testScript;
    }
    const response = await this.client.post("/testcases", payload);
    return response.data;
  }
  async createMultipleTestCases(testCases, continueOnError = true) {
    const results = [];
    let successful = 0;
    let failed = 0;
    for (let i = 0; i < testCases.length; i++) {
      try {
        const testCase = await this.createTestCase(testCases[i]);
        results.push({
          index: i,
          success: true,
          data: testCase
        });
        successful++;
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        results.push({
          index: i,
          success: false,
          error: errorMessage
        });
        failed++;
        if (!continueOnError) {
          break;
        }
      }
    }
    return {
      results,
      summary: {
        total: testCases.length,
        successful,
        failed
      }
    };
  }
};

// src/tools/test-plans.ts
var zephyrClient = null;
var getZephyrClient = () => {
  if (!zephyrClient) {
    zephyrClient = new ZephyrClient();
  }
  return zephyrClient;
};
var createTestPlan = async (input) => {
  const validatedInput = createTestPlanSchema.parse(input);
  try {
    const testPlan = await getZephyrClient().createTestPlan({
      name: validatedInput.name,
      description: validatedInput.description,
      projectKey: validatedInput.projectKey,
      startDate: validatedInput.startDate,
      endDate: validatedInput.endDate
    });
    return {
      success: true,
      data: {
        id: testPlan.id,
        key: testPlan.key,
        name: testPlan.name,
        description: testPlan.description,
        projectId: testPlan.projectId,
        status: testPlan.status,
        createdOn: testPlan.createdOn,
        createdBy: testPlan.createdBy.displayName
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};
var listTestPlans = async (input) => {
  const validatedInput = listTestPlansSchema.parse(input);
  try {
    const result = await getZephyrClient().getTestPlans(
      validatedInput.projectKey,
      validatedInput.limit,
      validatedInput.offset
    );
    return {
      success: true,
      data: {
        total: result.total,
        testPlans: result.testPlans.map((plan) => ({
          id: plan.id,
          key: plan.key,
          name: plan.name,
          description: plan.description,
          status: plan.status,
          createdOn: plan.createdOn,
          updatedOn: plan.updatedOn,
          createdBy: plan.createdBy.displayName
        }))
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// src/tools/test-cycles.ts
var zephyrClient2 = null;
var getZephyrClient2 = () => {
  if (!zephyrClient2) {
    zephyrClient2 = new ZephyrClient();
  }
  return zephyrClient2;
};
var createTestCycle = async (input) => {
  const validatedInput = createTestCycleSchema.parse(input);
  try {
    const testCycle = await getZephyrClient2().createTestCycle({
      name: validatedInput.name,
      description: validatedInput.description,
      projectKey: validatedInput.projectKey,
      versionId: validatedInput.versionId,
      environment: validatedInput.environment,
      startDate: validatedInput.startDate,
      endDate: validatedInput.endDate
    });
    return {
      success: true,
      data: {
        id: testCycle.id,
        key: testCycle.key,
        name: testCycle.name,
        description: testCycle.description,
        projectId: testCycle.projectId,
        versionId: testCycle.versionId,
        environment: testCycle.environment,
        status: testCycle.status,
        plannedStartDate: testCycle.plannedStartDate,
        plannedEndDate: testCycle.plannedEndDate,
        createdOn: testCycle.createdOn,
        executionSummary: testCycle.executionSummary
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};
var listTestCycles = async (input) => {
  const validatedInput = listTestCyclesSchema.parse(input);
  try {
    const result = await getZephyrClient2().getTestCycles(
      validatedInput.projectKey,
      validatedInput.versionId,
      validatedInput.limit
    );
    return {
      success: true,
      data: {
        total: result.total,
        testCycles: result.testCycles.map((cycle) => ({
          id: cycle.id,
          key: cycle.key,
          name: cycle.name,
          description: cycle.description,
          projectId: cycle.projectId,
          versionId: cycle.versionId,
          environment: cycle.environment,
          status: cycle.status,
          plannedStartDate: cycle.plannedStartDate,
          plannedEndDate: cycle.plannedEndDate,
          actualStartDate: cycle.actualStartDate,
          actualEndDate: cycle.actualEndDate,
          createdOn: cycle.createdOn,
          updatedOn: cycle.updatedOn,
          executionSummary: {
            total: cycle.executionSummary.total,
            passed: cycle.executionSummary.passed,
            failed: cycle.executionSummary.failed,
            blocked: cycle.executionSummary.blocked,
            inProgress: cycle.executionSummary.inProgress,
            notExecuted: cycle.executionSummary.notExecuted,
            passRate: cycle.executionSummary.total > 0 ? Math.round(cycle.executionSummary.passed / cycle.executionSummary.total * 100) : 0
          }
        }))
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// src/tools/test-execution.ts
var zephyrClient3 = null;
var getZephyrClient3 = () => {
  if (!zephyrClient3) {
    zephyrClient3 = new ZephyrClient();
  }
  return zephyrClient3;
};
var executeTest = async (input) => {
  const validatedInput = executeTestSchema.parse(input);
  try {
    const execution = await getZephyrClient3().updateTestExecution({
      executionId: validatedInput.executionId,
      status: validatedInput.status,
      comment: validatedInput.comment,
      defects: validatedInput.defects
    });
    return {
      success: true,
      data: {
        id: execution.id,
        key: execution.key,
        cycleId: execution.cycleId,
        testCaseId: execution.testCaseId,
        status: execution.status,
        comment: execution.comment,
        executedOn: execution.executedOn,
        executedBy: execution.executedBy?.displayName,
        defects: execution.defects.map((defect) => ({
          key: defect.key,
          summary: defect.summary
        }))
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};
var getTestExecutionStatus = async (input) => {
  const validatedInput = getTestExecutionStatusSchema.parse(input);
  try {
    const summary = await getZephyrClient3().getTestExecutionSummary(validatedInput.cycleId);
    return {
      success: true,
      data: {
        cycleId: validatedInput.cycleId,
        summary: {
          total: summary.total,
          passed: summary.passed,
          failed: summary.failed,
          blocked: summary.blocked,
          inProgress: summary.inProgress,
          notExecuted: summary.notExecuted,
          passRate: Math.round(summary.passRate)
        },
        progress: {
          completed: summary.passed + summary.failed + summary.blocked,
          remaining: summary.notExecuted + summary.inProgress,
          completionPercentage: summary.total > 0 ? Math.round((summary.passed + summary.failed + summary.blocked) / summary.total * 100) : 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};
var linkTestsToIssues = async (input) => {
  const validatedInput = linkTestsToIssuesSchema.parse(input);
  try {
    const results = [];
    for (const issueKey of validatedInput.issueKeys) {
      try {
        await getZephyrClient3().linkTestCaseToIssue(validatedInput.testCaseId, issueKey);
        results.push({
          issueKey,
          success: true
        });
      } catch (error) {
        results.push({
          issueKey,
          success: false,
          error: error.response?.data?.message || error.message
        });
      }
    }
    return {
      success: true,
      data: {
        testCaseId: validatedInput.testCaseId,
        linkResults: results,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};
var generateTestReport = async (input) => {
  const validatedInput = generateTestReportSchema.parse(input);
  try {
    const report = await getZephyrClient3().generateTestReport(validatedInput.cycleId);
    if (validatedInput.format === "HTML") {
      const htmlReport = generateHtmlReport(report);
      return {
        success: true,
        data: {
          format: "HTML",
          content: htmlReport,
          generatedOn: report.generatedOn
        }
      };
    }
    return {
      success: true,
      data: {
        format: "JSON",
        content: report,
        generatedOn: report.generatedOn
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};
var generateHtmlReport = (report) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Execution Report - ${report.cycleName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background-color: #e8f4f8; padding: 15px; border-radius: 5px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; }
        .metric .value { font-size: 24px; font-weight: bold; }
        .executions { margin-top: 30px; }
        .execution { padding: 10px; border-left: 4px solid #ddd; margin: 10px 0; }
        .execution.pass { border-left-color: #4caf50; }
        .execution.fail { border-left-color: #f44336; }
        .execution.blocked { border-left-color: #ff9800; }
        .execution.progress { border-left-color: #2196f3; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Test Execution Report</h1>
        <h2>${report.cycleName}</h2>
        <p>Project: ${report.projectKey}</p>
        <p>Generated: ${new Date(report.generatedOn).toLocaleString()}</p>
      </div>
      
      <div class="summary">
        <div class="metric">
          <h3>Total Tests</h3>
          <div class="value">${report.summary.total}</div>
        </div>
        <div class="metric">
          <h3>Passed</h3>
          <div class="value">${report.summary.passed}</div>
        </div>
        <div class="metric">
          <h3>Failed</h3>
          <div class="value">${report.summary.failed}</div>
        </div>
        <div class="metric">
          <h3>Blocked</h3>
          <div class="value">${report.summary.blocked}</div>
        </div>
        <div class="metric">
          <h3>Pass Rate</h3>
          <div class="value">${Math.round(report.summary.passRate)}%</div>
        </div>
      </div>
      
      <div class="executions">
        <h3>Test Executions</h3>
        ${report.executions.map((exec) => `
          <div class="execution ${exec.status.toLowerCase()}">
            <strong>${exec.key}</strong> - ${exec.status}
            ${exec.comment ? `<p>${exec.comment}</p>` : ""}
            ${exec.defects.length > 0 ? `<p>Defects: ${exec.defects.map((d) => d.key).join(", ")}</p>` : ""}
          </div>
        `).join("")}
      </div>
    </body>
    </html>
  `;
};

// src/tools/test-cases.ts
var zephyrClient4 = null;
var getZephyrClient4 = () => {
  if (!zephyrClient4) {
    zephyrClient4 = new ZephyrClient();
  }
  return zephyrClient4;
};
var createTestCase = async (input) => {
  const validatedInput = createTestCaseSchema.parse(input);
  try {
    const testCase = await getZephyrClient4().createTestCase({
      projectKey: validatedInput.projectKey,
      name: validatedInput.name,
      objective: validatedInput.objective,
      precondition: validatedInput.precondition,
      estimatedTime: validatedInput.estimatedTime,
      priority: validatedInput.priority,
      status: validatedInput.status,
      folderId: validatedInput.folderId,
      labels: validatedInput.labels,
      componentId: validatedInput.componentId,
      customFields: validatedInput.customFields,
      testScript: validatedInput.testScript
    });
    return {
      success: true,
      data: {
        id: testCase.id,
        key: testCase.key,
        name: testCase.name,
        projectKey: testCase.project?.id,
        objective: testCase.objective,
        precondition: testCase.precondition,
        estimatedTime: testCase.estimatedTime,
        priority: testCase.priority?.id,
        status: testCase.status?.id,
        folder: testCase.folder?.id,
        labels: testCase.labels || [],
        component: testCase.component?.id,
        owner: testCase.owner?.accountId,
        createdOn: testCase.createdOn,
        links: {
          self: `https://api.zephyrscale.smartbear.com/v2/testcases/${testCase.key}`,
          issues: testCase.links?.issues?.length || 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};
var searchTestCases = async (input) => {
  const validatedInput = searchTestCasesSchema.parse(input);
  try {
    const result = await getZephyrClient4().searchTestCases(
      validatedInput.projectKey,
      validatedInput.query,
      validatedInput.limit
    );
    return {
      success: true,
      data: {
        testCases: result.testCases.map((testCase) => ({
          id: testCase.id,
          key: testCase.key,
          name: testCase.name,
          objective: testCase.objective,
          precondition: testCase.precondition,
          estimatedTime: testCase.estimatedTime,
          priority: testCase.priority?.id,
          status: testCase.status?.id,
          folder: testCase.folder?.id,
          labels: testCase.labels || [],
          component: testCase.component?.id,
          owner: testCase.owner?.accountId,
          createdOn: testCase.createdOn,
          linkedIssues: testCase.links?.issues?.length || 0
        })),
        total: result.total,
        projectKey: validatedInput.projectKey
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};
var getTestCase = async (input) => {
  try {
    const testCase = await getZephyrClient4().getTestCase(input.testCaseId);
    return {
      success: true,
      data: {
        id: testCase.id,
        key: testCase.key,
        name: testCase.name,
        projectKey: testCase.project?.id,
        objective: testCase.objective,
        precondition: testCase.precondition,
        estimatedTime: testCase.estimatedTime,
        priority: testCase.priority,
        status: testCase.status,
        folder: testCase.folder,
        labels: testCase.labels || [],
        component: testCase.component,
        owner: testCase.owner,
        createdOn: testCase.createdOn,
        customFields: testCase.customFields,
        links: testCase.links,
        testScript: testCase.testScript
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};
var createMultipleTestCases = async (input) => {
  const validatedInput = createMultipleTestCasesSchema.parse(input);
  try {
    const result = await getZephyrClient4().createMultipleTestCases(
      validatedInput.testCases,
      validatedInput.continueOnError
    );
    return {
      success: true,
      data: {
        results: result.results.map((r) => ({
          index: r.index,
          success: r.success,
          testCase: r.success ? {
            id: r.data?.id,
            key: r.data?.key,
            name: r.data?.name,
            projectKey: r.data?.project?.id,
            objective: r.data?.objective,
            precondition: r.data?.precondition,
            estimatedTime: r.data?.estimatedTime,
            priority: r.data?.priority?.id,
            status: r.data?.status?.id,
            folder: r.data?.folder?.id,
            labels: r.data?.labels || [],
            component: r.data?.component?.id,
            owner: r.data?.owner?.accountId,
            createdOn: r.data?.createdOn,
            links: {
              self: r.data ? `https://api.zephyrscale.smartbear.com/v2/testcases/${r.data.key}` : void 0
            }
          } : void 0,
          error: r.error
        })),
        summary: result.summary
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// src/index.ts
var server = new Server(
  {
    name: "jira-zephyr-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {
        listChanged: false
      }
    }
  }
);
var TOOLS = [
  {
    name: "read_jira_issue",
    description: "Read JIRA issue details and metadata",
    inputSchema: {
      type: "object",
      properties: {
        issueKey: { type: "string", description: "JIRA issue key (e.g., ABC-123)" },
        fields: { type: "array", items: { type: "string" }, description: "Specific fields to retrieve (optional)" }
      },
      required: ["issueKey"]
    }
  },
  {
    name: "create_test_plan",
    description: "Create a new test plan in Zephyr",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Test plan name" },
        description: { type: "string", description: "Test plan description (optional)" },
        projectKey: { type: "string", description: "JIRA project key" },
        startDate: { type: "string", description: "Planned start date (ISO format, optional)" },
        endDate: { type: "string", description: "Planned end date (ISO format, optional)" }
      },
      required: ["name", "projectKey"]
    }
  },
  {
    name: "list_test_plans",
    description: "List existing test plans",
    inputSchema: {
      type: "object",
      properties: {
        projectKey: { type: "string", description: "JIRA project key" },
        limit: { type: "number", description: "Maximum number of results (default: 50)" },
        offset: { type: "number", description: "Number of results to skip (default: 0)" }
      },
      required: ["projectKey"]
    }
  },
  {
    name: "create_test_cycle",
    description: "Create a new test execution cycle",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Test cycle name" },
        description: { type: "string", description: "Test cycle description (optional)" },
        projectKey: { type: "string", description: "JIRA project key" },
        versionId: { type: "string", description: "JIRA version ID" },
        environment: { type: "string", description: "Test environment (optional)" },
        startDate: { type: "string", description: "Planned start date (ISO format, optional)" },
        endDate: { type: "string", description: "Planned end date (ISO format, optional)" }
      },
      required: ["name", "projectKey", "versionId"]
    }
  },
  {
    name: "list_test_cycles",
    description: "List existing test cycles with execution status",
    inputSchema: {
      type: "object",
      properties: {
        projectKey: { type: "string", description: "JIRA project key" },
        versionId: { type: "string", description: "JIRA version ID (optional)" },
        limit: { type: "number", description: "Maximum number of results (default: 50)" }
      },
      required: ["projectKey"]
    }
  },
  {
    name: "execute_test",
    description: "Update test execution results",
    inputSchema: {
      type: "object",
      properties: {
        executionId: { type: "string", description: "Test execution ID" },
        status: { type: "string", enum: ["PASS", "FAIL", "WIP", "BLOCKED"], description: "Execution status" },
        comment: { type: "string", description: "Execution comment (optional)" },
        defects: { type: "array", items: { type: "string" }, description: "Linked defect keys (optional)" }
      },
      required: ["executionId", "status"]
    }
  },
  {
    name: "get_test_execution_status",
    description: "Get test execution progress and statistics",
    inputSchema: {
      type: "object",
      properties: {
        cycleId: { type: "string", description: "Test cycle ID" }
      },
      required: ["cycleId"]
    }
  },
  {
    name: "link_tests_to_issues",
    description: "Associate test cases with JIRA issues",
    inputSchema: {
      type: "object",
      properties: {
        testCaseId: { type: "string", description: "Test case ID" },
        issueKeys: { type: "array", items: { type: "string" }, description: "JIRA issue keys to link" }
      },
      required: ["testCaseId", "issueKeys"]
    }
  },
  {
    name: "generate_test_report",
    description: "Generate test execution report",
    inputSchema: {
      type: "object",
      properties: {
        cycleId: { type: "string", description: "Test cycle ID" },
        format: { type: "string", enum: ["JSON", "HTML"], description: "Report format (default: JSON)" }
      },
      required: ["cycleId"]
    }
  },
  {
    name: "create_test_case",
    description: "Create a new test case in Zephyr",
    inputSchema: {
      type: "object",
      properties: {
        projectKey: { type: "string", description: "JIRA project key" },
        name: { type: "string", description: "Test case name" },
        objective: { type: "string", description: "Test case objective/description (optional)" },
        precondition: { type: "string", description: "Test preconditions (optional)" },
        estimatedTime: { type: "number", description: "Estimated execution time in minutes (optional)" },
        priority: { type: "string", description: "Test case priority (optional)" },
        status: { type: "string", description: "Test case status (optional)" },
        folderId: { type: "string", description: "Folder ID to organize test case (optional)" },
        labels: { type: "array", items: { type: "string" }, description: "Test case labels (optional)" },
        componentId: { type: "string", description: "Component ID (optional)" },
        customFields: { type: "object", description: "Custom fields as key-value pairs (optional)" },
        testScript: {
          type: "object",
          description: "Test script with steps (optional)",
          properties: {
            type: { type: "string", enum: ["STEP_BY_STEP", "PLAIN_TEXT"], description: "Script type" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number", description: "Step number" },
                  description: { type: "string", description: "Step description" },
                  testData: { type: "string", description: "Test data (optional)" },
                  expectedResult: { type: "string", description: "Expected result" }
                },
                required: ["index", "description", "expectedResult"]
              },
              description: "Test steps (for STEP_BY_STEP type)"
            },
            text: { type: "string", description: "Plain text script (for PLAIN_TEXT type)" }
          },
          required: ["type"]
        }
      },
      required: ["projectKey", "name"]
    }
  },
  {
    name: "search_test_cases",
    description: "Search for test cases in a project",
    inputSchema: {
      type: "object",
      properties: {
        projectKey: { type: "string", description: "JIRA project key" },
        query: { type: "string", description: "Search query (optional)" },
        limit: { type: "number", description: "Maximum number of results (default: 50)" }
      },
      required: ["projectKey"]
    }
  },
  {
    name: "get_test_case",
    description: "Get detailed information about a specific test case",
    inputSchema: {
      type: "object",
      properties: {
        testCaseId: { type: "string", description: "Test case ID or key" }
      },
      required: ["testCaseId"]
    }
  },
  {
    name: "create_multiple_test_cases",
    description: "Create multiple test cases in Zephyr at once",
    inputSchema: {
      type: "object",
      properties: {
        testCases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              projectKey: { type: "string", description: "JIRA project key" },
              name: { type: "string", description: "Test case name" },
              objective: { type: "string", description: "Test case objective/description (optional)" },
              precondition: { type: "string", description: "Test preconditions (optional)" },
              estimatedTime: { type: "number", description: "Estimated execution time in minutes (optional)" },
              priority: { type: "string", description: "Test case priority (optional)" },
              status: { type: "string", description: "Test case status (optional)" },
              folderId: { type: "string", description: "Folder ID to organize test case (optional)" },
              labels: { type: "array", items: { type: "string" }, description: "Test case labels (optional)" },
              componentId: { type: "string", description: "Component ID (optional)" },
              customFields: { type: "object", description: "Custom fields as key-value pairs (optional)" },
              testScript: {
                type: "object",
                description: "Test script with steps (optional)",
                properties: {
                  type: { type: "string", enum: ["STEP_BY_STEP", "PLAIN_TEXT"], description: "Script type" },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "Step number" },
                        description: { type: "string", description: "Step description" },
                        testData: { type: "string", description: "Test data (optional)" },
                        expectedResult: { type: "string", description: "Expected result" }
                      },
                      required: ["index", "description", "expectedResult"]
                    },
                    description: "Test steps (for STEP_BY_STEP type)"
                  },
                  text: { type: "string", description: "Plain text script (for PLAIN_TEXT type)" }
                },
                required: ["type"]
              }
            },
            required: ["projectKey", "name"]
          },
          description: "Array of test cases to create"
        },
        continueOnError: { type: "boolean", description: "Continue creating remaining test cases if one fails (default: true)", default: true }
      },
      required: ["testCases"]
    }
  }
];
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));
var validateInput = (schema, input, toolName) => {
  const result = schema.safeParse(input);
  if (!result.success) {
    const errors = result.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid parameters for ${toolName}:
${errors.join("\n")}`
    );
  }
  return result.data;
};
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    switch (name) {
      case "read_jira_issue": {
        const validatedArgs = validateInput(readJiraIssueSchema, args, "read_jira_issue");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await readJiraIssue(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "create_test_plan": {
        const validatedArgs = validateInput(createTestPlanSchema, args, "create_test_plan");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await createTestPlan(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "list_test_plans": {
        const validatedArgs = validateInput(listTestPlansSchema, args, "list_test_plans");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await listTestPlans(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "create_test_cycle": {
        const validatedArgs = validateInput(createTestCycleSchema, args, "create_test_cycle");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await createTestCycle(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "list_test_cycles": {
        const validatedArgs = validateInput(listTestCyclesSchema, args, "list_test_cycles");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await listTestCycles(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "execute_test": {
        const validatedArgs = validateInput(executeTestSchema, args, "execute_test");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await executeTest(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "get_test_execution_status": {
        const validatedArgs = validateInput(getTestExecutionStatusSchema, args, "get_test_execution_status");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await getTestExecutionStatus(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "link_tests_to_issues": {
        const validatedArgs = validateInput(linkTestsToIssuesSchema, args, "link_tests_to_issues");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await linkTestsToIssues(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "generate_test_report": {
        const validatedArgs = validateInput(generateTestReportSchema, args, "generate_test_report");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await generateTestReport(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "create_test_case": {
        const validatedArgs = validateInput(createTestCaseSchema, args, "create_test_case");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await createTestCase(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "search_test_cases": {
        const validatedArgs = validateInput(searchTestCasesSchema, args, "search_test_cases");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await searchTestCases(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "get_test_case": {
        const validatedArgs = validateInput(getTestCaseSchema, args, "get_test_case");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await getTestCase(validatedArgs), null, 2)
            }
          ]
        };
      }
      case "create_multiple_test_cases": {
        const validatedArgs = validateInput(createMultipleTestCasesSchema, args, "create_multiple_test_cases");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(await createMultipleTestCases(validatedArgs), null, 2)
            }
          ]
        };
      }
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Error executing tool '${name}': ${errorMessage}`);
  }
});
async function main() {
  try {
    console.error("Starting Jira Zephyr MCP server...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Jira Zephyr MCP server running...");
    process.on("SIGINT", () => {
      console.error("Received SIGINT, shutting down gracefully...");
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      console.error("Received SIGTERM, shutting down gracefully...");
      process.exit(0);
    });
    await new Promise(() => {
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to start MCP server:", errorMessage);
    if (errorMessage.includes("Configuration validation failed")) {
      console.error("Please check your environment variables and try again.");
    }
    process.exit(1);
  }
}
main().catch((err) => {
  console.error("Unexpected error during server startup:", err);
  process.exit(1);
});
