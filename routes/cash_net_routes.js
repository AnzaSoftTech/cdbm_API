const express = require('express');
const cash_net_router = express.Router();
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
cash_net_router.get('/client', async (req, res) => {
    try {
        const result = await pool.query('SELECT client_cd, scrip_cd, series,buy_qty, buy_value, sale_qty, sale_value, (buy_qty - sale_qty) AS net_qty, (buy_value - sale_value) AS net_value,position_date,dsettleno as delv_settle_no from cdbm.cash_net_position_client');
        res.json(result.rows);
    } catch (err) {
        logError(err, req);
        res.status(500).send(err.message);
    }
});

cash_net_router.get('/branches', async (req, res) => {
    try {
        const result = await pool.query('SELECT branch_cd,branch_name FROM cdbm.branch_master order by branch_name');
        res.json(result.rows);
    } catch (err) {
        logError(err, req);
        res.status(500).send(err.message);
    }
});
 
cash_net_router.get('/settlement_type', async (req, res) => {
  try {
      const result = await pool.query('SELECT Settle_tp,description FROM cdbm.cash_exchange_settlement_type order by description');
      res.json(result.rows);
  } catch (err) {
      logError(err, req);
      res.status(500).send(err.message);
  }
});

cash_net_router.get('/client/:id', async (req, res) => {
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

cash_net_router.get('/scrip/:id', async (req, res) => {
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

cash_net_router.get('/searchclient', async (req, res) => {
    const { name } = req.query;
    try {
        const result = await pool.query('SELECT client_cd, name FROM  cdbm.client_master WHERE name ILIKE $1', [`%${name}%`]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        logError(err, req);
        res.status(500).send('Server error');
    }
  });

  cash_net_router.get('/searchScrip', async (req, res) => {
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

  cash_net_router.get('/client_summary', async (req, res) => {
    const {
        clientcd,
        scripcd,
        fromdt,
        todt,
        branchcd,
        Settle_tp,
        SetleNo,
    } = req.query;
    
    try {
        let query = 'SELECT ' +
                    ' ndfl as delivery_nodelivery, ' +
                    ' sum(buy_value) as buy_value, ' +
                    ' sum(sale_value) as sale_value, ' +
                    ' (sum(buy_value) - sum(sale_value)) net_value1, ' +
                    ' sum(buy_value + sale_value) gross_value ' +
                    ' FROM cdbm.cash_net_position_client ' +
                    ' WHERE 1=1';
        
        const values = [];
        
        if (Settle_tp){
            values.push(`%${Settle_tp}%`);
            query += ` AND settle_tp ILIKE $${values.length}`;
          }
      
          if (SetleNo){
              values.push(`%${SetleNo}%`);
              query += ` AND settle_no ILIKE $${values.length}`;
            }
         
      
          if (clientcd) {
              values.push(`%${clientcd}%`);
              query += ` AND client_cd ILIKE $${values.length}`;
          }
      
          if (scripcd) {
              values.push(scripcd);
              query += ` AND scrip_cd = $${values.length}`;
          }
      
          if (fromdt) {
              values.push(fromdt);
              query += ` AND position_date >= $${values.length}`;
          }
      
          if (todt) {
              values.push(todt);
              query += ` AND position_date <= $${values.length}`;
          }
      
          if (branchcd) {
            values.push(`%${branchcd}%`);
            query += ` AND branch_cd ILIKE $${values.length}`;
          }
        
        query += ' GROUP BY ndfl';
        
        const { rows } = await pool.query(query, values);
        res.json(rows);
    } catch (err) {
        logError(err, req);
        res.status(500).json({ error: err.message });
    }
});


cash_net_router.get('/client_net_position', async (req, res) => {
    const {
        clientcd,
        scripcd,
        fromdt,
        todt,
        branchcd,
        Settle_tp,
        SetleNo,


    } = req.query;

    let query = `SELECT client_cd, scrip_cd,settle_tp, series,buy_qty, buy_value, sale_qty, sale_value, ` + 
                       ` (buy_qty - sale_qty) AS net_qty, (buy_value - sale_value) AS net_value, ` + 
                       ` nse_buy_value,  nse_sale_value, total_charges, total_stt, ` +
                       ` TO_CHAR(position_date, 'DD-MM-YYYY') position_date, ` +
                       ` dsettleno as delv_settle_no from cdbm.cash_net_position_client WHERE 1=1 `;
    const values = [];
    
    if (Settle_tp){
      values.push(`%${Settle_tp}%`);
      query += ` AND settle_tp ILIKE $${values.length}`;
    }

    if (SetleNo){
        values.push(`%${SetleNo}%`);
        query += ` AND settle_no ILIKE $${values.length}`;
      }
   

    if (clientcd) {
        values.push(`%${clientcd}%`);
        query += ` AND client_cd ILIKE $${values.length}`;
    }

    if (scripcd) {
        values.push(scripcd);
        query += ` AND scrip_cd = $${values.length}`;
    }

    if (fromdt) {
        values.push(fromdt);
        query += ` AND TO_DATE(TO_CHAR(position_date, 'DD-MM-YYYY'), 'DD-MM-YYYY') >= $${values.length}`;
    }

    if (todt) {
        values.push(todt);
        query += ` AND TO_DATE(TO_CHAR(position_date, 'DD-MM-YYYY'), 'DD-MM-YYYY') <= $${values.length}`;
    }

    if (branchcd) {
      values.push(`%${branchcd}%`);
      query += ` AND branch_cd ILIKE $${values.length}`;
    }
    
    try {
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        logError(err, req);
        console.error(err);
        res.status(500).send('Server error');
    }
});



module.exports = cash_net_router;
