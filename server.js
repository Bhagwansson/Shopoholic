const app = require("./app");
const connectDatabase = require("./db/Database");

//Hndeling uncaught exception
process.on("uncaughtException", (err) => {
  console.log(`Caught exception: ${err.message}`);
  console.log(`shutting down the server for handeling uncaught error`);
});

//config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}

// connect db
connectDatabase();

//creating server

const server = app.listen(process.env.PORT,"192.168.0.103",() => {
  //   console.log(process.env.PORT)
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

// unhandled promise error

process.on("unhandledRejection", (err) => {
  console.log(`Shutting down the server for ${err.message}`);
  console.log(`Shutting down the server for unhandled promise rejection`);

  server.close(() => {
    process.exit(1);
  });
});
