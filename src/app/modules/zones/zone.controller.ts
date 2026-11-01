import { Request, Response } from 'express';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import httpStatus from 'http-status';
import { zoneServices } from './zone.service';
import pick from 'app/utils/pick';
import { sendEmail } from 'app/utils/mailSender';
import path from 'path';
import fs from 'fs';

const createZone = catchAsync(async (req: Request, res: Response) => {
  const result = await zoneServices.createZone(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Zone created successfully',
    data: result,
  });
});

const getAllZones = catchAsync(async (req: Request, res: Response) => {
  const query = pick(req.query, ['searchTerm', 'page', 'limit']);
  const result = await zoneServices.getAllZones(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zones retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getZoneById = catchAsync(async (req: Request, res: Response) => {
  const result = await zoneServices.getZoneById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zone retrieved successfully',
    data: result,
  });
});

const updateZone = catchAsync(async (req: Request, res: Response) => {
  const result = await zoneServices.updateZone(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zone updated successfully',
    data: result,
  });
});

const deleteZone = catchAsync(async (req: Request, res: Response) => {
  const result = await zoneServices.deleteZone(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const assignRiderToZone = catchAsync(async (req: Request, res: Response) => {
  console.log('Assigning rider to zone with params:', req.params);
  console.log('req.params.zoneId:', req.params.zoneId);
  console.log('req.params.riderId:', req.params.riderId);
  const result = await zoneServices.assignRidersToZone(
    req.params.zoneId as string,
    req.params.riderId as string,
  );

  // Send approval email to rider
  try {
    const approvalEmailPath = path.join(
      __dirname,
      '../../../../public/view/zone_assignment_mail.html',
    );

    if (result.email)
      await sendEmail(
        result.email,
        'Zone Assignment Notification',
        fs
          .readFileSync(approvalEmailPath, 'utf8')
          .replace('{{name}}', result.name)
          .replace('{{zoneName}}', result!.zone!.name),
      );
  } catch (emailError) {
    console.error('Failed to send approval email:', emailError);
    // Don't throw error - approval was successful even if email fails
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rider assigned to zone successfully',
    data: result,
  });
});

const removeRiderFromZone = catchAsync(async (req: Request, res: Response) => {
  const result = await zoneServices.removeRiderFromZone(
    req.params.zoneId as string,
    req.params.riderId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Rider removed from zone successfully',
    data: result,
  });
});

export const zoneControllers = {
  createZone,
  getAllZones,
  getZoneById,
  updateZone,
  deleteZone,
  assignRiderToZone,
  removeRiderFromZone,
};
