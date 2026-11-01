import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from 'app/utils/catchAsync';
import sendResponse from 'app/utils/sendResponse';
import { contentPagesService } from './contentPages.service';

const getAboutUs = catchAsync(async (_req: Request, res: Response) => {
  const result = await contentPagesService.getPageContent('aboutUs');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'About us content retrieved successfully',
    data: result,
  });
});

const updateAboutUs = catchAsync(async (req: Request, res: Response) => {
  console.log('Updating about us content with content:', req.body);
  const result = await contentPagesService.updatePageContent(
    'aboutUs',
    req.body.content,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'About us content updated successfully',
    data: result,
  });
});

const getTermsAndConditions = catchAsync(
  async (_req: Request, res: Response) => {
    const result =
      await contentPagesService.getPageContent('termsAndCondition');

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Terms and conditions retrieved successfully',
      data: result,
    });
  },
);

const updateTermsAndConditions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await contentPagesService.updatePageContent(
      'termsAndCondition',
      req.body.content,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Terms and conditions updated successfully',
      data: result,
    });
  },
);

const getPrivacyPolicy = catchAsync(async (_req: Request, res: Response) => {
  const result = await contentPagesService.getPageContent('privacyPolicy');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Privacy policy retrieved successfully',
    data: result,
  });
});

const updatePrivacyPolicy = catchAsync(async (req: Request, res: Response) => {
  const result = await contentPagesService.updatePageContent(
    'privacyPolicy',
    req.body.content,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Privacy policy updated successfully',
    data: result,
  });
});

export const contentPagesController = {
  getAboutUs,
  updateAboutUs,
  getTermsAndConditions,
  updateTermsAndConditions,
  getPrivacyPolicy,
  updatePrivacyPolicy,
};
