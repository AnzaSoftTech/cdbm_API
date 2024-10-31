const express = require('express');
const ledger_router = express.Router();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const logError = require('../error-logger');
const sqlquery='';
const resulterr = [];

// Load environment variables from .env file
dotenv.config();

// PostgreSQL pool
const pool = new Pool({
user: process.env.DB_USER,
host: process.env.DB_HOST,
database: process.env.DB_DATABASE,
password:process.env.DB_PASSWORD,
port:process.env.DB_PORT
}); 

// CRUD endpoints
ledger_router.get('/ledger', async (req, res) => {
    try {
      const result = await pool.query(`select to_char (trans_date, 'DD-MM-YYYY') date, voucher_no vchr_no, fm.act_name particular,
	   case when drcr= 'Dr' then amount else 0 end debit_amount,
	   case when drcr= 'Cr' then amount else 0 end credit_amount,
	   0 balance_amount
	from cdbm.fin_transactions ft
	join cdbm.fin_account_master fm on ft.act_cd = fm.act_cd`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  


module.exports = ledger_router;
