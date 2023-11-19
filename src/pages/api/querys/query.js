const Pool = require("pg").Pool;
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "15042003",
  port: "5432",
});

module.exports = pool;
