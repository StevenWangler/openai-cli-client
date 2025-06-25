import OpenAI from 'openai';
import type { ChatMessage, MCPTool } from '../types/index.js';

export class OpenAIClient {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async *streamChat(
    messages: ChatMessage[],
    tools: MCPTool[] = []
  ): AsyncGenerator<string | { type: 'tool_call'; tool: string; args: any }, void, unknown> {
    const openaiMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));

    const openaiTools = tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema
      }
    }));

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      stream: true,
    });

    let currentToolCall: { name: string; args: string } | null = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      if (delta?.content) {
        yield delta.content;
      }

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          if (toolCall.function?.name) {
            currentToolCall = {
              name: toolCall.function.name,
              args: toolCall.function.arguments || ''
            };
          } else if (currentToolCall && toolCall.function?.arguments) {
            currentToolCall.args += toolCall.function.arguments;
          }
        }
      }

      // Tool call completed
      if (chunk.choices[0]?.finish_reason === 'tool_calls' && currentToolCall) {
        try {
          const args = JSON.parse(currentToolCall.args);
          yield {
            type: 'tool_call',
            tool: currentToolCall.name,
            args
          };
          currentToolCall = null;
        } catch (error) {
          console.error('Failed to parse tool call arguments:', error);
        }
      }
    }
  }

  async chat(messages: ChatMessage[], tools: MCPTool[] = []): Promise<string> {
    let response = '';
    for await (const chunk of this.streamChat(messages, tools)) {
      if (typeof chunk === 'string') {
        response += chunk;
      }
    }
    return response;
  }
} 