import type { SkillProfile } from './types';

type ParsedFrontmatter = {
  name: string;
  description: string;
};

function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/\r\n/g, '\n');
}

function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const normalizedMarkdown = normalizeMarkdown(markdown);
  const match = normalizedMarkdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error('Skill document is missing YAML frontmatter.');
  }

  const name = match[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();

  if (!name || !description) {
    throw new Error('Skill document frontmatter must include name and description.');
  }

  return {
    name: name.replace(/^"|"$/g, ''),
    description: description.replace(/^"|"$/g, ''),
  };
}

function getTitle(markdown: string): string {
  const match = normalizeMarkdown(markdown).match(/^# (.+)$/m);
  if (!match) {
    throw new Error('Skill document is missing the top-level title.');
  }

  return match[1].trim();
}

function getSection(markdown: string, heading: string): string {
  const normalizedMarkdown = normalizeMarkdown(markdown);
  const sectionMarker = `## ${heading}\n\n`;
  const sectionStart = normalizedMarkdown.indexOf(sectionMarker);
  if (sectionStart === -1) {
    throw new Error(`Skill document is missing the "${heading}" section.`);
  }

  const sectionContentStart = sectionStart + sectionMarker.length;
  const remaining = normalizedMarkdown.slice(sectionContentStart);
  const nextSectionIndex = remaining.indexOf('\n## ');

  return (nextSectionIndex === -1 ? remaining : remaining.slice(0, nextSectionIndex)).trim();
}

function getBulletSection(markdown: string, heading: string): string[] {
  return getSection(markdown, heading)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

export function parseSkillDocument(skillId: string, markdown: string): SkillProfile {
  const frontmatter = parseFrontmatter(markdown);
  if (frontmatter.name !== skillId) {
    throw new Error(`Skill frontmatter name "${frontmatter.name}" must match the folder id "${skillId}".`);
  }

  return {
    id: skillId,
    name: getTitle(markdown),
    description: frontmatter.description,
    objective: getSection(markdown, 'Objective'),
    tone: getSection(markdown, 'Tone'),
    forbiddenBehaviors: getBulletSection(markdown, 'Guardrails'),
    strategies: getBulletSection(markdown, 'Strategies'),
    openingStyle: getSection(markdown, 'Opening'),
    closingStyle: getSection(markdown, 'Closing'),
    recommendedCallPurposeHint: getSection(markdown, 'Recommended Call Purpose'),
  };
}
