/** Static Host tool contracts. Execution and turn permissions remain in the loop. */
export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'code_search',
      description: 'Search the workspace (semantic index + ripgrep + graph). Call this before guessing paths or proposing changes.',
      parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a text file with 1-based line numbers. Use offset and limit to page through large files; returned nextOffset is zero-based.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          maxChars: { type: 'number' },
          offset: { type: 'number', description: 'Zero-based starting line, usually from nextOffset.' },
          limit: { type: 'number', description: 'Maximum lines to return (default 200, max 1000).' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List one workspace directory. Returns bounded names and entry types; use before inventing paths.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Workspace-relative directory; default root' },
          limit: { type: 'number', description: 'Maximum entries, default 200 and max 1000' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'glob',
      description: 'Find workspace files by a bounded glob pattern such as src/**/*.ts. Excludes generated dependency directories.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          path: { type: 'string', description: 'Optional workspace-relative start directory' },
          limit: { type: 'number', description: 'Maximum matches, default 200 and max 1000' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_replace',
      description: 'Surgical edit: replace an exact old_string with new_string in a file. Prefer over write_file for partial edits to existing files. old_string must be unique unless replaceAll=true.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_string: { type: 'string' },
          new_string: { type: 'string' },
          replaceAll: { type: 'boolean' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create or overwrite an entire text file (Ask/Plan/Agent aware). Use search_replace for partial edits to existing files.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' }, content: { type: 'string' } },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_patch',
      description: 'Apply a single-file unified diff with verified context. The path is separate from patch headers for safety.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          patch: { type: 'string', description: 'Unified diff containing one or more @@ hunks' },
        },
        required: ['path', 'patch'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'multi_edit',
      description: 'Apply several exact/normalized search-replace edits as one transaction. All edits are preflighted before writing.',
      parameters: {
        type: 'object',
        properties: {
          edits: {
            type: 'array',
            minItems: 1,
            maxItems: 40,
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                old_string: { type: 'string' },
                new_string: { type: 'string' },
                replaceAll: { type: 'boolean' },
              },
              required: ['path', 'old_string', 'new_string'],
            },
          },
        },
        required: ['edits'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_file',
      description: 'Move or rename one file inside the workspace. Refuses directories, overwrite, and path escape.',
      parameters: {
        type: 'object',
        properties: { from: { type: 'string' }, to: { type: 'string' } },
        required: ['from', 'to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Delete one workspace file with a turn checkpoint. Directories and path escape are refused.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'todo_write',
      description: 'Create or update the current turn task list. Use for multi-step work; keep at most one item in progress.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            maxItems: 50,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
              },
              required: ['id', 'title', 'status'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Run install/build/migrate/test/git commands. Do NOT use for codebase search (grep/rg/find -name) — use code_search + read_file instead. Blocked destructive commands.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          cwd: { type: 'string', description: 'Optional relative subdirectory' },
          timeoutMs: { type: 'number' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_tests',
      description: 'Auto-detect and run project tests (pytest or npm test). Prefer this after edits in Agent mode. On failure, fix and re-run. Failures include lint/diagnostics for recently written files.',
      parameters: {
        type: 'object',
        properties: { extraArgs: { type: 'string', description: 'Optional args after pytest/npm test' }, timeoutMs: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_diagnostics',
      description: 'Lint / language diagnostics for given relative paths (or recently written files). Use after edits or failed tests.',
      parameters: {
        type: 'object',
        properties: { paths: { type: 'array', items: { type: 'string' }, description: 'Relative paths; empty = recently written files' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'git status --short and git diff --stat for the workspace. Use before summarizing changes.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

export const TOOL_SCHEMAS = Object.fromEntries(
  TOOLS.map((tool) => [tool.function.name, tool.function.parameters]),
)
export const TOOL_NAMES = Object.keys(TOOL_SCHEMAS)
