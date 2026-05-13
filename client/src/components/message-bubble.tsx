import { Bot, User, AlertTriangle, ExternalLink, ChevronRight } from "lucide-react";
import type { Message } from "@shared/schema";
import { cn } from "@/lib/utils";

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let i = 0;
  let keyCount = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(<h3 key={keyCount++} className="text-sm font-semibold mt-3 mb-1 text-foreground">{line.slice(4)}</h3>);
      i++;
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={keyCount++} className="text-sm font-bold mt-4 mb-1.5 text-foreground">{line.slice(3)}</h2>);
      i++;
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      elements.push(<p key={keyCount++} className="font-semibold text-sm mt-2 text-foreground">{line.slice(2, -2)}</p>);
      i++;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={keyCount++} className="space-y-0.5 my-1.5 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
              <span>{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={keyCount++} className="space-y-0.5 my-1.5 pl-1 list-decimal list-inside">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm">{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={keyCount++} className="h-1.5" />);
      i++;
    } else {
      elements.push(
        <p key={keyCount++} className="text-sm leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
      i++;
    }
  }

  return elements;
}

function renderInlineMarkdown(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`(.+?)`/);
    const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/);

    const matches = [
      boldMatch ? { index: boldMatch.index!, type: "bold", match: boldMatch } : null,
      codeMatch ? { index: codeMatch.index!, type: "code", match: codeMatch } : null,
      linkMatch ? { index: linkMatch.index!, type: "link", match: linkMatch } : null,
    ].filter(Boolean) as { index: number; type: string; match: RegExpMatchArray }[];

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    matches.sort((a, b) => a.index - b.index);
    const first = matches[0];

    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === "bold") {
      parts.push(<strong key={key++} className="font-semibold">{first.match[1]}</strong>);
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === "code") {
      parts.push(<code key={key++} className="bg-muted/70 px-1 py-0.5 rounded text-xs font-mono">{first.match[1]}</code>);
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === "link") {
      parts.push(
        <a key={key++} href={first.match[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-0.5">
          {first.match[1]}<ExternalLink className="w-2.5 h-2.5" />
        </a>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    }
  }

  return parts;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const metadata = message.metadata as any;

  return (
    <div
      className={cn("flex gap-3 max-w-3xl", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}
      data-testid={`message-${message.id}`}
    >
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-sidebar-primary text-sidebar-primary-foreground"
      )}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      <div className={cn("flex flex-col gap-1.5 max-w-[85%]", isUser ? "items-end" : "items-start")}>
        <div className={cn(
          "rounded-lg px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-card-border"
        )}>
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <div className="space-y-0.5 text-foreground">
              {renderMarkdown(message.content)}
            </div>
          )}
        </div>

        {!isUser && metadata?.escalation && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 max-w-full">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">{metadata.escalation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3 max-w-3xl mr-auto">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-sidebar-primary text-sidebar-primary-foreground">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="flex flex-col gap-1.5 max-w-[85%] items-start">
        <div className="bg-card border border-card-border rounded-lg px-4 py-3">
          {content ? (
            <div className="space-y-0.5 text-foreground">
              {renderMarkdown(content)}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
