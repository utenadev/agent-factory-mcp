import { spawn } from 'child_process';
import { Logger } from './logger.js';

export async function executeCommand(
  command: string,
  args: string[],
  onProgress?: (newOutput: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    Logger.debug(`Executing command: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      if (onProgress) {
        onProgress(output);
      }
      
      Logger.debug(`Command stdout: ${chunk.trim()}`);
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      Logger.debug(`Command stderr: ${chunk.trim()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        Logger.debug('Command executed successfully');
        resolve(output.trim());
      } else {
        const errorMsg = errorOutput || `Command exited with code ${code}`;
        Logger.error(`Command failed with code ${code}: ${errorMsg}`);
        reject(new Error(errorMsg));
      }
    });

    child.on('error', (error) => {
      Logger.error('Command execution error:', error);
      reject(error);
    });
  });
}