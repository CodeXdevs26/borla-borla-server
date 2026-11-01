import path from 'path';

const toPublicUploadPath = (filePath: string): string => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const publicSegment = '/public/';
  const segmentIndex = normalizedPath.toLowerCase().indexOf(publicSegment);

  if (segmentIndex >= 0) {
    return normalizedPath.slice(segmentIndex + 1);
  }

  return path
    .relative(process.cwd(), filePath)
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '');
};

export { toPublicUploadPath };
