const generateCryptoString = (length: number): string => {
  length += 1;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  //   const chars =
  //     'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length - 1);
  crypto.getRandomValues(array);
  return '#' + Array.from(array, byte => chars[byte % chars.length]).join('');
};

export default generateCryptoString;
