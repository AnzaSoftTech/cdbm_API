const express = require('express');
const sauda_book_router = express.Router();
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


sauda_book_router.get('/sauda_book', async (req, res) => {
    console.log('/sauda_book is called');
    const {
        clientcd,
        scripcd,
        fromdt,
        todt,
        branchcd,
        Settle_tp,
        SetleNo,
        orderNo,
        tradeNo,
  
  
    } = req.query;
    
    //cmp_cd, exc_cd, branch_cd,
  
    let query = `SELECT TO_CHAR(trd_enter_date_time, 'DD-Mon-YYYY') trd_date, ` + 
                  `     TO_CHAR(trd_enter_date_time, 'hh24:MI:SS') trd_time, ` + 
                  `  bm.Branch_Name branch_name, exc.Exc_Name exc_name, cc.name comp_name, ` +
                  `     record_no, trd_no, trd_status,trd_sec_cd, trd_series,  trd_user_id,  trd_buy_sell, ` +
                  `    trd_qty, trd_price, trd_pro_cl_wh, trd_client_cd, trd_part_cd, ord_no, contract_no, bill_no, ` +
                  `    net_rate, coalesce(trd_br_amount, 0) + coalesce(delivery_brokerage, 0) + coalesce(brokerage, 0) brokerage, ` + 
                  `    trd_settle_no, settle_tp,  sq_up_qty, sq_trans_no, org_client_cd, ` +
                  `    CASE WHEN trans_chrg_ex = 'Y' THEN coalesce(trans_chrg,0) ELSE 0 END tran_chrg,  ` +
                  `    CASE WHEN sebi_to_ex = 'Y' THEN coalesce(sebi_turn_over, 0) ELSE 0 END sebi_to,  ` +
                  `    CASE WHEN stamp_duty_ex = 'Y' THEN  ` +
                  `    coalesce(trd_stamp_duty, 0) + coalesce(trd_stamp_duty_del, 0) + coalesce(n_sd_round_off, 0) ELSE 0 END stamp_duty,  ` +
                  `    CASE WHEN clearing_chg_ex = 'Y' THEN coalesce(clearing_chg, 0) ELSE 0 END clearing_chrg,  ` +
                  `    CASE WHEN other_chrg_ex = 'Y' THEN coalesce(other_chrg, 0) ELSE 0 END other_chrg,  ` +
                  `    coalesce(stt_tax, 0) + coalesce(n_stt_round_off, 0) stt  ` +
                  ` FROM cdbm.cash_sauda_book csb ` + 
                  ` JOIN cdbm.branch_master bm ON csb.branch_cd = bm.branch_cd ` +
                  ` JOIN cdbm.der_exchange_master exc ON csb.exc_cd = exc.exc_cd ` +
                  ` JOIN cdbm.company_config cc ON csb.cmp_cd = cc.cmp_cd `+
                  ` WHERE 1=1 `;
    const values = [];
    
    if (Settle_tp){
      values.push(`%${Settle_tp}%`);
      query += ` AND settle_tp ILIKE $${values.length}`;
    }
  
    if (SetleNo){
        values.push(`%${SetleNo}%`);
        query += ` AND trd_settle_no ILIKE $${values.length}`;
      }
   
  
    if (clientcd) {
        values.push(`%${clientcd}%`);
        query += ` AND trd_client_cd ILIKE $${values.length}`;
    }
  
    if (scripcd) {
        values.push(scripcd);
        query += ` AND trd_sec_cd = $${values.length}`;
    }
  
    if (fromdt) {
        values.push(fromdt);
        query += ` AND TO_DATE(TO_CHAR(trd_enter_date_time, 'DD-MM-YYYY'), 'DD-MM-YYYY') >= $${values.length}`;
    }
  
    if (todt) {
        values.push(todt);
        query += ` AND TO_DATE(TO_CHAR(trd_enter_date_time, 'DD-MM-YYYY'), 'DD-MM-YYYY') <= $${values.length}`;
    }
  
    if (branchcd) {
      values.push(`%${branchcd}%`);
      query += ` AND csb.branch_cd ILIKE $${values.length}`;
    }
  
    if (orderNo){
      values.push(orderNo);
      query += ` AND ord_no = $${values.length}`;
    }
  
  
    if (tradeNo){
      values.push(tradeNo);  
      query += ` AND trd_no = $${values.length}`;
    }
  
    //console.log(query);
    //console.log(values);
  
    try {
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        logError(err, req);
        res.status(500).send('Server error');
    }
  });
  
  sauda_book_router.get('/scrip/:id', async (req, res) => {
    const {
        id
    } = req.params;
    try {
        const result = await pool.query('SELECT sec_name, scrip_cd FROM cdbm.cash_scrip_master WHERE TRIM( UPPER(scrip_cd)) =  $1', [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
            
        } else {
            res.status(404).send('Scrip not found');
        }
    } catch (err) {
        console.error(err);
        logError(err, req);
        res.status(500).send('Server error');
    }
  });
  
  sauda_book_router.get('/client/:id', async (req, res) => {
    const {
        id
    } = req.params;
    try {
        const result = await pool.query('SELECT name FROM cdbm.client_master WHERE client_cd = $1', [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send('Client not found');
        }
    } catch (err) {
        console.error(err);
        logError(err, req);
        res.status(500).send('Server error');
    }
  });
  
  
  sauda_book_router.get('/searchclient', async (req, res) => {
    const { name } = req.query;
    try {
        const result = await pool.query('SELECT client_cd, client_name FROM  cdbm.client WHERE client_name ILIKE $1', [`%${name}%`]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        logError(err, req);
        res.status(500).send('Server error');
    }
  });
  
  sauda_book_router.get('/searchScrip', async (req, res) => {
    const { name } = req.query;
    try {
        const result = await pool.query('SELECT sec_name, scrip_cd FROM  cdbm.cash_scrip_master WHERE sec_name ILIKE $1', [`%${name}%`]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        logError(err, req);
        res.status(500).send('Server error');
    }
  });
  
  
  
  
  sauda_book_router.get('/branches', async (req, res) => {
    try {
      const result = await pool.query('SELECT branch_cd,branch_name FROM cdbm.branch_master order by branch_name');
      res.json(result.rows);
    } catch (err) {
      logError(err, req);
      res.status(500).send(err.message);
    }
  });
  
  sauda_book_router.get('/settlement_type', async (req, res) => {
    try {
        const result = await pool.query('SELECT Settle_tp,description FROM cdbm.cash_exchange_settlement_type order by description');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
  }); 

  // Example route
 sauda_book_router.get('/example2', (req, res) => {
  res.send('Hello World2!');
}); 


module.exports = sauda_book_router;
