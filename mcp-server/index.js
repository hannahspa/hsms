#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, readdir } from "node:fs/promises";
import { resolve, join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = resolve(__dirname, "..", "knowledge");

// ── Resource Map ───────────────────────────────────────────────
const RESOURCE_MAP = {
  "hsms://database/tables": {
    file: "database/tables.md",
    name: "Database Schema — All Tables",
    description: "All 21 tables with columns, types, and constraints",
  },
  "hsms://database/views": {
    file: "database/views.md",
    name: "Database Views",
    description: "SQL view definitions (so_du_vi_thuc_te, lich_su_giao_dich_tong_hop)",
  },
  "hsms://database/relationships": {
    file: "database/relationships.md",
    name: "Database Relationships",
    description: "Foreign key map and constraints",
  },
  "hsms://database/enums": {
    file: "database/enums.md",
    name: "Database Enums & Constants",
    description: "All enum values, CHECK constraints, and constants used across the DB",
  },
  "hsms://business/salary": {
    file: "business/salary.md",
    name: "Business Rules — Salary",
    description: "Salary formulas, day-count rules, overtime, deposit deduction",
  },
  "hsms://business/finance": {
    file: "business/finance.md",
    name: "Business Rules — Finance",
    description: "Cashflow rules, 4 revenue types, wallet management, reconciliation",
  },
  "hsms://business/attendance": {
    file: "business/attendance.md",
    name: "Business Rules — Attendance",
    description: "Check-in/out flow, OFF types, overtime, holiday credits",
  },
  "hsms://business/inventory": {
    file: "business/inventory.md",
    name: "Business Rules — Inventory",
    description: "Stock types, transaction rules, splitting, auto-expense linkage",
  },
  "hsms://project/structure": {
    file: "project/structure.md",
    name: "Project Structure",
    description: "Full directory tree of the HSMS codebase",
  },
  "hsms://project/routes": {
    file: "project/routes.md",
    name: "Application Routes",
    description: "All URL routes grouped by app module (internal, admin, checkin, etc.)",
  },
  "hsms://project/components": {
    file: "project/components.md",
    name: "Shared Components Catalog",
    description: "Reusable components with props and usage notes",
  },
  "hsms://conventions/coding": {
    file: "conventions/coding.md",
    name: "Coding Conventions",
    description: "Timezone, currency formatting, Supabase queries, git workflow",
  },
  "hsms://conventions/styling": {
    file: "conventions/styling.md",
    name: "Design System — Styling",
    description: "COLORS palette, LUX design tokens, typography, shadows",
  },
  "hsms://conventions/database": {
    file: "conventions/database.md",
    name: "Database Conventions",
    description: "Supabase project config, RLS policies, query patterns, storage buckets",
  },
  "hsms://domain/overview": {
    file: "domain/overview.md",
    name: "Business Domain Overview",
    description: "Spa info, daily operations, accounts, app URLs, integrations",
  },
  "hsms://domain/staff": {
    file: "domain/staff.md",
    name: "Employee Roster",
    description: "All 10 employees with roles, salaries, OFF limits, deposit status",
  },
  "hsms://architecture/data-model": {
    file: "architecture/unified-data-model.md",
    name: "Unified Data Model — Architecture",
    description: "Complete data flow diagram, 5 payment methods, module links, unified schema design",
  },
  "hsms://domain/data-migration": {
    file: "domain/data-migration.md",
    name: "MySpa → HSMS Data Migration Strategy",
    description: "MySpa export file formats, column mappings, import order, 4-step migration process",
  },
};

// ── Business Topic Map (for hsms_business_rule) ─────────────────
const BUSINESS_TOPICS = {
  salary: { file: "business/salary.md", headings: ["Salary Constants", "Two Salary Periods", "Day Count Rules", "todayRef", "Deposit Auto-Increment", "Le Tan Commission"] },
  finance: { file: "business/finance.md", headings: ["5 Phương Thức Thanh Toán", "Công Thức Dòng Tiền Cốt Lõi", "POS → Doanh Thu", "Chiều Chuyển Khoản Nội Bộ"] },
  attendance: { file: "business/attendance.md", headings: ["Check-in Flow", "OFF Types", "Monthly OFF Limits", "Overtime"] },
  inventory: { file: "business/inventory.md", headings: ["Product Types", "Transaction Types", "Key Rules"] },
  off_limits: { file: "business/attendance.md", headings: ["Monthly OFF Limits"] },
  overtime: { file: "business/attendance.md", headings: ["Overtime"] },
  ky_quy: { file: "business/salary.md", headings: ["Salary Constants", "Deposit Auto-Increment"] },
  commission: { file: "business/salary.md", headings: ["Le Tan Commission"] },
  revenue_types: { file: "business/finance.md", headings: ["4 Revenue Types"] },
  transfers: { file: "business/finance.md", headings: ["Internal Transfer Directions"] },
  day_count: { file: "business/salary.md", headings: ["Day Count Rules"] },
};

// ── Helpers ─────────────────────────────────────────────────────

async function readKnowledgeFile(relativePath) {
  const fullPath = join(KNOWLEDGE_DIR, relativePath);
  return await readFile(fullPath, "utf-8");
}

function extractSectionByHeading(content, heading) {
  const lines = content.split("\n");
  const headingRegex = /^##\s+(.+)/;
  let inSection = false;
  const result = [];
  for (const line of lines) {
    const m = line.match(headingRegex);
    if (m) {
      if (inSection) break; // next section reached — stop
      if (m[1].toLowerCase().includes(heading.toLowerCase())) {
        inSection = true;
      }
    }
    if (inSection) result.push(line);
  }
  return result.length > 0 ? result.join("\n") : null;
}

function listHeadings(content) {
  const headingRegex = /^##\s+(.+)/;
  return content
    .split("\n")
    .filter((l) => headingRegex.test(l))
    .map((l) => l.match(headingRegex)[1]);
}

async function findAllMdFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findAllMdFiles(full)));
    } else if (extname(entry.name) === ".md") {
      results.push(full);
    }
  }
  return results;
}

async function searchAllFiles(query) {
  const files = await findAllMdFiles(KNOWLEDGE_DIR);
  const results = [];
  const lower = query.toLowerCase();
  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(lower)) {
        const relative = file.replace(KNOWLEDGE_DIR, "").replace(/^[\\/]/, "");
        results.push(`${relative}:${i + 1}  ${lines[i].trim()}`);
        if (results.length >= 12) return results.slice(0, 12);
      }
    }
  }
  return results.slice(0, 12);
}

// ── Server ──────────────────────────────────────────────────────

const server = new Server(
  { name: "hsms-knowledge", version: "1.0.0" },
  { capabilities: { resources: {}, tools: {} } }
);

// --- Resources ---

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = Object.entries(RESOURCE_MAP).map(([uri, info]) => ({
    uri,
    name: info.name,
    description: info.description,
    mimeType: "text/markdown",
  }));
  return { resources };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const info = RESOURCE_MAP[uri];
  if (!info) {
    throw new Error(`Unknown resource: ${uri}`);
  }
  const text = await readKnowledgeFile(info.file);
  return { contents: [{ uri, mimeType: "text/markdown", text }] };
});

// --- Tools ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "hsms_schema",
        description: "Get column definitions for a specific HSMS database table.",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name (e.g. 'nhan_vien', 'doanh_thu', 'bang_luong', 'cham_cong')",
            },
          },
          required: ["table"],
        },
      },
      {
        name: "hsms_route",
        description: "Find which component handles a given URL path in the HSMS app.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path fragment to search (e.g. '/checkin', '/admin/nhan-su', 'bao-cao')",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "hsms_search",
        description: "Full-text search across all HSMS knowledge files. Returns matching file:line results.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search term (e.g. 'ky_quy', 'luong_cung', 'gioi_han_off', 'PIN')",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "hsms_business_rule",
        description: "Look up a specific HSMS business rule by topic (salary, finance, attendance, inventory, off_limits, overtime, ky_quy, commission, revenue_types, transfers, day_count).",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Topic: salary, finance, attendance, inventory, off_limits, overtime, ky_quy, commission, revenue_types, transfers, day_count",
            },
          },
          required: ["topic"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "hsms_schema": {
      const tableName = String(args?.table || "");
      const content = await readKnowledgeFile("database/tables.md");
      const section = extractSectionByHeading(content, tableName);
      if (section) {
        return { content: [{ type: "text", text: section }] };
      }
      const headings = listHeadings(content);
      return {
        content: [
          {
            type: "text",
            text: `Table "${tableName}" not found in knowledge base. Available tables:\n${headings.map((h) => `  - ${h}`).join("\n")}`,
          },
        ],
      };
    }

    case "hsms_route": {
      const path = String(args?.path || "").toLowerCase();
      const content = await readKnowledgeFile("project/routes.md");
      const lines = content.split("\n");
      const matches = lines.filter((l) => l.toLowerCase().includes(path));
      const result = matches.length > 0
        ? matches.join("\n")
        : `No routes found matching "${path}".`;
      return { content: [{ type: "text", text: result }] };
    }

    case "hsms_search": {
      const query = String(args?.query || "");
      const results = await searchAllFiles(query);
      const text = results.length > 0
        ? results.join("\n")
        : `No results found for "${query}".`;
      return { content: [{ type: "text", text: text }] };
    }

    case "hsms_business_rule": {
      const topic = String(args?.topic || "").toLowerCase();
      const info = BUSINESS_TOPICS[topic];
      if (!info) {
        const known = Object.keys(BUSINESS_TOPICS).join(", ");
        return {
          content: [{ type: "text", text: `Unknown topic "${topic}". Known topics: ${known}` }],
        };
      }
      const content = await readKnowledgeFile(info.file);
      const sections = [];
      for (const heading of info.headings) {
        const sec = extractSectionByHeading(content, heading);
        if (sec) sections.push(sec);
      }
      const text = sections.length > 0
        ? sections.join("\n\n")
        : `No matching sections found in ${info.file} for topic "${topic}".`;
      return { content: [{ type: "text", text }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ── Start ───────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[hsms-mcp] HSMS Knowledge Server started — 16 resources, 4 tools");
