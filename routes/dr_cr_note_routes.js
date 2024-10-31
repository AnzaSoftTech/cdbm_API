const express = require('express');
const bodyParser = require('body-parser');
const dr_cr_notes_router = express.Router();
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const port = 3001;

// PostgreSQL pool
// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "cdbm_db",
//   password: "pg@12345",
//   port: 5432
// });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password:process.env.DB_PASSWORD,
    port:process.env.DB_PORT
    }); 

app.use(cors());
app.use(bodyParser.json());

// Endpoint to get accounts
dr_cr_notes_router.get('/bookType', async (req, res) => {
  try {
    const result = await pool.query('SELECT book_type FROM cdbm.fin_book_type');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

dr_cr_notes_router.get('/branches', async (req, res) => {
  try {
      const result = await pool.query('SELECT branch_cd,branch_name FROM cdbm.branch_master order by branch_name');
      res.json(result.rows);
  } catch (err) {
      res.status(500).send(err.message);
  }
});

dr_cr_notes_router.get('/Account', async (req, res) => {
  try {
      const result = await pool.query('SELECT act_cd,act_name FROM cdbm.fin_account_master order by act_name');
      res.json(result.rows);
  } catch (err) {
      res.status(500).send(err.message);
  }
});

dr_cr_notes_router.get('/searchAccount', async (req, res) => {
  const { exchange, segment, name } = req.query;
  let queryParams = [];
  let query = 'SELECT act_cd, act_name, branch_cd, cmp_cd, type_cd FROM cdbm.fin_account_master WHERE 1=1';

  if (exchange) {
    query += ' AND exc_cd = $1';
    queryParams.push(exchange);
  }
  if (segment) {
    query += ' AND segment = $2';
    queryParams.push(segment);
  }
  if (name) {
    query += ' AND act_name ILIKE $3';
    queryParams.push(`%${name}%`);
  }

  try {
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

dr_cr_notes_router.get('/searchVouchers', async (req, res) => {
  const { accountNamecd,voucherNo,branchNamecd,bookType, fromDate,toDate} = req.query;
  console.log('data====',req.query)
  let queryParams = [];
  let query = 'SELECT book_type, trans_date, eff_date, cb_act_cd,amount, drcr, segment, exc_cd, nor_depos, narration, fin_year, branch_cd, cmp_cd, act_cd, voucher_no,narr_code FROM cdbm.fin_transactions WHERE 1=1';

  if (accountNamecd) {
    query += ' AND act_cd = $1';
    queryParams.push(accountNamecd);
  }
  if (voucherNo) {
    query += ' AND voucher_no = $2';
    queryParams.push(voucherNo);
  }
  if (branchNamecd) {
    query += ' AND branch_cd ILIKE $3';
    queryParams.push(`%${branchNamecd}%`);
  }
  // if (fromDate && toDate) {
  //   query += ' AND trans_date >= $4::date AND trans_date <= $5::date';
  //   queryParams.push(fromDate, toDate);
  // } else if (fromDate) {
  //   query += ' AND trans_date >= $4::date';
  //   queryParams.push(fromDate);
  // } else if (toDate) {
  //   query += ' AND trans_date <= $4::date';
  //   queryParams.push(toDate);
  // }
  
  if (bookType) {
    query += ' AND book_type ILIKE $4';
    queryParams.push(`%${bookType}%`);
  }

  try {
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

dr_cr_notes_router.get('/fin_company/:voucherDate', async (req, res) => {
  const { voucherDate } = req.params;
  console.log('voucharDate----', voucherDate);

  try {
    // Fetch fin_year_frm, fin_year_to, and fin_year based on voucherDate
    const query = `
    SELECT fin_year 
    FROM cdbm.fin_company 
    WHERE to_date($1,'DD/MM/YYYY') BETWEEN 
to_date(to_char(fin_yr_frm,'DD/MM/YYYY'),'DD/MM/YYYY') AND 
to_date(to_char(fin_yr_to,'DD/MM/YYYY'),'DD/MM/YYYY')`;

    const values = [voucherDate];

    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).send('Financial year data not found for provided voucher date.');
    }
  } catch (err) {
    console.error('Error fetching financial year data:', err);
    res.status(500).send('Server error');
  }
});

dr_cr_notes_router.get('/exchange', async (req, res) => {
  try {
    const result = await pool.query('SELECT exc_name, exc_cd FROM cdbm.DER_EXCHANGE_MASTER');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

dr_cr_notes_router.post('/save_dr_cr_note', async (req, res) => {
  const { header, details } = req.body;
  const { bookType, voucherDate, effectiveDate, transType, userId } = header;

  console.log('req.body ====> ', req.body)

  try {
    await pool.query('BEGIN');
    
    const selectResult = await pool.query(`
          SELECT fin_year 
          FROM cdbm.fin_company 
          WHERE to_date($1,'YYYY-MM-DD') 
          BETWEEN to_date(to_char(fin_yr_frm,'YYYY-MM-DD'),'YYYY-MM-DD') 
          AND to_date(to_char(fin_yr_to,'YYYY-MM-DD'),'YYYY-MM-DD');
      `, [voucherDate]);

    if (selectResult.rows.length === 0) {
      throw new Error('Financial year not found for the provided voucher date');
    }
    const finYear = selectResult.rows[0].fin_year;

    let newBranch_cd = '';
    let newsegement = '';
    let newexchange = '';
    let newcmp_cd = '';

    for (let detail of details) {
      const { segment, exchange, branch_cd, cmp_cd } = detail;
      newBranch_cd = branch_cd;
      newsegement = segment;
      newexchange = exchange;
      newcmp_cd = cmp_cd;
    }
    console.log("Parameters for jvnoQuery:", finYear, bookType, newBranch_cd,newcmp_cd, newexchange, newsegement);

    const jvnoQuery = `
              SELECT curr_jvno 
              FROM cdbm.fin_book_type 
              WHERE fin_year = $1
                  AND book_type = $2 
                  AND exc_cd = $3
                  AND segment = $4
          `;
          
    const jvnoResult = await pool.query(jvnoQuery, [finYear, bookType, newexchange, newsegement]);
    if (jvnoResult.rows.length === 0) {
      throw new Error('JV number not found for the provided criteria');
    }
    const currentJVNo = jvnoResult.rows[0].curr_jvno;
    for (let detail of details) {
      const { act_name, dr_amount, cr_amount, dr_cr, segment, exchange, noraml_deposit, narration,
              act_cd, branch_cd, cmp_cd,analyzer_code } = detail;
      let amount = (dr_cr === 'Dr') ? dr_amount : cr_amount;
      
      const insertQuery = `
              INSERT INTO cdbm.fin_transactions 
                  (book_type, trans_date, eff_date, act_cd, amount, drcr, segment, exc_cd, nor_depos, 
                    narration, fin_year, branch_cd, cmp_cd, voucher_no, narr_code, trans_type, n_add_user_id)
              VALUES 
                  ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, 
                  $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`;
          //console.log('insertQuery ==> ', insertQuery);
          console.log('branch_cd ---> ', branch_cd);
          console.log('cmp_cd ---> ', cmp_cd);
  
      await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, act_cd, amount, dr_cr, segment, exchange, noraml_deposit,
                       narration, finYear, branch_cd, cmp_cd, currentJVNo, analyzer_code, transType, userId]);
    }
    
    const updateJVNoQuery = `
            UPDATE cdbm.fin_book_type 
            SET curr_jvno = curr_jvno + 1 
            WHERE fin_year = $1 
                AND book_type = $2 
                AND exc_cd = $3
                AND segment = $4`;
        
    await pool.query(updateJVNoQuery, [finYear, bookType,  newexchange, newsegement]);

    await pool.query('COMMIT');
    res.status(200).send('Voucher(s) inserted successfully');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error inserting voucher:', error);
    res.status(500).send('Error inserting voucher(s). Please try again.');
  }
});

module.exports = dr_cr_notes_router;
