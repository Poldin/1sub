export interface ToolRegistration {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export async function registerTool(input: { name: string; url: string }): Promise<ToolRegistration> {
  // Placeholder: persist to DB
  return {
    id: 'tool_' + Math.random().toString(36).slice(2),
    name: input.name,
    url: input.url,
    createdAt: new Date().toISOString(),
  };
}


