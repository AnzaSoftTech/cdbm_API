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
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});


contra_voucher_router.get('/cash_bank_master', async (req, res) => {
  try {
    //const { p_book_type, p_exchange, p_segment, p_branch_cd } = req.query;

    let query = `SELECT cb_act_cd, bank_name || ' ( ' || bank_act_no || ')' bank_ac_name, ` +
      `     branch_cd, exc_cd, segment, book_type  ` +
      ` FROM cdbm.fin_cash_bank_master order by bank_name `;
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

contra_voucher_router.get('/actvities', async (req, res) => {
  try {
    const result = await pool.query('SELECT activity_cd, act_name FROM cdbm.activity_master order by act_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

contra_voucher_router.get('/segment', async (req, res) => {
  try {
    const result = await pool.query('SELECT seg_code, seg_name FROM cdbm.segment_master');
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

contra_voucher_router.get('/searchContraEntry', async (req, res) => {
  const { accountName, bookType, fromDate, toDate, tran_type } = req.query;
  let queryParams = [];
  let query = `SELECT ft.segment, ft.exc_cd, ft.fin_year, ft.branch_cd, ft.voucher_no, ft.book_type, ft.trans_date, ft.eff_date ` +
    `, ft.narr_code , fcb.account_title, ft.act_cd, ft.amount, ft.drcr, ft.cmp_cd, ft.narration FROM cdbm.fin_transactions ft ` +
    `join cdbm.fin_cash_bank_master fcb on fcb.cb_act_cd = ft.cb_act_cd   WHERE ft.trans_type= '` + tran_type + `'`;

  if (accountName) {
    query += ` AND fcb.account_title ilike  '%` + accountName + `%'`;
  }
  if (fromDate && toDate) {
    query += ` and to_date(to_char(ft.trans_date, 'YYYY/MM/DD'), 'YYYY/MM/DD') ` +
      ` between to_date('` + fromDate + `', 'YYYY/MM/DD') and ` +
      `      to_date('` + toDate + `', 'YYYY/MM/DD')`
  }
  if (bookType) {
    query += ` AND ft.book_type = '` + bookType + `'`;

  }
  query += ` order by ft.trans_date desc, ft.book_type, ft.voucher_no desc `;
  try {
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

contra_voucher_router.get('/searchEditContra', async (req, res) => {
  const { segment, exchange, fin_year, activity, voucherNo, bookType } = req.query;

  let lv_query = `SELECT ft.segment, ft.exc_cd, ft.nor_depos, ft.fin_year, ft.voucher_no, ft.book_type, ft.cmp_cd, ft.branch_cd ` +
    `, to_char(trans_date,'yyyy-MM-dd') AS trans_date,ft.amount, ft.drcr , ft.narration ` +
    `,to_char(eff_date,'yyyy-MM-dd') AS eff_date,ft.narr_code,ft.cb_act_cd,fcb.account_title act_name ` +
    `,ft.d_add_date FROM cdbm.fin_transactions ft join cdbm.fin_cash_bank_master fcb on fcb.cb_act_cd = ft.cb_act_cd WHERE fin_year = $1 ` +
    `AND voucher_no = $2 AND ft.book_type = $3 AND ft.segment = $4 AND fcb.exc_cd = $5 AND ft.cmp_cd = $6`;

  try {
    const result = await pool.query(lv_query, [fin_year, voucherNo, bookType, segment, exchange, activity]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query:', err.message);
    res.status(500).send('Server error');
  }
});


contra_voucher_router.get('/populatedetailsContra', async (req, res) => {
  try {
    const { p_cb_act_cd } = req.query;
    const result = await pool.query(`SELECT exc_cd, segment, book_type FROM cdbm.fin_cash_bank_master where cb_act_cd = '` +
      p_cb_act_cd + `'`);
    return res.json(result.rows);
  } catch (err) {
    console.log('error in populatedetails ==== ', err);
    res.status(500).json({ error: err.message });
  }
});

contra_voucher_router.post('/save_contra_voucher', async (req, res) => {
  const { header } = req.body;
  const { segment, cbaccountDr, cbaccountCr, bookType, voucherDate, voucherNo, effectiveDate, activity,
    exchangeCode, dranalyzerCode, cranalyzerCode, amount, narration, userId } = header;

  try {
    await pool.query('BEGIN');

    if (voucherNo) {
      var updateQuery = `update cdbm.fin_transactions set narr_code = $1, amount = $2, narration = $3, trans_date = $4 ` +
        `, eff_date = $5 where voucher_no = $6 and cb_act_cd = $7 and book_type = $8 and segment = $9 and exc_cd = $10 and cmp_cd = $11 ` +
        `and cb_act_cd != 'ZZZZZ';`;

      await pool.query(updateQuery, [dranalyzerCode, amount, narration, voucherDate, effectiveDate, voucherNo, cbaccountDr,  bookType
        , segment, exchangeCode, activity]);

        await pool.query(updateQuery, [cranalyzerCode, amount, narration, voucherDate, effectiveDate, voucherNo, cbaccountCr,  bookType
          , segment, exchangeCode, activity]);

      updateQuery = `update cdbm.fin_transactions set narr_code = $1, amount = $2, narration = $3, trans_date = $4 ` +
        `, eff_date = $5 where voucher_no = $6 and cb_act_cd = $7 and book_type = $8 and segment = $9 and exc_cd = $10 and cmp_cd = $11 ` +
        `and cb_act_cd = 'ZZZZZ';`;

      await pool.query(updateQuery, [cranalyzerCode, amount, narration, voucherDate, effectiveDate, voucherNo, cbaccountCr, bookType
        , segment, exchangeCode, activity]);

      await pool.query(updateQuery, [cranalyzerCode, amount, narration, voucherDate, effectiveDate, voucherNo, cbaccountCr, bookType
        , segment, exchangeCode, activity]);

      await pool.query('COMMIT');
      //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
      res.json({ message: voucherNo });

    }
    else {
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

      const jvnoQuery = await pool.query(`SELECT jv_no FROM cdbm.fin_book_type ` +
        ` WHERE fin_year = ` + finYear +
        ` AND book_type = '` + bookType + `'` +
        //  `  AND branch_cd = '` + branchCode + `'` + 
        //  `  AND exc_cd = '` + exchangeCode + `'` +
        `  AND seg_code = '` + segment + `'`);

      if (jvnoQuery.rows.length === 0) {
        throw new Error('JV number not found for the provided criteria');
      }

      const currentJVNo = jvnoQuery.rows[0].jv_no;

      const contra_cd = 'ZZZZZ';

      const insertQuery = `
  INSERT INTO cdbm.fin_transactions 
      (book_type, trans_date, eff_date, cb_act_cd, amount, drcr, segment, exc_cd, nor_depos, 
        narration, fin_year, cmp_cd, voucher_no, narr_code, trans_type, n_add_user_id)
  VALUES 
      ($1, to_date($2, 'YYYY-MM-DD'), to_date($3, 'YYYY-MM-DD'), $4, $5, 
      $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`;

      await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, cbaccountDr, amount,
        'Dr', segment, exchangeCode, 'N', narration,
        finYear, activity, currentJVNo, dranalyzerCode, 'Contra', userId]);

      await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, contra_cd, amount,
        'Dr', segment, exchangeCode, 'N', narration,
        finYear, activity, currentJVNo, dranalyzerCode, 'Contra', userId]);

      await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, cbaccountCr, amount,
        'Cr', segment, exchangeCode, 'N', narration,
        finYear, activity, currentJVNo, cranalyzerCode, 'Contra', userId]);

      await pool.query(insertQuery, [bookType, voucherDate, effectiveDate, contra_cd, amount,
        'Cr', segment, exchangeCode, 'N', narration,
        finYear, activity, currentJVNo, cranalyzerCode, 'Contra', userId]);

      const updateJVNoQuery = `UPDATE cdbm.fin_book_type ` +
        `SET jv_no = jv_no + 1 ` +
        `WHERE fin_year = $1 ` +
        `AND book_type = $2 ` +
        // `AND exc_cd = $3 ` +
        `AND seg_code = $3`;

      //AND cmp_cd = $4 
      await pool.query(updateJVNoQuery, [finYear, bookType, segment]);

      await pool.query('COMMIT');
      //res.status(200).send('Voucher No. ' + currentJVNo +' saved successfully');
      res.json({ message: currentJVNo });
    }


  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error inserting voucher:', error);
    res.status(500).send('Error inserting voucher(s). Please try again.');
  }
});

module.exports = contra_voucher_router;
