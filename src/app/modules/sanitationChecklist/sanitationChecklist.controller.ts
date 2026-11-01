import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { toPublicUploadPath } from '../../utils/filePathSanitizer';
import { sanitationChecklistServices as services } from './sanitationChecklist.service';

const create = catchAsync(async (req: Request, res: Response) => {
  const data = await services.create({
    ...req.body,
    icon: toPublicUploadPath(req.file!.path),
  });
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Sanitation checklist item created',
    data,
  });
});
const getAll = catchAsync(async (_req: Request, res: Response) => {
  const data = await services.getAll();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Sanitation checklist items retrieved',
    data,
  });
});
const update = catchAsync(async (req: Request, res: Response) => {
  const payload = { ...req.body };
  if (req.file) payload.icon = toPublicUploadPath(req.file.path);
  const data = await services.update(req.params.id as string, payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Sanitation checklist item updated',
    data,
  });
});
const remove = catchAsync(async (req: Request, res: Response) => {
  const data = await services.remove(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Sanitation checklist item deleted',
    data,
  });
});

const saveMyProgress = catchAsync(async (req: Request, res: Response) => {
  const photos =
    Array.isArray(req.files) && req.files.length
      ? req.files.map(file => toPublicUploadPath(file.path))
      : undefined;
  const data = await services.saveMyProgress(
    req.user.userId,
    req.params.id as string,
    {
      isCompleted: req.body.isCompleted,
      photos,
    },
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your sanitation checklist progress saved',
    data,
  });
});

const getMyProgress = catchAsync(async (req: Request, res: Response) => {
  const data = await services.getMyProgress(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your sanitation checklist retrieved',
    data,
  });
});

export const sanitationChecklistControllers = {
  saveMyProgress,
  getMyProgress,
  create,
  getAll,
  update,
  remove,
};
