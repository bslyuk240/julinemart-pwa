export function isEmailValid(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

export function isPhoneValid(phone: string): boolean {
  return /^\+?[0-9\s-]{7,15}$/.test(phone);
}
