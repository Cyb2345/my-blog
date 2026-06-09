export type TocItem = {
  id: string;
  level: 2 | 3 | 4;
  text: string;
};

const fencePattern = /^\s*(```|~~~)/;
const bulletPattern = /^(\s*)[●•·]\s+/;
const numberedHeadingPattern = /^(\d+(?:\.\d+)*\.?)\s+(.+)$/;
const codeLikePattern =
  /^\s*(FROM|RUN|CMD|COPY|ADD|WORKDIR|ENV|EXPOSE|ENTRYPOINT|docker|kubectl|helm|systemctl|journalctl|redis-cli|mysql|cat|mkdir|cd|ss|SHOW|CREATE|GRANT|FLUSH|CHANGE MASTER|START SLAVE|cluster)\b|^\s*&&\b|^#\s+\S/;

export function slugifyHeading(text: string) {
  const plain = text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~#>|]/g, "")
    .trim()
    .toLowerCase();

  const slug = plain
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "section";
}

export function headingId(text: string, line?: number) {
  const slug = slugifyHeading(text);
  return line ? `h-${slug}-l${line}` : `h-${slug}`;
}

export function extractToc(content: string): TocItem[] {
  const items: TocItem[] = [];
  let insideFence = false;

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (fencePattern.test(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence) continue;

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].trim();

    if (level >= 2 && level <= 4) {
      items.push({
        id: headingId(text, index + 1),
        level: level as 2 | 3 | 4,
        text,
      });
    }
  }

  return items;
}

function isLikelyNumberedHeading(prefix: string, text: string) {
  if (text.length > 38) return false;
  if (/[。！？；;：:]$/.test(text)) return false;
  const depth = prefix.replace(/\.$/, "").split(".").filter(Boolean).length;
  return depth >= 1 && depth <= 3;
}

function numberedHeadingLevel(prefix: string) {
  const depth = prefix.replace(/\.$/, "").split(".").filter(Boolean).length;
  return Math.min(depth + 1, 4);
}

function convertTabTables(lines: string[]) {
  const output: string[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    if (!lines[cursor].includes("\t")) {
      output.push(lines[cursor]);
      cursor += 1;
      continue;
    }

    const tableRows: string[][] = [];
    while (cursor < lines.length && lines[cursor].includes("\t")) {
      tableRows.push(lines[cursor].split("\t").map((cell) => cell.trim()));
      cursor += 1;
    }

    if (tableRows.length < 2) {
      output.push(tableRows[0].join(" | "));
      continue;
    }

    const columns = Math.max(...tableRows.map((row) => row.length));
    const normalizedRows = tableRows.map((row) => [
      ...row,
      ...Array.from({ length: columns - row.length }, () => ""),
    ]);

    output.push(`| ${normalizedRows[0].join(" | ")} |`);
    output.push(`| ${Array.from({ length: columns }, () => "---").join(" | ")} |`);
    for (const row of normalizedRows.slice(1)) {
      output.push(`| ${row.join(" | ")} |`);
    }
  }

  return output;
}

function inferCodeLanguage(lines: string[]) {
  const text = lines.join("\n");
  if (/^\s*(FROM|RUN|CMD|COPY|ADD|WORKDIR|ENV|EXPOSE|ENTRYPOINT)\b/m.test(text)) return "dockerfile";
  if (/^\s*(SHOW|CREATE|GRANT|FLUSH|CHANGE MASTER|START SLAVE)\b/m.test(text)) return "sql";
  return "bash";
}

function wrapCodeLikeBlocks(lines: string[]) {
  const output: string[] = [];
  let cursor = 0;
  let insideFence = false;

  while (cursor < lines.length) {
    const line = lines[cursor];
    if (fencePattern.test(line)) {
      insideFence = !insideFence;
      output.push(line);
      cursor += 1;
      continue;
    }

    if (insideFence || !codeLikePattern.test(line) || line.startsWith("##")) {
      output.push(line);
      cursor += 1;
      continue;
    }

    const block: string[] = [];
    while (cursor < lines.length) {
      const current = lines[cursor];
      const previous = block[block.length - 1] ?? "";
      const isContinuation = /^\s+/.test(current) || previous.trim().endsWith("\\");
      if (!current.trim()) {
        const next = lines[cursor + 1] ?? "";
        if (codeLikePattern.test(next) || /^\s+/.test(next)) {
          block.push(current);
          cursor += 1;
          continue;
        }
        break;
      }
      if (current.startsWith("##") || (!codeLikePattern.test(current) && !isContinuation)) break;
      block.push(current);
      cursor += 1;
    }

    output.push(`\`\`\`${inferCodeLanguage(block)}`);
    output.push(...block);
    output.push("```");
  }

  return output;
}

export function normalizeYuqueMarkdown(content: string) {
  const normalized = content
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => {
      const bulletMatch = bulletPattern.exec(line);
      if (bulletMatch) return line.replace(bulletPattern, `${bulletMatch[1]}- `);

      const headingMatch = numberedHeadingPattern.exec(line.trim());
      if (headingMatch && isLikelyNumberedHeading(headingMatch[1], headingMatch[2])) {
        return `${"#".repeat(numberedHeadingLevel(headingMatch[1]))} ${headingMatch[1]} ${headingMatch[2]}`;
      }

      return line;
    });

  return wrapCodeLikeBlocks(convertTabTables(normalized))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
