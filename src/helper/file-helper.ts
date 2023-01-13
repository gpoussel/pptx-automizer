import fs from 'fs';
import path from 'path';
import JSZip, { InputType, JSZipObject, OutputType } from 'jszip';

import { AutomizerSummary, FileInfo } from '../types/types';
import { IPresentationProps } from '../interfaces/ipresentation-props';
import { contentTracker } from './content-tracker';
import CacheHelper from './cache-helper';
import { vd } from './general-helper';

export class FileHelper {
  static readFile(location: string): Promise<Buffer> {
    if (!fs.existsSync(location)) {
      throw new Error('File not found: ' + location);
    }
    return fs.promises.readFile(location);
  }

  static extractFromArchive(
    archive: JSZip,
    file: string,
    type?: OutputType,
    cache?: CacheHelper,
  ): Promise<string | number[] | Uint8Array | ArrayBuffer | Blob | Buffer> {
    const exists = FileHelper.check(archive, file);

    if (!exists) {
      throw new Error('File is not in archive: ' + file);
    }

    return archive.files[file].async(type || 'string');
  }

  static removeFromDirectory(
    archive: JSZip,
    dir: string,
    cb: (file: JSZipObject, relativePath: string) => boolean,
  ): string[] {
    const removed = [];
    archive.folder(dir).forEach((relativePath, file) => {
      if (!relativePath.includes('/') && cb(file, relativePath)) {
        FileHelper.removeFromArchive(archive, file.name);
        removed.push(file.name);
      }
    });
    return removed;
  }

  static removeFromArchive(archive: JSZip, file: string): JSZip {
    FileHelper.check(archive, file);

    return archive.remove(file);
  }

  static extractFileContent(file: Buffer, cache?: CacheHelper): Promise<JSZip> {
    cache?.store();
    const zip = new JSZip();
    return zip.loadAsync(file as unknown as InputType);
  }

  static getFileExtension(filename: string): string {
    return path.extname(filename).replace('.', '');
  }

  static getFileInfo(filename: string): FileInfo {
    return {
      base: path.basename(filename),
      dir: path.dirname(filename),
      isDir: filename[filename.length - 1] === '/',
      extension: path.extname(filename).replace('.', ''),
    };
  }

  static check(archive: JSZip, file: string): boolean {
    FileHelper.isArchive(archive);
    return FileHelper.fileExistsInArchive(archive, file);
  }

  static isArchive(archive) {
    if (archive === undefined || !archive.files) {
      throw new Error('Archive is invalid or empty.');
    }
  }

  static fileExistsInArchive(archive: JSZip, file: string): boolean {
    if (archive === undefined || archive.files[file] === undefined) {
      return false;
    }
    return true;
  }

  /**
   * Copies a file from one archive to another. The new file can have a different name to the origin.
   * @param {JSZip} sourceArchive - Source archive
   * @param {string} sourceFile - file path and name inside source archive
   * @param {JSZip} targetArchive - Target archive
   * @param {string} targetFile - file path and name inside target archive
   * @return {JSZip} targetArchive as an instance of JSZip
   */
  static async zipCopy(
    sourceArchive: JSZip,
    sourceFile: string,
    targetArchive: JSZip,
    targetFile?: string,
    tmp?: any,
  ): Promise<JSZip> {
    FileHelper.check(sourceArchive, sourceFile);

    const content = sourceArchive.files[sourceFile].async('nodebuffer');
    contentTracker.trackFile(targetFile);

    return targetArchive.file(targetFile || sourceFile, content);
  }

  static async writeOutputFile(
    location: string,
    content: Buffer,
    automizer: IPresentationProps,
  ): Promise<AutomizerSummary> {
    await fs.promises.writeFile(location, content).catch((err) => {
      console.error(err);
      throw new Error(`Could not write output file: ${location}`);
    });

    const duration: number = (Date.now() - automizer.timer) / 600;

    return {
      status: 'finished',
      duration,
      file: location,
      filename: path.basename(location),
      templates: automizer.templates.length,
      slides: automizer.rootTemplate.count('slides'),
      charts: automizer.rootTemplate.count('charts'),
      images: automizer.rootTemplate.count('images'),
    };
  }
}
