const express = require('express');
const finance_report_router = express.Router();
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


finance_report_router.get('/day_book', async (req, res) => {
  //const{p_book_types} = req.query;
  const { p_book_types, p_trans_type, p_from_date, p_to_date } = req.query;
 // const { selectedBookTypes, selectedTranTypes, fromDate, toDate} = req.body;

  console.log(' p_book_types, p_trans_type, p_from_date, p_to_date ',  p_book_types, p_trans_type, p_from_date, p_to_date);

    try {
        const result = await pool.query(`select to_char(trans_date, 'DD-MM-YYYY') trans_date, book_type_desc book_type, ` +
                                         ` voucher_no, account_name, narration, Dr_Amt, Cr_Amt  
                                           from CDBM.VW_DAY_BOOK 
                                          WHERE trans_date between to_date('` + p_from_date + `', 'YYYY-MM-DD') 
                                                       AND to_date('` + p_to_date + `', 'YYYY-MM-DD')
                                            AND book_type in (` + p_book_types + `) ` +
                                          ` AND UPPER(trans_type) in (` + p_trans_type + `)
                                           order by trans_date desc, voucher_no; `);

      console.log('result.rows ', result.rows);

      res.json(result.rows);

    } catch (err) {
      res.status(500).send(err.message);
      console.log('error in day_book ', err);
    }
  });


module.exports = finance_report_router;
