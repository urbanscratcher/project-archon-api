import express, { NextFunction, Request, Response } from "express";

const app = express();

// users CRUD
app.post("/users", (req: Request, res: Response, next: NextFunction) => {
  // get request
  // save in DB
  res.status(200).send();
});

app.get("/users", (req: Request, res: Response, next: NextFunction) => {
  // get request
  // save in DB
  res.status(200).json({
    total: 10,
    data: {
      id: 1,
      avatar_url: "http://",
    },
  });
});

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("welcome!");
});

const PORT = 5230;
app.listen(PORT, () => {
  console.log("app running on port...", PORT);
});
