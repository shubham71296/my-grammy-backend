require("../config/env").validateEnv();
const express = require("express");
const http = require("http");

const app = express();
app.use(express.json());
app.use("/api", require("../routes/index"));

const srv = app.listen(0, () => {
  const port = srv.address().port;
  const post = (path) =>
    new Promise((resolve) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => resolve({ path, status: res.statusCode, body: body.slice(0, 100) }));
        }
      );
      req.on("error", (e) => resolve({ path, error: e.message }));
      req.end("{}");
    });

  Promise.all([
    post("/api/catalog/guestallcourses"),
    post("/api/catalog/guestallinstumnts"),
    post("/api/admin/guestallcourses"),
  ]).then((results) => {
    console.log(results);
    srv.close();
  });
});
