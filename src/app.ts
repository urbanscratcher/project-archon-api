import express, { NextFunction, Request, Response } from "express";

const app = express();

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("welcome!");
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log("app running on port...", PORT);
});
