export const generateOtp = (digits: number = 6) => {
  const min = Math.pow(10, digits - 1); // Minimum value (e.g., 100000 for 6 digits)
  const max = Math.pow(10, digits) - 1; // Maximum value (e.g., 999999 for 6 digits)
  const otp = Math.floor(min + Math.random() * (max - min + 1));
  return otp.toString();
};
