import catchAsync from '@app/utils/catchAsync';
import { contentsService } from './content.service';
import sendResponse from '@app/utils/sendResponse';

const getContents = catchAsync(async (req, res) => {
  const result = await contentsService.getContents(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Contents fetched successfully',
    data: result,
  });
});
const updateContents = catchAsync(async (req, res) => {
  const result = await contentsService.updateContents(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Contents fetched successfully',
    data: result,
  });
});
const contactUs = catchAsync(async (req, res) => {
  const result = await contentsService.contactUs(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Support message send successfully',
    data: result,
  });
});

export const contentController = {
  getContents,
  updateContents,
  contactUs
};
