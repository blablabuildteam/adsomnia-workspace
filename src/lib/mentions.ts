import type { MentionPerson } from "@/lib/queries";

export type MentionQuery = {
  start: number;
  query: string;
};

export type MentionPart =
  | { kind: "text"; text: string }
  | { kind: "mention"; person: MentionPerson };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `@` after start-of-string or whitespace; query is the typed filter. */
export function getMentionQuery(
  value: string,
  caret: number,
): MentionQuery | null {
  const before = value.slice(0, caret);
  const match = before.match(/(^|[\s])@([^\n@]*)$/);
  if (!match) return null;
  const query = match[2];
  const words = query.split(" ");
  if (words.length > 2) return null;
  return {
    start: caret - query.length - 1,
    query,
  };
}

export function filterMentionablePeople(
  people: MentionPerson[],
  query: string,
): MentionPerson[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return people;
  return people.filter((person) => {
    const haystacks = [
      person.handle,
      person.firstName ?? "",
      person.lastName ?? "",
      `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim(),
    ];
    return haystacks.some((part) => part.toLowerCase().includes(needle));
  });
}

export function insertMention(
  value: string,
  caret: number,
  mention: MentionQuery,
  person: MentionPerson,
): { value: string; caret: number } {
  const inserted = `@${person.handle} `;
  const next = `${value.slice(0, mention.start)}${inserted}${value.slice(caret)}`;
  return {
    value: next,
    caret: mention.start + inserted.length,
  };
}

export function splitMentions(
  body: string,
  people: MentionPerson[],
): MentionPart[] {
  if (!body || people.length === 0) {
    return body ? [{ kind: "text", text: body }] : [];
  }

  const handles = [...people].sort(
    (a, b) => b.handle.length - a.handle.length,
  );
  const pattern = new RegExp(
    `@(?:${handles.map((person) => escapeRegExp(person.handle)).join("|")})\\b`,
    "g",
  );
  const byHandle = new Map(
    people.map((person) => [person.handle.toLowerCase(), person]),
  );

  const parts: MentionPart[] = [];
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      parts.push({ kind: "text", text: body.slice(cursor, index) });
    }
    const handle = match[0].slice(1);
    const person = byHandle.get(handle.toLowerCase());
    if (person) {
      parts.push({ kind: "mention", person });
    } else {
      parts.push({ kind: "text", text: match[0] });
    }
    cursor = index + match[0].length;
  }
  if (cursor < body.length) {
    parts.push({ kind: "text", text: body.slice(cursor) });
  }
  return parts;
}
