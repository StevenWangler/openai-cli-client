import { marked } from 'marked';
import chalk from 'chalk';

export class MarkdownRenderer {
  private static isInitialized = false;
  
  static initialize() {
    if (this.isInitialized) return;
    
    try {
      // Configure marked for terminal output
      marked.setOptions({
        breaks: true,
        gfm: true
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize markdown renderer:', error);
    }
  }
  
  /**
   * Render markdown text for terminal output
   * @param markdown The markdown text to render
   * @returns Formatted string for terminal display
   */
  static render(markdown: string): string {
    try {
      // Initialize renderer if not already done
      this.initialize();
      
      // Parse markdown to HTML
      const html = marked(markdown) as string;
      
      // Convert HTML to terminal-friendly text
      const terminalText = this.htmlToTerminal(html);
      
      // Clean up extra newlines at the end
      return terminalText.replace(/\n+$/, '\n');
    } catch (error) {
      console.error('Markdown rendering error:', error);
      // Fallback to plain text if rendering fails
      return markdown;
    }
  }

  /**
   * Convert HTML from marked to terminal-styled text
   * @param html The HTML string to convert
   * @returns Terminal-styled text
   */
  private static htmlToTerminal(html: string): string {
    let text = html;
    
    // Headers
    text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gs, (_, content) => 
      '\n' + chalk.bold.magenta('# ' + this.stripHtml(content)) + '\n'
    );
    text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gs, (_, content) => 
      '\n' + chalk.bold.blue('## ' + this.stripHtml(content)) + '\n'
    );
    text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gs, (_, content) => 
      '\n' + chalk.bold.cyan('### ' + this.stripHtml(content)) + '\n'
    );
    text = text.replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/gs, (_, content) => 
      '\n' + chalk.bold('#### ' + this.stripHtml(content)) + '\n'
    );
    
    // Code blocks
    text = text.replace(/<pre><code(?:\s+class="language-(\w+)")?[^>]*>(.*?)<\/code><\/pre>/gs, (_, lang, code) => {
      const cleanCode = this.stripHtml(code).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      const highlightedCode = lang ? highlightCode(cleanCode, lang) : cleanCode;
      return '\n' + chalk.bgBlack.white(highlightedCode) + '\n';
    });
    
    // Inline code
    text = text.replace(/<code[^>]*>(.*?)<\/code>/gs, (_, content) => 
      chalk.bgBlack.cyan(this.stripHtml(content))
    );
    
    // Bold and italic
    text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gs, (_, content) => 
      chalk.bold.white(this.stripHtml(content))
    );
    text = text.replace(/<em[^>]*>(.*?)<\/em>/gs, (_, content) => 
      chalk.italic.cyan(this.stripHtml(content))
    );
    
    // Links
    text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs, (_, href, content) => 
      chalk.underline.blue(this.stripHtml(content)) + chalk.gray(' (' + href + ')')
    );
    
    // Lists
    text = text.replace(/<ul[^>]*>(.*?)<\/ul>/gs, (_, content) => {
      const items = content.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
      return '\n' + items.map((item: string) => {
        const itemContent = item.replace(/<li[^>]*>(.*?)<\/li>/s, '$1');
        return '• ' + chalk.white(this.stripHtml(itemContent));
      }).join('\n') + '\n';
    });
    
    text = text.replace(/<ol[^>]*>(.*?)<\/ol>/gs, (_, content) => {
      const items = content.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
      return '\n' + items.map((item: string, index: number) => {
        const itemContent = item.replace(/<li[^>]*>(.*?)<\/li>/s, '$1');
        return (index + 1) + '. ' + chalk.white(this.stripHtml(itemContent));
      }).join('\n') + '\n';
    });
    
    // Blockquotes
    text = text.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, (_, content) => 
      '\n' + chalk.italic.gray('> ' + this.stripHtml(content).replace(/\n/g, '\n> ')) + '\n'
    );
    
    // Horizontal rules
    text = text.replace(/<hr[^>]*>/g, '\n' + chalk.gray('─'.repeat(60)) + '\n');
    
    // Paragraphs
    text = text.replace(/<p[^>]*>(.*?)<\/p>/gs, (_, content) => 
      this.stripHtml(content) + '\n'
    );
    
    // Clean up remaining HTML
    text = this.stripHtml(text);
    
    // Clean up extra whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text;
  }

  /**
   * Remove HTML tags and decode entities
   * @param html HTML string to clean
   * @returns Plain text
   */
  private static stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
  
  /**
   * Render markdown and stream it character by character
   * @param markdown The markdown text to render
   * @param callback Function called for each chunk of rendered text
   */
  static renderStream(markdown: string, callback: (chunk: string) => void): void {
    try {
      // Initialize renderer if not already done
      this.initialize();
      
      const rendered = this.render(markdown);
      
      // Stream the rendered text in small chunks for smooth display
      let index = 0;
      const chunkSize = 10; // Characters per chunk
      
      const streamChunk = () => {
        if (index < rendered.length) {
          const chunk = rendered.slice(index, index + chunkSize);
          callback(chunk);
          index += chunkSize;
          
          // Small delay between chunks for smooth streaming effect
          setTimeout(streamChunk, 10);
        }
      };
      
      streamChunk();
    } catch (error) {
      console.error('Markdown streaming error:', error);
      // Fallback to plain text streaming
      callback(markdown);
    }
  }
  
  /**
   * Check if text contains markdown syntax
   * @param text The text to check
   * @returns True if the text appears to contain markdown
   */
  static isMarkdown(text: string): boolean {
    // Simple heuristics to detect markdown
    const markdownPatterns = [
      /^#{1,6}\s/m,          // Headers
      /\*\*.*\*\*/,          // Bold
      /\*.*\*/,              // Italic
      /`.*`/,                // Inline code
      /```[\s\S]*```/,       // Code blocks
      /^\* /m,               // Lists
      /^\d+\. /m,            // Numbered lists
      /\[.*\]\(.*\)/,        // Links
      /^> /m                 // Blockquotes
    ];
    
    return markdownPatterns.some(pattern => pattern.test(text));
  }
}

/**
 * Basic syntax highlighting for common languages
 * @param code The code to highlight
 * @param lang The language identifier
 * @returns Highlighted code string
 */
function highlightCode(code: string, lang: string): string {
  const normalizedLang = lang.toLowerCase();
  
  switch (normalizedLang) {
    case 'javascript':
    case 'js':
      return highlightJavaScript(code);
    case 'typescript':
    case 'ts':
      return highlightTypeScript(code);
    case 'python':
    case 'py':
      return highlightPython(code);
    case 'json':
      return highlightJSON(code);
    case 'bash':
    case 'sh':
    case 'shell':
      return highlightBash(code);
    default:
      return code; // No highlighting for unknown languages
  }
}

function highlightJavaScript(code: string): string {
  return code
    .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|finally)\b/g, chalk.blue('$1'))
    .replace(/\b(true|false|null|undefined)\b/g, chalk.magenta('$1'))
    .replace(/\b\d+\b/g, chalk.yellow('$&'))
    .replace(/(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g, chalk.green('$1$2$3'))
    .replace(/\/\/.*$/gm, chalk.gray('$&'))
    .replace(/\/\*[\s\S]*?\*\//g, chalk.gray('$&'));
}

function highlightTypeScript(code: string): string {
  return code
    .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|finally|interface|type|enum|namespace|public|private|protected|readonly)\b/g, chalk.blue('$1'))
    .replace(/\b(string|number|boolean|any|void|never|unknown|object)\b/g, chalk.cyan('$1'))
    .replace(/\b(true|false|null|undefined)\b/g, chalk.magenta('$1'))
    .replace(/\b\d+\b/g, chalk.yellow('$&'))
    .replace(/(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g, chalk.green('$1$2$3'))
    .replace(/\/\/.*$/gm, chalk.gray('$&'))
    .replace(/\/\*[\s\S]*?\*\//g, chalk.gray('$&'));
}

function highlightPython(code: string): string {
  return code
    .replace(/\b(def|class|if|elif|else|for|while|try|except|finally|with|import|from|as|return|yield|lambda|pass|break|continue|global|nonlocal|assert|del|raise)\b/g, chalk.blue('$1'))
    .replace(/\b(True|False|None)\b/g, chalk.magenta('$1'))
    .replace(/\b\d+(\.\d+)?\b/g, chalk.yellow('$&'))
    .replace(/(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g, chalk.green('$1$2$3'))
    .replace(/#.*$/gm, chalk.gray('$&'));
}

function highlightJSON(code: string): string {
  return code
    .replace(/(["'])((?:(?!\1)[^\\]|\\.)*)(\1)(?=\s*:)/g, chalk.cyan('$1$2$3')) // Keys
    .replace(/:\s*(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g, ': ' + chalk.green('$1$2$3')) // String values
    .replace(/:\s*(true|false|null)\b/g, ': ' + chalk.magenta('$1')) // Boolean/null values
    .replace(/:\s*(\d+(\.\d+)?)\b/g, ': ' + chalk.yellow('$1')); // Number values
}

function highlightBash(code: string): string {
  return code
    .replace(/\b(if|then|else|elif|fi|for|do|done|while|case|esac|function|return|export|local|readonly|declare)\b/g, chalk.blue('$1'))
    .replace(/\$\w+/g, chalk.yellow('$&')) // Variables
    .replace(/\$\{[^}]+\}/g, chalk.yellow('$&')) // Variable expansions
    .replace(/(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g, chalk.green('$1$2$3'))
    .replace(/#.*$/gm, chalk.gray('$&'));
} 