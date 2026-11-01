import config from '@app/config';
import HashPassword from '@app/shared/hashPassword';
import prisma from '@app/shared/prisma';

export async function defaultTask() {
  // Add your default task here
  const email = config?.admin_credentials?.email || 'admin@email.com';
  const password = config?.admin_credentials?.password || 'admin@email.com';
  const admin = await prisma.user.findFirst({
    where: { email },
  });

  if (!admin) {
    await prisma.user.create({
      data: {
        name: 'MD Admin',
        email,
        password: await HashPassword(password),
        role: 'admin',
        expireAt: null,
        verification: {
          create: {
            otp: 0,
            status: true,
          },
        },
      },
    });
  }

  const content = await prisma?.contents.findFirst({});
  if (!content) {
    await prisma.contents.create({
      data: {
        termsAndCondition: 'This is Terms and condition page',
        privacyPolicy: 'This is privacy policy page',
      },
    });
  }
}
