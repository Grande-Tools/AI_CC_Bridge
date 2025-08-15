import * as fs from 'fs';
import * as path from 'path';
import { ClaudeMemoryFile, ClaudeMemorySection } from './types';

export class ClaudeMemoryReader {
  private static readonly CLAUDE_FILES = ['CLAUDE.md', 'CLAUDE.local.md'];

  /**
   * Find and read CLAUDE.md files starting from the given directory and traversing up
   */
  static async findAndReadClaudeFiles(startDir: string = process.cwd()): Promise<ClaudeMemoryFile[]> {
    const files: ClaudeMemoryFile[] = [];
    let currentDir = path.resolve(startDir);
    const rootDir = path.parse(currentDir).root;

    // Traverse up the directory tree
    while (currentDir !== rootDir) {
      for (const fileName of this.CLAUDE_FILES) {
        const filePath = path.join(currentDir, fileName);
        
        if (await this.fileExists(filePath)) {
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const memoryFile = this.parseClaudeFile(filePath, content);
            files.push(memoryFile);
          } catch (error) {
            // Continue silently if file can't be read
          }
        }
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break; // Reached root
      currentDir = parentDir;
    }

    return files;
  }

  /**
   * Parse a CLAUDE.md file into structured sections
   */
  static parseClaudeFile(filePath: string, content: string): ClaudeMemoryFile {
    const sections: ClaudeMemorySection[] = [];
    const lines = content.split('\n');
    let currentSection: ClaudeMemorySection | null = null;

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentSection.content.trim();
          sections.push(currentSection);
        }

        // Start new section
        const level = headerMatch[1]?.length || 1;
        const title = headerMatch[2]?.trim() || '';
        currentSection = {
          title,
          level,
          content: ''
        };
      } else if (currentSection) {
        // Add line to current section
        currentSection.content += line + '\n';
      }
    }

    // Add final section
    if (currentSection) {
      currentSection.content = currentSection.content.trim();
      sections.push(currentSection);
    }

    return {
      filePath,
      sections,
      rawContent: content
    };
  }

  /**
   * Convert CLAUDE.md files to context string for Claude Code
   */
  static formatForClaudeContext(memoryFiles: ClaudeMemoryFile[]): string {
    if (memoryFiles.length === 0) {
      return '';
    }

    const contextParts: string[] = [];

    for (const file of memoryFiles) {
      const relativePath = path.relative(process.cwd(), file.filePath);
      contextParts.push(`## Context from ${relativePath}\n`);
      contextParts.push(file.rawContent);
      contextParts.push('\n---\n');
    }

    return contextParts.join('\n');
  }

  /**
   * Get specific sections from memory files
   */
  static getSectionsByTitle(memoryFiles: ClaudeMemoryFile[], titlePattern: string | RegExp): ClaudeMemorySection[] {
    const matches: ClaudeMemorySection[] = [];
    
    for (const file of memoryFiles) {
      for (const section of file.sections) {
        if (typeof titlePattern === 'string') {
          if (section.title.toLowerCase().includes(titlePattern.toLowerCase())) {
            matches.push(section);
          }
        } else {
          if (titlePattern.test(section.title)) {
            matches.push(section);
          }
        }
      }
    }

    return matches;
  }

  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}