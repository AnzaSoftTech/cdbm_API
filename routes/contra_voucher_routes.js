const express = require('express');
const bodyParser = require('body-parser');
const contra_voucher_router = express.Router();
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

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


contra_voucher_router.get('/cash_bank_master', async (req, res) => {
  try {
      //const { p_book_type, p_exchange, p_segment, p_branch_cd } = req.query;

      let query = `SELECT cb_act_cd, bank_name || ' ( ' || bank_act_no || ')' bank_ac_name, ` +
                    `     branch_cd, exc_cd, segment, book_type  ` +
                                      ` FROM cdbm.fin_cash_bank_master order by bank_name ` ;
                                      // ` where branch_cd = '` + p_branch_cd  + `'` +
                                      // `   and exc_cd = '` + p_exchange + `'`  +
                                      // `   and seqment = '` + p_segment + `'`  +
                                      // `   and book_type = '` + p_book_type + `'` ;
      //console.log('query => ',  query);
      const result = await pool.query(query);
      res.json(result.rows);
      //console.log(result.rows);
  } catch (err) {
      res.status(500).send(err.message);
  }
});

contra_voucher_router.get('/bookType', async (req, res) => {
  try {
    const result = await pool.query('SELECT book_type FROM cdbm.fin_book_type');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

contra_voucher_router.get('/branches', async (req, res) => {
  try {
      const result = await pool.query('SELECT branch_cd,branch_name FROM cdbm.branch_master order by branch_name');
      res.json(result.rows);
  } catch (err) {
      res.status(500).send(err.message);
  }
});

contra_voucher_router.get('/exchange', async (req, res) => {
  try {
    const result = await pool.query('SELECT exc_name, exc_cd FROM cdbm.DER_EXCHANGE_MASTER');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

contra_voucher_router.get('/analyzercode', async (req, res) => {
  try {
    const result = await pool.query('SELECT ana_grp_cd, grp_name FROM cdbm.fin_analyzer_group_master order by grp_name');
    res.json(result.rows);
    //console.log('result.rows => ', result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

contra_voucher_router.get('/populatedetails', async (req, res) => {
  try {
    const {p_cb_act_cd} = req.query;
    const result = await pool.query(`SELECT branch_cd, exc_cd, segment, book_type FROM cdbm.fin_cash_bank_master where cb_act_cd = '` +
        p_cb_act_cd + `'`);
       //console.log(result.rows);
    return res.json(result.rows);
  } catch (err) {
    console.log('error in populatedetails ==== ', err);
    res.status(500).json({ error: err.message });
  }
});

contra_voucher_router.post('/save_contra_voucher', async (req, res) => {
  const { header } = req.body;
  const { segment, cbaccountDr, cbaccountCr, bookType, voucherDate, voucherNo, effectiveDate, branchCode,
         exchangeCode, dranalyzerCode, cranalyzerCode, amount, narration, userId } = header;

  console.log('save_contra_voucher req.body ====> ', req.body)

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

    const jvnoQuery = await pool.query(`SELECT curr_jvno FROM cdbm.fin_book_type ` +
                       ` WHERE fin_year = ` + finYear +
                       ` AND book_type = '` + bookType +`'` +
                     //  `  AND branch_cd = '` + branchCode + `'` + 
                       `  AND exc_cd = '` + exchangeCode + `'` +
                       `  AND segment = '` + segment + `'`);

    if (jvnoQuery.rows.length === 0) {
       throw new Error('JV number not found for the provided criteria');
    }
    
    const currentJVNo = jvnoQuery.rows[0].curr_jvno;

    const contra_cd = 'ZZZZZ';

    const insertQuery = `
    INSERT INTO cdbm.fin_transactions 
        (book_type, trans_date, eff_date, cb_act_cd, amount, drcr, segment, exc_cd, nor_depos, 
          narration, fin_year, branch_cd, cmp_cd, voucher_no, narr_code, trans_type, n_add_user_id)
    VALUES 
        ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, 
        $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`;

    await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, cbaccountDr, amount, 
                                    'Dr', segment, exchangeCode, 'N', narration,
                                    finYear, branchCode, 1, currentJVNo, dranalyzerCode, 'Contra', userId]);

    await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, contra_cd, amount,
                                   'Dr', segment, exchangeCode, 'N', narration,
                                   finYear, branchCode, 1, currentJVNo, dranalyzerCode, 'Contra', userId]);

    await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, cbaccountCr, amount, 
                                    'Cr', segment, exchangeCode, 'N', narration,
                                    finYear, branchCode, 1, currentJVNo, cranalyzerCode, 'Contra', userId]);

    await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, contra_cd, amount,
                                    'Cr', segment, exchangeCode, 'N', narration,
                                    finYear, branchCode, 1, currentJVNo, cranalyzerCode, 'Contra', userId]);

    const updateJVNoQuery = `UPDATE cdbm.fin_book_type 
                                    SET curr_jvno = curr_jvno + 1 
                                    WHERE fin_year = $1 
                                        AND book_type = $2 
                                        AND exc_cd = $3
                                        AND segment = $4`;
                        
    //AND cmp_cd = $4 
    await pool.query(updateJVNoQuery, [finYear, bookType, exchangeCode, segment]);

    await pool.query('COMMIT');
    //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
    res.json({message: currentJVNo });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error inserting voucher:', error);
    res.status(500).send('Error inserting voucher(s). Please try again.');
  }
});

module.exports = contra_voucher_router;
