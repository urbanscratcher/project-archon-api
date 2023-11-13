export { };

declare global {
  namespace Express {
    interface Request {
      userIdx?: number;
      userRole?: string;
    }
  }

}