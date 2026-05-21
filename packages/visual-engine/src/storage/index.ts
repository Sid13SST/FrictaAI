import * as path from 'path';
import * as fs from 'fs/promises';

export class VisualStorageManager {
  private baseDir: string;

  constructor(baseDir?: string) {
    if (baseDir) {
      this.baseDir = baseDir;
    } else {
      // Find monorepo root by looking for packages and apps directories
      let current = __dirname;
      let root = process.cwd();
      while (current !== path.parse(current).root) {
        const hasPackages = require('fs').existsSync(path.join(current, 'packages'));
        const hasApps = require('fs').existsSync(path.join(current, 'apps'));
        if (hasPackages && hasApps) {
          root = current;
          break;
        }
        current = path.dirname(current);
      }
      this.baseDir = path.join(root, 'storage');
    }
  }

  /**
   * Returns the absolute path of the storage directory
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Ensures that the session directory exists
   */
  async ensureSessionDir(sessionId: string): Promise<string> {
    const sessionDir = path.join(this.baseDir, 'sessions', sessionId);
    await fs.mkdir(sessionDir, { recursive: true });
    return sessionDir;
  }

  /**
   * Saves a file buffer to the session directory
   */
  async saveFile(sessionId: string, filename: string, data: Buffer): Promise<string> {
    const sessionDir = await this.ensureSessionDir(sessionId);
    const filePath = path.join(sessionDir, filename);
    await fs.writeFile(filePath, data);
    
    // Return relative path from baseDir to make DB records portable/independent of absolute installation paths
    return path.relative(this.baseDir, filePath).replace(/\\/g, '/');
  }

  /**
   * Resolves a relative storage path back to an absolute filesystem path
   */
  resolvePath(relativeStoragePath: string): string {
    return path.join(this.baseDir, relativeStoragePath);
  }
}
