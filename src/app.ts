import cookieParser from 'cookie-parser';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import router from './app/routes';
import globalErrorHandler from './app/middleware/globalErrorhandler';
import notFound from './app/middleware/notfound';
import { paymentPagesRoutes } from '@app/modules/payments/payment.pages.route';

const app: Application = express();
app.use(express.static('public'));
app.use('/public', express.static('public'));
app.set('view engine', 'ejs');
app.set('views', 'public/ejs');
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

//parsers
app.use(express.json());
app.use(cookieParser());
app.use(cors());
// app.use(
//   cors({
//     origin: true,
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//   }),
// );

app.use('/api/v1', router);
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Borla Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.use('/', paymentPagesRoutes);

app.use(globalErrorHandler);

//Not Found
app.use(notFound);
export default app;
