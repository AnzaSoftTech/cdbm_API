const express = require('express');
const trial_balance_router = express.Router();
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
trial_balance_router.get('/trial_balance', async (req, res) => {
  const{p_AsOnDate} = req.query;
  //console.log('asOnDate--->>>',typeof(p_AsOnDate));
    try {
      const result = await pool.query(
        `select acct_code, acct_name particular, sum(open_bal_dr) open_bal_dr, sum(open_bal_cr) 
           open_bal_cr, sum(amt_dr) tran_dr, sum(amt_cr) amt_cr,
          case when (sum(amt_dr) + sum(open_bal_dr)) > (sum(amt_cr) + sum(open_bal_cr))
              then (sum(amt_dr) + sum(open_bal_dr)) - (sum(amt_cr) + sum(open_bal_cr)) else 0 end Closing_Dr,
          case when (sum(amt_cr) + sum(open_bal_cr)) > (sum(amt_dr) + sum(open_bal_dr))
              then (sum(amt_cr) + sum(open_bal_cr)) - (sum(amt_dr) + sum(open_bal_dr)) else 0 end Closing_Cr
          from cdbm.vw_trial_balance where tran_date='${p_AsOnDate}' group by acct_code, acct_name order by 1;`);
        console.log('result ' , result);
      res.json(result.rows);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });


module.exports = trial_balance_router;
