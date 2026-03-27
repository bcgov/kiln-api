import busboy from 'busboy';
import { Request, Response } from 'express';
import path from 'path';
import { FormDefinition } from 'server/schema/form';
import fs from 'fs';
import os from 'node:os';
import { randomUUID } from 'crypto';
import { FileUploadElement } from 'server/schema/formElements';
import { readdirSync } from 'node:fs';
import CacheService from './cache.service';

type FileUpload = {
  fileId: string;
  originalName: string;
  size: number;
};

export class FileService {
  private uploadDirectory;
  constructor() {
    this.uploadDirectory = path.join(os.tmpdir(), 'uploadFiles');
    CacheService.events.on('expiry', (attachmentId) => {
      this.clearAttachmentFiles(attachmentId);
    });
  }
  private fileSizeToBytes(value: string | number) {
    if (typeof value === 'number') {
      return value;
    }

    const units: Record<string, number> = {
      B: 1,
      KB: 1024,
      MB: 1024 ** 2,
      GB: 1024 ** 3,
      TB: 1024 ** 4,
    };

    const match = value
      .trim()
      .toUpperCase()
      .match(/^(\d+(?:\.\d+)?)\s*([A-Z]+)?$/);

    if (!match) {
      return 0;
    }

    const number = parseFloat(match[1]);
    const unit = match[2] || 'B';

    if (!units[unit]) {
      return 0;
    }

    return Math.round(number * units[unit]);
  }

  private getConstraints(fieldName: string, schema: FormDefinition) {
    const fileField = schema.elements.find(
      (f): f is FileUploadElement =>
        f.name === fieldName && f.type === 'file-upload-input'
    );
    const maxFileSize = fileField
      ? fileField.attributes.maxFileSize
      : process.env.MAX_FILE_SIZE ?? '50MB';
    const maxFileCount = process.env.MAX_FILE_COUNT
      ? parseInt(process.env.MAX_FILE_COUNT)
      : 10;
    return {
      maxFileSize: this.fileSizeToBytes(maxFileSize),
      maxFileCount,
    };
  }

  async clearAttachmentFiles(attachmentId: string) {
    const uploadDir = path.join(this.uploadDirectory, attachmentId);
    try {
      await fs.promises.rm(uploadDir, { recursive: true, force: true });
      console.log(`Cleaned expired upload session ${attachmentId}`);
    } catch (err) {
      console.error(`Error cleaning expired attachment:`, err);
    }
  }

  handleFileUpload(
    req: Request,
    res: Response,
    attachmentId: string,
    schema: FormDefinition
  ) {
    const bb = busboy({ headers: req.headers });
    const uploadDir = path.join(this.uploadDirectory, attachmentId);

    fs.mkdirSync(uploadDir, { recursive: true });

    return new Promise<void>((resolve, reject) => {
      let responded = false;
      const safeJson = (
        status: number,
        body: FileUpload | { error: string }
      ) => {
        if (!responded) {
          responded = true;
          res.status(status).json(body);
        }
      };

      let bytesReceived = 0;
      let fileWritten: FileUpload | null = null;

      bb.on('file', (name, file, info) => {
        const { maxFileSize, maxFileCount } = this.getConstraints(name, schema);
        let aborted = false;
        const fileId = randomUUID();
        const filename = info.filename;

        // check global file count constraint
        const attachmentFiles = readdirSync(uploadDir, { withFileTypes: true });
        if (attachmentFiles.filter((f) => f.isFile()).length >= maxFileCount) {
          safeJson(400, { error: 'File limit for form exceeded' });
          return;
        }

        const outPath = path.join(uploadDir, fileId);
        const out = fs.createWriteStream(outPath);

        // validate filesize while writing
        file.on('data', (chunk) => {
          bytesReceived += chunk.length;
          if (bytesReceived > maxFileSize && !aborted) {
            aborted = true;
            file.unpipe(out);
            out.destroy();
            fs.rmSync(outPath, { force: true });
            safeJson(400, { error: 'File size exceeded' });
          }
        });

        file.pipe(out);

        file.on('end', () => {
          if (!aborted) {
            fileWritten = {
              fileId,
              originalName: filename,
              size: bytesReceived,
            };
            // Add to Redis here
            console.log(fileWritten);
            CacheService.addFile(attachmentId, {
              fileId,
              originalName: filename,
            });
          }
        });
      });

      bb.on('close', () => {
        if (!fileWritten) {
          safeJson(500, { error: 'No file uploaded' });
        } else {
          safeJson(200, fileWritten);
        }
        resolve();
      });

      bb.on('error', (err) => {
        safeJson(500, { error: 'Upload error' });
        console.error(err);
        reject(err);
      });

      req.pipe(bb);
    });
  }
}

export default new FileService();
