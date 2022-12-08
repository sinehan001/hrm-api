const express = require("express");
const app = express();
const port = process.env.PORT || 8080;
const moment = require("moment");
const sql = require("mysql");

var connection = sql.createPool({
  // connectionLimit: 100,
  user: process.env.DB_USER || "",
  password: process.env.DB_PASS || "",
  host: process.env.DB_HOST || "",
  database: process.env.DB || "",
  // reconnect: true,
  // port: 3306,
});

// connection.connect();

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/api/ping", (req, res) => {
  console.log("test");
  res.send(new Date().getTime().toString());
});

app.post("/api/punch/out", (req, res) => {
  connection.query(
    `SELECT * FROM employees WHERE employee_id = '${req.body.eid}'`,
    function (error, results, fields) {
      if (error) throw error;
      if (results) {
        const id = results[0].id;
        // const date_now = moment().format("YYYY-MM-DD");
        const date_now = req.body.date;
        const time_now = req.body.time;
        connection.query(
          `SELECT *, attendance.id AS uid FROM attendance LEFT JOIN employees ON employees.id=attendance.employee_id WHERE attendance.employee_id = '${id}' AND date = '${date_now}'`,
          function (error, result, fields) {
            if (error) throw error;
            if (result.length < 1) {
              res.send("Cannot Timeout. No time in.");
            } else {
              if (result[0].time_out != "00:00:00") {
                res.send("You have timedout for today");
              } else {
                connection.query(
                  `UPDATE attendance SET time_out = '${time_now}' WHERE id = '${result[0].uid}'`,
                  function (error, results, field) {
                    if (error) throw error;
                    res.send("OK");
                  }
                );
              }
            }
          }
        );
      }
    }
  );
});

app.post("/api/punch/in", (req, res) => {
  connection.query(
    `SELECT * FROM employees WHERE employee_id = '${req.body.eid}'`,
    function (error, results, fields) {
      if (error) throw error;
      if (results) {
        const id = results[0].id;
        const schedule_id = results[0].schedule_id;
        // const date_now = moment().format("YYYY-MM-DD");
        const date_now = req.body.date;
        const time_now = req.body.time;
        connection.query(
          `SELECT * FROM attendance WHERE employee_id = ${id} AND date = '${date_now}' AND time_in IS NOT NULL`,
          function (error, results, fields) {
            if (error) throw error;
            if (results.length == 0) {
              connection.query(
                `SELECT * FROM schedules WHERE id = '${schedule_id}'`,
                function (error, results, fields) {
                  if (error) throw error;
                  // const now = moment().format("hh:mm:ss");
                  const time_in = results[0].time_in;
                  // var time_in_d = new Date();
                  // time_in_d.setHours(time_in.slice(0, 2));
                  // time_in_d.setMinutes(time_in.slice(3, 5));
                  // time_in_d.setMilliseconds(0);
                  const logstatus = time_in < time_now ? 0 : 1;
                  connection.query(
                    `INSERT INTO attendance (employee_id, date, time_in, time_out, status) VALUES ('${id}', '${date_now}', '${time_now}', '00:00:00', '${logstatus}')`,
                    function (error, results, fields) {
                      if (error) throw error;
                      res.send("OK");
                    }
                  );
                }
              );
            } else {
              // Already timed in
              res.send("Already timed in");
            }
          }
        );
      }
    }
  );
});

app.listen(port, () => {
  console.log("server is up on port " + port);
});
