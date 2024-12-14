const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const common_router = express.Router();
const app = express();
const port = 3001;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password:process.env.DB_PASSWORD,
    port:process.env.DB_PORT
    }); 

app.use(cors());
app.use(bodyParser.json());

common_router.get('/bookType', async (req, res) => {
    try {
      const result = await pool.query('SELECT book_type FROM cdbm.fin_book_type order by 1');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  common_router.get('/bookType_multi_ddl', async (req, res) => {
    try {
      const result = await pool.query(`SELECT '''' || book_type || '''' book_type, description FROM cdbm.fin_book_type WHERE seg_code = 'C' order by 1`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

 
  common_router.get('/exchange', async (req, res) => {
    try {
      const result = await pool.query(`SELECT mii_id, mii_name FROM cdbm.mii_master where mii_catg = 'EXC' ORDER BY 2;`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  module.exports = common_router;
